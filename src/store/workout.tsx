import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from "react";
import { planPushA, type ExerciseEntry, type SetEntry, type SetType } from "@/data/mock";

export type Session = { planName: string; startedAt: number; exercises: ExerciseEntry[]; currentIndex: number; finishedAt?: number };

type WorkoutState = {
  session: Session | null;
  rest: { total: number; left: number; nextLabel: string } | null;
  start: (planName?: string) => void;
  finish: () => void;
  discard: () => void;
  setCurrent: (index: number) => void;
  updateSet: (exerciseId: string, setId: string, patch: Partial<Pick<SetEntry, "kg" | "reps">>) => void;
  completeSet: (exerciseId: string, setId: string) => void;
  setSetType: (exerciseId: string, setId: string, type: SetType) => void;
  removeSet: (exerciseId: string, setId: string) => void;
  addSet: (exerciseId: string) => void;
  removeExercise: (exerciseId: string) => void;
  moveExercise: (exerciseId: string, direction: -1 | 1) => void;
  setRestSeconds: (exerciseId: string, seconds: number) => void;
  adjustRest: (delta: number) => void;
  skipRest: () => void;
};

const WorkoutContext = createContext<WorkoutState | null>(null);

export function WorkoutProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [rest, setRest] = useState<WorkoutState["rest"]>(null);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionRef = useRef<Session | null>(null);
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    if (!rest) {
      if (tick.current) clearInterval(tick.current);
      tick.current = null;
      return;
    }
    if (tick.current) return;
    tick.current = setInterval(() => {
      setRest((r) => {
        if (!r) return r;
        if (r.left <= 1) return null;
        return { ...r, left: r.left - 1 };
      });
    }, 1000);
    return () => {
      if (tick.current) clearInterval(tick.current);
      tick.current = null;
    };
  }, [rest]);

  const mutate = useCallback((fn: (s: Session) => Session) => setSession((s) => (s ? fn(s) : s)), []);
  const mapEx = (s: Session, exerciseId: string, fn: (e: ExerciseEntry) => ExerciseEntry): Session => ({ ...s, exercises: s.exercises.map((e) => (e.id === exerciseId ? fn(e) : e)) });

  const start = useCallback((planName = "Push A") => {
    setSession({ planName, startedAt: Date.now(), exercises: planPushA(), currentIndex: 1 });
    setRest(null);
  }, []);
  const finish = useCallback(() => {
    setRest(null);
    mutate((s) => ({ ...s, finishedAt: Date.now() }));
  }, [mutate]);
  const discard = useCallback(() => {
    setSession(null);
    setRest(null);
  }, []);
  const setCurrent = useCallback((index: number) => mutate((s) => ({ ...s, currentIndex: Math.max(0, Math.min(index, s.exercises.length - 1)) })), [mutate]);
  const updateSet = useCallback((exerciseId: string, setId: string, patch: Partial<Pick<SetEntry, "kg" | "reps">>) => mutate((s) => mapEx(s, exerciseId, (e) => ({ ...e, sets: e.sets.map((x) => (x.id === setId ? { ...x, ...patch } : x)) }))), [mutate]);
  const completeSet = useCallback(
    (exerciseId: string, setId: string) => {
      const s = sessionRef.current;
      const ex = s?.exercises.find((e) => e.id === exerciseId);
      if (!s || !ex) return;
      const idx = ex.sets.findIndex((x) => x.id === setId);
      const wasDone = ex.sets[idx]?.done;
      mutate((cur) => mapEx(cur, exerciseId, (e) => ({ ...e, sets: e.sets.map((x) => (x.id === setId ? { ...x, done: !x.done } : x)) })));
      if (wasDone) return;
      const next = ex.sets.slice(idx + 1).find((x) => !x.done);
      const label = next ? `Set ${ex.sets.indexOf(next) + 1} · ${next.kg ? `${next.kg} kg × ` : ""}${next.reps}` : "Next exercise";
      setRest({ total: ex.restSeconds, left: ex.restSeconds, nextLabel: label });
    },
    [mutate],
  );
  const setSetType = useCallback((exerciseId: string, setId: string, type: SetType) => mutate((s) => mapEx(s, exerciseId, (e) => ({ ...e, sets: e.sets.map((x) => (x.id === setId ? { ...x, type } : x)) }))), [mutate]);
  const removeSet = useCallback((exerciseId: string, setId: string) => mutate((s) => mapEx(s, exerciseId, (e) => ({ ...e, sets: e.sets.filter((x) => x.id !== setId) }))), [mutate]);
  const addSet = useCallback(
    (exerciseId: string) =>
      mutate((s) =>
        mapEx(s, exerciseId, (e) => {
          const last = e.sets[e.sets.length - 1];
          return { ...e, sets: [...e.sets, { id: `s${Date.now()}`, type: "working", prevKg: last?.kg ?? null, prevReps: last?.reps ?? null, kg: last?.kg ?? 0, reps: last?.reps ?? 8, done: false }] };
        }),
      ),
    [mutate],
  );
  const removeExercise = useCallback((exerciseId: string) => mutate((s) => ({ ...s, exercises: s.exercises.filter((e) => e.id !== exerciseId), currentIndex: Math.min(s.currentIndex, s.exercises.length - 2) })), [mutate]);
  const moveExercise = useCallback(
    (exerciseId: string, direction: -1 | 1) =>
      mutate((s) => {
        const i = s.exercises.findIndex((e) => e.id === exerciseId);
        const j = i + direction;
        if (i < 0 || j < 0 || j >= s.exercises.length) return s;
        const next = [...s.exercises];
        [next[i], next[j]] = [next[j], next[i]];
        return { ...s, exercises: next, currentIndex: s.currentIndex === i ? j : s.currentIndex === j ? i : s.currentIndex };
      }),
    [mutate],
  );
  const setRestSeconds = useCallback((exerciseId: string, seconds: number) => mutate((s) => mapEx(s, exerciseId, (e) => ({ ...e, restSeconds: seconds }))), [mutate]);
  const adjustRest = useCallback((delta: number) => setRest((r) => (r ? { ...r, left: Math.max(1, r.left + delta), total: Math.max(r.total, r.left + delta) } : r)), []);
  const skipRest = useCallback(() => setRest(null), []);

  const value = useMemo<WorkoutState>(
    () => ({ session, rest, start, finish, discard, setCurrent, updateSet, completeSet, setSetType, removeSet, addSet, removeExercise, moveExercise, setRestSeconds, adjustRest, skipRest }),
    [session, rest, start, finish, discard, setCurrent, updateSet, completeSet, setSetType, removeSet, addSet, removeExercise, moveExercise, setRestSeconds, adjustRest, skipRest],
  );
  return <WorkoutContext.Provider value={value}>{children}</WorkoutContext.Provider>;
}

export function useWorkout() {
  const ctx = useContext(WorkoutContext);
  if (!ctx) throw new Error("useWorkout must be used inside WorkoutProvider");
  return ctx;
}

/** Derived numbers used by the strip, summary and post. */
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
  const elapsed = `${Math.floor(totalSec / 60)}:${String(totalSec % 60).padStart(2, "0")}`;
  return { volume, setsDone, setsTotal, minutes, elapsed };
}

export const fmtKg = (kg: number) => (kg >= 1000 ? `${(kg / 1000).toFixed(1)}k` : `${kg}`);
export const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
