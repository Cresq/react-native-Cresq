import { DB_VERSION, type Db, type Exercise, type ExerciseEntry, type Plan, type Session, type SetEntry, type SplitDay } from "./types";
import { libraryExercises } from "@/data/exercises";
import { uid } from "./storage";
import { translate, type Language } from "@/i18n/translate";

/** The exercise library, catalogue and artwork both, lives in its own file. */
export { libraryExercises as seedExercises } from "@/data/exercises";

const px = (exerciseId: string, sets: number, reps: number, kg: number, restSeconds: number, note?: string, supersetGroup?: string) => ({ exerciseId, sets, reps, kg, restSeconds, note, supersetGroup });

export const seedPlans: Plan[] = [
  { id: "push", name: "Push", focus: "Chest, shoulders, triceps", createdAt: 0, exercises: [px("bench", 4, 5, 95, 150, "Feet planted, pause on the chest"), px("incline-db", 4, 10, 30, 90, "Elbows tucked, pause at the bottom"), px("dips", 3, 12, 0, 90), px("lateral-raise", 3, 15, 10, 60, undefined, "A"), px("ohp", 3, 8, 50, 60, undefined, "A"), px("cable-fly", 3, 12, 25, 60)] },
  { id: "pull", name: "Pull", focus: "Back, biceps", createdAt: 0, exercises: [px("deadlift", 3, 5, 140, 180), px("pullup", 4, 8, 0, 120), px("row", 4, 8, 70, 90), px("lat-pulldown", 3, 12, 60, 60), px("face-pull", 3, 15, 25, 60, undefined, "A"), px("curl", 3, 10, 30, 60, undefined, "A")] },
  { id: "legs", name: "Legs", focus: "Quads, hamstrings, glutes", createdAt: 0, exercises: [px("squat", 4, 5, 120, 180), px("rdl", 3, 8, 100, 120), px("leg-press", 3, 12, 180, 90), px("leg-curl", 3, 12, 45, 60), px("calf-raise", 4, 15, 80, 45)] },
  { id: "chest-back", name: "Chest & Back", focus: "Pressing and rowing, paired", createdAt: 0, exercises: [px("bench", 4, 8, 85, 120, undefined, "A"), px("row", 4, 8, 70, 120, undefined, "A"), px("chest-press", 3, 12, 60, 90, undefined, "B"), px("lat-pulldown", 3, 12, 60, 90, undefined, "B"), px("cable-fly", 3, 15, 20, 60), px("face-pull", 3, 15, 25, 60)] },
  { id: "arms-shoulders", name: "Arms & Shoulders", focus: "Biceps, triceps, delts", createdAt: 0, exercises: [px("ohp", 4, 6, 50, 120), px("lateral-raise", 4, 15, 10, 60), px("curl", 3, 10, 30, 60, undefined, "A"), px("pushdown", 3, 12, 30, 60, undefined, "A"), px("hammer-curl", 3, 12, 14, 60, undefined, "B"), px("skull-crusher", 3, 10, 30, 60, undefined, "B")] },
];

/**
 * The same plans, with the copy this app wrote in the reader's language.
 * Names stay as they are: Push, Pull and Legs are what a Dutch gym calls them
 * too. Only the sentences move.
 */
export const seedPlansIn = (lang: Language): Plan[] =>
  seedPlans.map((p) => ({
    ...p,
    focus: translate(lang, p.focus),
    exercises: p.exercises.map((e) => (e.note ? { ...e, note: translate(lang, e.note) } : e)),
  }));

/** Templates offered when adding a day to a split: every plan, plus a rest day. */
export const splitTemplates = (plans: Plan[], t: (s: string) => string = (s) => s): Omit<SplitDay, "id">[] => [
  ...plans.map((p) => ({ name: p.name, focus: p.focus, planId: p.id, exercises: p.exercises.length, minutes: estimateMinutes(p) })),
  { name: t("Rest day"), focus: t("Recover. Walk, sleep, eat."), rest: true },
];

export const seedSplitDays = (plans: Plan[] = seedPlans): SplitDay[] =>
  plans.map((p) => ({ id: uid(), name: p.name, focus: p.focus, planId: p.id, exercises: p.exercises.length, minutes: estimateMinutes(p) }));

/** Rough duration from sets and rest. Enough to plan an evening. */
export function estimateMinutes(plan: { exercises: { sets: number; restSeconds: number }[] }) {
  const sets = plan.exercises.reduce((n, e) => n + e.sets, 0);
  const rest = plan.exercises.reduce((n, e) => n + e.sets * e.restSeconds, 0);
  return Math.round((sets * 40 + rest) / 60);
}

/**
 * Eight weeks of sample history following the split, with steady progress on
 * the main lifts so the charts and records mean something on day one.
 * Every session is flagged `sample` and can be removed from Settings.
 */
export function seedSampleSessions(exercises: Exercise[], plans: Plan[]): Session[] {
  const out: Session[] = [];
  const now = new Date();
  const dayMs = 86400000;
  /** Linear from (target - gain) in week 0 to target in the last week, on 2.5 kg plates. */
  const progress = (target: number, gain: number, week: number, weeks: number) => Math.round((target - gain + (gain * week) / (weeks - 1)) / 2.5) * 2.5;
  const weeks = 8;
  let planIndex = 0;
  for (let w = 0; w < weeks; w++) {
    for (const offset of [1, 3, 5, 6]) {
      const date = new Date(now);
      date.setHours(18, 30, 0, 0);
      date.setDate(now.getDate() - (weeks - 1 - w) * 7 - (7 - offset));
      if (date.getTime() > now.getTime() - dayMs) continue;
      const plan = plans[planIndex % plans.length];
      planIndex++;
      const entries: ExerciseEntry[] = plan.exercises.map((pe) => {
        const ex = exercises.find((e) => e.id === pe.exerciseId)!;
        const gain = pe.exerciseId === "bench" ? 7.5 : pe.exerciseId === "squat" ? 12.5 : pe.exerciseId === "deadlift" ? 15 : pe.exerciseId === "ohp" ? 5 : 5;
        const kg = ex.bodyweight ? 0 : progress(pe.kg, gain, w, weeks);
        const sets: SetEntry[] = Array.from({ length: pe.sets }, (_, i) => {
          const warm = i === 0 && !ex.bodyweight;
          return { id: uid(), type: warm ? "warmup" : "working", prevKg: null, prevReps: null, kg: warm ? Math.round((kg * 0.6) / 2.5) * 2.5 : kg, reps: pe.reps, done: true };
        });
        return { id: uid(), exerciseId: pe.exerciseId, name: ex.name, note: pe.note, restSeconds: pe.restSeconds, supersetGroup: pe.supersetGroup, sets };
      });
      const startedAt = date.getTime();
      out.push({ id: uid(), planId: plan.id, planName: plan.name, startedAt, finishedAt: startedAt + (50 + Math.round(Math.random() * 15)) * 60000, exercises: entries, currentIndex: entries.length - 1, shared: w === weeks - 1, sample: true });
    }
  }
  return out.sort((a, b) => a.startedAt - b.startedAt);
}

export function createSeedDb(lang: Language = "nl"): Db {
  const exercises = libraryExercises;
  const plans = seedPlansIn(lang);
  return {
    version: DB_VERSION,
    createdAt: Date.now(),
    auth: { signedIn: false },
    // No name, no town, no starting year: those are the person's, and they are
    // asked for at sign-up. A fresh install must never present itself as somebody else.
    profile: { name: "", first: "", handle: "", city: "", since: String(new Date().getFullYear()), units: "kg", onboarded: false, favourites: ["bench", "squat", "deadlift", "ohp"] },
    exercises,
    plans,
    sessions: seedSampleSessions(exercises, plans),
    activeSession: null,
    split: { name: "Push Pull Legs", days: seedSplitDays(plans), nextIndex: 0 },
    consent: { analytics: false, ageStats: false, marketing: false },
    following: ["u2", "u3", "u4", "u5", "u6", "u7"],
    blocked: [],
  };
}
