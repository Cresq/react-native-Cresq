import { useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useNav } from "@/nav";
import { useTheme } from "@/theme/ThemeProvider";
import { useDb } from "@/db/DbProvider";
import { useNow } from "@/clock";
import { DEFAULT_FAVOURITES } from "@/db/types";
import { finished, fmtKg, liftTrend, sessionStats, shortDate, startOfWeek, weeklyVolume } from "@/db/derive";
import { useT, usePlural } from "@/i18n";
import { Screen, Row, Section, Header } from "@/components/ui/Screen";
import { Txt } from "@/components/ui/Text";
import { Icon, type IconName } from "@/components/ui/Icon";
import { IconButton } from "@/components/ui/IconButton";
import { Card, Divider } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Stat, StatDivider } from "@/components/StatCard";
import { LineChart } from "@/components/LineChart";
import { BottomSheet, SheetGroup, SheetOption } from "@/components/ui/BottomSheet";

/**
 * Data. Everything the log can tell you, in one place: the week in figures,
 * one lift's trend with the others a tap away, and the two overviews that
 * answer "how much" and "for what". Home keeps only a glance at this.
 */
export default function Data() {
  const router = useNav();
  const t = useT();
  const plural = usePlural();
  const { db, update } = useDb();
  const now = useNow();
  const [managing, setManaging] = useState(false);
  const [liftId, setLiftId] = useState<string | null>(null);

  const done = useMemo(() => finished(db.sessions), [db.sessions]);
  const volume = useMemo(() => weeklyVolume(db.sessions, now, db.activeSession), [db.sessions, db.activeSession, now]);
  const week = useMemo(() => {
    const from = startOfWeek(now);
    const sessions = done.filter((s) => s.startedAt >= from);
    const live = db.activeSession && !db.activeSession.finishedAt && db.activeSession.startedAt >= from ? db.activeSession : null;
    return { sessions: sessions.length, sets: [...sessions, ...(live ? [live] : [])].reduce((n, s) => n + sessionStats(s).setsDone, 0) };
  }, [done, db.activeSession, now]);
  const goal = db.profile.daysPerWeek ?? 3;

  const favourites = db.profile.favourites ?? DEFAULT_FAVOURITES;
  const lifts = useMemo(
    () => favourites.map((id) => db.exercises.find((e) => e.id === id)).filter((e): e is NonNullable<typeof e> => !!e).map((ex) => ({ ex, points: liftTrend(db.sessions, ex.id) })),
    [favourites, db.exercises, db.sessions],
  );
  const lift = lifts.find((l) => l.ex.id === liftId) ?? lifts.find((l) => l.points.length >= 2) ?? lifts[0] ?? null;
  const current = lift && lift.points.length ? lift.points[lift.points.length - 1].value : 0;
  const delta = lift && lift.points.length ? Math.round((current - lift.points[0].value) * 2) / 2 : 0;

  const dropFavourite = (id: string) => {
    update((d) => {
      const cur = d.profile.favourites ?? DEFAULT_FAVOURITES;
      return { ...d, profile: { ...d.profile, favourites: cur.filter((x) => x !== id) } };
    });
    if (liftId === id) setLiftId(null);
  };

  return (
    <Screen>
      <Header left={<IconButton name="chevronLeft" onPress={() => router.back()} accessibilityLabel={t("Back")} />} title={t("Data")} />

      <Row gap={16} align="stretch">
        <Stat
          label={t("This week")}
          value={fmtKg(volume.current)}
          unit="kg"
          delta={volume.delta === null ? t("First week with a session") : t("{p}% on last week", { p: `${volume.delta >= 0 ? "+" : ""}${volume.delta}` })}
          deltaTone={volume.delta === null ? "tertiary" : volume.delta >= 0 ? "success" : "danger"}
          deltaIcon={volume.delta !== null && volume.delta < 0 ? "trendingDown" : "trendingUp"}
        />
        <StatDivider />
        <Stat label={t("Sessions")} value={String(week.sessions)} unit={t("of {n}", { n: goal })} />
        <StatDivider />
        <Stat label={t("Sets")} value={String(week.sets)} />
      </Row>

      <Section title={t("Your lifts")}>
        <Card padding={20} gap={12}>
          <Row gap={12}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 8 }} style={{ flex: 1, marginLeft: -20, paddingLeft: 20 }}>
              {lifts.map((l) => (
                <Chip key={l.ex.id} label={l.ex.name} selected={lift?.ex.id === l.ex.id} onPress={() => setLiftId(l.ex.id)} />
              ))}
            </ScrollView>
            <IconButton name="addPlus" size={36} iconSize={18} tone="raised" onPress={() => setManaging(true)} accessibilityLabel={t("Choose the lifts on Home")} />
          </Row>

          {lift && lift.points.length >= 2 ? (
            <View style={{ gap: 12 }}>
              <Pressable accessibilityRole="button" accessibilityLabel={t("Open {name}", { name: lift.ex.name })} onPress={() => router.push(`/progress/${lift.ex.id}`)} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
                <Row justify="space-between" align="flex-end">
                  <Txt variant="labelS" tone="tertiary">
                    {t("Estimated 1RM")}
                  </Txt>
                  <Row gap={4} align="baseline">
                    <Txt variant="numberL" tabular>
                      {current}
                    </Txt>
                    <Txt variant="labelM" tone="secondary">
                      kg
                    </Txt>
                    <Txt variant="labelS" tone={delta >= 0 ? "ember" : "danger"} style={{ paddingLeft: 4 }}>
                      {delta >= 0 ? "+" : ""}
                      {delta}
                    </Txt>
                  </Row>
                </Row>
              </Pressable>
              <LineChart points={lift.points.slice(-8)} labels={lift.points.slice(-8).map((p, i, a) => (i === a.length - 1 ? t("Now") : shortDate(p.date)))} scrubLabels={lift.points.slice(-8).map((p) => shortDate(p.date))} height={170} onPress={() => router.push(`/progress/${lift.ex.id}`)} />
            </View>
          ) : (
            <View style={{ gap: 4, paddingVertical: 8 }}>
              <Txt variant="displayM">{lift ? lift.ex.name : t("Pick your lifts")}</Txt>
              <Txt variant="bodyM" tone="secondary">
                {lift ? t("Log {name} in two sessions and its trend appears here.", { name: lift.ex.name.toLowerCase() }) : t("Add the exercises you want to follow and their trend shows here.")}
              </Txt>
            </View>
          )}
        </Card>
      </Section>

      <Section title={t("Overviews")} gap={0}>
        <DataRow icon="chartLine" label={t("Volume per week")} sub={t("Twelve weeks, a bar each")} onPress={() => router.push("/progress/volume")} />
        <Divider />
        <DataRow icon="dumbbell" label={t("Muscle groups")} sub={t("Working sets per muscle, this week and last")} onPress={() => router.push("/progress/muscles")} />
        <Divider />
        <DataRow icon="users" label={t("Compare with others")} sub={t("Your figures beside someone you follow")} onPress={() => router.push("/compare")} />
      </Section>

      <BottomSheet visible={managing} onClose={() => setManaging(false)} title={t("Lifts on Home")} subtitle={t("Tap one to take it off. Its sessions and records stay.")}>
        {lifts.length ? (
          <SheetGroup>
            {lifts.map((l) => (
              <SheetOption key={l.ex.id} icon="close" label={l.ex.name} sub={l.points.length ? plural(l.points.length, "{n} session", "{n} sessions") : t("Not logged yet")} onPress={() => dropFavourite(l.ex.id)} />
            ))}
          </SheetGroup>
        ) : null}
        <SheetGroup>
          <SheetOption icon="addPlus" label={t("Add a lift")} sub={t("From your exercise library")} onPress={() => { setManaging(false); router.push("/exercises?favourite=1"); }} />
        </SheetGroup>
      </BottomSheet>
    </Screen>
  );
}

function DataRow({ icon, label, sub, onPress }: { icon: IconName; label: string; sub: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, opacity: pressed ? 0.7 : 1 })}>
      <View style={{ width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg.raised }}>
        <Icon name={icon} size={18} color={colors.icon.strong} strokeWidth={1.9} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Txt variant="labelL">{label}</Txt>
        <Txt variant="bodyS" tone="tertiary">
          {sub}
        </Txt>
      </View>
      <Icon name="chevronRight" size={18} color={colors.text.tertiary} />
    </Pressable>
  );
}
