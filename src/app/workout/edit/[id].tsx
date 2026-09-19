import { useState } from "react";
import { Pressable, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useNav, useOnce } from "@/nav";
import { useTheme } from "@/theme/ThemeProvider";
import { useDb } from "@/db/DbProvider";
import { uid } from "@/db/storage";
import { longDate } from "@/db/derive";
import { useT, usePlural } from "@/i18n";
import { haptic } from "@/haptics";
import type { ExerciseEntry, Session, SetEntry } from "@/db/types";
import { Screen, Row, Header } from "@/components/ui/Screen";
import { Txt } from "@/components/ui/Text";
import { Card, Divider } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Icon } from "@/components/ui/Icon";
import { ExerciseMark } from "@/components/ExerciseMark";

const num = (s: string) => {
  const n = Number(s.replace(",", ".").trim());
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

/**
 * A workout after the fact. The same figures the live screen took down, now
 * as a form: every set's weight and reps, whether it counts, sets added or
 * struck, an exercise struck or added, and how long the whole thing took.
 * Nothing is written until Save; records and the week's volume follow from
 * what is written, so they take care of themselves.
 */
export default function EditSession() {
  const router = useNav();
  const t = useT();
  const { db } = useDb();
  const { id } = useLocalSearchParams<{ id: string }>();
  const stored = db.sessions.find((s) => s.id === id);

  if (!stored) {
    return (
      <Screen>
        <Header left={<IconButton name="chevronLeft" onPress={() => router.back()} accessibilityLabel={t("Back")} />} title={t("Edit workout")} />
        <Txt variant="bodyM" tone="secondary">
          {t("This workout is no longer available.")}
        </Txt>
      </Screen>
    );
  }
  // Keyed on the session, so the form's working copy is built from a session
  // that is actually there, not from the first render's empty hand.
  return <EditForm key={stored.id} s={stored} />;
}

function EditForm({ s }: { s: Session }) {
  const { colors } = useTheme();
  const router = useNav();
  const once = useOnce();
  const t = useT();
  const plural = usePlural();
  const { update } = useDb();

  // A working copy. Weights and reps are kept as text while they are typed, so
  // "12," does not snap to 12 under the person's thumb.
  const [caption, setCaption] = useState(s.caption ?? "");
  const [minutes, setMinutes] = useState(() => (s.finishedAt ? String(Math.max(1, Math.round((s.finishedAt - s.startedAt) / 60_000))) : ""));
  const [exercises, setExercises] = useState<(Omit<ExerciseEntry, "sets"> & { sets: (Omit<SetEntry, "kg" | "reps"> & { kg: string; reps: string })[] })[]>(() =>
    s.exercises.map((e) => ({ ...e, sets: e.sets.map((x) => ({ ...x, kg: String(x.kg), reps: String(x.reps) })) })),
  );

  const patchSet = (ex: string, set: string, fn: (x: (typeof exercises)[number]["sets"][number]) => (typeof exercises)[number]["sets"][number]) =>
    setExercises((list) => list.map((e) => (e.id === ex ? { ...e, sets: e.sets.map((x) => (x.id === set ? fn(x) : x)) } : e)));
  const addSet = (ex: string) =>
    setExercises((list) =>
      list.map((e) => {
        if (e.id !== ex) return e;
        const last = e.sets[e.sets.length - 1];
        return { ...e, sets: [...e.sets, { id: uid(), type: "working", prevKg: null, prevReps: null, kg: last?.kg ?? "0", reps: last?.reps ?? "8", done: true }] };
      }),
    );
  const removeSet = (ex: string, set: string) => setExercises((list) => list.map((e) => (e.id === ex ? { ...e, sets: e.sets.filter((x) => x.id !== set) } : e)));
  const removeExercise = (ex: string) => {
    haptic("tap");
    setExercises((list) => list.filter((e) => e.id !== ex));
  };

  const save = once(() => {
    const mins = num(minutes);
    const next: Session = {
      ...s,
      caption: caption.trim() || undefined,
      finishedAt: mins > 0 ? s.startedAt + Math.round(mins) * 60_000 : s.finishedAt,
      exercises: exercises.map((e) => ({ ...e, sets: e.sets.map((x) => ({ ...x, kg: num(x.kg), reps: Math.round(num(x.reps)) })) })),
      currentIndex: Math.max(0, Math.min(s.currentIndex, exercises.length - 1)),
    };
    update((d) => ({ ...d, sessions: d.sessions.map((x) => (x.id === s.id ? next : x)) }));
    haptic("done");
    router.back(`/workout/${s.id}`);
  });

  const counted = exercises.reduce((n, e) => n + e.sets.filter((x) => x.done).length, 0);

  return (
    <Screen bottom={90} footer={<Button label={t("Save workout")} onPress={save} />}>
      <Header left={<IconButton name="chevronLeft" onPress={() => router.back(`/workout/${s.id}`)} accessibilityLabel={t("Back")} />} title={t("Edit workout")} subtitle={`${s.planName}, ${longDate(s.startedAt)}`} />

      <Txt variant="bodyM" tone="secondary">
        {t("Change what was taken down wrongly. Only ticked sets count; {n} count now.", { n: counted })}
      </Txt>

      <View style={{ gap: 10 }}>
        <Field label={t("Caption")} value={caption} onChangeText={setCaption} placeholder={t("How did it go?")} multiline />
        <Field label={t("Duration (min)")} value={minutes} onChangeText={setMinutes} keyboardType="number-pad" inputMode="numeric" placeholder="60" selectTextOnFocus />
      </View>

      <View style={{ gap: 12 }}>
        {exercises.map((e, index) => (
          <Card key={e.id} padding={14} gap={0}>
            <Row gap={10} style={{ paddingBottom: 8 }}>
              <ExerciseMark exerciseId={e.exerciseId} name={e.name} size={34} />
              <View style={{ flex: 1, gap: 1 }}>
                <Txt variant="labelL" numberOfLines={1}>
                  {e.name}
                </Txt>
                <Txt variant="labelS" tone="tertiary">
                  {plural(e.sets.length, "{n} set", "{n} sets")}
                </Txt>
              </View>
              <IconButton name="trash" size={34} iconSize={16} tone="danger" onPress={() => removeExercise(e.id)} accessibilityLabel={t("Remove {name}", { name: e.name })} />
            </Row>

            <Row gap={8} style={{ paddingVertical: 4 }}>
              <Txt variant="labelS" tone="tertiary" style={{ width: 28 }}>
                {t("Set")}
              </Txt>
              <Txt variant="labelS" tone="tertiary" style={{ flex: 1 }}>
                kg
              </Txt>
              <Txt variant="labelS" tone="tertiary" style={{ flex: 1 }}>
                {t("Reps")}
              </Txt>
              <View style={{ width: 40 }} />
              <View style={{ width: 34 }} />
            </Row>

            {e.sets.map((x, i) => (
              <View key={x.id}>
                {i > 0 ? <Divider /> : null}
                <Row gap={8} style={{ paddingVertical: 6, opacity: x.done ? 1 : 0.55 }}>
                  <Txt variant="labelM" tone={x.type === "warmup" ? "tertiary" : "secondary"} style={{ width: 28 }} tabular>
                    {x.type === "warmup" ? "W" : String(i + 1)}
                  </Txt>
                  <View style={{ flex: 1 }}>
                    <Field label="kg" value={x.kg} onChangeText={(v) => patchSet(e.id, x.id, (y) => ({ ...y, kg: v }))} keyboardType="decimal-pad" inputMode="decimal" selectTextOnFocus />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Field label={t("Reps")} value={x.reps} onChangeText={(v) => patchSet(e.id, x.id, (y) => ({ ...y, reps: v }))} keyboardType="number-pad" inputMode="numeric" selectTextOnFocus />
                  </View>
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: x.done }}
                    accessibilityLabel={x.done ? t("Counts") : t("Does not count")}
                    onPress={() => { haptic("tap"); patchSet(e.id, x.id, (y) => ({ ...y, done: !y.done })); }}
                    style={({ pressed }) => ({ width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: x.done ? colors.status.success : colors.bg.raised, opacity: pressed ? 0.7 : 1 })}
                  >
                    <Icon name="check" size={18} color={x.done ? colors.accent.on : colors.text.tertiary} strokeWidth={2.4} />
                  </Pressable>
                  <IconButton name="close" size={34} iconSize={14} tone="raised" onPress={() => removeSet(e.id, x.id)} accessibilityLabel={t("Remove set")} />
                </Row>
              </View>
            ))}

            <Button label={t("Add set")} variant="tertiary" size="M" icon="addPlus" onPress={() => addSet(e.id)} style={{ marginTop: 4 }} />
            {index === exercises.length - 1 ? null : null}
          </Card>
        ))}
      </View>

      <Button label={t("Add exercise")} variant="secondary" size="M" icon="addPlus" onPress={() => router.push(`/exercises?edit=${s.id}`)} />

      <Txt variant="labelS" tone="tertiary">
        {t("Weights that changed here are not written back to the plan; next time you do {plan}, it suggests what it did before.", { plan: s.planName })}
      </Txt>
    </Screen>
  );
}
