import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "@/theme/ThemeProvider";
import { useDb } from "@/db/DbProvider";
import { useWorkout } from "@/store/workout";
import { fmtKg, newRecords, sessionRows, sessionStats } from "@/db/derive";
import { photos } from "@/data/mock";
import { useSocial } from "@/store/social";
import { Screen, Row, Header } from "@/components/ui/Screen";
import { Txt } from "@/components/ui/Text";
import { IconButton } from "@/components/ui/IconButton";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { PostCard } from "@/components/PostCard";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Field } from "@/components/ui/Field";
import { useT } from "@/i18n";

/** Posted. The session is filed as shared when you leave; Undo returns to the summary with nothing filed yet. */
export default function Posted() {
  const { colors } = useTheme();
  const router = useRouter();
  const t = useT();
  const { followers } = useSocial();
  const { db } = useDb();
  const { session, file, setCaption } = useWorkout();
  const [left, setLeft] = useState(60);
  const [editing, setEditing] = useState(false);
  const [captionText, setCaptionText] = useState(session?.caption ?? "");
  const stats = sessionStats(session);
  const record = session ? newRecords(session, db.sessions).sort((a, b) => b.kg - a.kg)[0] : null;

  useEffect(() => {
    const t = setInterval(() => setLeft((n) => Math.max(0, n - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  const done = () => {
    file(true);
    router.replace("/(tabs)/feed");
  };

  const footer = (
    <>
      <Button
        label={t("Undo post")}
        variant="secondary"
        size="M"
        icon="reload"
        disabled={left === 0}
        onPress={() => router.replace("/workout/summary")}
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
      <View style={{ alignItems: "center", gap: 10, paddingVertical: 8 }}>
        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.accent.soft, alignItems: "center", justifyContent: "center" }}>
          <Icon name="check" size={30} color={colors.accent.ember} strokeWidth={2.4} />
        </View>
        <Txt variant="displayL">{t("Posted to your feed")}</Txt>
        <Txt variant="bodyM" tone="secondary">
          {t("Visible to {n} followers", { n: followers.length })}
        </Txt>
      </View>

      <PostCard
        preview
        post={{
          id: "new",
          name: db.profile.name,
          meta: `${session?.planName ?? t("Session")}, ${t("just now")}, ${db.profile.city}`,
          avatar: photos.selfie,
          photo: session?.photo ? { uri: session.photo } : undefined,
          photoHeight: 300,
          exercises: session ? sessionRows(session).map((r) => ({ name: r.name, detail: t(r.count === 1 ? "{n} set" : "{n} sets", { n: r.count }) })) : [],
          record: record ? t("New record, {name} {kg} kg", { name: record.name, kg: record.kg }) : undefined,
          caption: session?.caption || t("{plan} done. Every set counted.", { plan: session?.planName ?? t("Session") }),
          stats: [
            { value: String(stats.minutes), unit: "min" },
            { value: fmtKg(stats.volume), unit: "kg" },
            { value: String(stats.setsDone), unit: t("sets") },
          ],
          likes: 0,
          comments: 0,
        }}
      />
      <Pressable accessibilityRole="button" hitSlop={8} onPress={() => { setCaptionText(session?.caption ?? ""); setEditing(true); }} style={{ alignSelf: "center" }}>
        <Row gap={6}>
          <Icon name="noteEdit" size={14} color={colors.text.secondary} strokeWidth={1.7} />
          <Txt variant="labelM" tone="secondary">
            {t("Edit caption")}
          </Txt>
        </Row>
      </Pressable>

      <BottomSheet visible={editing} onClose={() => setEditing(false)} title={t("Caption")} subtitle={t("Leave it empty and CresQ writes one from your session.")}>
        <View style={{ paddingHorizontal: 8, paddingVertical: 8, gap: 10 }}>
          <Field label={t("Caption")} value={captionText} onChangeText={setCaptionText} placeholder={t("How did it go?")} multiline autoFocus />
          <Button label={t("Save caption")} onPress={() => { setCaption(captionText.trim()); setEditing(false); }} />
        </View>
      </BottomSheet>
    </Screen>
  );
}
