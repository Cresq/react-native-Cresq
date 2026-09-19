import { startOfDay } from "@/db/derive";
import type { Burn, Food, FoodEntry, NutritionTargets } from "@/db/types";
import { portion } from "./derive";

/**
 * Food has days. The Food tab looks at one of them, and what is added from
 * there belongs to that day: yesterday's dinner filled in late, or tomorrow's
 * lunch planned ahead. An entry in the future is a plan until its day comes;
 * then it is simply what was eaten, unless it is taken off.
 */

/** Midnight at the start of the day `n` days from the day `t` is in. Through the calendar, not by adding hours: a day is 23 or 25 hours long twice a year. */
export function addDays(t: number, n: number) {
  const d = new Date(startOfDay(t));
  d.setDate(d.getDate() + n);
  return d.getTime();
}

/** How many days `t` is from today: 0 today, -1 yesterday, 1 tomorrow. */
export function dayOffset(t: number, now: number) {
  return Math.round((startOfDay(t) - startOfDay(now)) / 86_400_000);
}

/**
 * The day the Food tab is looking at, for the screens behind it. Adding a
 * product runs through several screens (search or scan, sometimes the label
 * and its review, then the product), and every one of them would have to pass
 * the day along. The tab says it here once, and the product page reads it at
 * the moment it logs. Without a tab to say it, the day is today.
 */
let looking: number | null = null;
export const setLoggingDay = (day: number | null) => {
  looking = day;
};
export const loggingDay = (now: number) => (looking === null ? startOfDay(now) : looking);
/** The moment a new entry is stamped with: now for today, the middle of the day for any other, so it sorts inside its own day whatever the clock says. */
export const loggingAt = (now: number = Date.now()) => {
  const day = loggingDay(now);
  return day === startOfDay(now) ? now : day + 43_200_000;
};

/** A day counts as on target when the energy eaten is within a tenth of what the day may hold. */
export const kcalOnTarget = (eaten: number, budget: number) => budget > 0 && eaten > 0 && Math.abs(eaten - budget) <= budget * 0.1;

/** A macro is reached within a tenth of its target. Protein has no ceiling: more of it is never a miss. */
export const macroReached = (kind: "protein" | "carbs" | "fat", eaten: number, target?: number) => {
  if (!target || target <= 0 || eaten <= 0) return false;
  if (kind === "protein") return eaten >= target * 0.9;
  return Math.abs(eaten - target) <= target * 0.1;
};

export type DayMark = { kcal: number; onTarget: boolean };

/** Every day that has something in it, keyed by its midnight: what it adds up to, and whether that is on target. One pass over the log. */
export function dayMarks(log: FoodEntry[], foods: Food[], burns: Burn[], targets?: NutritionTargets): Map<number, DayMark> {
  const byId = new Map(foods.map((f) => [f.id, f]));
  const eaten = new Map<number, number>();
  for (const e of log) {
    const f = byId.get(e.foodId);
    const day = startOfDay(e.at);
    eaten.set(day, (eaten.get(day) ?? 0) + (f ? portion(f, e.amount).kcal : 0));
  }
  const burned = new Map<number, number>();
  for (const b of burns) {
    const day = startOfDay(b.at);
    burned.set(day, (burned.get(day) ?? 0) + b.kcal);
  }
  const out = new Map<number, DayMark>();
  for (const [day, kcal] of eaten) out.set(day, { kcal, onTarget: !!targets && kcalOnTarget(kcal, targets.kcal + (burned.get(day) ?? 0)) });
  return out;
}
