import { DB_VERSION, type Db, type Exercise, type ExerciseEntry, type Plan, type Session, type SetEntry, type SplitDay } from "./types";
import { uid } from "./storage";

/** Exercise library. Enough to build the default plans; users add their own. */
export const seedExercises: Exercise[] = [
  { id: "bench", name: "Bench press", muscles: "Chest, triceps", equipment: "Barbell" },
  { id: "incline-db", name: "Incline dumbbell press", muscles: "Upper chest", equipment: "Dumbbells" },
  { id: "dips", name: "Dips", muscles: "Chest, triceps", equipment: "Bodyweight", bodyweight: true },
  { id: "lateral-raise", name: "Lateral raise", muscles: "Side delts", equipment: "Dumbbells" },
  { id: "ohp", name: "Overhead press", muscles: "Shoulders", equipment: "Barbell" },
  { id: "cable-fly", name: "Cable fly", muscles: "Chest", equipment: "Cable" },
  { id: "pushdown", name: "Triceps pushdown", muscles: "Triceps", equipment: "Cable" },
  { id: "deadlift", name: "Deadlift", muscles: "Back, hamstrings, glutes", equipment: "Barbell" },
  { id: "pullup", name: "Pull-up", muscles: "Lats, biceps", equipment: "Bodyweight", bodyweight: true },
  { id: "row", name: "Barbell row", muscles: "Back", equipment: "Barbell" },
  { id: "lat-pulldown", name: "Lat pulldown", muscles: "Lats", equipment: "Cable" },
  { id: "face-pull", name: "Face pull", muscles: "Rear delts", equipment: "Cable" },
  { id: "curl", name: "Barbell curl", muscles: "Biceps", equipment: "Barbell" },
  { id: "hammer-curl", name: "Hammer curl", muscles: "Biceps, forearms", equipment: "Dumbbells" },
  { id: "preacher-curl", name: "Preacher curl", muscles: "Biceps", equipment: "Machine" },
  { id: "squat", name: "Squat", muscles: "Quads, glutes", equipment: "Barbell" },
  { id: "rdl", name: "Romanian deadlift", muscles: "Hamstrings, glutes", equipment: "Barbell" },
  { id: "leg-press", name: "Leg press", muscles: "Quads", equipment: "Machine" },
  { id: "leg-curl", name: "Leg curl", muscles: "Hamstrings", equipment: "Machine" },
  { id: "calf-raise", name: "Calf raise", muscles: "Calves", equipment: "Machine" },
  { id: "chest-press", name: "Chest press machine", muscles: "Chest", equipment: "Machine" },
  { id: "skull-crusher", name: "Skull crusher", muscles: "Triceps", equipment: "Barbell" },
  { id: "rear-delt-fly", name: "Rear delt fly", muscles: "Rear delts", equipment: "Dumbbells" },
  { id: "plank", name: "Plank", muscles: "Core", equipment: "Bodyweight", bodyweight: true },
  { id: "incline-bench", name: "Incline bench press", muscles: "Upper chest", equipment: "Barbell" },
  { id: "db-bench", name: "Dumbbell bench press", muscles: "Chest, triceps", equipment: "Dumbbells" },
  { id: "db-fly", name: "Dumbbell fly", muscles: "Chest", equipment: "Dumbbells" },
  { id: "pec-deck", name: "Pec deck", muscles: "Chest", equipment: "Machine" },
  { id: "pushup", name: "Push-up", muscles: "Chest, triceps", equipment: "Bodyweight", bodyweight: true },
  { id: "db-shoulder-press", name: "Dumbbell shoulder press", muscles: "Shoulders", equipment: "Dumbbells" },
  { id: "arnold-press", name: "Arnold press", muscles: "Shoulders", equipment: "Dumbbells" },
  { id: "cable-lateral-raise", name: "Cable lateral raise", muscles: "Side delts", equipment: "Cable" },
  { id: "upright-row", name: "Upright row", muscles: "Shoulders, traps", equipment: "Barbell" },
  { id: "shrug", name: "Shrug", muscles: "Traps", equipment: "Dumbbells" },
  { id: "overhead-extension", name: "Overhead triceps extension", muscles: "Triceps", equipment: "Dumbbells" },
  { id: "close-grip-bench", name: "Close-grip bench press", muscles: "Triceps, chest", equipment: "Barbell" },
  { id: "chinup", name: "Chin-up", muscles: "Lats, biceps", equipment: "Bodyweight", bodyweight: true },
  { id: "cable-row", name: "Seated cable row", muscles: "Back", equipment: "Cable" },
  { id: "db-row", name: "Dumbbell row", muscles: "Back", equipment: "Dumbbells" },
  { id: "tbar-row", name: "T-bar row", muscles: "Back", equipment: "Barbell" },
  { id: "chest-supported-row", name: "Chest-supported row", muscles: "Back", equipment: "Machine" },
  { id: "straight-arm-pulldown", name: "Straight-arm pulldown", muscles: "Lats", equipment: "Cable" },
  { id: "back-extension", name: "Back extension", muscles: "Lower back, glutes", equipment: "Bodyweight", bodyweight: true },
  { id: "ez-curl", name: "EZ-bar curl", muscles: "Biceps", equipment: "Barbell" },
  { id: "incline-curl", name: "Incline dumbbell curl", muscles: "Biceps", equipment: "Dumbbells" },
  { id: "cable-curl", name: "Cable curl", muscles: "Biceps", equipment: "Cable" },
  { id: "front-squat", name: "Front squat", muscles: "Quads", equipment: "Barbell" },
  { id: "hack-squat", name: "Hack squat", muscles: "Quads", equipment: "Machine" },
  { id: "goblet-squat", name: "Goblet squat", muscles: "Quads, glutes", equipment: "Dumbbells" },
  { id: "bulgarian-split-squat", name: "Bulgarian split squat", muscles: "Quads, glutes", equipment: "Dumbbells" },
  { id: "walking-lunge", name: "Walking lunge", muscles: "Quads, glutes", equipment: "Dumbbells" },
  { id: "leg-extension", name: "Leg extension", muscles: "Quads", equipment: "Machine" },
  { id: "seated-leg-curl", name: "Seated leg curl", muscles: "Hamstrings", equipment: "Machine" },
  { id: "hip-thrust", name: "Hip thrust", muscles: "Glutes", equipment: "Barbell" },
  { id: "sumo-deadlift", name: "Sumo deadlift", muscles: "Glutes, hamstrings", equipment: "Barbell" },
  { id: "trap-bar-deadlift", name: "Trap bar deadlift", muscles: "Quads, back, glutes", equipment: "Barbell" },
  { id: "seated-calf-raise", name: "Seated calf raise", muscles: "Calves", equipment: "Machine" },
  { id: "hip-abduction", name: "Hip abduction", muscles: "Glutes", equipment: "Machine" },
  { id: "kb-swing", name: "Kettlebell swing", muscles: "Glutes, hamstrings", equipment: "Kettlebell" },
  { id: "farmers-walk", name: "Farmer's walk", muscles: "Grip, core", equipment: "Dumbbells" },
  { id: "hanging-leg-raise", name: "Hanging leg raise", muscles: "Core", equipment: "Bodyweight", bodyweight: true },
  { id: "cable-crunch", name: "Cable crunch", muscles: "Core", equipment: "Cable" },
  { id: "ab-wheel", name: "Ab wheel rollout", muscles: "Core", equipment: "Bodyweight", bodyweight: true },
  { id: "russian-twist", name: "Russian twist", muscles: "Obliques", equipment: "Bodyweight", bodyweight: true },
];

const px = (exerciseId: string, sets: number, reps: number, kg: number, restSeconds: number, note?: string, supersetGroup?: string) => ({ exerciseId, sets, reps, kg, restSeconds, note, supersetGroup });

export const seedPlans: Plan[] = [
  { id: "push", name: "Push", focus: "Chest, shoulders, triceps", createdAt: 0, exercises: [px("bench", 4, 5, 95, 150, "Feet planted, pause on the chest"), px("incline-db", 4, 10, 30, 90, "Elbows tucked, pause at the bottom"), px("dips", 3, 12, 0, 90), px("lateral-raise", 3, 15, 10, 60, undefined, "A"), px("ohp", 3, 8, 50, 60, undefined, "A"), px("cable-fly", 3, 12, 25, 60)] },
  { id: "pull", name: "Pull", focus: "Back, biceps", createdAt: 0, exercises: [px("deadlift", 3, 5, 140, 180), px("pullup", 4, 8, 0, 120), px("row", 4, 8, 70, 90), px("lat-pulldown", 3, 12, 60, 60), px("face-pull", 3, 15, 25, 60, undefined, "A"), px("curl", 3, 10, 30, 60, undefined, "A")] },
  { id: "legs", name: "Legs", focus: "Quads, hamstrings, glutes", createdAt: 0, exercises: [px("squat", 4, 5, 120, 180), px("rdl", 3, 8, 100, 120), px("leg-press", 3, 12, 180, 90), px("leg-curl", 3, 12, 45, 60), px("calf-raise", 4, 15, 80, 45)] },
  { id: "chest-back", name: "Chest & Back", focus: "Pressing and rowing, paired", createdAt: 0, exercises: [px("bench", 4, 8, 85, 120, undefined, "A"), px("row", 4, 8, 70, 120, undefined, "A"), px("chest-press", 3, 12, 60, 90, undefined, "B"), px("lat-pulldown", 3, 12, 60, 90, undefined, "B"), px("cable-fly", 3, 15, 20, 60), px("face-pull", 3, 15, 25, 60)] },
  { id: "arms-shoulders", name: "Arms & Shoulders", focus: "Biceps, triceps, delts", createdAt: 0, exercises: [px("ohp", 4, 6, 50, 120), px("lateral-raise", 4, 15, 10, 60), px("curl", 3, 10, 30, 60, undefined, "A"), px("pushdown", 3, 12, 30, 60, undefined, "A"), px("hammer-curl", 3, 12, 14, 60, undefined, "B"), px("skull-crusher", 3, 10, 30, 60, undefined, "B")] },
];

/** Templates offered when adding a day to a split: every plan, plus a rest day. */
export const splitTemplates = (plans: Plan[]): Omit<SplitDay, "id">[] => [
  ...plans.map((p) => ({ name: p.name, focus: p.focus, planId: p.id, exercises: p.exercises.length, minutes: estimateMinutes(p) })),
  { name: "Rest day", focus: "Recover. Walk, sleep, eat.", rest: true },
];

export const seedSplitDays = (): SplitDay[] =>
  seedPlans.map((p) => ({ id: uid(), name: p.name, focus: p.focus, planId: p.id, exercises: p.exercises.length, minutes: estimateMinutes(p) }));

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

export function createSeedDb(): Db {
  const exercises = seedExercises;
  const plans = seedPlans;
  return {
    version: DB_VERSION,
    createdAt: Date.now(),
    auth: { signedIn: false },
    profile: { name: "Nick Li", first: "Nick", handle: "@nickli", city: "Amsterdam", since: "2021", units: "kg", onboarded: false, favourites: ["bench", "squat", "deadlift", "ohp"] },
    exercises,
    plans,
    sessions: seedSampleSessions(exercises, plans),
    activeSession: null,
    split: { name: "Push Pull Legs, 5 days", days: seedSplitDays(), nextIndex: 0 },
    consent: { analytics: false, ageStats: false, marketing: false },
    following: ["u2", "u3", "u4", "u5", "u6", "u7"],
    blocked: [],
  };
}
