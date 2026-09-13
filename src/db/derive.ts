import type { Exercise, ExerciseEntry, Plan, PlanExercise, PlannedSet, Session, SetEntry, SetType } from "./types";
import { uid } from "./storage";

/** Epley estimate of a one-rep max. Warm-ups are excluded everywhere this is used. */
export const e1rm = (kg: number, reps: number) => (reps <= 1 ? kg : kg * (1 + reps / 30));

export const isWorking = (s: SetEntry) => s.done && s.type !== "warmup";

export const fmtKg = (kg: number) => (kg >= 1000 ? `${(kg / 1000).toFixed(1)}k` : `${Math.round(kg * 10) / 10}`);
export const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
export const shortDate = (t: number) => new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
export const longDate = (t: number) => new Date(t).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
export const relativeDay = (t: number) => {
  const days = Math.floor((startOfDay(Date.now()) - startOfDay(t)) / 86400000);
  return days <= 0 ? "today" : days === 1 ? "yesterday" : days < 7 ? `${days} days ago` : days < 14 ? "last week" : `${Math.floor(days / 7)} weeks ago`;
};

export function startOfDay(t: number) {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Monday 00:00 of the week containing t. */
export function startOfWeek(t: number) {
  const d = new Date(startOfDay(t));
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return d.getTime();
}

export function sessionStats(session: Session | null) {
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
  const ms = (session.finishedAt ?? Date.now()) - session.startedAt;
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
  for (const e of session.exercises) {
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

export type Comparison = { name: string; detail: string; delta: string; tone: "ember" | "neutral" | "warning" };

/** Per-exercise change against the last finished session with the same plan name. */
export function compareToLast(session: Session, sessions: Session[]): { previous: Session | null; rows: Comparison[] } {
  const previous = finished(sessions).filter((s) => s.id !== session.id && s.planName === session.planName && s.startedAt < session.startedAt).pop() ?? null;
  const rows: Comparison[] = session.exercises.map((e) => {
    const top = bestSet(session, e.exerciseId);
    const working = e.sets.filter(isWorking);
    const detail = top ? `${working.length} × ${top.reps}${top.kg ? ` · ${top.kg} kg` : ""}` : "not done";
    if (!top) return { name: e.name, detail, delta: "skipped", tone: "neutral" };
    if (!previous) return { name: e.name, detail, delta: "first time", tone: "neutral" };
    const prevTop = bestSet(previous, e.exerciseId);
    if (!prevTop) return { name: e.name, detail, delta: "new", tone: "neutral" };
    const dKg = top.kg - prevTop.kg;
    const dReps = top.reps - prevTop.reps;
    if (dKg > 0) return { name: e.name, detail, delta: `+${dKg} kg`, tone: "ember" };
    if (dKg < 0) return { name: e.name, detail, delta: `${dKg} kg`, tone: "warning" };
    if (dReps > 0) return { name: e.name, detail, delta: `+${dReps} rep${dReps > 1 ? "s" : ""}`, tone: "ember" };
    if (dReps < 0) return { name: e.name, detail, delta: `${dReps} rep${dReps < -1 ? "s" : ""}`, tone: "warning" };
    return { name: e.name, detail, delta: "same", tone: "neutral" };
  });
  return { previous, rows };
}

export type DayState = "done" | "rest" | "missed" | "today" | "future";

/** This week, Monday to Sunday. Past days with a session are done; today is today; the rest is quiet. */
export function weekDays(sessions: Session[], now = Date.now()) {
  const start = startOfWeek(now);
  const today = startOfDay(now);
  const letters = ["M", "T", "W", "T", "F", "S", "S"];
  return letters.map((letter, i) => {
    const day = start + i * 86400000;
    const session = sessions.find((s) => s.finishedAt && startOfDay(s.startedAt) === day);
    const state: DayState = session ? "done" : day === today ? "today" : day > today ? "future" : "rest";
    return { num: String(new Date(day).getDate()), letter, state, sessionId: session?.id };
  });
}

export function weeklyVolume(sessions: Session[], now = Date.now()) {
  const thisStart = startOfWeek(now);
  const lastStart = thisStart - 7 * 86400000;
  const sum = (from: number, to: number) => finished(sessions).filter((s) => s.startedAt >= from && s.startedAt < to).reduce((n, s) => n + sessionStats(s).volume, 0);
  const current = sum(thisStart, thisStart + 7 * 86400000);
  const last = sum(lastStart, thisStart);
  const delta = last ? Math.round(((current - last) / last) * 100) : null;
  return { current, last, delta };
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
