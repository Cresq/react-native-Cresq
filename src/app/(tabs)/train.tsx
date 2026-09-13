import { Pressable, ScrollView, View } from "react-native";
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
 * Train. Three things, top to bottom: what is up next, the split that decides
 * that (one line, tap to edit), and the workouts you own.
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
          {running ? `Session running · ${session?.planName}` : `Up next · day ${split.nextIndex + 1} of ${split.days.length}`}
        </Txt>
        <View style={{ gap: 4 }}>
          <Txt variant="displayL">{nextDay?.name ?? "Quick session"}</Txt>
          <Txt variant="bodyM" tone="secondary">
            {nextDay?.focus}
          </Txt>
        </View>
        {nextPlan ? (
          <Row gap={16}>
            <Meta icon="calendar" text={`${nextPlan.exercises.length} exercises`} />
            <Meta icon="clock" text={`${estimateMinutes(nextPlan)} min`} />
            {lastDone(nextPlan.name) ? <Meta icon="check" text={`Last ${relativeDay(lastDone(nextPlan.name)!.startedAt)}`} /> : null}
          </Row>
        ) : null}
        <Button label={running ? "Continue session" : nextDay?.rest ? "Rest day · start anyway" : "Start session"} iconRight="arrowRight" onPress={() => begin(nextPlan?.id, nextDay?.name)} style={{ marginTop: 4 }} />
      </Card>

      <Section title="Your split" action="Edit" onAction={() => router.push("/train/split")}>
        <Pressable accessibilityRole="button" accessibilityLabel="Edit your split" onPress={() => router.push("/train/split")} style={{ gap: 10 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, alignItems: "center", paddingRight: 20 }} style={{ marginHorizontal: -20, paddingHorizontal: 20 }}>
            {split.days.map((d, i) => {
              const isNext = i === split.nextIndex;
              return (
                <Row key={d.id} gap={6}>
                  <View style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, backgroundColor: isNext ? colors.accent.ember : colors.bg.surface }}>
                    <Txt variant="labelM" style={{ color: isNext ? colors.accent.on : d.rest ? colors.text.tertiary : colors.text.secondary }}>
                      {d.name}
                    </Txt>
                  </View>
                  {i < split.days.length - 1 ? <Icon name="chevronRight" size={12} color={colors.text.tertiary} strokeWidth={2.2} /> : null}
                </Row>
              );
            })}
          </ScrollView>
          <Txt variant="bodyS" tone="tertiary">
            {split.name}. Finishing a session moves you to the next day, and after day {split.days.length} it starts again.
          </Txt>
        </Pressable>
      </Section>

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
        <Divider />
        <Pressable accessibilityRole="button" style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 14, opacity: pressed ? 0.7 : 1 })}>
          <Icon name="sun" size={18} color={colors.pr.gold} strokeWidth={2} />
          <View style={{ flex: 1, gap: 2 }}>
            <Txt variant="labelL">Build a workout with AI</Txt>
            <Txt variant="bodyS" tone="tertiary">
              Describe your goals and limits, edit the result line by line.
            </Txt>
          </View>
          <Txt variant="labelS" tone="tertiary">
            Soon
          </Txt>
        </Pressable>
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
