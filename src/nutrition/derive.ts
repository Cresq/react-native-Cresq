import type { Food, FoodEntry, Meal } from "@/db/types";
import { locale, startOfDay } from "@/db/derive";

export const MEALS: Meal[] = ["breakfast", "lunch", "dinner", "snack"];

/** Translation keys, one per meal. */
export const MEAL_NAME: Record<Meal, string> = { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner", snack: "Snacks" };

export type Figures = { kcal: number; protein: number; carbs: number; fat: number; sugars: number; saturated: number; fibre: number; salt: number };

const ZERO: Figures = { kcal: 0, protein: 0, carbs: 0, fat: 0, sugars: 0, saturated: 0, fibre: 0, salt: 0 };

/** What `amount` g or ml of a food comes to, from figures stated per 100. */
export function portion(food: Food, amount: number): Figures {
  const k = amount / 100;
  return {
    kcal: food.kcal * k,
    protein: food.protein * k,
    carbs: food.carbs * k,
    fat: food.fat * k,
    sugars: (food.sugars ?? 0) * k,
    saturated: (food.saturated ?? 0) * k,
    fibre: (food.fibre ?? 0) * k,
    salt: (food.salt ?? 0) * k,
  };
}

export function sum(list: Figures[]): Figures {
  const out = { ...ZERO };
  for (const f of list) for (const key of Object.keys(out) as (keyof Figures)[]) out[key] += f[key];
  return out;
}

/** The entries that fall on the day `t` is in, newest last. */
export function entriesOn(log: FoodEntry[], t: number): FoodEntry[] {
  const from = startOfDay(t);
  const to = from + 86_400_000;
  return log.filter((e) => e.at >= from && e.at < to).sort((a, b) => a.at - b.at);
}

export function totals(entries: FoodEntry[], foods: Food[]): Figures {
  const byId = new Map(foods.map((f) => [f.id, f]));
  return sum(entries.map((e) => (byId.get(e.foodId) ? portion(byId.get(e.foodId)!, e.amount) : ZERO)));
}

/** Which meal it probably is, from the clock: enough to preselect, never to insist. */
export function mealAt(t: number): Meal {
  const h = new Date(t).getHours() + new Date(t).getMinutes() / 60;
  if (h < 10.5) return "breakfast";
  if (h < 14.5) return "lunch";
  if (h >= 17 && h < 21) return "dinner";
  return "snack";
}

/**
 * One decimal when it matters, none when it does not: 12,5 g, 250 kcal, 0,3 g.
 * Written the way the reader's language writes numbers, comma and all.
 */
export const fmtG = (n: number) => (Math.abs(n) >= 10 ? Math.round(n) : Math.round(n * 10) / 10).toLocaleString(locale);
export const fmtKcal = (n: number) => Math.round(n).toLocaleString(locale);

/** Energy in kJ to kcal, for a pack that states only the one. */
export const kjToKcal = (kj: number) => kj / 4.184;
