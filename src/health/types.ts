/**
 * What CresQ asks of a phone's health store, whichever store that is. Apple
 * Health answers on iOS; Health Connect will on Android. Garmin, Fitbit, Polar
 * and the rest are not asked directly: they write their workouts into the
 * phone's store when the person lets them, and CresQ reads them from there.
 */
export type WorkoutKind = "strength" | "run" | "ride" | "walk" | "hike" | "swim" | "row" | "hiit" | "yoga" | "cardio" | "other";

export const KIND_NAME: Record<WorkoutKind, string> = { strength: "Strength training", run: "Running", ride: "Cycling", walk: "Walking", hike: "Hiking", swim: "Swimming", row: "Rowing", hiit: "HIIT", yoga: "Yoga", cardio: "Cardio", other: "Workout" };

/** One workout as the store reports it, reduced to what a day's energy needs. */
export type HealthWorkout = {
  /** The store's own id, so the same workout read twice is one workout. */
  id: string;
  start: number;
  end: number;
  /** Active energy, in kilocalories whatever unit the phone prefers. */
  kcal: number;
  kind: WorkoutKind;
  /** The app or device that recorded it: "Apple Watch", "Garmin Connect". */
  source?: string;
};

/** Why this build cannot reach a health store, so the screen can say which it is. */
export type HealthUnavailable =
  /** The native bindings are not in this build: Expo Go, or a build made before they were added. */
  | "needs-build"
  /** This device has no health store (an iPad without Health). */
  | "no-store"
  /** Health Connect is not wired up yet. */
  | "android"
  | "web";

export type HealthProvider = {
  /** The store's own name, which is a product name and is not translated. */
  name: string;
  unavailable: HealthUnavailable | null;
  /**
   * Shows the system's permission sheet. Resolves false only when it could not
   * be shown. Apple never tells an app whether reading was allowed, so true
   * means "asked", and an empty answer later may mean "no".
   */
  authorize(): Promise<boolean>;
  /** Workouts that started in [from, to), oldest first. Empty when nothing is allowed or nothing is there. */
  workouts(from: number, to: number): Promise<HealthWorkout[]>;
};
