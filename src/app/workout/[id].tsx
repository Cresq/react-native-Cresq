import { useMemo, useState } from "react";
import { FlatList, View, Pressable, useWindowDimensions } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useNav } from "@/nav";
import { shareText } from "@/share";
import { useTheme } from "@/theme/ThemeProvider";
import { useDb } from "@/db/DbProvider";
import { finished, fmtKg, longDate, newRecords, sessionStats } from "@/db/derive";
import { otherPosts } from "@/data/mock";
import { person, personByName } from "@/data/people";
import { Screen, Row, Section, Header } from "@/components/ui/Screen";
import { Txt } from "@/components/ui/Text";
import { IconButton } from "@/components/ui/IconButton";
import { Icon } from "@/components/ui/Icon";
import { Chip } from "@/components/ui/Chip";
import { Avatar, PhotoSlot } from "@/components/ui/PhotoSlot";
import { Stat, StatDivider } from "@/components/StatCard";
import { Card } from "@/components/ui/Card";
import { SessionBreakdown, type BreakdownExercise } from "@/components/SessionBreakdown";
import { useT, usePlural } from "@/i18n";
import { PhotoViewer } from "@/components/PhotoViewer";
import { BottomSheet, SheetOption } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { PostCard } from "@/components/PostCard";
import { CommentSheet, type Comment } from "@/components/CommentSheet";
import { useComments } from "@/store/comments";
import { useMe } from "@/store/me";
import { useWorkout } from "@/store/workout";
import { useNow } from "@/clock";
import { postFromSession } from "@/social/posts";

/**
 * One workout, or a row of them.
 *
 * Opened from a profile it arrives with `of`: "me" for your own log, a
 * person's id for their posts. Then it is a horizontal pager, one workout per
 * page, and the next one is a swipe away instead of a close and a tap.
 * Opened from anywhere else it is the single page it always was.
 */
export default function SessionDetail() {
  const { id, of } = useLocalSearchParams<{ id: string; of?: string }>();
  const { db } = useDb();
  const { width } = useWindowDimensions();

  const ids = useMemo(() => {
    if (of === "me") return [...finished(db.sessions)].reverse().map((s) => s.id);
    if (of) return otherPosts.filter((p) => p.userId === of).map((p) => p.id);
    return [id];
  }, [of, id, db.sessions]);
  const start = Math.max(0, ids.indexOf(id));

  if (ids.length <= 1) return <Page id={id} />;
  return (
    <FlatList
      horizontal
      pagingEnabled
      bounces={false}
      data={ids}
      keyExtractor={(x) => x}
      initialScrollIndex={start}
      getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
      renderItem={({ item, index }) => (
        <View style={{ width }}>
          <Page id={item} at={{ index, count: ids.length }} />
        </View>
      )}
      showsHorizontalScrollIndicator={false}
      windowSize={3}
      initialNumToRender={1}
      maxToRenderPerBatch={2}
    />
  );
}

/**
 * The page itself: the figures, any records, the photo, then every exercise
 * with each set on its own line. Your own sessions come from the log; someone
 * else's come with their post.
 */
function Page({ id, at }: { id: string; at?: { index: number; count: number } }) {
  const { colors } = useTheme();
  const router = useNav();
  const t = useT();
  const plural = usePlural();
  const { db, update } = useDb();
  const [menu, setMenu] = useState<"menu" | "delete" | null>(null);
  const [afterSheet, setAfterSheet] = useState<(() => void) | null>(null);
  const [zoom, setZoom] = useState(false);
  const [commenting, setCommenting] = useState(false);
  const me = useMe();
  const now = useNow();
  const { resume } = useWorkout();
  const { commentsOf, add: addComment, actionsFor } = useComments();
  const session = db.sessions.find((s) => s.id === id) ?? (db.activeSession?.id === id ? db.activeSession : undefined);
  const post = session ? undefined : otherPosts.find((p) => p.id === id);
  const recs = useMemo(() => (session ? newRecords(session, db.sessions.filter((x) => x.startedAt < session.startedAt)) : []), [session, db.sessions]);
  // Your own session as the post it makes, the same card the feed shows, so the two never disagree.
  const myPost = useMemo(() => (session ? postFromSession(session, { profile: db.profile, sessions: db.sessions, photo: me.photo, comments: (db.comments?.[session.id] ?? []).length, t }) : null), [session, db.profile, db.sessions, db.comments, me.photo, t]);
  const openWriter = (c: Comment) => {
    const who = personByName(c.name);
    setCommenting(false);
    if (who) router.push(`/user/${who.id}`);
    else if (c.name === db.profile.name) router.push("/(tabs)/profile");
  };
  // Taking a session up again makes sense the same day, not next week.
  const resumable = !!session?.finishedAt && !db.activeSession && now - session.finishedAt < 12 * 3_600_000;
  const position = at ? t("{a} of {b}", { a: at.index + 1, b: at.count }) : "";
  const back = () => router.back();

  if (!session && !post) {
    return (
      <Screen>
        <Header left={<IconButton name="chevronLeft" onPress={back} accessibilityLabel={t("Back")} />} title={t("Workout")} />
        <Txt variant="bodyM" tone="secondary">
          {t("This workout is no longer available.")}
        </Txt>
      </Screen>
    );
  }

  if (post) {
    const author = post.userId ? person(post.userId) : undefined;
    const exercises: BreakdownExercise[] = post.workout ?? (post.exercises ?? []).map((e) => ({ name: e.name, sets: [] }));
    const [title, ...rest] = post.meta.split(", ").map((part) => t(part));
    return (
      <Screen>
        <Header left={<IconButton name="chevronLeft" onPress={back} accessibilityLabel={t("Back")} />} title={title} subtitle={[...rest, position].filter(Boolean).join(", ")} />
        <Pressable accessibilityRole={author ? "button" : undefined} accessibilityLabel={author ? t("Open {name}", { name: post.name }) : undefined} disabled={!author} onPress={() => author && router.push(`/user/${author.id}`)} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, opacity: pressed ? 0.7 : 1 })}>
          <Avatar source={post.avatar ?? author?.avatar} size={40} initial={post.name[0]} />
          <View style={{ flex: 1, gap: 1 }}>
            <Txt variant="labelL">{post.name}</Txt>
            {author ? (
              <Txt variant="bodyS" tone="tertiary">
                {author.handle}, {author.city}
              </Txt>
            ) : null}
          </View>
          {author ? <Icon name="chevronRight" size={18} color={colors.text.tertiary} /> : null}
        </Pressable>
        {post.photo ? (
          <Pressable accessibilityRole="button" accessibilityLabel={t("See the photo")} onPress={() => setZoom(true)}>
            <PhotoSlot source={post.photo} height={320} radius={18} />
          </Pressable>
        ) : null}
        <PhotoViewer source={post.photo} visible={zoom} onClose={() => setZoom(false)} />
        {post.caption ? <Txt variant="bodyL">{post.caption}</Txt> : null}

        <Card padding={16} gap={0}>
          <Row gap={12} align="stretch">
            {post.stats.map((s, i) => (
              <View key={i} style={{ flexDirection: "row", flex: 1 }}>
                {i > 0 ? <StatDivider /> : null}
                <Stat label={s.unit === "min" ? t("Duration") : s.unit === "kg" ? t("Volume") : t("Sets")} value={s.value} unit={s.unit === "sets" ? undefined : s.unit} />
              </View>
            ))}
          </Row>
        </Card>
        {post.record ? <Chip label={post.record} icon="trophy" tone="gold" size="S" style={{ alignSelf: "flex-start" }} /> : null}

        <SessionBreakdown exercises={exercises} />
      </Screen>
    );
  }

  const s = session!;
  const stats = sessionStats(s);
  const exercises: BreakdownExercise[] = s.exercises.map((e) => ({ exerciseId: e.exerciseId, name: e.name, note: e.note, supersetGroup: e.supersetGroup, sets: e.sets.filter((x) => x.done).map((x) => ({ kg: x.kg, reps: x.reps, type: x.type, done: true })) }));

  return (
    <Screen>
      <Header left={<IconButton name="chevronLeft" onPress={back} accessibilityLabel={t("Back")} />} title={s.planName} subtitle={[longDate(s.startedAt), position].filter(Boolean).join(", ")} right={<IconButton name="moreHorizontal" onPress={() => setMenu("menu")} accessibilityLabel={t("Options")} />} />

      {s.photo ? (
        <Pressable accessibilityRole="button" accessibilityLabel={t("See the photo")} onPress={() => setZoom(true)}>
          <PhotoSlot source={{ uri: s.photo }} height={320} radius={18} />
        </Pressable>
      ) : null}
      <PhotoViewer source={s.photo ? { uri: s.photo } : undefined} visible={zoom} onClose={() => setZoom(false)} />

      {s.caption ? <Txt variant="bodyL">{s.caption}</Txt> : null}

      {s.shared && myPost ? (
        <Section title={t("On your feed")}>
          <PostCard post={myPost} onComment={() => setCommenting(true)} />
        </Section>
      ) : null}
      {myPost ? (
        <CommentSheet
          visible={commenting}
          onClose={() => setCommenting(false)}
          title={[myPost.name, myPost.title].filter(Boolean).join(", ")}
          comments={commentsOf(myPost)}
          me={{ initial: me.initial, name: db.profile.name, photo: me.photo }}
          onSend={(text, replyTo) => addComment(myPost.id, text, replyTo)}
          onOpenProfile={openWriter}
          actionsFor={(c) => actionsFor(myPost, c)}
        />
      ) : null}

      <Card padding={16} gap={0}>
        <Row gap={12} align="stretch">
          <Stat label={t("Duration")} value={String(stats.minutes)} unit="min" />
          <StatDivider />
          <Stat label={t("Volume")} value={fmtKg(stats.volume)} unit="kg" />
          <StatDivider />
          <Stat label={t("Sets")} value={String(stats.setsDone)} unit={t("of {n}", { n: stats.setsTotal })} />
        </Row>
      </Card>

      {recs.length ? (
        <Row gap={8} style={{ flexWrap: "wrap" }}>
          {recs.map((r) => (
            <Chip key={r.exerciseId} label={`${r.name} ${r.kg} kg`} icon="trophy" tone="gold" size="S" />
          ))}
        </Row>
      ) : null}

      <SessionBreakdown exercises={exercises} />

      {/* Where, and who can see it: one quiet line rather than two stray ones. */}
      <Row gap={8} style={{ flexWrap: "wrap" }}>
        <Icon name={s.shared ? "users" : "lock"} size={13} color={colors.text.tertiary} strokeWidth={1.8} />
        <Txt variant="labelS" tone="tertiary">
          {[s.shared ? t("Shared to your feed") : t("Private"), s.gym, s.sample ? t("sample session") : ""].filter(Boolean).join(", ")}
        </Txt>
      </Row>

      {/* One sheet that changes its face: a second modal opened while the first closes locks up iOS. */}
      <BottomSheet visible={!!menu} onClose={() => setMenu(null)} onClosed={() => { const go = afterSheet; setAfterSheet(null); go?.(); }} title={menu === "delete" ? t("Delete this workout?") : s.planName} subtitle={menu === "delete" ? t("It disappears from the feed and from your log. Records from it are recalculated. This cannot be undone.") : longDate(s.startedAt)}>
        {menu === "menu" ? (
          <>
            {resumable ? <SheetOption icon="play" label={t("Continue this workout")} sub={t("Back into the session, everything as you left it")} onPress={() => { setMenu(null); resume(s.id); router.replace("/workout/active"); }} /> : null}
            <SheetOption icon="sliders" label={t("Edit workout")} sub={t("Caption, sets, weights, duration, exercises")} onPress={() => { setMenu(null); router.push(`/workout/edit/${s.id}`); }} />
            {s.shared ? (
              <SheetOption icon="lock" label={t("Make private")} sub={t("Removes it from the feed, keeps it in your log")} onPress={() => { setMenu(null); update((d) => ({ ...d, sessions: d.sessions.map((x) => (x.id === s.id ? { ...x, shared: false } : x)) })); }} />
            ) : (
              <SheetOption icon="users" label={t("Share to feed")} sub={t("Your followers see it in their feed")} onPress={() => { setMenu(null); update((d) => ({ ...d, sessions: d.sessions.map((x) => (x.id === s.id ? { ...x, shared: true } : x)) })); }} />
            )}
            <SheetOption icon="share" label={t("Share")} sub={t("Send a summary to another app")} onPress={() => { setAfterSheet(() => () => void shareText(`${s.planName}, ${longDate(s.startedAt)}: ${plural(stats.setsDone, "{n} set", "{n} sets")}, ${fmtKg(stats.volume)} kg, ${stats.minutes} min. CresQ.`)); setMenu(null); }} />
            <SheetOption icon="trash" label={t("Delete workout")} danger onPress={() => setMenu("delete")} />
          </>
        ) : null}
        {menu === "delete" ? (
          <View style={{ paddingHorizontal: 8, paddingVertical: 8, gap: 8 }}>
            <Button label={t("Keep it")} variant="secondary" size="M" onPress={() => setMenu("menu")} />
            <Button label={t("Delete workout")} variant="danger" size="M" onPress={() => { const gone = s.id; setMenu(null); update((d) => ({ ...d, sessions: d.sessions.filter((x) => x.id !== gone) })); back(); }} />
          </View>
        ) : null}
      </BottomSheet>
    </Screen>
  );
}
