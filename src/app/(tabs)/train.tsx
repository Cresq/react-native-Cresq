import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "@/theme/ThemeProvider";
import { useDb } from "@/db/DbProvider";
import { useWorkout } from "@/store/workout";
import { useSplit } from "@/store/split";
import { finished, relativeDay } from "@/db/derive";
import { estimateMinutes } from "@/db/seed";
import { uid } from "@/db/storage";
import { Screen, Row, Section } from "@/components/ui/Screen";
import { Txt } from "@/components/ui/Text";
import { Card, Divider } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { IconButton } from "@/components/ui/IconButton";

/**
 * Train. Two things: what is up next, with the split it comes from on one
 * quiet line inside the card, and the workouts you own.
 */
export default function Train() {
  const { colors } = useTheme();
  const router = useRouter();
  const { db, update } = useDb();
  const { session, start } = useWorkout();
  const { split, nextDay } = useSplit();
  const running = !!session && !session.finishedAt;
  const nextPlan = db.plans.find((p) => p.id === nextDay?.planId);
  const done = finished(db.sessions);
  const lastDone = (name: string) => [...done].reverse().find((s) => s.planName === name);

  const begin = (planId?: string, name?: string) => {
    if (!running) start(planId, name);
    router.push("/workout/active");
  };
  const newWorkout = () => {
    const id = uid();
    update((d) => ({ ...d, plans: [...d.plans, { id, name: "New workout", focus: "", exercises: [], createdAt: Date.now() }] }));
    router.push(`/train/plan/${id}`);
  };

  return (
    <Screen tabs>
      <Row gap={10}>
        <Txt variant="displayXL" style={{ flex: 1 }}>
          Train
        </Txt>
        <IconButton name="search" onPress={() => router.push("/exercises")} accessibilityLabel="Exercise library" />
        <IconButton name="addPlus" onPress={newWorkout} accessibilityLabel="New workout" />
      </Row>

      <Card padding={20} gap={14}>
        <Txt variant="labelM" tone={running ? "ember" : "tertiary"}>
          {running ? "Session running" : "Up next"}
        </Txt>
        <View style={{ gap: 4 }}>
          <Txt variant="displayL">{running ? session?.planName : (nextDay?.name ?? "Quick session")}</Txt>
          <Txt variant="bodyM" tone="secondary">
            {running ? `${session?.exercises.length} exercises` : (nextDay?.focus ?? "Pick any workout below")}
          </Txt>
        </View>
        {nextPlan && !running ? (
          <Row gap={16}>
            <Meta icon="calendar" text={`${nextPlan.exercises.length} exercises`} />
            <Meta icon="clock" text={`${estimateMinutes(nextPlan)} min`} />
            {lastDone(nextPlan.name) ? <Meta icon="check" text={`Last ${relativeDay(lastDone(nextPlan.name)!.startedAt)}`} /> : null}
          </Row>
        ) : null}
        <Button label={running ? "Continue session" : nextDay?.rest ? "Rest day · start anyway" : "Start session"} iconRight="arrowRight" onPress={() => begin(nextPlan?.id, nextDay?.name)} style={{ marginTop: 4 }} />
        <Pressable accessibilityRole="button" accessibilityLabel="Edit your split" onPress={() => router.push("/train/split")} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 8, opacity: pressed ? 0.7 : 1 })}>
          <Icon name="rows" size={14} color={colors.text.tertiary} strokeWidth={1.8} />
          <Txt variant="labelS" tone="tertiary" style={{ flex: 1 }}>
            {split.name} · day {split.nextIndex + 1} of {split.days.length}
          </Txt>
          <Txt variant="labelS" tone="secondary">
            Change
          </Txt>
          <Icon name="chevronRight" size={14} color={colors.text.secondary} strokeWidth={2} />
        </Pressable>
      </Card>

      <Section title="Workouts" action="New" onAction={newWorkout} gap={0}>
        {db.plans.map((p, i) => {
          const last = lastDone(p.name);
          return (
            <View key={p.id}>
              {i > 0 ? <Divider /> : null}
              <Pressable accessibilityRole="button" onPress={() => router.push(`/train/plan/${p.id}`)} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 14, opacity: pressed ? 0.7 : 1 })}>
                <View style={{ flex: 1, gap: 3 }}>
                  <Txt variant="labelL">{p.name}</Txt>
                  <Txt variant="bodyS" tone="tertiary">
                    {[p.focus, `${p.exercises.length} exercises`, `${estimateMinutes(p)} min`].filter(Boolean).join(" · ")}
                  </Txt>
                </View>
                <Txt variant="labelS" tone="tertiary">
                  {last ? relativeDay(last.startedAt) : "not yet"}
                </Txt>
                <Icon name="chevronRight" size={18} color={colors.text.tertiary} />
              </Pressable>
            </View>
          );
        })}
      </Section>
    </Screen>
  );
}

function Meta({ icon, text }: { icon: "calendar" | "clock" | "check"; text: string }) {
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
