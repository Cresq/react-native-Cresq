import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { useDb } from "@/db/DbProvider";
import { useTheme } from "@/theme/ThemeProvider";
import { useSocial } from "@/store/social";
import { liveProgress } from "@/data/people";
import { finished, fmtKg, newRecords, relativeDay, sessionRows, sessionStats } from "@/db/derive";
import { otherPosts, photos } from "@/data/mock";
import { useT } from "@/i18n";
import { Screen, Row } from "@/components/ui/Screen";
import { Txt } from "@/components/ui/Text";
import { IconButton } from "@/components/ui/IconButton";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Avatar } from "@/components/ui/PhotoSlot";
import { BottomSheet, SheetOption } from "@/components/ui/BottomSheet";
import { PostCard, type Post } from "@/components/PostCard";
import { Field } from "@/components/ui/Field";

/** Placeholder replies on the mock posts, so the sheet is not empty on day one. */
const seedComments = (p: Post): { name: string; text: string }[] => (p.userId === "u2" ? [{ name: "Tom Bakker", text: "Pause squats at 90, strong." }, { name: "Nick Li", text: "That bar speed though." }] : p.userId === "u3" ? [{ name: "Sara de Vries", text: "Forearms will forgive you by Thursday." }] : []);

/** Feed. Your own shared sessions come from the database; other people's posts are placeholders until there is a server. */
export default function Feed() {
  const router = useRouter();
  const t = useT();
  const { colors } = useTheme();
  const { db, update } = useDb();
  const { isFollowing, people } = useSocial();
  const live = people.filter((p) => p.live && isFollowing(p.id) && !liveProgress(p.live).finished);
  const [filter, setFilter] = useState("following");
  const [more, setMore] = useState<Post | null>(null);
  const [hidden, setHidden] = useState<string[]>([]);
  const [reported, setReported] = useState(false);
  const [commentsFor, setCommentsFor] = useState<Post | null>(null);
  const [comments, setComments] = useState<Record<string, { name: string; text: string }[]>>({});
  const [draft, setDraft] = useState("");
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
            meta: `${s.planName}, ${relativeDay(s.startedAt)}${db.profile.showCity === false ? "" : `, ${db.profile.city}`}`,
            avatar: photos.selfie,
            photo: s.photo ? { uri: s.photo } : undefined,
            exercises: sessionRows(s).map((r) => ({ name: r.name, detail: t(r.count === 1 ? "{n} set" : "{n} sets", { n: r.count }) })),
            record: rec ? t("New record, {name} {kg} kg", { name: rec.name, kg: rec.kg }) : undefined,
            caption: s.caption || (rec ? `${rec.name} ${rec.kg} kg. ${rec.previous ? t("Up {kg} kg.", { kg: Math.round((rec.kg - rec.previous) * 10) / 10 }) : t("First logged best.")}` : t("{plan} done. Every set counted.", { plan: s.planName })),
            stats: [
              { value: String(stats.minutes), unit: "min" },
              { value: fmtKg(stats.volume), unit: "kg" },
              { value: String(stats.setsDone), unit: t("sets") },
            ],
            likes: rec ? 24 : 9,
            liked: true,
            comments: rec ? 6 : 2,
          };
        }),
    [db.sessions, db.profile, t],
  );
  const visible = (filter === "following" ? [...mine, ...otherPosts.filter((p) => p.userId && isFollowing(p.userId))] : otherPosts.filter((p) => !p.userId || !isFollowing(p.userId))).filter((p) => !hidden.includes(p.id));
  const open = (p: Post) => router.push(`/workout/${p.id}`);

  return (
    <Screen tabs>
      <View style={{ gap: 16 }}>
        <Row gap={10}>
          <Txt variant="displayXL" style={{ flex: 1 }}>
            {t("Feed")}
          </Txt>
          <IconButton name="search" onPress={() => router.push("/search")} accessibilityLabel={t("Find people")} />
          <IconButton name="bell" badge onPress={() => router.push("/notifications")} accessibilityLabel={t("Notifications")} />
        </Row>
        <Row gap={8}>
          <Chip label={t("Following")} selected={filter === "following"} onPress={() => setFilter("following")} />
          <Chip label={t("Discover")} selected={filter === "discover"} onPress={() => setFilter("discover")} />
        </Row>
      </View>

      {live.length ? (
        <View style={{ gap: 10 }}>
          <Txt variant="labelS" tone="tertiary">
            {t("Training right now")}
          </Txt>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 18, paddingRight: 20 }} style={{ marginHorizontal: -20, paddingHorizontal: 20 }}>
            {live.map((p) => {
              const prog = liveProgress(p.live!);
              return (
                <Pressable key={p.id} accessibilityRole="button" accessibilityLabel={t("{name} is training now", { name: p.name })} onPress={() => router.push(`/live/${p.id}`)} style={({ pressed }) => ({ alignItems: "center", gap: 6, width: 72, opacity: pressed ? 0.7 : 1 })}>
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
          <PostCard key={p.id} post={p} onPress={() => open(p)} onMore={() => setMore(p)} onComment={() => setCommentsFor(p)} />
        ))}
        {visible.length === 0 ? (
          <Txt variant="bodyM" tone="secondary">
            {filter === "following" ? t("Follow a few people and their sessions show up here.") : t("Nothing new to discover right now.")}
          </Txt>
        ) : null}
      </View>

      <BottomSheet visible={!!commentsFor} onClose={() => { setCommentsFor(null); setDraft(""); }} title={t("Comments")} subtitle={commentsFor ? `${commentsFor.name}, ${commentsFor.meta}` : undefined}>
        {commentsFor ? (
          <View style={{ paddingHorizontal: 8, paddingVertical: 8, gap: 12 }}>
            {[...seedComments(commentsFor), ...(comments[commentsFor.id] ?? [])].map((c, i) => (
              <View key={i} style={{ gap: 2 }}>
                <Txt variant="labelM">{c.name}</Txt>
                <Txt variant="bodyM" tone="secondary">
                  {c.text}
                </Txt>
              </View>
            ))}
            {seedComments(commentsFor).length + (comments[commentsFor.id]?.length ?? 0) === 0 ? (
              <Txt variant="bodyM" tone="tertiary">
                {t("No comments yet. Say something.")}
              </Txt>
            ) : null}
            <Row gap={8}>
              <View style={{ flex: 1 }}>
                <Field label={t("Comment")} value={draft} onChangeText={setDraft} placeholder={t("Nice work")} />
              </View>
              <Button label={t("Post")} size="M" full={false} disabled={!draft.trim()} onPress={() => { const id = commentsFor.id; setComments((c) => ({ ...c, [id]: [...(c[id] ?? []), { name: db.profile.name, text: draft.trim() }] })); setDraft(""); }} />
            </Row>
            <Txt variant="labelS" tone="tertiary">
              {t("Comments stay on this device until accounts sync.")}
            </Txt>
          </View>
        ) : null}
      </BottomSheet>

      <BottomSheet visible={!!more} onClose={() => { setMore(null); setReported(false); }} title={reported ? t("Thanks, we got it") : (more?.name ?? "")} subtitle={reported ? t("We look at every report within two days.") : undefined}>
        {reported ? (
          <View style={{ paddingHorizontal: 8, paddingVertical: 8 }}>
            <Button label={t("Done")} variant="secondary" size="M" onPress={() => { setMore(null); setReported(false); }} />
          </View>
        ) : more?.userId ? (
          <>
            <SheetOption icon="user" label={t("View profile")} onPress={() => { const id = more.userId!; setMore(null); router.push(`/user/${id}`); }} />
            <SheetOption icon="close" label={t("Hide this post")} sub={t("Only from your feed")} onPress={() => { setHidden((h) => [...h, more.id]); setMore(null); }} />
            <SheetOption icon="flag" label={t("Report post")} sub={t("Spam or abuse")} danger onPress={() => setReported(true)} />
          </>
        ) : more ? (
          <>
            <SheetOption icon="rows" label={t("Open session")} onPress={() => { const id = more.id; setMore(null); router.push(`/workout/${id}`); }} />
            <SheetOption icon="lock" label={t("Make private")} sub={t("Removes it from the feed, keeps it in your log")} onPress={() => { const id = more.id; update((d) => ({ ...d, sessions: d.sessions.map((s) => (s.id === id ? { ...s, shared: false } : s)) })); setMore(null); }} />
          </>
        ) : null}
      </BottomSheet>
    </Screen>
  );
}
