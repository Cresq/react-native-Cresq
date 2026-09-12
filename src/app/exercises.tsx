import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTheme } from "@/theme/ThemeProvider";
import { useDb } from "@/db/DbProvider";
import { useWorkout } from "@/store/workout";
import { uid } from "@/db/storage";
import { Screen, Row, Header } from "@/components/ui/Screen";
import { Txt } from "@/components/ui/Text";
import { IconButton } from "@/components/ui/IconButton";
import { Divider } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { BottomSheet } from "@/components/ui/BottomSheet";

/**
 * Exercise library. Browse (tap opens the lift), add to a plan (?plan=ID), or add
 * to the running session (?session=1). One list, one search field, one sheet to create.
 */
export default function Exercises() {
  const { colors } = useTheme();
  const router = useRouter();
  const { db, update } = useDb();
  const { addExercise } = useWorkout();
  const { plan: planId, session: forSession } = useLocalSearchParams<{ plan?: string; session?: string }>();
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [muscles, setMuscles] = useState("");

  const mode = planId ? "plan" : forSession ? "session" : "browse";
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return [...db.exercises].filter((e) => !t || e.name.toLowerCase().includes(t) || e.muscles.toLowerCase().includes(t) || e.equipment.toLowerCase().includes(t)).sort((a, b) => a.name.localeCompare(b.name));
  }, [db.exercises, q]);

  const pick = (id: string) => {
    const ex = db.exercises.find((e) => e.id === id)!;
    if (mode === "plan") {
      update((d) => ({ ...d, plans: d.plans.map((p) => (p.id === planId ? { ...p, exercises: [...p.exercises, { exerciseId: ex.id, sets: 3, reps: 10, kg: ex.bodyweight ? 0 : 20, restSeconds: 90 }] } : p)) }));
      router.back();
    } else if (mode === "session") {
      addExercise(ex);
      router.back();
    } else router.push(`/progress/${ex.id}`);
  };

  const create = () => {
    const n = name.trim();
    if (!n) return;
    const id = uid();
    update((d) => ({ ...d, exercises: [...d.exercises, { id, name: n, muscles: muscles.trim() || "Custom", equipment: "Custom" }] }));
    setCreating(false);
    setName("");
    setMuscles("");
    if (mode !== "browse") pick(id);
  };

  return (
    <Screen>
      <Header left={<IconButton name={mode === "browse" ? "chevronLeft" : "close"} onPress={() => router.back()} accessibilityLabel="Back" />} title={mode === "plan" ? "Add to plan" : mode === "session" ? "Add exercise" : "Exercises"} subtitle={`${db.exercises.length} in your library`} />
      <Field label="Search" value={q} onChangeText={setQ} placeholder="Name, muscle or equipment" icon="search" autoCorrect={false} />

      <View>
        {list.map((e, i) => (
          <View key={e.id}>
            {i > 0 ? <Divider /> : null}
            <Pressable accessibilityRole="button" onPress={() => pick(e.id)} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 13, opacity: pressed ? 0.7 : 1 })}>
              <View style={{ flex: 1, gap: 2 }}>
                <Txt variant="labelL">{e.name}</Txt>
                <Txt variant="bodyS" tone="tertiary">
                  {e.muscles} · {e.equipment}
                </Txt>
              </View>
              <Icon name={mode === "browse" ? "chevronRight" : "addPlus"} size={18} color={mode === "browse" ? colors.text.tertiary : colors.text.secondary} strokeWidth={2} />
            </Pressable>
          </View>
        ))}
        {list.length === 0 ? (
          <Txt variant="bodyM" tone="secondary" style={{ paddingVertical: 12 }}>
            Nothing called “{q}” yet. Create it below.
          </Txt>
        ) : null}
      </View>

      <Button label="New exercise" variant="secondary" size="M" icon="addPlus" onPress={() => { setName(q); setCreating(true); }} />

      <BottomSheet visible={creating} onClose={() => setCreating(false)} title="New exercise" subtitle="It goes into your library and can be used in any plan.">
        <View style={{ gap: 10, paddingHorizontal: 8, paddingVertical: 8 }}>
          <Field label="Name" value={name} onChangeText={setName} placeholder="Seated cable row" autoFocus />
          <Field label="Muscles" value={muscles} onChangeText={setMuscles} placeholder="Back, biceps" />
          <Button label="Add exercise" onPress={create} disabled={!name.trim()} style={{ marginTop: 4 }} />
        </View>
      </BottomSheet>
    </Screen>
  );
}
