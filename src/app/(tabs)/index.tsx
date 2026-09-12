import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "@/theme/ThemeProvider";
import { useWorkout } from "@/store/workout";
import { lifts, photos, plans, user, week } from "@/data/mock";
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

const today = new Date();
const dateLabel = today.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
const greeting = () => {
  const h = today.getHours();
  return h < 12 ? "Morning" : h < 18 ? "Afternoon" : "Evening";
};

/**
 * Home. One anchor: today's session. Everything below it sits on the ground
 * and gets quieter as you scroll: this week's figures, then the lifts.
 */
export default function Home() {
  const { colors } = useTheme();
  const router = useRouter();
  const { session, start } = useWorkout();
  const [mode, setMode] = useState("gym");
  const [liftSlug, setLiftSlug] = useState(lifts[0].slug);
  const lift = lifts.find((l) => l.slug === liftSlug) ?? lifts[0];
  const plan = plans[0];
  const running = !!session && !session.finishedAt;

  const startSession = () => {
    if (!running) start(plan.name);
    router.push("/workout/active");
  };

  return (
    <Screen tabs>
      <Row gap={12}>
        <Avatar source={photos.selfie} size={44} />
        <View style={{ flex: 1, gap: 2 }}>
          <Txt variant="labelS" tone="tertiary">
            {dateLabel}
          </Txt>
          <Txt variant="displayXL">
            {greeting()}, {user.first}
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
                {running ? "Session running" : "Today"} · {plan.name} · {plan.focus.split(",")[0]}
              </Txt>
              <Txt variant="displayL">Bench, incline press, dips</Txt>
              <Row gap={16}>
                <Meta icon="calendar" text={`${plan.exercises} exercises`} />
                <Meta icon="clock" text={`${plan.minutes} min`} />
                <Meta icon="trendingUp" text="+2.5 kg last time" />
              </Row>
              <Button label={running ? "Continue session" : "Start session"} iconRight="arrowRight" onPress={startSession} style={{ marginTop: 4 }} />
            </Card>
          </View>

          <Row gap={16} align="stretch">
            <Stat label="This week" value="18.4k" unit="kg" delta="+6% on last week" />
            <StatDivider />
            <Stat label="Next record" value="100" unit="kg bench" delta="Likely in 2 weeks" deltaTone="sage" deltaIcon="star" />
          </Row>

          <Section title="Lifts" action="All lifts" onAction={() => router.push(`/progress/${lift.slug}`)}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 8 }} style={{ marginHorizontal: -20, paddingHorizontal: 20 }}>
              {lifts.map((l) => (
                <Chip key={l.slug} label={l.name} selected={l.slug === liftSlug} onPress={() => setLiftSlug(l.slug)} />
              ))}
              <Chip label="Add" icon="addPlus" onPress={() => {}} />
            </ScrollView>

            <Pressable accessibilityRole="button" onPress={() => router.push(`/progress/${lift.slug}`)} style={{ gap: 12, paddingTop: 4 }}>
              <Row justify="space-between" align="flex-end">
                <View style={{ gap: 2 }}>
                  <Row gap={4}>
                    <Txt variant="displayM">{lift.name}</Txt>
                    <Icon name="chevronRight" size={16} color={colors.text.tertiary} strokeWidth={2} />
                  </Row>
                  <Txt variant="labelS" tone="tertiary">
                    Estimated 1RM · {lift.weeks} weeks
                  </Txt>
                </View>
                <View style={{ alignItems: "flex-end", gap: 2 }}>
                  <Row gap={4} align="baseline">
                    <Txt variant="numberL" tabular>
                      {lift.e1rm}
                    </Txt>
                    <Txt variant="labelM" tone="secondary">
                      kg
                    </Txt>
                  </Row>
                  <Txt variant="labelS" tone="ember">
                    +{lift.deltaKg} kg
                  </Txt>
                </View>
              </Row>
              <LineChart points={lift.points} labels={["W1", "W2", "W3", "W4", "W5", "W6", "W7", "Now"]} height={110} />
            </Pressable>
          </Section>
        </>
      )}
    </Screen>
  );
}

function Meta({ icon, text }: { icon: "calendar" | "clock" | "trendingUp"; text: string }) {
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
