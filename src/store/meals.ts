import { useCallback } from "react";
import { useDb } from "@/db/DbProvider";
import { uid } from "@/db/storage";
import { useT } from "@/i18n";
import { MEALS, MEAL_NAME } from "@/nutrition/derive";
import type { CustomMeal, Meal, MealKey } from "@/db/types";

const NONE: CustomMeal[] = [];

/**
 * The meals a day is divided into: the six the app knows, and the ones a
 * person made for themselves, such as "snacks after dinner". A meal of one's
 * own has a name and nothing else; an entry points at it by its id, so a
 * rename reaches everything that was ever logged to it.
 */
export function useMeals() {
  const { db, update } = useDb();
  const t = useT();
  const own = db.customMeals ?? NONE;

  /** What to call a meal: the person's own words for their own, the app's for the rest. An id nobody knows any more reads as snacks, which is where its entries were moved to. */
  const nameOf = useCallback(
    (key: MealKey) => {
      const mine = own.find((m) => m.id === key);
      if (mine) return mine.name;
      return t(MEAL_NAME[(MEALS as string[]).includes(key) ? (key as Meal) : "snack"]);
    },
    [own, t],
  );

  /** Whether a key out of a link or a parameter is a meal that exists. */
  const known = useCallback((key?: string): key is MealKey => !!key && ((MEALS as string[]).includes(key) || own.some((m) => m.id === key)), [own]);

  const add = useCallback(
    (name: string) => {
      const id: CustomMeal["id"] = `own_${uid()}`;
      update((d) => ({ ...d, customMeals: [...(d.customMeals ?? []), { id, name: name.trim() }] }));
      return id;
    },
    [update],
  );

  /** Taking a meal away does not take away what was eaten: its entries move to snacks. */
  const remove = useCallback(
    (id: string) =>
      update((d) => ({
        ...d,
        customMeals: (d.customMeals ?? []).filter((m) => m.id !== id),
        foodLog: d.foodLog.map((e) => (e.meal === id ? { ...e, meal: "snack" as const } : e)),
      })),
    [update],
  );

  return { own, nameOf, known, add, remove };
}
