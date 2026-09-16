import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useNav, useOnce } from "@/nav";
import { useTheme } from "@/theme/ThemeProvider";
import { useDb } from "@/db/DbProvider";
import { useWorkout } from "@/store/workout";
import { uid } from "@/db/storage";
import { DEFAULT_FAVOURITES } from "@/db/types";
import { Screen, Header } from "@/components/ui/Screen";
import { Txt } from "@/components/ui/Text";
import { IconButton } from "@/components/ui/IconButton";
import { Divider } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { ExerciseMedia } from "@/components/ExerciseMedia";
import { MoveViewer } from "@/components/MoveViewer";
import type { Exercise } from "@/db/types";
import { useT, useTerms } from "@/i18n";

/**
 * Exercise library. Browse (tap opens the lift), add to a workout (?plan=ID),
 * add to the running session (?session=1), or pick favourites for Home
 * (?favourite=1, tap toggles the star). One list, one search field, one sheet to create.
 */
export default function Exercises() {
  const { colors } = useTheme();
  const router = useNav();
  const t = useT();
  const tm = useTerms();
  const { db, update } = useDb();
  const { addExercise, swapExercise } = useWorkout();
  const { plan: planId, session: forSession, favourite, swap } = useLocalSearchParams<{ plan?: string; session?: string; favourite?: string; swap?: string }>();
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState(false);
  const [watching, setWatching] = useState<Exercise | null>(null);
  const [name, setName] = useState("");
  const [muscles, setMuscles] = useState("");

  const mode = planId ? "plan" : forSession ? "session" : swap ? "swap" : favourite ? "favourite" : "browse";
  const favourites = db.profile.favourites ?? DEFAULT_FAVOURITES;
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    // Searched in both languages: somebody typing "borst" and somebody typing "chest" are after the same shelf.
    return [...db.exercises].filter((e) => !t || e.name.toLowerCase().includes(t) || e.muscles.toLowerCase().includes(t) || e.equipment.toLowerCase().includes(t) || tm(e.muscles).toLowerCase().includes(t) || tm(e.equipment).toLowerCase().includes(t)).sort((a, b) => a.name.localeCompare(b.name));
  }, [db.exercises, q, tm]);

  const toggleFavourite = (id: string) =>
    update((d) => {
      const cur = d.profile.favourites ?? DEFAULT_FAVOURITES;
      return { ...d, profile: { ...d.profile, favourites: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id] } };
    });

  const once = useOnce();
  // Two taps in the same breath must not put the movement in twice: a stacked
  // screen is a nuisance, a duplicated exercise in somebody's session is wrong data.
  const pick = once((id: string) => {
    const ex = db.exercises.find((e) => e.id === id);
    if (!ex) return;
    if (mode === "plan") {
      update((d) => ({ ...d, plans: d.plans.map((p) => (p.id === planId ? { ...p, exercises: [...p.exercises, { exerciseId: ex.id, sets: 3, reps: 10, kg: ex.bodyweight ? 0 : 20, restSeconds: 90 }] } : p)) }));
      router.back();
    } else if (mode === "session") {
      addExercise(ex);
      router.back();
    } else if (mode === "swap") {
      swapExercise(swap!, ex);
      router.back();
    } else if (mode === "favourite") toggleFavourite(id);
    else router.push(`/progress/${ex.id}`);
  });

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

  const titles = { plan: t("Add to workout"), session: t("Add exercise"), swap: t("Swap exercise"), favourite: t("Favourite lifts"), browse: t("Exercises") };
  const subtitle = mode === "favourite" ? t("{n} on Home, tap to add or remove", { n: favourites.length }) : mode === "swap" ? t("Sets and numbers stay, the movement changes") : t("{n} in your library", { n: db.exercises.length });

  return (
    <Screen bottom={mode === "favourite" ? 80 : 0} footer={mode === "favourite" ? <Button label={t("Done")} variant="inverse" size="M" onPress={() => router.back()} /> : undefined}>
      <Header left={<IconButton name={mode === "browse" ? "chevronLeft" : "close"} onPress={() => router.back()} accessibilityLabel={t("Back")} />} title={titles[mode]} subtitle={subtitle} />
      <Field label={t("Search")} value={q} onChangeText={setQ} placeholder={t("Name, muscle or equipment")} icon="search" autoCorrect={false} />

      <View>
        {list.map((e, i) => {
          const fav = favourites.includes(e.id);
          return (
            <View key={e.id}>
              {i > 0 ? <Divider /> : null}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <ExerciseMedia exercise={e} size={52} round onPress={() => setWatching(e)} />
                <Pressable accessibilityRole="button" accessibilityState={mode === "favourite" ? { selected: fav } : undefined} onPress={() => pick(e.id)} style={({ pressed }) => ({ flex: 1, flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 13, opacity: pressed ? 0.7 : 1 })}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Txt variant="labelL">{e.name}</Txt>
                    <Txt variant="bodyS" tone="tertiary">
                      {tm(e.muscles)}, {tm(e.equipment)}
                    </Txt>
                  </View>
                  {mode === "favourite" ? (
                    <Icon name="star" size={20} color={fav ? colors.pr.gold : colors.text.tertiary} fill={fav ? colors.pr.gold : undefined} strokeWidth={1.8} />
                  ) : (
                    <Icon name={mode === "browse" ? "chevronRight" : mode === "swap" ? "reload" : "addPlus"} size={18} color={mode === "browse" ? colors.text.tertiary : colors.text.secondary} strokeWidth={2} />
                  )}
                </Pressable>
              </View>
            </View>
          );
        })}
        {list.length === 0 ? (
          <Txt variant="bodyM" tone="secondary" style={{ paddingVertical: 12 }}>
            {t("Nothing called “{q}” yet. Create it below.", { q })}
          </Txt>
        ) : null}
      </View>

      <Button label={t("New exercise")} variant="secondary" size="M" icon="addPlus" onPress={() => { setName(q); setCreating(true); }} />

      <BottomSheet visible={creating} onClose={() => setCreating(false)} title={t("New exercise")} subtitle={t("It goes into your library and can be used in any workout.")}>
        <View style={{ gap: 12, paddingHorizontal: 8, paddingVertical: 8 }}>
          <Field label={t("Name")} value={name} onChangeText={setName} placeholder="Seated cable row" autoFocus />
          <Field label={t("Muscles")} value={muscles} onChangeText={setMuscles} placeholder={t("Back, biceps")} />
          <Button label={t("Add exercise")} onPress={create} disabled={!name.trim()} style={{ marginTop: 4 }} />
        </View>
      </BottomSheet>

      <MoveViewer exercise={watching} onClose={() => setWatching(null)} />
    </Screen>
  );
}
