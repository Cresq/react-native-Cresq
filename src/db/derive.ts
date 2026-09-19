import { fmtLoad, isBodyweight } from "@/load";
import type { Db, Exercise, ExerciseEntry, Plan, PlanExercise, PlannedSet, Session, SetEntry, SetType } from "./types";
import { uid } from "./storage";

/** Epley estimate of a one-rep max. Warm-ups are excluded everywhere this is used. */
export const e1rm = (kg: number, reps: number) => (reps <= 1 ? kg : kg * (1 + reps / 30));

/** A set counts once it is ticked, is not a warm-up, and actually has reps in it. A ticked empty row is not a lift. */
export const isWorking = (s: SetEntry) => s.done && s.type !== "warmup" && s.reps > 0;

export const fmtKg = (kg: number) => (kg >= 1000 ? `${(kg / 1000).toFixed(1)}k` : `${Math.round(kg * 10) / 10}`);
export const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
/** Locale for dates and relative words. Set once from the profile language; "nl-NL" by default. */
export let locale = "nl-NL";
export const setLocale = (l: string) => {
  locale = l;
};
export const shortDate = (t: number) => new Date(t).toLocaleDateString(locale, { day: "numeric", month: "short" }).replace(".", "");
export const longDate = (t: number) => new Date(t).toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long" });
export const relativeDay = (t: number) => {
  const days = Math.floor((startOfDay(Date.now()) - startOfDay(t)) / 86400000);
  const nl = locale.startsWith("nl");
  if (days <= 0) return nl ? "vandaag" : "today";
  if (days === 1) return nl ? "gisteren" : "yesterday";
  if (days < 7) return nl ? `${days} dagen geleden` : `${days} days ago`;
  if (days < 14) return nl ? "vorige week" : "last week";
  const w = Math.floor(days / 7);
  return nl ? `${w} weken geleden` : `${w} weeks ago`;
};

/** How long ago, in the smallest unit that reads well: just now, minutes, hours, then the day. */
export const relativeTime = (t: number, now: number) => {
  const nl = locale.startsWith("nl");
  const m = Math.floor((now - t) / 60000);
  if (m < 1) return nl ? "zojuist" : "just now";
  if (m < 60) return nl ? `${m} min geleden` : `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 12) return nl ? `${h} uur geleden` : h === 1 ? "1 hour ago" : `${h} hours ago`;
  return relativeDay(t);
};

export function startOfDay(t: number) {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** How far a weigh-in may be from a session and still be called the weight it was done at. */
const BODY_WEIGHT_WINDOW = 10 * 86_400_000;

/**
 * What somebody weighed around the moment `t`: the weigh-in nearest to it,
 * before or after, as long as it is within ten days. Body weight moves slowly,
 * so a figure from last week is a fair answer; one from last spring is not,
 * and then there is no answer rather than a wrong one. The weight given when
 * Food was first opened counts as a weigh-in on that day.
 */
export function bodyWeightAt(db: Pick<Db, "weights" | "profile">, t: number): { kg: number; at: number } | undefined {
  const given = db.profile.food?.weightKg && db.profile.food.onboardedAt ? [{ kg: db.profile.food.weightKg, at: db.profile.food.onboardedAt }] : [];
  let best: { kg: number; at: number } | undefined;
  for (const w of [...(db.weights ?? []), ...given]) {
    const gap = Math.abs(w.at - t);
    if (gap <= BODY_WEIGHT_WINDOW && (!best || gap < Math.abs(best.at - t))) best = { kg: w.kg, at: w.at };
  }
  return best;
}

/** Monday 00:00 of the week containing t. */
export function startOfWeek(t: number) {
  const d = new Date(startOfDay(t));
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return d.getTime();
}

export function sessionStats(session: Session | null, now = Date.now()) {
  if (!session) return { volume: 0, setsDone: 0, setsTotal: 0, minutes: 0, elapsed: "0:00" };
  let volume = 0;
  let setsDone = 0;
  let setsTotal = 0;
  for (const e of session.exercises) {
    for (const s of e.sets) {
      setsTotal++;
      if (s.done) {
        setsDone++;
        if (s.type !== "warmup") volume += s.kg * s.reps;
      }
    }
  }
  const ms = (session.finishedAt ?? now) - session.startedAt;
  const minutes = Math.max(1, Math.round(ms / 60000));
  const totalSec = Math.floor(ms / 1000);
  return { volume, setsDone, setsTotal, minutes, elapsed: `${Math.floor(totalSec / 60)}:${String(totalSec % 60).padStart(2, "0")}` };
}

export const finished = (sessions: Session[]) => sessions.filter((s) => s.finishedAt).sort((a, b) => a.startedAt - b.startedAt);

/** Best working set of an exercise in a session, by estimated 1RM. */
export function bestSet(session: Session, exerciseId: string) {
  let best: SetEntry | null = null;
  for (const e of session.exercises) {
    if (e.exerciseId !== exerciseId) continue;
    for (const s of e.sets) if (isWorking(s) && (!best || e1rm(s.kg, s.reps) > e1rm(best.kg, best.reps))) best = s;
  }
  return best;
}

export type TrendPoint = { value: number; date: number; record?: boolean };

/** Estimated 1RM per session for one exercise, oldest first, with records marked. */
export function liftTrend(sessions: Session[], exerciseId: string): TrendPoint[] {
  const points: TrendPoint[] = [];
  let bestKg = 0;
  for (const s of finished(sessions)) {
    const b = bestSet(s, exerciseId);
    if (!b || !b.kg) continue;
    const record = b.kg > bestKg;
    if (record) bestKg = b.kg;
    points.push({ value: Math.round(e1rm(b.kg, b.reps) * 2) / 2, date: s.startedAt, record });
  }
  return points;
}

export type Forecast = { slopePerWeek: number; target: number; weeksToTarget: number | null; values: number[] };

/** Linear fit over the last six points, projected three sessions ahead. Honest when the trend is flat. */
export function forecast(points: TrendPoint[]): Forecast | null {
  if (points.length < 3) return null;
  const recent = points.slice(-6);
  const xs = recent.map((p) => p.date / (7 * 86400000));
  const ys = recent.map((p) => p.value);
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
  const my = ys.reduce((a, b) => a + b, 0) / ys.length;
  const slope = xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0) / Math.max(1e-9, xs.reduce((a, x) => a + (x - mx) ** 2, 0));
  const current = ys[ys.length - 1];
  const target = Math.floor(current / 5) * 5 + 5;
  const weeksToTarget = slope > 0.05 ? Math.ceil((target - current) / slope) : null;
  const values = [1, 2, 3].map((k) => Math.round((current + slope * k * 0.6) * 2) / 2);
  return { slopePerWeek: slope, target, weeksToTarget, values };
}

export type Record = { exerciseId: string; name: string; kg: number; reps: number; date: number; previous: number | null };

/** All-time best working weight per exercise, with the previous best for context. */
export function records(sessions: Session[], exercises: Exercise[]): Record[] {
  const out: Record[] = [];
  for (const ex of exercises) {
    let best: Record | null = null;
    let previous: number | null = null;
    for (const s of finished(sessions)) {
      const b = bestSet(s, ex.id);
      if (!b || !b.kg) continue;
      if (!best || b.kg > best.kg) {
        previous = best ? best.kg : null;
        best = { exerciseId: ex.id, name: ex.name, kg: b.kg, reps: b.reps, date: s.startedAt, previous };
      }
    }
    if (best) out.push(best);
  }
  return out.sort((a, b) => b.date - a.date);
}

/** Records set in this session: exercises whose top working weight beats everything before. */
export function newRecords(session: Session, priorSessions: Session[]) {
  const out: Record[] = [];
  // The same movement can appear twice in one session; it is still one record.
  const seen = new Set<string>();
  for (const e of session.exercises) {
    if (seen.has(e.exerciseId)) continue;
    seen.add(e.exerciseId);
    const top = bestSet(session, e.exerciseId);
    if (!top || !top.kg) continue;
    let priorBest = 0;
    for (const s of priorSessions) {
      if (s.id === session.id) continue;
      const b = bestSet(s, e.exerciseId);
      if (b && b.kg > priorBest) priorBest = b.kg;
    }
    if (top.kg > priorBest) out.push({ exerciseId: e.exerciseId, name: e.name, kg: top.kg, reps: top.reps, date: session.startedAt, previous: priorBest || null });
  }
  return out;
}

export type Comparison = { exerciseId: string; name: string; detail: string; delta: string; tone: "ember" | "neutral" | "warning" };

/** Per-exercise change against the last finished session with the same plan name. */
export function compareToLast(session: Session, sessions: Session[]): { previous: Session | null; rows: Comparison[] } {
  const previous = finished(sessions).filter((s) => s.id !== session.id && s.planName === session.planName && s.startedAt < session.startedAt).pop() ?? null;
  const rows: Comparison[] = session.exercises.map((e) => {
    const top = bestSet(session, e.exerciseId);
    const working = e.sets.filter(isWorking);
    const detail = top ? `${working.length} × ${top.reps}${top.kg || isBodyweight(e.exerciseId) ? `, ${fmtLoad(top.kg, isBodyweight(e.exerciseId))}` : ""}` : "not done";
    if (!top) return { exerciseId: e.exerciseId, name: e.name, detail, delta: "skipped", tone: "neutral" };
    if (!previous) return { exerciseId: e.exerciseId, name: e.name, detail, delta: "first time", tone: "neutral" };
    const prevTop = bestSet(previous, e.exerciseId);
    if (!prevTop) return { exerciseId: e.exerciseId, name: e.name, detail, delta: "new", tone: "neutral" };
    const dKg = top.kg - prevTop.kg;
    const dReps = top.reps - prevTop.reps;
    if (dKg > 0) return { exerciseId: e.exerciseId, name: e.name, detail, delta: `+${dKg} kg`, tone: "ember" };
    if (dKg < 0) return { exerciseId: e.exerciseId, name: e.name, detail, delta: `${dKg} kg`, tone: "warning" };
    if (dReps > 0) return { exerciseId: e.exerciseId, name: e.name, detail, delta: `+${dReps} rep${dReps > 1 ? "s" : ""}`, tone: "ember" };
    if (dReps < 0) return { exerciseId: e.exerciseId, name: e.name, detail, delta: `${dReps} rep${dReps < -1 ? "s" : ""}`, tone: "warning" };
    return { exerciseId: e.exerciseId, name: e.name, detail, delta: "same", tone: "neutral" };
  });
  return { previous, rows };
}

export type DayState = "done" | "rest" | "missed" | "today" | "future";

/** This week, Monday to Sunday. Past days with a session are done; today is today; the rest is quiet. */
export function weekDays(sessions: Session[], now = Date.now()) {
  const start = startOfWeek(now);
  const today = startOfDay(now);
  const letters = locale.startsWith("nl") ? ["M", "D", "W", "D", "V", "Z", "Z"] : ["M", "T", "W", "T", "F", "S", "S"];
  return letters.map((letter, i) => {
    const day = start + i * 86400000;
    const session = sessions.find((s) => s.finishedAt && startOfDay(s.startedAt) === day);
    const state: DayState = session ? "done" : day === today ? "today" : day > today ? "future" : "rest";
    return { num: String(new Date(day).getDate()), letter, state, sessionId: session?.id };
  });
}

export function weeklyVolume(sessions: Session[], now = Date.now(), active?: Session | null) {
  const thisStart = startOfWeek(now);
  const lastStart = thisStart - 7 * 86400000;
  const sum = (from: number, to: number) => finished(sessions).filter((s) => s.startedAt >= from && s.startedAt < to).reduce((n, s) => n + sessionStats(s).volume, 0);
  // A session still running counts: the figure is what you have lifted this week, not what you have filed.
  const live = active && !active.finishedAt && active.startedAt >= thisStart ? sessionStats(active).volume : 0;
  const current = sum(thisStart, thisStart + 7 * 86400000) + live;
  const last = sum(lastStart, thisStart);
  const delta = last ? Math.round(((current - last) / last) * 1000) / 10 : null;
  return { current, last, delta };
}

/** Volume per week, most recent first, for the weeks that hold a session. */
export function volumeByWeek(sessions: Session[], weeks = 12, now = Date.now(), active?: Session | null) {
  const thisStart = startOfWeek(now);
  const out: { start: number; week: number; volume: number; sessions: number }[] = [];
  for (let i = 0; i < weeks; i++) {
    const start = thisStart - i * 7 * 86400000;
    const end = start + 7 * 86400000;
    const inWeek = finished(sessions).filter((s) => s.startedAt >= start && s.startedAt < end);
    const live = active && !active.finishedAt && active.startedAt >= start && active.startedAt < end ? sessionStats(active).volume : 0;
    const running = live > 0 ? 1 : 0;
    out.push({ start, week: isoWeek(start), volume: inWeek.reduce((n, s) => n + sessionStats(s).volume, 0) + live, sessions: inWeek.length + running });
  }
  return out;
}

/** ISO week number, the one people mean when they say "week 38". */
export function isoWeek(t: number) {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const first = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d.getTime() - first.getTime()) / 86400000 - 3 + ((first.getDay() + 6) % 7)) / 7);
}

/**
 * Muscle groups, in the order people think about them. An exercise names its
 * muscles in plain words ("Chest, triceps"); these patterns turn those words
 * into the group they belong to.
 */
export const MUSCLE_GROUPS = ["Chest", "Back", "Shoulders", "Biceps", "Triceps", "Quads", "Hamstrings", "Glutes", "Calves", "Core"] as const;
export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

/** Short names, for a chart axis where a full word will not fit. */
export const MUSCLE_SHORT: { [K in MuscleGroup]: string } = { Chest: "Borst", Back: "Rug", Shoulders: "Schoud", Biceps: "Biceps", Triceps: "Triceps", Quads: "Quads", Hamstrings: "Hams", Glutes: "Bil", Calves: "Kuit", Core: "Core" };

/** Dutch names for the groups. Kept out of the dictionary because "Back" there means the back button. */
export const MUSCLE_NL: { [K in MuscleGroup]: string } = { Chest: "Borst", Back: "Rug", Shoulders: "Schouders", Biceps: "Biceps", Triceps: "Triceps", Quads: "Quadriceps", Hamstrings: "Hamstrings", Glutes: "Bilspieren", Calves: "Kuiten", Core: "Core" };

const MUSCLE_WORDS: [RegExp, MuscleGroup][] = [
  [/chest|pec/i, "Chest"],
  [/back|lat|rhomboid|trap/i, "Back"],
  [/delt|shoulder/i, "Shoulders"],
  [/bicep/i, "Biceps"],
  [/tricep/i, "Triceps"],
  [/quad/i, "Quads"],
  [/hamstring/i, "Hamstrings"],
  [/glute/i, "Glutes"],
  [/calf|calve/i, "Calves"],
  [/core|oblique|abs/i, "Core"],
];

/** Every group an exercise works, first one first. Lower back counts as Back, forearms and grip as nothing. */
export function musclesOf(exercise: Exercise | undefined): MuscleGroup[] {
  if (!exercise) return [];
  const out: MuscleGroup[] = [];
  for (const part of exercise.muscles.split(",")) {
    for (const [re, group] of MUSCLE_WORDS) {
      if (re.test(part) && !out.includes(group)) {
        out.push(group);
        break;
      }
    }
  }
  return out;
}

export type MuscleLoad = { group: MuscleGroup; sets: number; previous: number; volume: number; exercises: string[] };

/**
 * Working sets per muscle group over the last `days`, against the same length
 * of time before it. Sets are what people plan by, so they lead; every muscle
 * an exercise names gets the set, and only the first gets the volume, so the
 * kilos are never counted twice.
 */
export function muscleLoad(sessions: Session[], exercises: Exercise[], days = 7, now = Date.now(), active?: Session | null): MuscleLoad[] {
  const from = startOfDay(now) - (days - 1) * 86400000;
  const before = from - days * 86400000;
  const byId = new Map(exercises.map((e) => [e.id, e]));
  const load = new Map<MuscleGroup, MuscleLoad>();
  for (const g of MUSCLE_GROUPS) load.set(g, { group: g, sets: 0, previous: 0, volume: 0, exercises: [] });

  const count = (s: Session, window: "now" | "before") => {
    for (const e of s.exercises) {
      const groups = musclesOf(byId.get(e.exerciseId));
      const sets = e.sets.filter(isWorking);
      if (!groups.length || !sets.length) continue;
      const volume = sets.reduce((n, x) => n + x.kg * x.reps, 0);
      groups.forEach((g, i) => {
        const row = load.get(g)!;
        if (window === "before") row.previous += sets.length;
        else {
          row.sets += sets.length;
          if (i === 0) row.volume += volume;
          if (!row.exercises.includes(e.name)) row.exercises.push(e.name);
        }
      });
    }
  };

  const all = [...finished(sessions), ...(active && !active.finishedAt ? [active] : [])];
  for (const s of all) {
    if (s.startedAt >= from) count(s, "now");
    else if (s.startedAt >= before) count(s, "before");
  }
  return [...load.values()].sort((a, b) => b.sets - a.sets || a.group.localeCompare(b.group));
}

/** Consecutive weeks, ending this or last week, with at least one finished session. */
export function streakWeeks(sessions: Session[], now = Date.now()) {
  let weeks = 0;
  let start = startOfWeek(now);
  const has = (from: number) => sessions.some((s) => s.finishedAt && s.startedAt >= from && s.startedAt < from + 7 * 86400000);
  if (!has(start)) start -= 7 * 86400000;
  while (has(start)) {
    weeks++;
    start -= 7 * 86400000;
  }
  return weeks;
}

/** Last finished session that contained the exercise, for pre-filling a new session. */
function lastEntry(sessions: Session[], exerciseId: string) {
  for (const s of [...finished(sessions)].reverse()) {
    const e = s.exercises.find((x) => x.exerciseId === exerciseId);
    if (e) return e;
  }
  return null;
}

/** Build a fresh session from a plan, pre-filled with what happened last time. */
/** The sets a plan prescribes for one exercise: the edited list when there is one, else the summary expanded. */
export function plannedSets(pe: PlanExercise): PlannedSet[] {
  if (pe.setList && pe.setList.length) return pe.setList;
  return Array.from({ length: pe.sets }, () => ({ kg: pe.kg, reps: pe.reps, type: "working" as SetType }));
}

export function sessionFromPlan(plan: Plan, exercises: Exercise[], sessions: Session[]): Session {
  const entries: ExerciseEntry[] = plan.exercises.map((pe) => {
    const ex = exercises.find((e) => e.id === pe.exerciseId);
    const last = lastEntry(sessions, pe.exerciseId);
    const lastWorking = last?.sets.filter(isWorking) ?? [];
    const lastWarm = last?.sets.find((s) => s.type === "warmup" && s.done) ?? null;
    if (pe.setList && pe.setList.length) {
      let w = 0;
      const sets: SetEntry[] = pe.setList.map((ps) => {
        if (ps.type === "warmup") return { id: uid(), type: "warmup", prevKg: lastWarm ? lastWarm.kg : null, prevReps: lastWarm ? lastWarm.reps : null, kg: lastWarm?.kg ?? ps.kg, reps: lastWarm?.reps ?? ps.reps, done: false };
        const prev = lastWorking[w++] ?? lastWorking[lastWorking.length - 1];
        return { id: uid(), type: ps.type, prevKg: prev ? prev.kg : null, prevReps: prev ? prev.reps : null, kg: prev?.kg ?? ps.kg, reps: prev?.reps ?? ps.reps, done: false };
      });
      return { id: uid(), exerciseId: pe.exerciseId, name: ex?.name ?? pe.exerciseId, note: pe.note ?? last?.note, restSeconds: pe.restSeconds, supersetGroup: pe.supersetGroup, sets };
    }
    const hasWarm = !ex?.bodyweight && pe.kg >= 40;
    const sets: SetEntry[] = Array.from({ length: pe.sets }, (_, i) => {
      const warm = hasWarm && i === 0;
      if (warm) {
        const kg = lastWarm?.kg ?? Math.round((pe.kg * 0.6) / 2.5) * 2.5;
        return { id: uid(), type: "warmup", prevKg: lastWarm ? lastWarm.kg : null, prevReps: lastWarm ? lastWarm.reps : null, kg, reps: lastWarm?.reps ?? pe.reps, done: false };
      }
      const idx = i - (hasWarm ? 1 : 0);
      const prev = lastWorking[idx] ?? lastWorking[lastWorking.length - 1];
      return { id: uid(), type: "working", prevKg: prev ? prev.kg : null, prevReps: prev ? prev.reps : null, kg: prev?.kg ?? pe.kg, reps: prev?.reps ?? pe.reps, done: false };
    });
    return { id: uid(), exerciseId: pe.exerciseId, name: ex?.name ?? pe.exerciseId, note: pe.note ?? last?.note, restSeconds: pe.restSeconds, supersetGroup: pe.supersetGroup, sets };
  });
  return { id: uid(), planId: plan.id, planName: plan.name, startedAt: Date.now(), exercises: entries, currentIndex: 0 };
}

/** History rows for an exercise: date, top set, volume. Newest first. */
export function exerciseHistory(sessions: Session[], exerciseId: string) {
  return finished(sessions)
    .map((s) => {
      const e = s.exercises.find((x) => x.exerciseId === exerciseId);
      if (!e) return null;
      const top = bestSet(s, exerciseId);
      const working = e.sets.filter(isWorking);
      return { sessionId: s.id, planName: s.planName, date: s.startedAt, top, sets: working.length, volume: working.reduce((n, x) => n + x.kg * x.reps, 0) };
    })
    .filter((r): r is NonNullable<typeof r> => !!r)
    .reverse();
}

/** One line per exercise for a post without a photo: "3 × 5, 100 kg". */
export function sessionRows(session: Session) {
  return session.exercises
    .map((e) => {
      const done = e.sets.filter((s) => s.done && s.type !== "warmup");
      if (!done.length) return null;
      const top = done.reduce((a, b) => (b.kg > a.kg ? b : a), done[0]);
      const reps = done.every((s) => s.reps === done[0].reps) ? String(done[0].reps) : `${Math.min(...done.map((s) => s.reps))}–${Math.max(...done.map((s) => s.reps))}`;
      return { exerciseId: e.exerciseId, name: e.name, count: done.length, detail: `${done.length} × ${reps}${top.kg || isBodyweight(e.exerciseId) ? `, ${fmtLoad(top.kg, isBodyweight(e.exerciseId))}` : ""}` };
    })
    .filter((r): r is { exerciseId: string; name: string; count: number; detail: string } => !!r);
}
