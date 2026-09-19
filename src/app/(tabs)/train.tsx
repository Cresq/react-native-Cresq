import { Pressable, View } from "react-native";
import { useNav } from "@/nav";
import { useTheme } from "@/theme/ThemeProvider";
import { useDb } from "@/db/DbProvider";
import { useWorkout } from "@/store/workout";
import { useSplit } from "@/store/split";
import { finished, relativeDay } from "@/db/derive";
import { uid } from "@/db/storage";
import { useT, usePlural } from "@/i18n";
import { Screen, Row, Section } from "@/components/ui/Screen";
import { Txt } from "@/components/ui/Text";
import { Card, Divider } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { IconButton } from "@/components/ui/IconButton";

/**
 * Train, top to bottom: the split (the plan for the week, one row of days
 * with today lit), the session that split says is next, and the workouts
 * you own.
 */
export default function Train() {
  const { colors } = useTheme();
  const router = useNav();
  const t = useT();
  const plural = usePlural();
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
    update((d) => ({ ...d, plans: [...d.plans, { id, name: t("New workout"), focus: "", exercises: [], createdAt: Date.now() }] }));
    router.push(`/train/plan/${id}`);
  };

  return (
    <Screen tabs>
      <Row gap={12}>
        <Txt variant="pageTitle" style={{ flex: 1 }}>
          {t("Workout")}
        </Txt>
        <IconButton name="search" onPress={() => router.push("/exercises")} accessibilityLabel={t("Exercise library")} />
      </Row>

      <Card padding={20} gap={12}>
        {/* The split is one quiet line on the card it governs, not a section of its own. */}
        {running ? (
          <Txt variant="labelM" tone="ember">
            {t("Session running")}
          </Txt>
        ) : (
          <Pressable accessibilityRole="button" accessibilityLabel={t("Edit your split")} onPress={() => router.push("/train/split")} hitSlop={12} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
            <Row gap={4}>
              <Txt variant="labelM" tone="tertiary">
                {split.name}, {t("day {a} of {b}", { a: split.nextIndex + 1, b: split.days.length })}
              </Txt>
              <Icon name="chevronRight" size={13} color={colors.text.tertiary} strokeWidth={2} />
            </Row>
          </Pressable>
        )}
        <View style={{ gap: 4 }}>
          <Txt variant="displayL">{running ? session?.planName : (nextDay?.rest ? t("Rest day") : nextDay?.name) ?? t("Quick session")}</Txt>
          <Txt variant="bodyM" tone="secondary">
            {running ? plural(session?.exercises.length ?? 0, "{n} exercise", "{n} exercises") : (nextDay?.focus ?? t("Pick any workout below"))}
          </Txt>
        </View>
        <Button label={running ? t("Continue session") : nextDay?.rest ? t("Rest day, start anyway") : t("Start session")} iconRight="arrowRight" onPress={() => begin(nextPlan?.id, nextDay?.name)} style={{ marginTop: 4 }} />
      </Card>

      <Section title={t("Workouts")} action={t("New")} actionIcon="addPlus" onAction={newWorkout} gap={0}>
        {db.plans.map((p, i) => {
          const last = lastDone(p.name);
          return (
            <View key={p.id}>
              {i > 0 ? <Divider /> : null}
              <Pressable accessibilityRole="button" onPress={() => router.push(`/train/plan/${p.id}`)} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, opacity: pressed ? 0.7 : 1 })}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Txt variant="labelL">{p.name}</Txt>
                  <Txt variant="bodyS" tone="tertiary">
                    {p.focus || plural(p.exercises.length, "{n} exercise", "{n} exercises")}
                  </Txt>
                </View>
                <Txt variant="labelS" tone="tertiary">
                  {last ? relativeDay(last.startedAt) : t("not yet")}
                </Txt>
                <Icon name="chevronRight" size={18} color={colors.text.tertiary} />
              </Pressable>
            </View>
          );
        })}
        {db.plans.length === 0 ? (
          <Txt variant="bodyM" tone="secondary" style={{ paddingVertical: 8 }}>
            {t("No workouts yet. Tap New to build one.")}
          </Txt>
        ) : null}
      </Section>
    </Screen>
  );
}

