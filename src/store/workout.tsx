import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from "react";
import { useDb } from "@/db/DbProvider";
import type { Exercise, ExerciseEntry, Session, SetEntry, SetType, SharePrefs } from "@/db/types";
import { haptic } from "@/haptics";
import { sessionFromPlan } from "@/db/derive";
import { uid } from "@/db/storage";

export { fmtKg, fmtTime, sessionStats } from "@/db/derive";
export type { Session };

/**
 * `endsAt` is the truth and `left` is what it looks like. A timer counted down
 * a tick at a time stops while the phone sleeps and drifts while it runs, and
 * both are wrong in the same direction: it tells you to lift sooner than you
 * should.
 */
type Rest = { total: number; left: number; endsAt: number; next: { set: number; kg: number; reps: number } | null } | null;

/** Exercises as blocks: a superset is one block, a loose exercise is a block of one. */
function blocks(exs: ExerciseEntry[]) {
  const out: ExerciseEntry[][] = [];
  for (const e of exs) {
    const last = out[out.length - 1];
    if (e.supersetGroup && last && last[0].supersetGroup === e.supersetGroup) last.push(e);
    else out.push([e]);
  }
  return out;
}
/** Every superset's members side by side, at the place of the first member. */
function contiguous(exs: ExerciseEntry[]) {
  const seen = new Set<string>();
  const out: ExerciseEntry[] = [];
  for (const e of exs) {
    if (e.supersetGroup) {
      if (seen.has(e.supersetGroup)) continue;
      seen.add(e.supersetGroup);
      out.push(...exs.filter((x) => x.supersetGroup === e.supersetGroup));
    } else out.push(e);
  }
  return out;
}
/** The first group letter nobody outside `ids` is using, so two supersets can never share one. */
function freeGroup(exs: ExerciseEntry[], ids: string[]) {
  const used = new Set(exs.filter((e) => e.supersetGroup && !ids.includes(e.id)).map((e) => e.supersetGroup as string));
  let g = "A";
  while (used.has(g)) g = String.fromCharCode(g.charCodeAt(0) + 1);
  return g;
}
function keepCurrent(s: Session, next: ExerciseEntry[]): Session {
  const currentId = s.exercises[s.currentIndex]?.id;
  const currentIndex = currentId ? Math.max(0, next.findIndex((e) => e.id === currentId)) : s.currentIndex;
  return { ...s, exercises: next, currentIndex };
}

type WorkoutState = {
  session: Session | null;
  rest: Rest;
  lastDiscarded: Session | null;
  undoDiscard: () => void;
  /** Let the undo strip go without bringing the session back. */
  dismissDiscarded: () => void;
  /** Start from a plan id, or a quick empty session with a name. */
  start: (planId?: string, name?: string) => void;
  finish: () => void;
  discard: () => void;
  /** Mark the finished session as shared to the feed (or not) and file it. */
  file: (shared: boolean) => void;
  setCurrent: (index: number) => void;
  setDuration: (minutes: number) => void;
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
  setShare: (share: SharePrefs) => void;
  setGym: (gym: string) => void;
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

  const resting = !!rest;
  useEffect(() => {
    if (!resting) return;
    tick.current = setInterval(
      () =>
        setRest((r) => {
          if (!r) return r;
          const left = Math.max(0, Math.round((r.endsAt - Date.now()) / 1000));
          if (left <= 0) return null;
          return left === r.left ? r : { ...r, left };
        }),
      250,
    );
    return () => {
      if (tick.current) clearInterval(tick.current);
      tick.current = null;
    };
  }, [resting]);

  const mutate = useCallback((fn: (s: Session) => Session) => update((d) => (d.activeSession ? { ...d, activeSession: fn(d.activeSession) } : d)), [update]);
  const mapEx = (s: Session, exerciseId: string, fn: (e: ExerciseEntry) => ExerciseEntry): Session => ({ ...s, exercises: s.exercises.map((e) => (e.id === exerciseId ? fn(e) : e)) });

  const start = useCallback(
    (planId?: string, name?: string) =>
      update((d) => {
        // Someone already lifting keeps their session; the caller routes them back to it.
        if (d.activeSession && !d.activeSession.finishedAt) return d;
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
    const going = sessionRef.current;
    if (going) {
      setLastDiscarded(going);
      if (undoTimer.current) clearTimeout(undoTimer.current);
      undoTimer.current = setTimeout(() => setLastDiscarded(null), 6000);
    }
    update((d) => ({ ...d, activeSession: null }));
  }, [update]);
  const dismissDiscarded = useCallback(() => {
    if (undoTimer.current) clearTimeout(undoTimer.current);
    setLastDiscarded(null);
  }, []);
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
  /** How long it took, as the person says it did: the finish is moved, the start stays where it was. */
  const setDuration = useCallback((minutes: number) => mutate((s) => ({ ...s, finishedAt: s.startedAt + Math.max(1, Math.round(minutes)) * 60_000 })), [mutate]);
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
      const seconds = Math.max(1, ex.restSeconds || 60);
      // What comes next travels as numbers, not as a sentence: the sentence is written on screen, in the reader's language.
      setRest({ total: seconds, left: seconds, endsAt: Date.now() + seconds * 1000, next: next ? { set: ex.sets.indexOf(next) + 1, kg: next.kg, reps: next.reps } : null });
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
        const g = freeGroup(s.exercises, []);
        return { ...s, exercises: s.exercises.map((e, k) => (k === i || k === i + 1 ? { ...e, supersetGroup: g } : e)) };
      }),
    [mutate],
  );
  /** Put exactly these exercises in one superset (ungrouping them from anything else). Fewer than two clears it. */
  const groupExercises = useCallback(
    (ids: string[]) =>
      mutate((s) => {
        const group = ids.length >= 2 ? freeGroup(s.exercises, ids) : undefined;
        const moved = s.exercises.map((e) => (ids.includes(e.id) ? { ...e, supersetGroup: group } : e));
        const size: Record<string, number> = {};
        for (const e of moved) if (e.supersetGroup) size[e.supersetGroup] = (size[e.supersetGroup] ?? 0) + 1;
        const kept = moved.map((e) => (e.supersetGroup && size[e.supersetGroup] < 2 ? { ...e, supersetGroup: undefined } : e));
        return keepCurrent(s, contiguous(kept));
      }),
    [mutate],
  );
  const removeExercise = useCallback(
    (exerciseId: string) =>
      mutate((s) => {
        const next = s.exercises.filter((e) => e.id !== exerciseId);
        // Removing the one you are on falls back to the row that took its place.
        if (s.exercises[s.currentIndex]?.id === exerciseId) return { ...s, exercises: next, currentIndex: Math.max(0, Math.min(s.currentIndex, next.length - 1)) };
        return keepCurrent(s, next);
      }),
    [mutate],
  );
  /**
   * Move an exercise by a number of rows. A superset moves as one block and
   * nothing can land inside another block, so groups always stay together.
   * The current exercise stays the current one.
   */
  const moveExercise = useCallback(
    (exerciseId: string, delta: number) =>
      mutate((s) => {
        const i = s.exercises.findIndex((e) => e.id === exerciseId);
        if (i < 0 || !delta) return s;
        const units = blocks(s.exercises);
        const from = units.findIndex((u) => u.some((e) => e.id === exerciseId));
        const targetRow = Math.max(0, Math.min(s.exercises.length - 1, i + delta));
        let to = 0;
        let row = 0;
        for (let k = 0; k < units.length; k++) {
          if (targetRow >= row && targetRow < row + units[k].length) to = k;
          row += units[k].length;
        }
        if (to === from) return s;
        const moved = [...units];
        const [unit] = moved.splice(from, 1);
        moved.splice(to, 0, unit);
        return keepCurrent(s, moved.flat());
      }),
    [mutate],
  );
  const setRestSeconds = useCallback((exerciseId: string, seconds: number) => mutate((s) => mapEx(s, exerciseId, (e) => ({ ...e, restSeconds: seconds }))), [mutate]);
  const setNote = useCallback((exerciseId: string, note: string) => mutate((s) => mapEx(s, exerciseId, (e) => ({ ...e, note }))), [mutate]);
  const setShare = useCallback((share: SharePrefs) => mutate((s) => ({ ...s, share })), [mutate]);
  /** Name where you trained, and keep it at the top of the list for next time. */
  const setGym = useCallback(
    (gym: string) =>
      update((d) => {
        const name = gym.trim();
        const rest = (d.profile.gyms ?? []).filter((g) => g.toLowerCase() !== name.toLowerCase());
        return {
          ...d,
          activeSession: d.activeSession ? { ...d.activeSession, gym: name || undefined } : d.activeSession,
          profile: { ...d.profile, gyms: name ? [name, ...rest].slice(0, 8) : rest },
        };
      }),
    [update],
  );
  const setCaption = useCallback((caption: string) => mutate((s) => ({ ...s, caption })), [mutate]);
  const setPhoto = useCallback((photo: string | null) => mutate((s) => ({ ...s, photo: photo ?? undefined })), [mutate]);
  const adjustRest = useCallback(
    (delta: number) =>
      setRest((r) => {
        if (!r) return r;
        const left = Math.max(1, r.left + delta);
        return { ...r, left, endsAt: Date.now() + left * 1000, total: Math.max(r.total, left) };
      }),
    [],
  );
  const skipRest = useCallback(() => setRest(null), []);

  const value = useMemo<WorkoutState>(
    () => ({ session, rest, lastDiscarded, undoDiscard, dismissDiscarded, start, finish, discard, file, setCurrent, setDuration, updateSet, completeSet, setSetType, removeSet, addSet, addExercise, removeExercise, moveExercise, setRestSeconds, setNote, setCaption, setPhoto, swapExercise, toggleSuperset, groupExercises, setShare, setGym, adjustRest, skipRest }),
    [session, rest, lastDiscarded, undoDiscard, dismissDiscarded, start, finish, discard, file, setCurrent, setDuration, updateSet, completeSet, setSetType, removeSet, addSet, addExercise, removeExercise, moveExercise, setRestSeconds, setNote, setCaption, setPhoto, swapExercise, toggleSuperset, groupExercises, setShare, setGym, adjustRest, skipRest],
  );
  return <WorkoutContext.Provider value={value}>{children}</WorkoutContext.Provider>;
}

export function useWorkout() {
  const ctx = useContext(WorkoutContext);
  if (!ctx) throw new Error("useWorkout must be used inside WorkoutProvider");
  return ctx;
}
