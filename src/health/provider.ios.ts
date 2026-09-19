import { TurboModuleRegistry } from "react-native";
import type { HealthProvider, HealthWorkout, WorkoutKind } from "./types";

type Kit = typeof import("@kingstinct/react-native-healthkit");

/**
 * Apple Health, through HealthKit.
 *
 * The bindings are native code, and Expo Go does not carry them: asking for
 * them there throws. So the registry is asked first whether they are in this
 * build, which answers null rather than throwing, and the library itself is
 * only loaded once something actually needs it. In Expo Go this file
 * therefore does nothing at all, and says so through `unavailable`.
 */
const present = TurboModuleRegistry.get("NitroModules") != null;
let kit: Kit | null = null;

async function load(): Promise<Kit | null> {
  if (!present) return null;
  if (kit) return kit;
  try {
    kit = await import("@kingstinct/react-native-healthkit");
  } catch {
    kit = null;
  }
  return kit;
}

const WORKOUTS = "HKWorkoutTypeIdentifier";
const ACTIVE_ENERGY = "HKQuantityTypeIdentifierActiveEnergyBurned";

/** HKWorkoutActivityType, as far as CresQ tells them apart. Everything else is simply a workout. */
const KINDS: Record<number, WorkoutKind> = { 50: "strength", 20: "strength", 59: "strength", 37: "run", 13: "ride", 52: "walk", 24: "hike", 46: "swim", 35: "row", 63: "hiit", 57: "yoga", 16: "cardio", 44: "cardio", 73: "cardio" };

/** The phone reports energy in whatever unit the person prefers; the day is counted in kilocalories. */
function toKcal(quantity: number, unit: string) {
  if (unit === "kJ") return quantity / 4.184;
  if (unit === "J") return quantity / 4184;
  if (unit === "cal") return quantity / 1000;
  return quantity;
}

export const health: HealthProvider = {
  name: "Apple Health",
  unavailable: present ? null : "needs-build",

  async authorize() {
    const hk = await load();
    if (!hk) return false;
    try {
      if (!hk.isHealthDataAvailable()) return false;
      // Read only, and only what counting a day's energy needs.
      return await hk.requestAuthorization({ toRead: [WORKOUTS, ACTIVE_ENERGY] });
    } catch {
      return false;
    }
  },

  async workouts(from, to) {
    const hk = await load();
    if (!hk) return [];
    try {
      const found = await hk.queryWorkoutSamples({ filter: { date: { startDate: new Date(from), endDate: new Date(to), strictStartDate: true } }, limit: 0, ascending: true });
      const out: HealthWorkout[] = [];
      for (const w of found) {
        // The workout's own statistics are the current way to ask; the total on the sample is the older one, and some sources fill only that.
        let kcal = 0;
        try {
          const active = await w.getStatistic(ACTIVE_ENERGY, "kcal");
          if (active?.sumQuantity) kcal = active.sumQuantity.quantity;
        } catch {
          kcal = 0;
        }
        if (!kcal && w.totalEnergyBurned) kcal = toKcal(w.totalEnergyBurned.quantity, w.totalEnergyBurned.unit);
        out.push({ id: w.uuid, start: w.startDate.getTime(), end: w.endDate.getTime(), kcal: Math.round(kcal), kind: KINDS[w.workoutActivityType as number] ?? "other", source: w.sourceRevision?.source?.name });
      }
      return out;
    } catch {
      return [];
    }
  },
};
