import { useState } from "react";
import { Pressable, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTheme } from "@/theme/ThemeProvider";
import { useDb } from "@/db/DbProvider";
import { useWorkout } from "@/store/workout";
import { fmtTime } from "@/db/derive";
import { estimateMinutes } from "@/db/seed";
import type { Plan, PlanExercise } from "@/db/types";
import { Screen, Row, Section, Header } from "@/components/ui/Screen";
import { Txt } from "@/components/ui/Text";
import { IconButton } from "@/components/ui/IconButton";
import { Card, Divider } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { BottomSheet, SheetOption } from "@/components/ui/BottomSheet";

/**
 * Plan detail and editor in one. Name and focus are editable inline; exercises are
 * a list with one options sheet per row and a stepper sheet for sets, reps, weight and rest.
 */
export default function PlanEditor() {
  const { colors } = useTheme();
  const router = useRouter();
  const { db, update } = useDb();
  const { session, start } = useWorkout();
  const { id } = useLocalSearchParams<{ id: string }>();
  const plan = db.plans.find((p) => p.id === id);
  const [sheet, setSheet] = useState<null | { kind: "options"; index: number } | { kind: "edit"; index: number } | { kind: "delete" }>(null);

  if (!plan) {
    return (
      <Screen>
        <Header left={<IconButton name="chevronLeft" onPress={() => router.back()} accessibilityLabel="Back" />} title="Plan" />
        <Txt variant="bodyM" tone="secondary">
          This plan no longer exists.
        </Txt>
      </Screen>
    );
  }

  const patch = (fn: (p: Plan) => Plan) => update((d) => ({ ...d, plans: d.plans.map((p) => (p.id === plan.id ? fn(p) : p)) }));
  const patchEx = (index: number, fn: (e: PlanExercise) => PlanExercise) => patch((p) => ({ ...p, exercises: p.exercises.map((e, i) => (i === index ? fn(e) : e)) }));
  const move = (index: number, dir: -1 | 1) =>
    patch((p) => {
      const j = index + dir;
      if (j < 0 || j >= p.exercises.length) return p;
      const ex = [...p.exercises];
      [ex[index], ex[j]] = [ex[j], ex[index]];
      return { ...p, exercises: ex };
    });
  const remove = (index: number) => patch((p) => ({ ...p, exercises: p.exercises.filter((_, i) => i !== index) }));
  const deletePlan = () => {
    update((d) => ({ ...d, plans: d.plans.filter((p) => p.id !== plan.id), split: { ...d.split, days: d.split.days.map((day) => (day.planId === plan.id ? { ...day, planId: undefined } : day)) } }));
    router.back();
  };
  const begin = () => {
    if (!session || session.finishedAt) start(plan.id);
    router.push("/workout/active");
  };
  const name = (e: PlanExercise) => db.exercises.find((x) => x.id === e.exerciseId)?.name ?? e.exerciseId;
  const editing = sheet?.kind === "edit" ? plan.exercises[sheet.index] : null;

  return (
    <Screen bottom={90} footer={<Button label={session && !session.finishedAt ? "Continue session" : "Start this workout"} iconRight="arrowRight" onPress={begin} disabled={plan.exercises.length === 0} />}>
      <Header left={<IconButton name="chevronLeft" onPress={() => router.back()} accessibilityLabel="Back" />} title="Workout" subtitle={`${plan.exercises.length} exercises · ${estimateMinutes(plan)} min`} right={<IconButton name="trash" onPress={() => setSheet({ kind: "delete" })} accessibilityLabel="Delete workout" />} />

      <View style={{ gap: 10 }}>
        <Field label="Name" value={plan.name} onChangeText={(t) => patch((p) => ({ ...p, name: t }))} placeholder="Push day" />
        <Field label="Focus" value={plan.focus} onChangeText={(t) => patch((p) => ({ ...p, focus: t }))} placeholder="Chest, shoulders, triceps" />
      </View>

      <Section title="Exercises" action="Add" onAction={() => router.push(`/exercises?plan=${plan.id}`)} gap={0}>
        {plan.exercises.length === 0 ? (
          <Txt variant="bodyM" tone="secondary" style={{ paddingVertical: 8 }}>
            Add exercises from the library. Sets, reps and weight can be set per exercise.
          </Txt>
        ) : null}
        <Card padding={6} gap={0}>
          {plan.exercises.map((e, i) => (
            <View key={`${e.exerciseId}-${i}`}>
              {i > 0 ? <Divider inset={50} /> : null}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, paddingHorizontal: 10 }}>
                <View style={{ width: 28, height: 28, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg.raised }}>
                  <Txt variant="labelM" tone="secondary">
                    {i + 1}
                  </Txt>
                </View>
                <Pressable accessibilityRole="button" onPress={() => setSheet({ kind: "edit", index: i })} style={{ flex: 1, gap: 2 }}>
                  <Row gap={8}>
                    <Txt variant="labelL">{name(e)}</Txt>
                    {e.supersetGroup ? (
                      <Txt variant="labelS" tone="tertiary">
                        superset {e.supersetGroup}
                      </Txt>
                    ) : null}
                  </Row>
                  <Txt variant="bodyS" tone="tertiary">
                    {e.sets} × {e.reps}
                    {e.kg ? ` · ${e.kg} kg` : " · bodyweight"} · rest {fmtTime(e.restSeconds)}
                  </Txt>
                </Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel="Options" hitSlop={10} onPress={() => setSheet({ kind: "options", index: i })}>
                  <Icon name="moreHorizontal" size={18} color={colors.text.tertiary} />
                </Pressable>
              </View>
            </View>
          ))}
          {plan.exercises.length ? <Divider inset={50} /> : null}
          <Pressable accessibilityRole="button" onPress={() => router.push(`/exercises?plan=${plan.id}`)} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, paddingHorizontal: 10 }}>
            <View style={{ width: 28, alignItems: "center" }}>
              <Icon name="addPlus" size={16} color={colors.text.secondary} strokeWidth={2} />
            </View>
            <Txt variant="labelM" tone="secondary">
              Add exercise
            </Txt>
          </Pressable>
        </Card>
      </Section>

      <BottomSheet visible={sheet?.kind === "options"} onClose={() => setSheet(null)} title={sheet?.kind === "options" ? name(plan.exercises[sheet.index]) : ""}>
        {sheet?.kind === "options" ? (
          <>
            <SheetOption icon="sliders" label="Sets, reps, weight, rest" onPress={() => setSheet({ kind: "edit", index: sheet.index })} />
            <SheetOption icon="dragVertical" label="Move up" onPress={() => { move(sheet.index, -1); setSheet(null); }} />
            <SheetOption icon="dragVertical" label="Move down" onPress={() => { move(sheet.index, 1); setSheet(null); }} />
            <SheetOption icon="link" label={plan.exercises[sheet.index].supersetGroup ? "Remove from superset" : "Superset with next"} sub="No rest between the two" onPress={() => { const cur = plan.exercises[sheet.index]; const g = cur.supersetGroup ? undefined : String.fromCharCode(65 + sheet.index); patchEx(sheet.index, (e) => ({ ...e, supersetGroup: g })); if (sheet.index + 1 < plan.exercises.length) patchEx(sheet.index + 1, (e) => ({ ...e, supersetGroup: g })); setSheet(null); }} />
            <SheetOption icon="trash" label="Remove from workout" danger onPress={() => { remove(sheet.index); setSheet(null); }} />
          </>
        ) : null}
      </BottomSheet>

      <BottomSheet visible={sheet?.kind === "edit"} onClose={() => setSheet(null)} title={editing ? name(editing) : ""} subtitle="Defaults for a new session. Last time's numbers still pre-fill.">
        {sheet?.kind === "edit" && editing ? (
          <View style={{ gap: 6, paddingHorizontal: 8, paddingVertical: 6 }}>
            <Stepper label="Sets" value={editing.sets} step={1} min={1} onChange={(v) => patchEx(sheet.index, (e) => ({ ...e, sets: v }))} />
            <Stepper label="Reps" value={editing.reps} step={1} min={1} onChange={(v) => patchEx(sheet.index, (e) => ({ ...e, reps: v }))} />
            <Stepper label="Weight" value={editing.kg} step={2.5} min={0} unit="kg" onChange={(v) => patchEx(sheet.index, (e) => ({ ...e, kg: v }))} />
            <Stepper label="Rest" value={editing.restSeconds} step={15} min={15} format={fmtTime} onChange={(v) => patchEx(sheet.index, (e) => ({ ...e, restSeconds: v }))} />
          </View>
        ) : null}
      </BottomSheet>

      <BottomSheet visible={sheet?.kind === "delete"} onClose={() => setSheet(null)} title="Delete this workout?" subtitle="Sessions you already logged with it stay in your history.">
        <View style={{ paddingHorizontal: 8, paddingVertical: 8 }}>
          <Button label="Delete workout" variant="danger" size="M" onPress={deletePlan} />
        </View>
      </BottomSheet>
    </Screen>
  );
}

function Stepper({ label, value, step, min, unit, format, onChange }: { label: string; value: number; step: number; min: number; unit?: string; format?: (v: number) => string; onChange: (v: number) => void }) {
  const { colors } = useTheme();
  const btn = (icon: "addPlus" | "close", onPress: () => void, minus?: boolean) => (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => ({ width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: pressed ? colors.border.strong : colors.bg.raised })}>
      {minus ? <View style={{ width: 12, height: 2, borderRadius: 1, backgroundColor: colors.text.primary }} /> : <Icon name={icon} size={16} color={colors.text.primary} strokeWidth={2.2} />}
    </Pressable>
  );
  return (
    <Row gap={12} style={{ paddingVertical: 6 }}>
      <Txt variant="labelL" style={{ flex: 1 }}>
        {label}
      </Txt>
      {btn("close", () => onChange(Math.max(min, Math.round((value - step) * 100) / 100)), true)}
      <Row gap={3} align="baseline" style={{ minWidth: 70, justifyContent: "center" }}>
        <Txt variant="numberM" tabular>
          {format ? format(value) : value}
        </Txt>
        {unit ? (
          <Txt variant="labelS" tone="secondary">
            {unit}
          </Txt>
        ) : null}
      </Row>
      {btn("addPlus", () => onChange(Math.round((value + step) * 100) / 100))}
    </Row>
  );
}
