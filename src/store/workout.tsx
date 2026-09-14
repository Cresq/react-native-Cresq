import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from "react";
import { useDb } from "@/db/DbProvider";
import type { Exercise, ExerciseEntry, Session, SetEntry, SetType } from "@/db/types";
import { haptic } from "@/haptics";
import { sessionFromPlan } from "@/db/derive";
import { uid } from "@/db/storage";

export { fmtKg, fmtTime, sessionStats } from "@/db/derive";
export type { Session };

type Rest = { total: number; left: number; nextLabel: string } | null;

type WorkoutState = {
  session: Session | null;
  rest: Rest;
  lastDiscarded: Session | null;
  undoDiscard: () => void;
  /** Start from a plan id, or a quick empty session with a name. */
  start: (planId?: string, name?: string) => void;
  finish: () => void;
  discard: () => void;
  /** Mark the finished session as shared to the feed (or not) and file it. */
  file: (shared: boolean) => void;
  setCurrent: (index: number) => void;
  updateSet: (exerciseId: string, setId: string, patch: Partial<Pick<SetEntry, "kg" | "reps">>) => void;
  completeSet: (exerciseId: string, setId: string) => void;
  setSetType: (exerciseId: string, setId: string, type: SetType) => void;
  removeSet: (exerciseId: string, setId: string) => void;
  addSet: (exerciseId: string) => void;
  addExercise: (exercise: Exercise) => void;
  removeExercise: (exerciseId: string) => void;
  moveExercise: (exerciseId: string, delta: number) => void;
  setRestSeconds: (exerciseId: string, seconds: number) => void;
  setNote: (exerciseId: string, note: string) => void;
  setCaption: (caption: string) => void;
  setPhoto: (photo: string | null) => void;
  swapExercise: (entryId: string, ex: Exercise) => void;
  toggleSuperset: (entryId: string) => void;
  groupExercises: (ids: string[]) => void;
  adjustRest: (delta: number) => void;
  skipRest: () => void;
};

const WorkoutContext = createContext<WorkoutState | null>(null);

/** True while a session is open and not yet finished. Safe anywhere, even outside the provider. */
export function useRunningSession() {
  const ctx = useContext(WorkoutContext);
  return !!ctx?.session && !ctx.session.finishedAt;
}

/**
 * The running session is stored in the database document (`activeSession`) so a
 * crash or restart mid-workout loses nothing. Finishing moves it into `sessions`.
 */
export function WorkoutProvider({ children }: PropsWithChildren) {
  const { db, update } = useDb();
  const session = db.activeSession;
  const [rest, setRest] = useState<Rest>(null);
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
    tick.current = setInterval(() => setRest((r) => (!r ? r : r.left <= 1 ? null : { ...r, left: r.left - 1 })), 1000);
    return () => {
      if (tick.current) clearInterval(tick.current);
      tick.current = null;
    };
  }, [rest]);

  const mutate = useCallback((fn: (s: Session) => Session) => update((d) => (d.activeSession ? { ...d, activeSession: fn(d.activeSession) } : d)), [update]);
  const mapEx = (s: Session, exerciseId: string, fn: (e: ExerciseEntry) => ExerciseEntry): Session => ({ ...s, exercises: s.exercises.map((e) => (e.id === exerciseId ? fn(e) : e)) });

  const start = useCallback(
    (planId?: string, name?: string) =>
      update((d) => {
        const plan = d.plans.find((p) => p.id === planId) ?? (name ? d.plans.find((p) => p.name.toLowerCase() === name.toLowerCase()) : undefined);
        const fresh = plan ? sessionFromPlan(plan, d.exercises, d.sessions) : { id: uid(), planName: name ?? "Quick session", startedAt: Date.now(), exercises: [], currentIndex: 0 };
        haptic("start");
        return { ...d, activeSession: fresh };
      }),
    [update],
  );
  const finish = useCallback(() => {
    setRest(null);
    mutate((s) => ({ ...s, finishedAt: Date.now() }));
  }, [mutate]);
  const [lastDiscarded, setLastDiscarded] = useState<Session | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Stops the session at once. It is kept for a few seconds so a slip can be undone. */
  const discard = useCallback(() => {
    setRest(null);
    update((d) => {
      if (d.activeSession) {
        setLastDiscarded(d.activeSession);
        if (undoTimer.current) clearTimeout(undoTimer.current);
        undoTimer.current = setTimeout(() => setLastDiscarded(null), 6000);
      }
      return { ...d, activeSession: null };
    });
  }, [update]);
  const undoDiscard = useCallback(() => {
    if (undoTimer.current) clearTimeout(undoTimer.current);
    setLastDiscarded((s) => {
      if (s) update((d) => ({ ...d, activeSession: s }));
      return null;
    });
  }, [update]);
  const file = useCallback(
    (shared: boolean) => {
      setRest(null);
      update((d) => {
        const s = d.activeSession;
        if (!s) return d;
        const done = { ...s, finishedAt: s.finishedAt ?? Date.now(), shared };
        const hasWork = done.exercises.some((e) => e.sets.some((x) => x.done));
        const sessions = hasWork ? [...d.sessions, done] : d.sessions;
        const dayIdx = d.split.days.findIndex((x) => x.planId === done.planId || x.name === done.planName);
        const split = hasWork && dayIdx === d.split.nextIndex ? { ...d.split, nextIndex: d.split.days.length ? (d.split.nextIndex + 1) % d.split.days.length : 0 } : d.split;
        return { ...d, sessions, split: { ...split, overridePlanId: undefined }, activeSession: null };
      });
    },
    [update],
  );
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
      const label = next ? `Set ${ex.sets.indexOf(next) + 1}, ${next.kg ? `${next.kg} kg × ` : ""}${next.reps}` : "Next exercise";
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
          return { ...e, sets: [...e.sets, { id: uid(), type: "working", prevKg: last?.kg ?? null, prevReps: last?.reps ?? null, kg: last?.kg ?? 0, reps: last?.reps ?? 8, done: false }] };
        }),
      ),
    [mutate],
  );
  const addExercise = useCallback(
    (exercise: Exercise) =>
      mutate((s) => ({
        ...s,
        exercises: [...s.exercises, { id: uid(), exerciseId: exercise.id, name: exercise.name, restSeconds: 90, sets: Array.from({ length: 3 }, () => ({ id: uid(), type: "working" as const, prevKg: null, prevReps: null, kg: exercise.bodyweight ? 0 : 20, reps: 10, done: false })) }],
      })),
    [mutate],
  );
  /** Replace the movement, keep the sets and their numbers. */
  const swapExercise = useCallback((entryId: string, ex: Exercise) => mutate((s) => mapEx(s, entryId, (e) => ({ ...e, exerciseId: ex.id, name: ex.name, sets: e.sets.map((x) => ({ ...x, prevKg: null, prevReps: null })) }))), [mutate]);
  /** Pair with the next exercise (or unpair): both get the same group letter. */
  const toggleSuperset = useCallback(
    (entryId: string) =>
      mutate((s) => {
        const i = s.exercises.findIndex((e) => e.id === entryId);
        if (i < 0) return s;
        const cur = s.exercises[i];
        if (cur.supersetGroup) return { ...s, exercises: s.exercises.map((e) => (e.supersetGroup === cur.supersetGroup ? { ...e, supersetGroup: undefined } : e)) };
        if (i + 1 >= s.exercises.length) return s;
        const g = String.fromCharCode(65 + i);
        return { ...s, exercises: s.exercises.map((e, k) => (k === i || k === i + 1 ? { ...e, supersetGroup: g } : e)) };
      }),
    [mutate],
  );
  /** Put exactly these exercises in one superset (ungrouping them from anything else). Fewer than two clears it. */
  const groupExercises = useCallback(
    (ids: string[]) =>
      mutate((s) => {
        const used = new Set(s.exercises.filter((e) => e.supersetGroup && !ids.includes(e.id)).map((e) => e.supersetGroup as string));
        let g = "A";
        while (used.has(g)) g = String.fromCharCode(g.charCodeAt(0) + 1);
        const group = ids.length >= 2 ? g : undefined;
        return { ...s, exercises: s.exercises.map((e) => (ids.includes(e.id) ? { ...e, supersetGroup: group } : e)) };
      }),
    [mutate],
  );
  const removeExercise = useCallback((exerciseId: string) => mutate((s) => ({ ...s, exercises: s.exercises.filter((e) => e.id !== exerciseId), currentIndex: Math.max(0, Math.min(s.currentIndex, s.exercises.length - 2)) })), [mutate]);
  /** Move an exercise by any number of places; the current exercise stays the current one. */
  const moveExercise = useCallback(
    (exerciseId: string, delta: number) =>
      mutate((s) => {
        const i = s.exercises.findIndex((e) => e.id === exerciseId);
        if (i < 0 || !delta) return s;
        const j = Math.max(0, Math.min(s.exercises.length - 1, i + delta));
        if (j === i) return s;
        const next = [...s.exercises];
        const [item] = next.splice(i, 1);
        next.splice(j, 0, item);
        const currentId = s.exercises[s.currentIndex]?.id;
        const currentIndex = currentId ? Math.max(0, next.findIndex((e) => e.id === currentId)) : s.currentIndex;
        return { ...s, exercises: next, currentIndex };
      }),
    [mutate],
  );
  const setRestSeconds = useCallback((exerciseId: string, seconds: number) => mutate((s) => mapEx(s, exerciseId, (e) => ({ ...e, restSeconds: seconds }))), [mutate]);
  const setNote = useCallback((exerciseId: string, note: string) => mutate((s) => mapEx(s, exerciseId, (e) => ({ ...e, note }))), [mutate]);
  const setCaption = useCallback((caption: string) => mutate((s) => ({ ...s, caption })), [mutate]);
  const setPhoto = useCallback((photo: string | null) => mutate((s) => ({ ...s, photo: photo ?? undefined })), [mutate]);
  const adjustRest = useCallback((delta: number) => setRest((r) => (r ? { ...r, left: Math.max(1, r.left + delta), total: Math.max(r.total, r.left + delta) } : r)), []);
  const skipRest = useCallback(() => setRest(null), []);

  const value = useMemo<WorkoutState>(
    () => ({ session, rest, lastDiscarded, undoDiscard, start, finish, discard, file, setCurrent, updateSet, completeSet, setSetType, removeSet, addSet, addExercise, removeExercise, moveExercise, setRestSeconds, setNote, setCaption, setPhoto, swapExercise, toggleSuperset, groupExercises, adjustRest, skipRest }),
    [session, rest, lastDiscarded, undoDiscard, start, finish, discard, file, setCurrent, updateSet, completeSet, setSetType, removeSet, addSet, addExercise, removeExercise, moveExercise, setRestSeconds, setNote, setCaption, setPhoto, swapExercise, toggleSuperset, groupExercises, adjustRest, skipRest],
  );
  return <WorkoutContext.Provider value={value}>{children}</WorkoutContext.Provider>;
}

export function useWorkout() {
  const ctx = useContext(WorkoutContext);
  if (!ctx) throw new Error("useWorkout must be used inside WorkoutProvider");
  return ctx;
}
