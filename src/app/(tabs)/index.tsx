import { useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "@/theme/ThemeProvider";
import { useDb } from "@/db/DbProvider";
import { useWorkout } from "@/store/workout";
import { useSplit } from "@/store/split";
import { finished, fmtKg, forecast, liftTrend, locale, relativeDay, shortDate, startOfWeek, weekDays, weeklyVolume } from "@/db/derive";
import { estimateMinutes } from "@/db/seed";
import { DEFAULT_FAVOURITES } from "@/db/types";
import { photos } from "@/data/mock";
import { useLanguage, useT } from "@/i18n";
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
import { BottomSheet, SheetOption } from "@/components/ui/BottomSheet";
import { useSocial } from "@/store/social";
import { otherPosts } from "@/data/mock";
import { person } from "@/data/people";

const greetingKey = () => {
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
  const t = useT();
  const lang = useLanguage();
  const { db } = useDb();
  const { session, start } = useWorkout();
  const { split, nextDay, setOverride } = useSplit();
  const { isFollowing } = useSocial();
  const [mode, setMode] = useState("gym");
  const [choosing, setChoosing] = useState(false);
  // While the chart is being scrubbed, releasing the finger must not open the lift.
  const scrubbing = useRef(false);
  const onScrub = (on: boolean) => {
    if (on) scrubbing.current = true;
    else setTimeout(() => { scrubbing.current = false; }, 300);
  };

  const override = split.overridePlanId ? db.plans.find((p) => p.id === split.overridePlanId) : undefined;
  const plan = override ?? db.plans.find((p) => p.id === nextDay?.planId);
  const missed = useMemo(() => {
    const since = db.profile.lastFeedSeen ?? 0;
    const ageMs = (meta: string) => (/today/.test(meta) ? 2 * 3600000 : /yesterday/.test(meta) ? 26 * 3600000 : 3 * 86400000);
    return otherPosts.filter((p) => p.userId && isFollowing(p.userId) && Date.now() - ageMs(p.meta) > since).map((p) => ({ post: p, who: person(p.userId!) }));
  }, [db.profile.lastFeedSeen, isFollowing]);
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
    if (!running) start(plan?.id, plan?.name ?? nextDay?.name);
    router.push("/workout/active");
  };
  const names = (running ? session!.exercises.map((e) => e.name) : plan ? plan.exercises.map((pe) => db.exercises.find((e) => e.id === pe.exerciseId)?.name ?? "") : []).map((n) => n.toLowerCase());
  const three = names.slice(0, 3).join(", ");
  const more = (n: number) => (lang === "nl" ? `+${n} meer` : `+${n} more`);
  const exerciseLine = names.length === 0 ? (nextDay?.focus ?? "") : three.length <= 44 ? (names.length > 3 ? `${three} ${more(names.length - 3)}` : three) : `${names.slice(0, 2).join(", ")} ${more(names.length - 2)}`;
  const weeksWord = (w: number) => t(w === 1 ? "Next record {kg} kg, likely in {w} week" : "Next record {kg} kg, likely in {w} weeks", { kg: fc?.target ?? 0, w });

  return (
    <Screen tabs>
      <Row gap={12}>
        <Pressable accessibilityRole="button" accessibilityLabel={t("Your profile")} onPress={() => router.push("/(tabs)/profile")}>
          <Avatar source={photos.selfie} size={44} />
        </Pressable>
        <View style={{ flex: 1, gap: 2 }}>
          <Txt variant="labelS" tone="tertiary">
            {new Date().toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long" })}
          </Txt>
          <Txt variant="displayXL">
            {t(greetingKey())}, {db.profile.first}
          </Txt>
        </View>
        <IconButton name="bell" badge onPress={() => router.push("/notifications")} accessibilityLabel={t("Notifications")} />
      </Row>

      <Segmented
        value={mode}
        onChange={setMode}
        segments={[
          { key: "gym", label: t("Gym"), icon: "dumbbell", color: "ember" },
          { key: "food", label: t("Food"), icon: "leaf", color: "sage" },
        ]}
      />

      {mode === "food" ? (
        <View style={{ gap: 6, paddingVertical: 8 }}>
          <Txt variant="displayM">{t("Food is on its way")}</Txt>
          <Txt variant="bodyM" tone="secondary">
            {t("Calories, macros and meals will live here, using the energy your sessions burn.")}
          </Txt>
        </View>
      ) : (
        <>
          <View style={{ gap: 20 }}>
            <WeekStrip days={week} onPress={(d) => d.sessionId && router.push(`/workout/${d.sessionId}`)} />

            <Card padding={20} gap={14}>
              <Txt variant="labelM" tone={running ? "ember" : "tertiary"}>
                {running ? t("Session running") : t("Today, day {a} of {b}", { a: split.nextIndex + 1, b: split.days.length })}
              </Txt>
              <Pressable accessibilityRole="button" accessibilityLabel={t("Choose another workout")} disabled={running} onPress={() => setChoosing(true)} style={({ pressed }) => ({ gap: 4, opacity: pressed ? 0.7 : 1 })}>
                <Row gap={6}>
                  <Txt variant="displayL">{running ? session?.planName : plan ? plan.name : (nextDay?.rest ? t("Rest day") : nextDay?.name) ?? t("Quick session")}</Txt>
                  {!running ? <Icon name="chevronDown" size={18} color={colors.text.tertiary} strokeWidth={2} /> : null}
                </Row>
                {exerciseLine ? (
                  <Txt variant="bodyM" tone="secondary">
                    {exerciseLine.charAt(0).toUpperCase() + exerciseLine.slice(1)}
                  </Txt>
                ) : null}
                {override && !running ? (
                  <Txt variant="labelS" tone="tertiary">
                    {t("Instead of {name} from your split", { name: nextDay?.name ?? "" })}
                  </Txt>
                ) : null}
              </Pressable>
              <Row gap={16}>
                {plan ? <Meta icon="calendar" text={t("{n} exercises", { n: plan.exercises.length })} /> : null}
                {plan ? <Meta icon="clock" text={t("{n} min", { n: estimateMinutes(plan) })} /> : null}
                {lastSame ? <Meta icon="check" text={t("Last {when}", { when: relativeDay(lastSame.startedAt) })} /> : <Meta icon="star" text={t("First time")} />}
              </Row>
              <Button label={running ? t("Continue session") : nextDay?.rest ? t("Rest day, start anyway") : t("Start session")} iconRight="arrowRight" onPress={startSession} style={{ marginTop: 4 }} />
            </Card>
          </View>

          {missed.length ? (
            <Pressable accessibilityRole="button" accessibilityLabel={t("Open the feed")} onPress={() => router.push("/(tabs)/feed")} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, opacity: pressed ? 0.7 : 1 })}>
              <Row gap={0}>
                {missed.slice(0, 3).map(({ post, who }, i) => (
                  <View key={post.id} style={{ marginLeft: i ? -10 : 0, borderWidth: 2, borderColor: colors.bg.ground, borderRadius: 20 }}>
                    <Avatar source={who?.avatar} size={36} initial={post.name[0]} />
                  </View>
                ))}
              </Row>
              <View style={{ flex: 1, gap: 1 }}>
                <Txt variant="labelL">{missed.length === 1 ? t("{name} trained since you last looked", { name: missed[0].post.name.split(" ")[0] }) : t("{name} and {n} others trained since you last looked", { name: missed[0].post.name.split(" ")[0], n: missed.length - 1 })}</Txt>
                <Txt variant="bodyS" tone="tertiary">
                  {missed.map((m) => m.post.meta.split(", ")[0]).join(", ")}
                </Txt>
              </View>
              <Icon name="chevronRight" size={18} color={colors.text.tertiary} />
            </Pressable>
          ) : null}

          <Row gap={16} align="stretch">
            <Stat
              label={t("This week")}
              value={fmtKg(volume.current)}
              unit="kg"
              delta={volume.delta === null ? t("No sessions last week") : t("{p}% on last week", { p: `${volume.delta >= 0 ? "+" : ""}${volume.delta}` })}
              deltaTone={volume.delta === null ? "tertiary" : volume.delta >= 0 ? "ember" : "warning"}
              deltaIcon={volume.delta !== null && volume.delta < 0 ? "trendingDown" : "trendingUp"}
            />
            <StatDivider />
            <Stat
              label={t("Sessions")}
              value={String(thisWeek)}
              unit={t("of {n}", { n: goal })}
              delta={thisWeek >= goal ? t("Week's goal done") : t("{n} to go this week", { n: goal - thisWeek })}
              deltaTone={thisWeek >= goal ? "sage" : "tertiary"}
              deltaIcon={thisWeek >= goal ? "circleCheck" : "calendar"}
            />
          </Row>

          <Section title={t("Progress")}>
            <Card padding={18} gap={14}>
              <Row gap={10}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 8 }} style={{ flex: 1, marginLeft: -18, paddingLeft: 18 }}>
                  {lifts.map((l) => (
                    <Chip key={l.ex.id} label={l.ex.name} selected={lift?.ex.id === l.ex.id} onPress={() => setLiftId(l.ex.id)} />
                  ))}
                </ScrollView>
                <IconButton name="addPlus" size={36} iconSize={18} tone="raised" onPress={() => router.push("/exercises?favourite=1")} accessibilityLabel={t("Add a lift to follow")} />
              </Row>

              {lift && lift.points.length >= 2 ? (
                <Pressable accessibilityRole="button" accessibilityLabel={lift.ex.name} onPress={() => { if (!scrubbing.current) router.push(`/progress/${lift.ex.id}`); }} style={{ gap: 12 }}>
                  <Row justify="space-between" align="flex-end">
                    <View style={{ gap: 2 }}>
                      <Txt variant="labelS" tone="tertiary">
                        {t("Estimated 1RM, {n} sessions", { n: lift.points.length })}
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
                  <LineChart points={lift.points.slice(-8)} labels={lift.points.slice(-8).map((p, i, a) => (i === a.length - 1 ? t("Now") : shortDate(p.date)))} scrubLabels={lift.points.slice(-8).map((p) => shortDate(p.date))} height={110} onScrub={onScrub} />
                  <Row gap={6}>
                    <Icon name="star" size={12} color={fc?.weeksToTarget ? colors.fuel.sage : colors.text.tertiary} strokeWidth={2} />
                    <Txt variant="labelS" tone={fc?.weeksToTarget ? "sage" : "tertiary"}>
                      {fc?.weeksToTarget ? weeksWord(fc.weeksToTarget) : t("Holding steady, add a rep or a small jump in weight")}
                    </Txt>
                  </Row>
                </Pressable>
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
        </>
      )}

      <BottomSheet visible={choosing} onClose={() => setChoosing(false)} title={t("Today's workout")} subtitle={t("Your split says {name}. Pick something else for today; the split keeps its order.", { name: nextDay?.rest ? t("Rest day") : (nextDay?.name ?? "") })}>
        {db.plans.map((p) => (
          <SheetOption key={p.id} icon="dumbbell" label={p.name} sub={[p.focus, t("{n} exercises", { n: p.exercises.length })].filter(Boolean).join(", ")} selected={plan?.id === p.id} onPress={() => { setOverride(p.id === nextDay?.planId ? undefined : p.id); setChoosing(false); }} />
        ))}
        {override ? <SheetOption icon="reload" label={t("Back to the split")} sub={nextDay?.name} onPress={() => { setOverride(undefined); setChoosing(false); }} /> : null}
      </BottomSheet>
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
