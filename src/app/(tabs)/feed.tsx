import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useNav } from "@/nav";
import { useDb } from "@/db/DbProvider";
import { useMe } from "@/store/me";
import { useNotes } from "@/store/notifications";
import { useTheme } from "@/theme/ThemeProvider";
import { useSocial } from "@/store/social";
import { liveProgress, personByName } from "@/data/people";
import { finished, fmtKg, newRecords, relativeDay, sessionRows, sessionStats } from "@/db/derive";
import { otherPosts } from "@/data/mock";
import { useT, useLanguage, possessive } from "@/i18n";
import { Screen, Row } from "@/components/ui/Screen";
import { Txt } from "@/components/ui/Text";
import { IconButton } from "@/components/ui/IconButton";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Avatar } from "@/components/ui/PhotoSlot";
import { BottomSheet, SheetOption } from "@/components/ui/BottomSheet";
import { PostCard, type Post } from "@/components/PostCard";
import { CommentSheet, type Comment, type CommentActions } from "@/components/CommentSheet";

/** Feed. Your own shared sessions come from the database; other people's posts are placeholders until there is a server. */
export default function Feed() {
  const router = useNav();
  const t = useT();
  const { colors } = useTheme();
  const { db, update } = useDb();
  const me = useMe();
  const { unread } = useNotes();
  const lang = useLanguage();
  const { isFollowing, people, block } = useSocial();
  const live = people.filter((p) => p.live && isFollowing(p.id) && !liveProgress(p.live).finished);
  const [filter, setFilter] = useState("following");
  const [more, setMore] = useState<Post | null>(null);
  const [hidden, setHidden] = useState<string[]>([]);
  const [reported, setReported] = useState(false);
  const [moreView, setMoreView] = useState<"menu" | "delete">("menu");
  const openMore = (p: Post) => { setMoreView("menu"); setReported(false); setMore(p); };
  const closeMore = () => { setMore(null); setReported(false); setMoreView("menu"); };
  const [commentsFor, setCommentsFor] = useState<Post | null>(null);

  /**
   * What a post already came with, plus anything written on this device. The
   * seeded ones never had ids, so they get one from their position: stable for
   * as long as the list is, which is as long as an answer needs it to be.
   */
  const commentsOf = (p: Post): Comment[] => {
    const hidden = new Set(db.hiddenComments ?? []);
    const byBlocked = (c: Comment) => {
      const who = personByName(c.name);
      return !!who && db.blocked.includes(who.id);
    };
    return [
      ...(p.commentList ?? []).map((c, i) => ({ ...c, id: `seed-${i}` })),
      ...(db.comments?.[p.id] ?? []).map((c) => ({ id: String(c.at), name: db.profile.name, text: c.text, at: c.at, replyTo: c.replyTo, avatar: me.photo })),
    ].filter((c) => !hidden.has(`${p.id}:${c.id}`) && !byBlocked(c));
  };
  /** Your own words, gone for good; anything answering them goes with them. */
  const deleteComment = (postId: string, id: string) =>
    update((d) => ({ ...d, comments: { ...(d.comments ?? {}), [postId]: (d.comments?.[postId] ?? []).filter((c) => String(c.at) !== id && c.replyTo !== id) } }));
  /** Somebody else's words, off your screen. */
  const hideComment = (postId: string, id: string) => update((d) => ({ ...d, hiddenComments: [...(d.hiddenComments ?? []), `${postId}:${id}`] }));
  /**
   * What holding a comment offers. Your own: delete. Under your own post:
   * delete anything. Somebody else's, anywhere: report it, block them.
   */
  const actionsFor = (c: Comment): CommentActions => {
    const post = commentsFor;
    if (!post) return {};
    const mine = c.name === db.profile.name && !c.id.startsWith("seed-");
    const myPost = !post.userId;
    const who = personByName(c.name);
    return {
      delete: mine ? () => deleteComment(post.id, c.id) : myPost ? () => hideComment(post.id, c.id) : undefined,
      report: mine ? undefined : () => hideComment(post.id, c.id),
      block: !mine && who ? { name: who.name.split(" ")[0], run: () => block(who.id) } : undefined,
    };
  };

  const addComment = (postId: string, text: string, replyTo?: string) =>
    update((d) => ({ ...d, comments: { ...(d.comments ?? {}), [postId]: [...(d.comments?.[postId] ?? []), { text, at: Date.now(), replyTo }] } }));

  /** A name is all a comment carries, so it is the way back to whoever wrote it. */
  const openWriter = (c: Comment) => {
    const who = personByName(c.name);
    setCommentsFor(null);
    if (who) router.push(`/user/${who.id}`);
    else if (c.name === db.profile.name) router.push("/(tabs)/profile");
  };
  // Opening the feed marks everything as seen; Home's "since you were here" starts counting again.
  useEffect(() => {
    const now = Date.now();
    const timer = setTimeout(() => update((d) => ({ ...d, profile: { ...d.profile, lastFeedSeen: now } })), 1500);
    return () => clearTimeout(timer);
  }, [update]);

  const mine = useMemo<Post[]>(
    () =>
      [...finished(db.sessions)]
        .reverse()
        .filter((s) => s.shared)
        .slice(0, 3)
        .map((s) => {
          const stats = sessionStats(s);
          const rec = newRecords(s, db.sessions.filter((x) => x.startedAt < s.startedAt)).sort((a, b) => b.kg - a.kg)[0];
          return {
            id: s.id,
            name: db.profile.name,
            title: s.planName,
            meta: relativeDay(s.startedAt),
            place: s.gym ?? (db.profile.showCity === false ? undefined : db.profile.city || undefined),
            avatar: me.photo,
            photo: s.photo ? { uri: s.photo } : undefined,
            exercises: s.share?.exercises === false ? [] : sessionRows(s).map((r) => ({ name: r.name, detail: t(r.count === 1 ? "{n} set" : "{n} sets", { n: r.count }) })),
            record: rec && s.share?.records !== false ? t("New record, {name} {kg} kg", { name: rec.name, kg: rec.kg }) : undefined,
            caption: s.caption || t("{plan} done. Every set counted.", { plan: s.planName }),
            stats: s.share?.stats === false ? [] : [
              { value: String(stats.minutes), unit: "min" },
              { value: fmtKg(stats.volume), unit: "kg" },
              { value: String(stats.setsDone), unit: t("sets") },
            ],
            // Nobody has liked this. Inventing a number on a person's own post is
            // the sort of thing that makes an app feel like a demo, and it is a lie.
            likes: 0,
            liked: false,
            comments: 0,
          };
        }),
    [db.sessions, db.profile, me.photo, t],
  );
  const visible = (filter === "following" ? [...mine, ...otherPosts.filter((p) => p.userId && isFollowing(p.userId))] : otherPosts.filter((p) => !p.userId || !isFollowing(p.userId))).filter((p) => !hidden.includes(p.id));
  const open = (p: Post) => router.push(`/workout/${p.id}`);

  return (
    <Screen tabs>
      <View style={{ gap: 16 }}>
        <Row gap={12}>
          <Txt variant="displayXL" style={{ flex: 1 }}>
            {t("Feed")}
          </Txt>
          <IconButton name="search" onPress={() => router.push("/search")} accessibilityLabel={t("Find people")} />
          <IconButton name="bell" badge={unread > 0} onPress={() => router.push("/notifications")} accessibilityLabel={t("Notifications")} />
        </Row>
        <Row gap={8}>
          <Chip label={t("Following")} selected={filter === "following"} onPress={() => setFilter("following")} />
          <Chip label={t("Discover")} selected={filter === "discover"} onPress={() => setFilter("discover")} />
        </Row>
      </View>

      {live.length ? (
        <View style={{ gap: 12 }}>
          <Txt variant="labelS" tone="tertiary">
            {t("Training right now")}
          </Txt>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 16, paddingRight: 20 }} style={{ marginHorizontal: -20, paddingHorizontal: 20 }}>
            {live.map((p) => {
              const prog = liveProgress(p.live!);
              return (
                <Pressable key={p.id} accessibilityRole="button" accessibilityLabel={t("{name} is training now", { name: p.name })} onPress={() => router.push(`/live/${p.id}`)} style={({ pressed }) => ({ alignItems: "center", gap: 8, width: 72, opacity: pressed ? 0.7 : 1 })}>
                  <View style={{ padding: 3, borderRadius: 32, borderWidth: 2, borderColor: colors.status.danger }}>
                    <Avatar source={p.avatar} size={50} initial={p.name[0]} />
                  </View>
                  <Txt variant="labelS" numberOfLines={1}>
                    {p.name.split(" ")[0]}
                  </Txt>
                  <Txt variant="labelS" tone="tertiary" numberOfLines={1}>
                    {p.live!.planName}, {prog.done}/{prog.total}
                  </Txt>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      <View style={{ gap: 20 }}>
        {visible.map((p) => (
          <PostCard key={p.id} post={p} onPress={() => open(p)} onMore={() => openMore(p)} onComment={() => setCommentsFor(p)} />
        ))}
        {visible.length === 0 ? (
          <Txt variant="bodyM" tone="secondary">
            {filter === "following" ? t("Follow a few people and their sessions show up here.") : t("Nothing new to discover right now.")}
          </Txt>
        ) : null}
      </View>

      <CommentSheet
        visible={!!commentsFor}
        onClose={() => setCommentsFor(null)}
        title={commentsFor ? [commentsFor.name, commentsFor.title].filter(Boolean).join(", ") : undefined}
        comments={commentsFor ? commentsOf(commentsFor) : []}
        me={{ initial: me.initial, name: db.profile.name, photo: me.photo }}
        onSend={(text, replyTo) => commentsFor && addComment(commentsFor.id, text, replyTo)}
        onOpenProfile={openWriter}
        actionsFor={actionsFor}
      />

      <BottomSheet
        visible={!!more}
        onClose={closeMore}
        title={reported ? t("Hidden and noted") : moreView === "delete" ? t("Delete this workout?") : more ? t("{whose} workout", { whose: possessive(lang, more.name) }) : ""}
        subtitle={reported ? t("The post is hidden from your feed. Reports reach us once accounts sync; until then nothing leaves this phone.") : moreView === "delete" ? t("It disappears from the feed and from your log. Records from it are recalculated. This cannot be undone.") : undefined}
      >
        {!reported && more && moreView === "delete" ? (
          <View style={{ paddingHorizontal: 8, paddingVertical: 8, gap: 8 }}>
            <Button label={t("Keep it")} variant="secondary" size="M" onPress={() => setMoreView("menu")} />
            <Button label={t("Delete workout")} variant="danger" size="M" onPress={() => { const id = more.id; closeMore(); update((d) => ({ ...d, sessions: d.sessions.filter((x) => x.id !== id) })); }} />
          </View>
        ) : null}
        {reported ? (
          <View style={{ paddingHorizontal: 8, paddingVertical: 8 }}>
            <Button label={t("Done")} variant="secondary" size="M" onPress={closeMore} />
          </View>
        ) : moreView !== "menu" ? null : more?.userId ? (
          <>
            <SheetOption icon="close" label={t("Hide this post")} sub={t("Only from your feed")} onPress={() => { setHidden((h) => [...h, more.id]); closeMore(); }} />
            <SheetOption icon="flag" label={t("Report post")} sub={t("Spam or abuse")} danger onPress={() => { setHidden((h) => (h.includes(more.id) ? h : [...h, more.id])); setReported(true); }} />
          </>
        ) : more ? (
          <>
            <SheetOption icon="sliders" label={t("Edit workout")} sub={t("Caption, sets, weights, duration, exercises")} onPress={() => { const id = more.id; closeMore(); router.push(`/workout/edit/${id}`); }} />
            <SheetOption icon="lock" label={t("Make private")} sub={t("Removes it from the feed, keeps it in your log")} onPress={() => { const id = more.id; update((d) => ({ ...d, sessions: d.sessions.map((s) => (s.id === id ? { ...s, shared: false } : s)) })); closeMore(); }} />
            <SheetOption icon="trash" label={t("Delete workout")} sub={t("Gone from the feed and from your log")} danger onPress={() => setMoreView("delete")} />
          </>
        ) : null}
      </BottomSheet>

    </Screen>
  );
}
