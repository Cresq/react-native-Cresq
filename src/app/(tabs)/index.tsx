import { useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "@/theme/ThemeProvider";
import { useDb } from "@/db/DbProvider";
import { useWorkout } from "@/store/workout";
import { useSplit } from "@/store/split";
import { finished, fmtKg, forecast, liftTrend, relativeDay, shortDate, startOfWeek, weekDays, weeklyVolume } from "@/db/derive";
import { estimateMinutes } from "@/db/seed";
import { DEFAULT_FAVOURITES } from "@/db/types";
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

/**
 * Home is one glance: the week so far, the next session with its name up
 * front, two figures, and one card for your favourite lifts, where the chips
 * choose and the chart answers.
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
  const thisWeek = useMemo(() => done.filter((s) => s.startedAt >= startOfWeek(Date.now())).length, [done]);
  const goal = db.profile.daysPerWeek ?? 3;
  const lastSame = [...done].reverse().find((s) => s.planName === (plan?.name ?? nextDay?.name));

  const favourites = db.profile.favourites ?? DEFAULT_FAVOURITES;
  const lifts = useMemo(
    () => favourites.map((id) => db.exercises.find((e) => e.id === id)).filter((e): e is NonNullable<typeof e> => !!e).map((ex) => ({ ex, points: liftTrend(db.sessions, ex.id) })),
    [favourites, db.exercises, db.sessions],
  );
  const [liftId, setLiftId] = useState<string | null>(null);
  const lift = lifts.find((l) => l.ex.id === liftId) ?? lifts.find((l) => l.points.length >= 2) ?? lifts[0] ?? null;
  const fc = lift && lift.points.length >= 2 ? forecast(lift.points) : null;
  const current = lift && lift.points.length ? lift.points[lift.points.length - 1].value : 0;
  const delta = lift && lift.points.length ? Math.round((current - lift.points[0].value) * 2) / 2 : 0;

  const startSession = () => {
    if (!running) start(plan?.id, nextDay?.name);
    router.push("/workout/active");
  };
  const names = (running ? session!.exercises.map((e) => e.name) : plan ? plan.exercises.map((pe) => db.exercises.find((e) => e.id === pe.exerciseId)?.name ?? "") : []).map((n) => n.toLowerCase());
  const three = names.slice(0, 3).join(", ");
  const exerciseLine = names.length === 0 ? (nextDay?.focus ?? "") : three.length <= 44 ? (names.length > 3 ? `${three} +${names.length - 3} more` : three) : `${names.slice(0, 2).join(", ")} +${names.length - 2} more`;

  return (
    <Screen tabs>
      <Row gap={12}>
        <Pressable accessibilityRole="button" accessibilityLabel="Your profile" onPress={() => router.push("/(tabs)/profile")}>
          <Avatar source={photos.selfie} size={44} />
        </Pressable>
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
            <WeekStrip days={week} onPress={(d) => d.sessionId && router.push(`/workout/${d.sessionId}`)} />

            <Card padding={20} gap={14}>
              <Txt variant="labelM" tone={running ? "ember" : "tertiary"}>
                {running ? "Session running" : `Today · day ${split.nextIndex + 1} of ${split.days.length}`}
              </Txt>
              <View style={{ gap: 4 }}>
                <Txt variant="displayL">{running ? session?.planName : (nextDay?.name ?? "Quick session")}</Txt>
                {exerciseLine ? (
                  <Txt variant="bodyM" tone="secondary">
                    {exerciseLine.charAt(0).toUpperCase() + exerciseLine.slice(1)}
                  </Txt>
                ) : null}
              </View>
              <Row gap={16}>
                {plan ? <Meta icon="calendar" text={`${plan.exercises.length} exercises`} /> : null}
                {plan ? <Meta icon="clock" text={`${estimateMinutes(plan)} min`} /> : null}
                {lastSame ? <Meta icon="check" text={`Last ${relativeDay(lastSame.startedAt)}`} /> : <Meta icon="star" text="First time" />}
              </Row>
              <Button label={running ? "Continue session" : nextDay?.rest ? "Rest day · start anyway" : "Start session"} iconRight="arrowRight" onPress={startSession} style={{ marginTop: 4 }} />
            </Card>
          </View>

          <Row gap={16} align="stretch">
            <Stat
              label="This week"
              value={fmtKg(volume.current)}
              unit="kg"
              delta={volume.delta === null ? "No sessions last week" : `${volume.delta >= 0 ? "+" : ""}${volume.delta}% on last week`}
              deltaTone={volume.delta === null ? "tertiary" : volume.delta >= 0 ? "ember" : "warning"}
              deltaIcon={volume.delta !== null && volume.delta < 0 ? "trendingDown" : "trendingUp"}
            />
            <StatDivider />
            <Stat
              label="Sessions"
              value={String(thisWeek)}
              unit={`of ${goal}`}
              delta={thisWeek >= goal ? "Week's goal done" : `${goal - thisWeek} to go this week`}
              deltaTone={thisWeek >= goal ? "sage" : "tertiary"}
              deltaIcon={thisWeek >= goal ? "circleCheck" : "calendar"}
            />
          </Row>

          <Section title="Progress">
            <Card padding={18} gap={14}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 8 }} style={{ marginHorizontal: -18, paddingHorizontal: 18 }}>
                {lifts.map((l) => (
                  <Chip key={l.ex.id} label={l.ex.name} selected={lift?.ex.id === l.ex.id} onPress={() => setLiftId(l.ex.id)} />
                ))}
                <Chip label="Add" icon="addPlus" onPress={() => router.push("/exercises?favourite=1")} />
              </ScrollView>

              {lift && lift.points.length >= 2 ? (
                <Pressable accessibilityRole="button" accessibilityLabel={`${lift.ex.name} details`} onPress={() => router.push(`/progress/${lift.ex.id}`)} style={{ gap: 12 }}>
                  <Row justify="space-between" align="flex-end">
                    <View style={{ gap: 2 }}>
                      <Txt variant="labelS" tone="tertiary">
                        Estimated 1RM · {lift.points.length} sessions
                      </Txt>
                      <Row gap={4}>
                        <Txt variant="displayM">{lift.ex.name}</Txt>
                        <Icon name="chevronRight" size={16} color={colors.text.tertiary} strokeWidth={2} />
                      </Row>
                    </View>
                    <View style={{ alignItems: "flex-end", gap: 2 }}>
                      <Row gap={4} align="baseline">
                        <Txt variant="numberL" tabular>
                          {current}
                        </Txt>
                        <Txt variant="labelM" tone="secondary">
                          kg
                        </Txt>
                      </Row>
                      <Row gap={4}>
                        <Icon name={delta >= 0 ? "trendingUp" : "trendingDown"} size={12} color={delta >= 0 ? colors.accent.ember : colors.status.warning} strokeWidth={2.2} />
                        <Txt variant="labelS" tone={delta >= 0 ? "ember" : "warning"}>
                          {delta >= 0 ? "+" : ""}
                          {delta} kg
                        </Txt>
                      </Row>
                    </View>
                  </Row>
                  <LineChart points={lift.points.slice(-8)} labels={lift.points.slice(-8).map((p, i, a) => (i === a.length - 1 ? "Now" : shortDate(p.date)))} height={110} />
                  <Row gap={6}>
                    <Icon name="star" size={12} color={fc?.weeksToTarget ? colors.fuel.sage : colors.text.tertiary} strokeWidth={2} />
                    <Txt variant="labelS" tone={fc?.weeksToTarget ? "sage" : "tertiary"}>
                      {fc?.weeksToTarget ? `Next record ${fc.target} kg, likely in ${fc.weeksToTarget} week${fc.weeksToTarget === 1 ? "" : "s"}` : "Holding steady, add a rep or a small jump in weight"}
                    </Txt>
                  </Row>
                </Pressable>
              ) : (
                <View style={{ gap: 4, paddingVertical: 8 }}>
                  <Txt variant="displayM">{lift ? lift.ex.name : "Pick your lifts"}</Txt>
                  <Txt variant="bodyM" tone="secondary">
                    {lift ? `Log ${lift.ex.name.toLowerCase()} in two sessions and its trend appears here.` : "Add the exercises you want to follow and their trend shows here."}
                  </Txt>
                </View>
              )}
            </Card>
          </Section>
        </>
      )}
    </Screen>
  );
}

function Meta({ icon, text }: { icon: "calendar" | "clock" | "check" | "star"; text: string }) {
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
