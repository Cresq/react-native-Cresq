import { useEffect, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import { useNav } from "@/nav";
import { useTheme } from "@/theme/ThemeProvider";
import { useDb } from "@/db/DbProvider";
import { useMe } from "@/store/me";
import { useWorkout } from "@/store/workout";
import { fmtKg, newRecords, sessionRows, sessionStats } from "@/db/derive";
import { useSocial } from "@/store/social";
import { Screen, Row, Header } from "@/components/ui/Screen";
import { Txt } from "@/components/ui/Text";
import { IconButton } from "@/components/ui/IconButton";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { PostCard } from "@/components/PostCard";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Field } from "@/components/ui/Field";
import { useT, usePlural } from "@/i18n";

/**
 * Posted. The session is filed the moment this screen opens, so leaving any
 * way at all still leaves the post standing. Undo takes it back out of the
 * feed within the minute; the session itself stays in the log either way.
 */
export default function Posted() {
  const { colors } = useTheme();
  const router = useNav();
  const t = useT();
  const plural = usePlural();
  const { followers } = useSocial();
  const { db, update } = useDb();
  const me = useMe();
  const { session, file, resume, setCaption } = useWorkout();
  // The session moves out of the store as soon as it is filed, so hold on to it.
  const [snap, setSnap] = useState(session);
  const [left, setLeft] = useState(60);
  const [editing, setEditing] = useState(false);
  const [captionText, setCaptionText] = useState(snap?.caption ?? "");
  const filed = useRef(false);
  const stats = sessionStats(snap ?? null);
  const record = snap ? newRecords(snap, db.sessions.filter((x) => x.id !== snap.id)).sort((a, b) => b.kg - a.kg)[0] : null;

  useEffect(() => {
    const t = setInterval(() => setLeft((n) => Math.max(0, n - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  // The store may still be waking up on the first render; take the session the moment it is there.
  useEffect(() => {
    if (!snap && session) setSnap(session);
  }, [snap, session]);

  // File it as soon as we have it. Everything below reads the snapshot, not the store.
  useEffect(() => {
    if (filed.current || !snap) return;
    filed.current = true;
    file(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snap]);

  /** The post is already filed, so a caption edit goes to the filed session. */
  const saveCaption = (text: string) => {
    setCaption(text);
    const id = snap?.id;
    if (id) update((d) => ({ ...d, sessions: d.sessions.map((x) => (x.id === id ? { ...x, caption: text } : x)) }));
  };
  const done = () => router.replace("/(tabs)/feed");
  const undo = () => {
    const id = snap?.id;
    if (id) update((d) => ({ ...d, sessions: d.sessions.map((x) => (x.id === id ? { ...x, shared: false } : x)) }));
    router.replace("/(tabs)");
  };

  const footer = (
    <>
      <Button
        label={t("Undo post")}
        variant="secondary"
        size="M"
        icon="reload"
        disabled={left === 0}
        onPress={undo}
        trailing={
          <Txt variant="labelS" tone="tertiary" tabular>
            {`0:${String(left).padStart(2, "0")}`}
          </Txt>
        }
      />
      <Button label={t("Done")} onPress={done} />
    </>
  );

  return (
    <Screen bottom={130} footer={footer}>
      <Header left={<IconButton name="close" onPress={done} accessibilityLabel={t("Close")} />} />
      <View style={{ alignItems: "center", gap: 12, paddingVertical: 8 }}>
        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.accent.soft, alignItems: "center", justifyContent: "center" }}>
          <Icon name="check" size={30} color={colors.accent.ember} strokeWidth={2.4} />
        </View>
        <Txt variant="displayL">{t("Posted to your feed")}</Txt>
        <Txt variant="bodyM" tone="secondary">
          {plural(followers.length, "Visible to {n} follower", "Visible to {n} followers")}
        </Txt>
      </View>

      <PostCard
        preview
        post={{
          id: "new",
          name: db.profile.name,
          title: snap?.planName ?? t("Session"),
          meta: t("just now"),
          place: snap?.gym ?? (db.profile.showCity === false ? undefined : db.profile.city || undefined),
          avatar: me.photo,
          photo: snap?.photo ? { uri: snap.photo } : undefined,
          photoHeight: 300,
          exercises: snap ? sessionRows(snap).map((r) => ({ name: r.name, detail: t(r.count === 1 ? "{n} set" : "{n} sets", { n: r.count }) })) : [],
          record: record ? t("New record, {name} {kg} kg", { name: record.name, kg: record.kg }) : undefined,
          caption: snap?.caption || t("{plan} done. Every set counted.", { plan: snap?.planName ?? t("Session") }),
          stats: [
            { value: String(stats.minutes), unit: "min" },
            { value: fmtKg(stats.volume), unit: "kg" },
            { value: String(stats.setsDone), unit: t("sets") },
          ],
          likes: 0,
          comments: 0,
        }}
      />
      <Pressable accessibilityRole="button" hitSlop={8} onPress={() => { setCaptionText(snap?.caption ?? ""); setEditing(true); }} style={{ alignSelf: "center" }}>
        <Row gap={8}>
          <Icon name="noteEdit" size={14} color={colors.text.secondary} strokeWidth={1.7} />
          <Txt variant="labelM" tone="secondary">
            {t("Edit caption")}
          </Txt>
        </Row>
      </Pressable>

      <Pressable accessibilityRole="button" hitSlop={8} onPress={() => { if (!snap) return; resume(snap.id); router.replace("/workout/active"); }} style={{ alignSelf: "center" }}>
        <Row gap={8}>
          <Icon name="play" size={14} color={colors.text.tertiary} strokeWidth={1.7} />
          <Txt variant="labelM" tone="tertiary">
            {t("Not done yet? Keep going")}
          </Txt>
        </Row>
      </Pressable>

      <BottomSheet visible={editing} onClose={() => setEditing(false)} title={t("Caption")} subtitle={t("Leave it empty and CresQ writes one from your session.")}>
        <View style={{ paddingHorizontal: 8, paddingVertical: 8, gap: 12 }}>
          <Field label={t("Caption")} value={captionText} onChangeText={setCaptionText} placeholder={t("How did it go?")} multiline autoFocus />
          <Button label={t("Save caption")} onPress={() => { saveCaption(captionText.trim()); setEditing(false); }} />
        </View>
      </BottomSheet>
    </Screen>
  );
}
