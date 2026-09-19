import { useCallback, useMemo } from "react";
import { useDb } from "@/db/DbProvider";
import { uid } from "@/db/storage";
import type { Burn, Food, FoodEntry, Meal, NutritionTargets } from "@/db/types";

export type NewFood = Omit<Food, "id" | "createdAt">;

/** Everything the food screens do to the document, in one place. */
export function useFood() {
  const { db, update } = useDb();
  const foods = db.foods;
  const log = db.foodLog;
  const byId = useMemo(() => new Map(foods.map((f) => [f.id, f])), [foods]);

  const addFood = useCallback(
    (food: NewFood) => {
      const id = uid();
      update((d) => ({ ...d, foods: [...d.foods, { ...food, id, createdAt: Date.now() }] }));
      return id;
    },
    [update],
  );

  const updateFood = useCallback((id: string, patch: Partial<NewFood>) => update((d) => ({ ...d, foods: d.foods.map((f) => (f.id === id ? { ...f, ...patch } : f)) })), [update]);

  /**
   * A scanned pack is kept the first time it is seen, so the next scan is
   * instant and works offline. Scanning it again finds the copy already here,
   * with whatever the person has corrected on it, rather than a fresh one.
   */
  const remember = useCallback(
    (food: NewFood) => {
      const known = food.barcode ? foods.find((f) => f.barcode === food.barcode) : undefined;
      return known ? known.id : addFood(food);
    },
    [foods, addFood],
  );

  const logFood = useCallback(
    (foodId: string, amount: number, meal: Meal, at = Date.now()) => {
      const entry: FoodEntry = { id: uid(), foodId, amount, meal, at };
      update((d) => ({ ...d, foodLog: [...d.foodLog, entry] }));
      return entry.id;
    },
    [update],
  );

  const removeEntry = useCallback((id: string) => update((d) => ({ ...d, foodLog: d.foodLog.filter((e) => e.id !== id) })), [update]);

  const setTargets = useCallback((targets: NutritionTargets | undefined) => update((d) => ({ ...d, profile: { ...d.profile, targets } })), [update]);

  const burns = db.burns;
  /** Stamped with now unless the caller knows better, as a finished session does. */
  const addBurn = useCallback((b: Omit<Burn, "id" | "at"> & { at?: number }) => update((d) => ({ ...d, burns: [...d.burns, { ...b, at: b.at ?? Date.now(), id: uid() }] })), [update]);
  const removeBurn = useCallback((id: string) => update((d) => ({ ...d, burns: d.burns.filter((b) => b.id !== id) })), [update]);

  return { foods, log, byId, targets: db.profile.targets, addFood, updateFood, remember, logFood, removeEntry, setTargets, burns, addBurn, removeBurn };
}
