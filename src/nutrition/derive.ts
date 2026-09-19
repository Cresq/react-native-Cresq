import type { Food, FoodEntry, Meal, NutritionTargets, Burn } from "@/db/types";
import { locale, startOfDay } from "@/db/derive";

export const MEALS: Meal[] = ["breakfast", "lunch", "pre", "post", "dinner", "snack"];

/** Translation keys, one per meal. */
export const MEAL_NAME: Record<Meal, string> = { breakfast: "Breakfast", lunch: "Lunch", pre: "Pre-workout", post: "Post-workout", dinner: "Dinner", snack: "Snacks" };

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

/** The energy spent that falls on the day `t` is in, newest last. */
export function burnsOn(burns: Burn[], t: number): Burn[] {
  const from = startOfDay(t);
  const to = from + 86_400_000;
  return burns.filter((b) => b.at >= from && b.at < to).sort((a, b) => a.at - b.at);
}

/**
 * A rough figure for a strength session: 4 METs, the Compendium of Physical
 * Activities' band for resistance training with several exercises, rest
 * included, times body weight, per minute (kcal/min = MET × 3.5 × kg / 200).
 * An estimate the person takes or changes, never a measurement.
 */
export const estimateSessionBurn = (minutes: number, weightKg: number) => Math.round(((4 * 3.5 * weightKg) / 200) * minutes);

export function totals(entries: FoodEntry[], foods: Food[]): Figures {
  const byId = new Map(foods.map((f) => [f.id, f]));
  return sum(entries.map((e) => (byId.get(e.foodId) ? portion(byId.get(e.foodId)!, e.amount) : ZERO)));
}

/**
 * Which meal it probably is: post-workout for two hours after a session,
 * otherwise from the clock. Enough to preselect, never to insist.
 */
export function mealAt(t: number, lastFinishedAt?: number): Meal {
  if (lastFinishedAt && t >= lastFinishedAt && t - lastFinishedAt < 2 * 3_600_000) return "post";
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

/** Energy from the three macros: four calories a gram of protein or carbohydrate, nine a gram of fat. */
export const kcalOf = (protein: number, carbs: number, fat: number) => Math.round(protein * 4 + carbs * 4 + fat * 9);

export type NeedsInput = { weightKg: number; heightCm: number; age: number; sex: "m" | "f" | "x"; activity: "low" | "moderate" | "high"; goal: "cut" | "maintain" | "gain" };

/**
 * What a day costs at rest and on its feet: Mifflin-St Jeor for the resting
 * figure (the equation dietitians reach for first), then the day's activity.
 * "Rather not say" takes the midpoint of the two constants.
 */
export function maintenanceOf(i: NeedsInput) {
  const base = 10 * i.weightKg + 6.25 * i.heightCm - 5 * i.age;
  const rest = i.sex === "m" ? base + 5 : i.sex === "f" ? base - 161 : base - 78;
  const factor = { low: 1.35, moderate: 1.55, high: 1.75 }[i.activity];
  return Math.round(rest * factor);
}

/**
 * A starting point for daily targets, never a prescription: maintenance, moved
 * the way the goal points (a real deficit for fat loss, a modest surplus for
 * muscle), protein per kilo of body weight and higher when cutting, fat a
 * quarter of the energy, carbohydrate whatever is left. The person sees the
 * four figures before anything is saved and can change every one; the four
 * stay coupled through `kcalOf`.
 */
export function proposeTargets(i: NeedsInput): NutritionTargets {
  const maintenance = maintenanceOf(i);
  const kcal = Math.round((i.goal === "cut" ? maintenance * 0.82 : i.goal === "gain" ? maintenance * 1.1 : maintenance) / 10) * 10;
  const protein = Math.round(i.weightKg * (i.goal === "cut" ? 2.0 : 1.8));
  const fat = Math.round((kcal * 0.27) / 9);
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
  return { kcal, protein, carbs, fat };
}

/**
 * What to offer at this hour: the foods this person has logged at this meal
 * before, most often first, then the products they added most recently to
 * fill the row. Skyr at breakfast because that is what they eat at breakfast.
 */
export function suggestions(log: FoodEntry[], foods: Food[], now: number, limit = 6): { pattern: Food[]; recent: Food[] } {
  const slot = mealAt(now);
  const byId = new Map(foods.map((f) => [f.id, f]));
  const seen = new Map<string, { n: number; last: number }>();
  for (const e of log) {
    if (e.meal !== slot || !byId.has(e.foodId)) continue;
    const c = seen.get(e.foodId) ?? { n: 0, last: 0 };
    seen.set(e.foodId, { n: c.n + 1, last: Math.max(c.last, e.at) });
  }
  const pattern = [...seen.entries()].sort((a, b) => b[1].n - a[1].n || b[1].last - a[1].last).map(([id]) => byId.get(id)!).slice(0, limit);
  const taken = new Set(pattern.map((f) => f.id));
  const recent = [...foods].sort((a, b) => b.createdAt - a.createdAt).filter((f) => !taken.has(f.id)).slice(0, Math.max(0, limit - pattern.length) + 2);
  return { pattern, recent };
}
