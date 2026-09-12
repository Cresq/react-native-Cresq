import { createContext, useCallback, useContext, useMemo, useState, type PropsWithChildren } from "react";
import { defaultSplit, type SplitDay } from "@/data/mock";

/**
 * A split is the order you train in: Push > Pull > Legs > Chest & Back > Arms & Shoulders.
 * `nextIndex` points at the day you do next; finishing a session advances it.
 */
export type Split = { name: string; days: SplitDay[]; nextIndex: number };

type SplitState = {
  split: Split;
  nextDay: SplitDay;
  rename: (name: string) => void;
  addDay: (day: Omit<SplitDay, "id">) => void;
  removeDay: (id: string) => void;
  moveDay: (id: string, direction: -1 | 1) => void;
  setNext: (id: string) => void;
  advance: () => void;
};

const SplitContext = createContext<SplitState | null>(null);

export function SplitProvider({ children }: PropsWithChildren) {
  const [split, setSplit] = useState<Split>(defaultSplit);

  const rename = useCallback((name: string) => setSplit((s) => ({ ...s, name })), []);
  const addDay = useCallback((day: Omit<SplitDay, "id">) => setSplit((s) => ({ ...s, days: [...s.days, { ...day, id: `d${Date.now()}` }] })), []);
  const removeDay = useCallback(
    (id: string) =>
      setSplit((s) => {
        const days = s.days.filter((d) => d.id !== id);
        return { ...s, days, nextIndex: Math.min(s.nextIndex, Math.max(0, days.length - 1)) };
      }),
    [],
  );
  const moveDay = useCallback(
    (id: string, direction: -1 | 1) =>
      setSplit((s) => {
        const i = s.days.findIndex((d) => d.id === id);
        const j = i + direction;
        if (i < 0 || j < 0 || j >= s.days.length) return s;
        const days = [...s.days];
        [days[i], days[j]] = [days[j], days[i]];
        const nextIndex = s.nextIndex === i ? j : s.nextIndex === j ? i : s.nextIndex;
        return { ...s, days, nextIndex };
      }),
    [],
  );
  const setNext = useCallback((id: string) => setSplit((s) => ({ ...s, nextIndex: Math.max(0, s.days.findIndex((d) => d.id === id)) })), []);
  const advance = useCallback(() => setSplit((s) => ({ ...s, nextIndex: s.days.length ? (s.nextIndex + 1) % s.days.length : 0 })), []);

  const value = useMemo<SplitState>(() => ({ split, nextDay: split.days[split.nextIndex] ?? split.days[0], rename, addDay, removeDay, moveDay, setNext, advance }), [split, rename, addDay, removeDay, moveDay, setNext, advance]);
  return <SplitContext.Provider value={value}>{children}</SplitContext.Provider>;
}

export function useSplit() {
  const ctx = useContext(SplitContext);
  if (!ctx) throw new Error("useSplit must be used inside SplitProvider");
  return ctx;
}
