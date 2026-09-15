import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "@/theme/ThemeProvider";
import { useDb } from "@/db/DbProvider";
import { useWorkout } from "@/store/workout";
import { compareToLast, fmtKg, longDate, newRecords, sessionStats, shortDate } from "@/db/derive";
import { Screen, Row, Header, Section } from "@/components/ui/Screen";
import { Txt } from "@/components/ui/Text";
import { IconButton } from "@/components/ui/IconButton";
import { Divider } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { Field } from "@/components/ui/Field";
import { Toggle } from "@/components/ui/Toggle";
import type { SharePrefs } from "@/db/types";
import { Stat, StatDivider } from "@/components/StatCard";
import { PhotoSlot } from "@/components/ui/PhotoSlot";
import { BottomSheet, SheetOption } from "@/components/ui/BottomSheet";
import { pickPhoto } from "@/photo";
import { useT } from "@/i18n";

/**
 * Session complete. The hero is typographic: the record, or the plain fact
 * that the session counted. Figures follow; then two chapters, the
 * exercises against last time and the heart-rate data. Actions are pinned.
 */
export default function Summary() {
  const { colors } = useTheme();
  const router = useRouter();
  const t = useT();
  const { db } = useDb();
  const { session, file, setPhoto, setCaption, setShare, setGym } = useWorkout();
  const [gymSheet, setGymSheet] = useState(false);
  const [gymText, setGymText] = useState("");
  const gyms = db.profile.gyms ?? [];
  const share: SharePrefs = session?.share ?? { exercises: true, stats: true, records: true };
  const flip = (key: keyof SharePrefs) => setShare({ ...share, [key]: !share[key] });
  const [photoSheet, setPhotoSheet] = useState(false);
  const choose = async (source: "library" | "camera") => {
    setPhotoSheet(false);
    const uri = await pickPhoto(source);
    if (uri) setPhoto(uri);
  };
  const [tab, setTab] = useState("exercises");
  const stats = sessionStats(session);
  const recs = useMemo(() => (session ? newRecords(session, db.sessions).sort((a, b) => b.kg - a.kg) : []), [session, db.sessions]);
  const record = recs[0] ?? null;
  const cmp = useMemo(() => (session ? compareToLast(session, db.sessions) : { previous: null, rows: [] }), [session, db.sessions]);

  const savePrivately = () => {
    file(false);
    router.replace("/(tabs)");
  };
  const viewSession = () => {
    const id = session?.id;
    file(false);
    router.replace(id ? `/workout/${id}` : "/(tabs)");
  };

  const footer = (
    <>
      <Button label={t("Share to feed")} icon="share" onPress={() => router.replace("/workout/posted")} />
      <Row gap={12}>
        <Button label={t("Save privately")} variant="secondary" size="M" icon="lock" onPress={savePrivately} style={{ flex: 1 }} />
        <Button label={t("View session")} variant="tertiary" size="M" iconRight="chevronRight" onPress={viewSession} style={{ flex: 1 }} />
      </Row>
      <Txt variant="labelS" tone="tertiary" align="center">
        {t("Shared posts go to your followers. Undo within 60 seconds.")}
      </Txt>
    </>
  );

  return (
    <Screen bottom={170} footer={footer}>
      <Header left={<IconButton name="close" onPress={savePrivately} accessibilityLabel={t("Close")} />} title={t("Session complete")} subtitle={`${session?.planName ?? t("Session")}, ${longDate(session?.startedAt ?? Date.now())}`} />

      <View style={{ gap: 12, paddingTop: 8 }}>
        {record ? (
          <>
            <Chip label={recs.length > 1 ? t("{n} new personal records", { n: recs.length }) : t("New personal record")} icon="trophy" tone="gold" size="S" style={{ alignSelf: "flex-start" }} />
            <Txt variant="displayXL">
              {record.name} {record.kg} kg
            </Txt>
            <Txt variant="bodyM" tone="secondary">
              {t("{reps} reps at {kg} kg", { reps: record.reps, kg: record.kg })}
              {record.previous ? t(", up {kg} kg on your previous best.", { kg: Math.round((record.kg - record.previous) * 10) / 10 }) : t(", your first logged best for this lift.")}
              {recs.length > 1 ? ` ${t("Also {list}.", { list: recs.slice(1).map((r) => `${r.name.toLowerCase()} ${r.kg} kg`).join(", ") })}` : ""}
            </Txt>
          </>
        ) : (
          <>
            <Txt variant="displayXL">{t("Logged and counted")}</Txt>
            <Txt variant="bodyM" tone="secondary">
              {t("Every set is in your history. Your estimates update from this session.")}
            </Txt>
          </>
        )}
      </View>

      <View>
      <Row gap={12} align="stretch">
        <Stat label={t("Duration")} value={String(stats.minutes)} unit="min" />
        <StatDivider />
        <Stat label={t("Volume")} value={fmtKg(stats.volume)} unit="kg" />
        <StatDivider />
        <Stat label={t("Sets")} value={String(stats.setsDone)} unit={t("of {n}", { n: stats.setsTotal })} />
      </Row>
      </View>

      <Section title={t("Your post")} gap={12}>
        {session?.photo ? (
          <View style={{ gap: 12 }}>
            <PhotoSlot source={{ uri: session.photo }} height={300} radius={18} />
            <Row gap={12}>
              <Button label={t("Change photo")} variant="secondary" size="S" full={false} icon="camera" onPress={() => setPhotoSheet(true)} />
              <Button label={t("Remove")} variant="tertiary" size="S" full={false} onPress={() => setPhoto(null)} />
            </Row>
          </View>
        ) : (
          <Pressable accessibilityRole="button" accessibilityLabel={t("Add a photo")} onPress={() => setPhotoSheet(true)} style={({ pressed }) => ({ height: 150, borderRadius: 18, borderWidth: 1.5, borderStyle: "dashed", borderColor: colors.accent.ember, backgroundColor: pressed ? colors.accent.soft : colors.bg.surface, alignItems: "center", justifyContent: "center", gap: 8 })}>
            <View style={{ width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: colors.accent.ember }}>
              <Icon name="camera" size={22} color={colors.accent.on} strokeWidth={2} />
            </View>
            <Txt variant="labelL">{t("Add a photo")}</Txt>
            <Txt variant="bodyS" tone="tertiary">
              {t("Goes on your post and in your log")}
            </Txt>
          </Pressable>
        )}
        <Field label={t("Caption")} value={session?.caption ?? ""} onChangeText={setCaption} placeholder={t("How did it go?")} multiline />
        <Pressable accessibilityRole="button" accessibilityLabel={t("Where did you train?")} onPress={() => { setGymText(session?.gym ?? ""); setGymSheet(true); }} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 12, opacity: pressed ? 0.7 : 1 })}>
          <Icon name="mapPin" size={16} color={session?.gym ? colors.accent.ember : colors.text.tertiary} strokeWidth={1.9} />
          <Txt variant="labelL" tone={session?.gym ? "primary" : "tertiary"} style={{ flex: 1 }}>
            {session?.gym || t("Add the gym")}
          </Txt>
          <Icon name="chevronRight" size={16} color={colors.text.tertiary} strokeWidth={2} />
        </Pressable>
        <View>
          <Txt variant="labelS" tone="tertiary" style={{ paddingBottom: 4 }}>
            {t("What your post shows")}
          </Txt>
          <ShareRow label={t("Exercises and sets")} value={share.exercises} onChange={() => flip("exercises")} />
          <Divider />
          <ShareRow label={t("Duration, volume and set count")} value={share.stats} onChange={() => flip("stats")} />
          <Divider />
          <ShareRow label={t("New records")} value={share.records} onChange={() => flip("records")} />
        </View>
      </Section>

      <BottomSheet visible={gymSheet} onClose={() => setGymSheet(false)} title={t("Where did you train?")} subtitle={t("It shows with a pin on your post. Your gyms are remembered for next time.")}>
        <View style={{ paddingHorizontal: 8, paddingVertical: 8, gap: 12 }}>
          <Field label={t("Gym")} value={gymText} onChangeText={setGymText} placeholder={t("Name of the gym")} autoFocus />
          {gyms.length ? (
            <View style={{ gap: 8 }}>
              <Txt variant="labelS" tone="tertiary">
                {t("Places you train")}
              </Txt>
              <Row gap={8} style={{ flexWrap: "wrap" }}>
                {gyms.map((g) => (
                  <Chip key={g} label={g} selected={gymText === g} onPress={() => setGymText(g)} />
                ))}
              </Row>
            </View>
          ) : null}
          <Button label={gymText.trim() ? t("Save") : t("Leave it out")} onPress={() => { setGym(gymText); setGymSheet(false); }} />
        </View>
      </BottomSheet>

      <BottomSheet visible={photoSheet} onClose={() => setPhotoSheet(false)} title={t("Add a photo")} subtitle={t("It goes on this session, and on your post if you share it.")}>
        <SheetOption icon="camera" label={t("Take a photo")} onPress={() => choose("camera")} />
        <SheetOption icon="rows" label={t("Choose from library")} onPress={() => choose("library")} />
      </BottomSheet>

      <View style={{ gap: 4 }}>
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { key: "exercises", label: t("Exercises"), count: cmp.rows.length },
            { key: "heart", label: t("Heart rate") },
          ]}
        />

        {tab === "exercises" ? (
          <View>
            <Txt variant="labelS" tone="tertiary" style={{ paddingTop: 12, paddingBottom: 4 }}>
              {cmp.previous ? `${t("Compared to last {plan}", { plan: session?.planName ?? "" })}, ${shortDate(cmp.previous.startedAt)}` : t("First session of its kind, nothing to compare yet")}
            </Txt>
            {cmp.rows.map((r, i) => (
              <View key={r.name + i}>
                {i > 0 ? <Divider /> : null}
                <Row style={{ paddingVertical: 12 }}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Txt variant="labelL">{r.name}</Txt>
                    <Txt variant="bodyS" tone="tertiary">
                      {t(r.detail)}
                    </Txt>
                  </View>
                  <Chip label={t(r.delta)} icon={r.tone === "ember" ? "trendingUp" : undefined} tone={r.tone} size="S" />
                </Row>
              </View>
            ))}
          </View>
        ) : (
          <View style={{ gap: 16, paddingTop: 16 }}>
            <Row gap={16} align="stretch">
              <HR icon="heart" label={t("Average")} value="126" unit="bpm" color={colors.status.danger} />
              <HR icon="pulse" label={t("Max")} value="158" unit="bpm" color={colors.text.secondary} />
              <HR icon="flame" label={t("Energy")} value="412" unit="kcal" color={colors.accent.ember} />
            </Row>
            <View style={{ gap: 8 }}>
              <Row gap={4}>
                {(
                  [
                    [4, colors.border.strong],
                    [12, colors.fuel.sage],
                    [28, colors.accent.ember],
                    [9, colors.status.warning],
                    [1, colors.status.danger],
                  ] as const
                ).map(([minutes, color], i) => (
                  <View key={i} style={{ flex: minutes, height: 6, borderRadius: 3, backgroundColor: color, minWidth: 6 }} />
                ))}
              </Row>
              <Txt variant="labelS" tone="tertiary">
                {t("Minutes per zone, easy to hard.")}
              </Txt>
            </View>
            <Row gap={8}>
              <Icon name="watch" size={13} color={colors.text.tertiary} strokeWidth={1.8} />
              <Txt variant="labelS" tone="tertiary">
                {t("Sample data until a watch is connected.")}
              </Txt>
            </Row>
          </View>
        )}
      </View>
    </Screen>
  );
}

function ShareRow({ label, value, onChange }: { label: string; value: boolean; onChange: () => void }) {
  return (
    <Row gap={12} style={{ paddingVertical: 12 }}>
      <Txt variant="labelL" style={{ flex: 1 }}>
        {label}
      </Txt>
      <Toggle value={value} onChange={onChange} />
    </Row>
  );
}

function HR({ icon, label, value, unit, color }: { icon: "heart" | "pulse" | "flame"; label: string; value: string; unit: string; color: string }) {
  return (
    <View style={{ flex: 1, gap: 4 }}>
      <Row gap={4}>
        <Icon name={icon} size={12} color={color} strokeWidth={2.2} />
        <Txt variant="labelS" tone="tertiary">
          {label}
        </Txt>
      </Row>
      <Row gap={4} align="baseline">
        <Txt variant="numberM" tabular>
          {value}
        </Txt>
        <Txt variant="labelS" tone="secondary">
          {unit}
        </Txt>
      </Row>
    </View>
  );
}
