import { useCallback, useMemo } from "react";
import { useDb } from "@/db/DbProvider";
import type { SplitDay } from "@/db/types";
import { uid } from "@/db/storage";

/**
 * A split is the order you train in. `nextIndex` points at the day you do next;
 * finishing a session for that day advances it, and the split repeats.
 */
export function useSplit() {
  const { db, update } = useDb();
  const split = db.split;
  const set = useCallback((fn: (s: typeof split) => typeof split) => update((d) => ({ ...d, split: fn(d.split) })), [update]);

  const rename = useCallback((name: string) => set((s) => ({ ...s, name })), [set]);
  const addDay = useCallback((day: Omit<SplitDay, "id">) => set((s) => ({ ...s, days: [...s.days, { ...day, id: uid() }] })), [set]);
  const removeDay = useCallback(
    (id: string) =>
      set((s) => {
        const days = s.days.filter((d) => d.id !== id);
        return { ...s, days, nextIndex: Math.min(s.nextIndex, Math.max(0, days.length - 1)) };
      }),
    [set],
  );
  const moveDay = useCallback(
    (id: string, direction: -1 | 1) =>
      set((s) => {
        const i = s.days.findIndex((d) => d.id === id);
        const j = i + direction;
        if (i < 0 || j < 0 || j >= s.days.length) return s;
        const days = [...s.days];
        [days[i], days[j]] = [days[j], days[i]];
        return { ...s, days, nextIndex: s.nextIndex === i ? j : s.nextIndex === j ? i : s.nextIndex };
      }),
    [set],
  );
  const setNext = useCallback((id: string) => set((s) => ({ ...s, nextIndex: Math.max(0, s.days.findIndex((d) => d.id === id)) })), [set]);
  const advance = useCallback(() => set((s) => ({ ...s, nextIndex: s.days.length ? (s.nextIndex + 1) % s.days.length : 0 })), [set]);

  const nextDay = split.days[split.nextIndex] ?? split.days[0];
  return useMemo(() => ({ split, nextDay, rename, addDay, removeDay, moveDay, setNext, advance }), [split, nextDay, rename, addDay, removeDay, moveDay, setNext, advance]);
}
