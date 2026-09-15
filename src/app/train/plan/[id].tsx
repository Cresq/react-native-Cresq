import { useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTheme } from "@/theme/ThemeProvider";
import { useDb } from "@/db/DbProvider";
import { useWorkout } from "@/store/workout";
import { fmtTime, plannedSets } from "@/db/derive";
import { estimateMinutes } from "@/db/seed";
import type { Plan, PlanExercise, PlannedSet, SetType } from "@/db/types";
import { Screen, Row, Section, Header } from "@/components/ui/Screen";
import { Txt } from "@/components/ui/Text";
import { IconButton } from "@/components/ui/IconButton";
import { Card, Divider } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { BottomSheet, SheetOption } from "@/components/ui/BottomSheet";
import { fontFamily } from "../../../../constants/theme";
import { useT } from "@/i18n";
import { SUPERSET_INK, supersetColor } from "@/superset";

const typeLabel = (t: SetType, working: number) => (t === "warmup" ? "W" : t === "drop" ? "D" : t === "failure" ? "F" : String(working));

/**
 * Workout detail and editor in one. Name and focus are inline; each exercise
 * is a row that opens into the same set table you log in during a session,
 * so what you plan here is exactly what you see when you train.
 */
export default function PlanEditor() {
  const { colors, radius } = useTheme();
  const router = useRouter();
  const t = useT();
  const { db, update } = useDb();
  const { session, start } = useWorkout();
  const { id } = useLocalSearchParams<{ id: string }>();
  const plan = db.plans.find((p) => p.id === id);
  const [open, setOpen] = useState<number | null>(0);
  const [sheet, setSheet] = useState<null | { kind: "options"; index: number } | { kind: "rest"; index: number } | { kind: "type"; index: number; set: number } | { kind: "delete" }>(null);

  if (!plan) {
    return (
      <Screen>
        <Header left={<IconButton name="chevronLeft" onPress={() => router.back()} accessibilityLabel={t("Back")} />} title={t("Workout")} />
        <Txt variant="bodyM" tone="secondary">
          {t("This workout no longer exists.")}
        </Txt>
      </Screen>
    );
  }

  const patch = (fn: (p: Plan) => Plan) => update((d) => ({ ...d, plans: d.plans.map((p) => (p.id === plan.id ? fn(p) : p)) }));
  const patchEx = (index: number, fn: (e: PlanExercise) => PlanExercise) => patch((p) => ({ ...p, exercises: p.exercises.map((e, i) => (i === index ? fn(e) : e)) }));
  const setSets = (index: number, list: PlannedSet[]) =>
    patchEx(index, (e) => {
      const first = list.find((s) => s.type !== "warmup") ?? list[0];
      return { ...e, setList: list, sets: list.length, reps: first?.reps ?? e.reps, kg: first?.kg ?? e.kg };
    });
  const move = (index: number, dir: -1 | 1) =>
    patch((p) => {
      const j = index + dir;
      if (j < 0 || j >= p.exercises.length) return p;
      const ex = [...p.exercises];
      [ex[index], ex[j]] = [ex[j], ex[index]];
      return { ...p, exercises: ex };
    });
  const remove = (index: number) => {
    patch((p) => ({ ...p, exercises: p.exercises.filter((_, i) => i !== index) }));
    setOpen(null);
  };
  const deletePlan = () => {
    update((d) => ({ ...d, plans: d.plans.filter((p) => p.id !== plan.id), split: { ...d.split, days: d.split.days.map((day) => (day.planId === plan.id ? { ...day, planId: undefined } : day)) } }));
    router.back();
  };
  const begin = () => {
    if (!session || session.finishedAt) start(plan.id);
    router.push("/workout/active");
  };
  const name = (e: PlanExercise) => db.exercises.find((x) => x.id === e.exerciseId)?.name ?? e.exerciseId;
  const inputStyle = { width: "100%" as const, textAlign: "center" as const, color: colors.text.primary, fontFamily: fontFamily.displaySemi, fontSize: 18, paddingVertical: 0 };

  return (
    <Screen bottom={90} footer={<Button label={session && !session.finishedAt ? t("Continue session") : t("Start this workout")} iconRight="arrowRight" onPress={begin} disabled={plan.exercises.length === 0} />}>
      <Header left={<IconButton name="chevronLeft" onPress={() => router.back()} accessibilityLabel={t("Back")} />} title={t("Workout")} subtitle={`${t("{n} exercises", { n: plan.exercises.length })}, ${t("{n} min", { n: estimateMinutes(plan) })}`} right={<IconButton name="trash" onPress={() => setSheet({ kind: "delete" })} accessibilityLabel={t("Delete workout")} />} />

      <View style={{ gap: 12 }}>
        <Field label={t("Name")} value={plan.name} onChangeText={(v) => patch((p) => ({ ...p, name: v }))} placeholder={t("Push day")} />
        <Field label={t("Focus")} value={plan.focus} onChangeText={(v) => patch((p) => ({ ...p, focus: v }))} placeholder={t("Chest, shoulders, triceps")} />
      </View>

      <Section title={t("Exercises")} action={t("Add")} actionIcon="addPlus" onAction={() => router.push(`/exercises?plan=${plan.id}`)} gap={8}>
        {plan.exercises.length === 0 ? (
          <Txt variant="bodyM" tone="secondary" style={{ paddingVertical: 8 }}>
            {t("Add exercises from the library, then tap one to set its sets, weight and reps.")}
          </Txt>
        ) : null}
        {plan.exercises.map((e, i) => {
          const sets = plannedSets(e);
          const isOpen = open === i;
          let working = 0;
          const groupColor = supersetColor(e.supersetGroup);
          return (
            <Card key={`${e.exerciseId}-${i}`} padding={isOpen ? 16 : 8} gap={0}>
              <Row gap={12} style={{ paddingVertical: isOpen ? 0 : 6, paddingHorizontal: isOpen ? 0 : 8 }}>
                {/* A superset is told apart by colour and SS, the same as in a running session. */}
                <View style={{ width: 28, height: 28, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: groupColor ? groupColor : isOpen ? colors.accent.ember : colors.bg.raised }}>
                  {groupColor ? (
                    <Txt variant="labelS" style={{ color: SUPERSET_INK, letterSpacing: 0.3 }}>
                      SS
                    </Txt>
                  ) : (
                    <Txt variant="labelM" style={{ color: isOpen ? colors.accent.on : colors.text.secondary }}>
                      {i + 1}
                    </Txt>
                  )}
                </View>
                <Pressable accessibilityRole="button" accessibilityState={{ expanded: isOpen }} onPress={() => setOpen(isOpen ? null : i)} style={{ flex: 1, gap: 2 }}>
                  <Row gap={8}>
                    <Txt variant="labelL">{name(e)}</Txt>
                  </Row>
                  <Txt variant="bodyS" tone="tertiary">
                    {t(sets.length === 1 ? "{n} set" : "{n} sets", { n: sets.length })}
                    {e.kg ? `, ${e.kg} kg × ${e.reps}` : `, ${t("{n} reps", { n: e.reps })}`}, {t("{time} rest", { time: fmtTime(e.restSeconds) })}
                  </Txt>
                </Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel={t("Options")} hitSlop={10} onPress={() => setSheet({ kind: "options", index: i })}>
                  <Icon name="moreHorizontal" size={18} color={colors.text.tertiary} />
                </Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel={isOpen ? t("Collapse") : t("Expand")} hitSlop={10} onPress={() => setOpen(isOpen ? null : i)}>
                  <Icon name={isOpen ? "chevronDown" : "chevronRight"} size={18} color={colors.text.tertiary} strokeWidth={2} />
                </Pressable>
              </Row>

              {isOpen ? (
                <View style={{ gap: 4, paddingTop: 12 }}>
                  <Row gap={8} style={{ paddingHorizontal: 8, paddingBottom: 4 }}>
                    <Txt variant="labelS" tone="tertiary" style={{ width: 28 }}>
                      {t("Set")}
                    </Txt>
                    <Txt variant="labelS" tone="tertiary" style={{ flex: 1 }} align="center">
                      kg
                    </Txt>
                    <Txt variant="labelS" tone="tertiary" style={{ flex: 1 }} align="center">
                      {t("Reps")}
                    </Txt>
                    <View style={{ width: 36 }} />
                  </Row>
                  {sets.map((s, si) => {
                    if (s.type === "working") working++;
                    return (
                      <View key={si} style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4, paddingHorizontal: 8, borderRadius: radius.setRow }}>
                        <Pressable accessibilityRole="button" accessibilityLabel={t("Set type")} hitSlop={6} onPress={() => setSheet({ kind: "type", index: i, set: si })} style={{ width: 28 }}>
                          <Txt variant="labelL" tone={s.type === "warmup" ? "tertiary" : "primary"}>
                            {typeLabel(s.type, working)}
                          </Txt>
                        </Pressable>
                        <View style={{ flex: 1, height: 40, borderRadius: radius.input, backgroundColor: colors.bg.raised, justifyContent: "center" }}>
                          <TextInput value={String(s.kg)} onChangeText={(v) => setSets(i, sets.map((x, k) => (k === si ? { ...x, kg: Number(v.replace(",", ".")) || 0 } : x)))} keyboardType="decimal-pad" selectTextOnFocus style={inputStyle} accessibilityLabel={t("Set {n} weight", { n: si + 1 })} />
                        </View>
                        <View style={{ flex: 1, height: 40, borderRadius: radius.input, backgroundColor: colors.bg.raised, justifyContent: "center" }}>
                          <TextInput value={String(s.reps)} onChangeText={(v) => setSets(i, sets.map((x, k) => (k === si ? { ...x, reps: Number(v) || 0 } : x)))} keyboardType="number-pad" selectTextOnFocus style={inputStyle} accessibilityLabel={t("Set {n} reps", { n: si + 1 })} />
                        </View>
                        <Pressable accessibilityRole="button" accessibilityLabel={t("Remove set")} hitSlop={6} disabled={sets.length === 1} onPress={() => setSets(i, sets.filter((_, k) => k !== si))} style={{ width: 36, height: 40, alignItems: "center", justifyContent: "center", opacity: sets.length === 1 ? 0.3 : 1 }}>
                          <Icon name="close" size={16} color={colors.text.tertiary} strokeWidth={2} />
                        </Pressable>
                      </View>
                    );
                  })}
                  <Row gap={12} style={{ paddingTop: 8, paddingHorizontal: 8 }}>
                    <Pressable accessibilityRole="button" onPress={() => setSets(i, [...sets, { ...(sets[sets.length - 1] ?? { kg: e.kg, reps: e.reps }), type: "working" }])} hitSlop={6} style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8 }}>
                      <Icon name="addPlus" size={14} color={colors.text.secondary} strokeWidth={2.2} />
                      <Txt variant="labelM" tone="secondary">
                        {t("Add set")}
                      </Txt>
                    </Pressable>
                    <Pressable accessibilityRole="button" accessibilityLabel={t("Rest between sets")} onPress={() => setSheet({ kind: "rest", index: i })} style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingLeft: 12, paddingRight: 8, height: 32, borderRadius: radius.pill, backgroundColor: colors.bg.raised }}>
                      <Icon name="timer" size={13} color={colors.text.secondary} strokeWidth={1.9} />
                      <Txt variant="labelS">{t("{time} rest", { time: fmtTime(e.restSeconds) })}</Txt>
                      <Icon name="chevronDown" size={12} color={colors.text.tertiary} strokeWidth={2.2} />
                    </Pressable>
                  </Row>
                </View>
              ) : null}
            </Card>
          );
        })}
        {plan.exercises.length ? (
          <Pressable accessibilityRole="button" onPress={() => router.push(`/exercises?plan=${plan.id}`)} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, paddingHorizontal: 16 }}>
            <Icon name="addPlus" size={16} color={colors.text.secondary} strokeWidth={2} />
            <Txt variant="labelM" tone="secondary">
              {t("Add exercise")}
            </Txt>
          </Pressable>
        ) : null}
      </Section>

      <BottomSheet visible={sheet?.kind === "options"} onClose={() => setSheet(null)} title={sheet?.kind === "options" ? name(plan.exercises[sheet.index]) : ""}>
        {sheet?.kind === "options" ? (
          <>
            <SheetOption icon="dragVertical" label={t("Move up")} onPress={() => { move(sheet.index, -1); setSheet(null); }} />
            <SheetOption icon="dragVertical" label={t("Move down")} onPress={() => { move(sheet.index, 1); setSheet(null); }} />
            <SheetOption icon="link" label={plan.exercises[sheet.index].supersetGroup ? t("Remove from superset") : t("Superset with next")} sub={t("No rest between the two")} onPress={() => { const cur = plan.exercises[sheet.index]; const g = cur.supersetGroup ? undefined : String.fromCharCode(65 + sheet.index); patchEx(sheet.index, (e) => ({ ...e, supersetGroup: g })); if (sheet.index + 1 < plan.exercises.length) patchEx(sheet.index + 1, (e) => ({ ...e, supersetGroup: g })); setSheet(null); }} />
            <SheetOption icon="trash" label={t("Remove from workout")} danger onPress={() => { remove(sheet.index); setSheet(null); }} />
          </>
        ) : null}
      </BottomSheet>

      <BottomSheet visible={sheet?.kind === "type"} onClose={() => setSheet(null)} title={sheet?.kind === "type" ? t("Set {n}", { n: sheet.set + 1 }) : ""} subtitle={sheet?.kind === "type" ? name(plan.exercises[sheet.index]) : undefined}>
        {sheet?.kind === "type" ? (
          <>
            {(
              [
                ["warmup", "sun", "Warm-up", "Lighter weight, not counted in volume"],
                ["working", "circleCheck", "Working set", "Counts toward volume and records"],
                ["drop", "chevronDown", "Drop set", "Lower the weight and keep going"],
                ["failure", "star", "Failure set", "Reps until you can't do another"],
              ] as const
            ).map(([type, icon, label, sub]) => (
              <SheetOption key={type} icon={icon} label={t(label)} sub={t(sub)} selected={plannedSets(plan.exercises[sheet.index])[sheet.set]?.type === type} onPress={() => { const list = plannedSets(plan.exercises[sheet.index]).map((s, k) => (k === sheet.set ? { ...s, type: type as SetType } : s)); setSets(sheet.index, list); setSheet(null); }} />
            ))}
          </>
        ) : null}
      </BottomSheet>

      <BottomSheet visible={sheet?.kind === "rest"} onClose={() => setSheet(null)} title={t("Rest between sets")} subtitle={sheet?.kind === "rest" ? name(plan.exercises[sheet.index]) : undefined}>
        {sheet?.kind === "rest" ? (
          <Row gap={8} style={{ paddingHorizontal: 8, paddingVertical: 8 }}>
            {[60, 90, 120, 150, 180].map((s) => (
              <Chip key={s} label={fmtTime(s)} selected={plan.exercises[sheet.index].restSeconds === s} onPress={() => { patchEx(sheet.index, (e) => ({ ...e, restSeconds: s })); setSheet(null); }} style={{ flex: 1, justifyContent: "center" }} />
            ))}
          </Row>
        ) : null}
      </BottomSheet>

      <BottomSheet visible={sheet?.kind === "delete"} onClose={() => setSheet(null)} title={t("Delete this workout?")} subtitle={t("Sessions you already logged with it stay in your history.")}>
        <View style={{ paddingHorizontal: 8, paddingVertical: 8 }}>
          <Button label={t("Delete workout")} variant="danger" size="M" onPress={deletePlan} />
        </View>
      </BottomSheet>
    </Screen>
  );
}
