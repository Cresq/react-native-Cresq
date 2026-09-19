import { useCallback, useMemo } from "react";
import { useDb } from "@/db/DbProvider";
import { uid } from "@/db/storage";
import { startOfDay } from "@/db/derive";

const DAY = 86_400_000;

/**
 * Body weight, one figure a day. Weighing again on the same day corrects that
 * day's figure instead of adding a second, so the line is a line and not a
 * scatter. The newest weight is also the one the food targets and the burn
 * estimate work from, so it is written through to the food profile.
 */
export function useWeight() {
  const { db, update } = useDb();
  const entries = useMemo(() => [...db.weights].sort((a, b) => a.at - b.at), [db.weights]);
  const latest = entries[entries.length - 1];

  const log = useCallback(
    (kg: number, at = Date.now()) =>
      update((d) => {
        const from = startOfDay(at);
        const figure = Math.round(kg * 10) / 10;
        const weights = [...d.weights.filter((w) => w.at < from || w.at >= from + DAY), { id: uid(), at, kg: figure }];
        const newest = weights.reduce((m, w) => (w.at > m.at ? w : m));
        return { ...d, weights, profile: d.profile.food ? { ...d.profile, food: { ...d.profile.food, weightKg: newest.kg } } : d.profile };
      }),
    [update],
  );

  const remove = useCallback((id: string) => update((d) => ({ ...d, weights: d.weights.filter((w) => w.id !== id) })), [update]);

  /** The figure for the day `t` is in, if there is one. */
  const on = useCallback((t: number) => entries.find((w) => startOfDay(w.at) === startOfDay(t)), [entries]);

  return { entries, latest, on, log, remove };
}
