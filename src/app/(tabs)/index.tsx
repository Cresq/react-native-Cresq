import { useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "@/theme/ThemeProvider";
import { useDb } from "@/db/DbProvider";
import { useWorkout } from "@/store/workout";
import { useSplit } from "@/store/split";
import { finished, fmtKg, forecast, liftTrend, relativeDay, shortDate, weekDays, weeklyVolume } from "@/db/derive";
import { estimateMinutes } from "@/db/seed";
import { photos } from "@/data/mock";
import { Screen, Row, Section } from "@/components/ui/Screen";
import { Txt } from "@/components/ui/Text";
import { Icon } from "@/components/ui/Icon";
import { IconButton } from "@/components/ui/IconButton";
import { Avatar } from "@/components/ui/PhotoSlot";
import { Segmented } from "@/components/ui/Segmented";
import { WeekStrip } from "@/components/WeekStrip";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { Stat, StatDivider } from "@/components/StatCard";
import { LineChart } from "@/components/LineChart";

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Morning" : h < 18 ? "Afternoon" : "Evening";
};
const MAIN_LIFTS = ["bench", "squat", "deadlift", "ohp"];

/**
 * Home. One anchor: the next session from your split. Below it, this week's
 * figures and the lifts, all computed from what you have logged.
 */
export default function Home() {
  const { colors } = useTheme();
  const router = useRouter();
  const { db } = useDb();
  const { session, start } = useWorkout();
  const { split, nextDay } = useSplit();
  const [mode, setMode] = useState("gym");

  const plan = db.plans.find((p) => p.id === nextDay?.planId);
  const running = !!session && !session.finishedAt;
  const done = useMemo(() => finished(db.sessions), [db.sessions]);
  const week = useMemo(() => weekDays(db.sessions), [db.sessions]);
  const volume = useMemo(() => weeklyVolume(db.sessions), [db.sessions]);
  const lastSame = [...done].reverse().find((s) => s.planName === (plan?.name ?? nextDay?.name));

  const lifts = useMemo(
    () => db.exercises.map((ex) => ({ ex, points: liftTrend(db.sessions, ex.id) })).filter((l) => l.points.length >= 2).sort((a, b) => (MAIN_LIFTS.indexOf(a.ex.id) + 1 || 99) - (MAIN_LIFTS.indexOf(b.ex.id) + 1 || 99) || b.points.length - a.points.length),
    [db.exercises, db.sessions],
  );
  const [liftId, setLiftId] = useState<string | null>(null);
  const lift = lifts.find((l) => l.ex.id === liftId) ?? lifts[0];
  const liftFc = lift ? forecast(lift.points) : null;
  const nextRecord = useMemo(() => {
    const cands = lifts.filter((l) => MAIN_LIFTS.includes(l.ex.id)).map((l) => ({ l, fc: forecast(l.points) })).filter((c) => c.fc && c.fc.weeksToTarget !== null);
    cands.sort((a, b) => (a.fc!.weeksToTarget ?? 99) - (b.fc!.weeksToTarget ?? 99));
    return cands[0] ?? null;
  }, [lifts]);

  const startSession = () => {
    if (!running) start(plan?.id, nextDay?.name);
    router.push("/workout/active");
  };
  const names = plan ? plan.exercises.map((pe) => db.exercises.find((e) => e.id === pe.exerciseId)?.name.toLowerCase() ?? "") : [];
  const three = names.slice(0, 3).join(", ");
  const title = plan ? (three.length <= 34 ? three : `${names.slice(0, 2).join(", ")} +${names.length - 2} more`) : (nextDay?.focus ?? "Quick session");

  return (
    <Screen tabs>
      <Row gap={12}>
        <Avatar source={photos.selfie} size={44} />
        <View style={{ flex: 1, gap: 2 }}>
          <Txt variant="labelS" tone="tertiary">
            {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
          </Txt>
          <Txt variant="displayXL">
            {greeting()}, {db.profile.first}
          </Txt>
        </View>
        <IconButton name="bell" badge onPress={() => router.push("/notifications")} accessibilityLabel="Notifications" />
      </Row>

      <Segmented
        value={mode}
        onChange={setMode}
        segments={[
          { key: "gym", label: "Gym", icon: "dumbbell", color: "ember" },
          { key: "food", label: "Food", icon: "leaf", color: "sage" },
        ]}
      />

      {mode === "food" ? (
        <View style={{ gap: 6, paddingVertical: 8 }}>
          <Txt variant="displayM">Food is on its way</Txt>
          <Txt variant="bodyM" tone="secondary">
            Calories, macros and meals will live here, using the energy your sessions burn.
          </Txt>
        </View>
      ) : (
        <>
          <View style={{ gap: 20 }}>
            <WeekStrip days={week} />

            <Card padding={20} gap={14}>
              <Txt variant="labelM" tone={running ? "ember" : "tertiary"}>
                {running ? `Session running · ${session?.planName}` : `Today · ${nextDay?.name ?? "Session"} · day ${split.nextIndex + 1} of ${split.days.length}`}
              </Txt>
              <Txt variant="displayL" style={{ textTransform: "none" }}>
                {running ? session?.exercises.slice(0, 3).map((e) => e.name.toLowerCase()).join(", ") : title.charAt(0).toUpperCase() + title.slice(1)}
              </Txt>
              <Row gap={16}>
                {plan ? <Meta icon="calendar" text={`${plan.exercises.length} exercises`} /> : null}
                {plan ? <Meta icon="clock" text={`${estimateMinutes(plan)} min`} /> : null}
                {lastSame ? <Meta icon="trendingUp" text={`Last ${relativeDay(lastSame.startedAt)}`} /> : <Meta icon="star" text="First time" />}
              </Row>
              <Button label={running ? "Continue session" : nextDay?.rest ? "Rest day · start anyway" : "Start session"} iconRight="arrowRight" onPress={startSession} style={{ marginTop: 4 }} />
            </Card>
          </View>

          <Row gap={16} align="stretch">
            <Stat label="This week" value={fmtKg(volume.current)} unit="kg" delta={volume.delta === null ? "No sessions last week" : `${volume.delta >= 0 ? "+" : ""}${volume.delta}% on last week`} deltaTone={volume.delta === null ? "tertiary" : volume.delta >= 0 ? "ember" : "warning"} />
            <StatDivider />
            {nextRecord ? (
              <Stat label="Next record" value={String(nextRecord.fc!.target)} unit={`kg ${nextRecord.l.ex.name.split(" ")[0].toLowerCase()}`} delta={`Likely in ${nextRecord.fc!.weeksToTarget} week${nextRecord.fc!.weeksToTarget === 1 ? "" : "s"}`} deltaTone="sage" deltaIcon="star" />
            ) : (
              <Stat label="Next record" value="—" delta="Log a few sessions first" deltaTone="tertiary" deltaIcon="star" />
            )}
          </Row>

          {lift ? (
            <Section title="Lifts" action="All lifts" onAction={() => router.push("/progress")}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 8 }} style={{ marginHorizontal: -20, paddingHorizontal: 20 }}>
                {lifts.map((l) => (
                  <Chip key={l.ex.id} label={l.ex.name} selected={l.ex.id === lift.ex.id} onPress={() => setLiftId(l.ex.id)} />
                ))}
                <Chip label="Add" icon="addPlus" onPress={() => router.push("/exercises")} />
              </ScrollView>

              <Pressable accessibilityRole="button" onPress={() => router.push(`/progress/${lift.ex.id}`)} style={{ gap: 12, paddingTop: 4 }}>
                <Row justify="space-between" align="flex-end">
                  <View style={{ gap: 2 }}>
                    <Row gap={4}>
                      <Txt variant="displayM">{lift.ex.name}</Txt>
                      <Icon name="chevronRight" size={16} color={colors.text.tertiary} strokeWidth={2} />
                    </Row>
                    <Txt variant="labelS" tone="tertiary">
                      Estimated 1RM · {lift.points.length} sessions
                    </Txt>
                  </View>
                  <View style={{ alignItems: "flex-end", gap: 2 }}>
                    <Row gap={4} align="baseline">
                      <Txt variant="numberL" tabular>
                        {lift.points[lift.points.length - 1].value}
                      </Txt>
                      <Txt variant="labelM" tone="secondary">
                        kg
                      </Txt>
                    </Row>
                    <Txt variant="labelS" tone={lift.points[lift.points.length - 1].value >= lift.points[0].value ? "ember" : "warning"}>
                      {lift.points[lift.points.length - 1].value >= lift.points[0].value ? "+" : ""}
                      {Math.round((lift.points[lift.points.length - 1].value - lift.points[0].value) * 2) / 2} kg
                    </Txt>
                  </View>
                </Row>
                <LineChart points={lift.points.slice(-8)} labels={lift.points.slice(-8).map((p, i, a) => (i === a.length - 1 ? "Now" : shortDate(p.date)))} height={110} />
                {liftFc?.weeksToTarget ? (
                  <Txt variant="labelS" tone="tertiary">
                    {liftFc.target} kg likely in {liftFc.weeksToTarget} week{liftFc.weeksToTarget === 1 ? "" : "s"} at this pace
                  </Txt>
                ) : null}
              </Pressable>
            </Section>
          ) : (
            <Section title="Lifts">
              <Txt variant="bodyM" tone="secondary">
                Your lifts appear here after two sessions with the same exercise.
              </Txt>
            </Section>
          )}
        </>
      )}
    </Screen>
  );
}

function Meta({ icon, text }: { icon: "calendar" | "clock" | "trendingUp" | "star"; text: string }) {
  const { colors } = useTheme();
  return (
    <Row gap={6}>
      <Icon name={icon} size={14} color={colors.text.tertiary} strokeWidth={1.8} />
      <Txt variant="bodyS" tone="secondary">
        {text}
      </Txt>
    </Row>
  );
}
