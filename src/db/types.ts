/**
 * CresQ data model, v1. One JSON document persisted on the device.
 * Small enough for a strength log (thousands of sets), and simple to move to
 * SQLite or a server later because every entity already carries a stable id.
 */

export type SetType = "warmup" | "working" | "drop" | "failure";

export type Exercise = { id: string; name: string; muscles: string; equipment: string; bodyweight?: boolean };

export type PlanExercise = { exerciseId: string; sets: number; reps: number; kg: number; restSeconds: number; note?: string; supersetGroup?: string };

export type Plan = { id: string; name: string; focus: string; exercises: PlanExercise[]; createdAt: number };

export type SetEntry = { id: string; type: SetType; prevKg: number | null; prevReps: number | null; kg: number; reps: number; done: boolean };

export type ExerciseEntry = { id: string; exerciseId: string; name: string; note?: string; restSeconds: number; supersetGroup?: string; sets: SetEntry[] };

export type Session = {
  id: string;
  planId?: string;
  planName: string;
  startedAt: number;
  finishedAt?: number;
  exercises: ExerciseEntry[];
  currentIndex: number;
  /** Shared to the feed (true) or kept private. */
  shared?: boolean;
  /** Generated on first launch so the app is not empty; removable from Settings. */
  sample?: boolean;
};

export type SplitDay = { id: string; name: string; focus: string; planId?: string; exercises?: number; minutes?: number; rest?: boolean };

export type Split = { name: string; days: SplitDay[]; nextIndex: number };

export type Profile = {
  name: string;
  first: string;
  handle: string;
  city: string;
  since: string;
  units: "kg" | "lb";
  onboarded: boolean;
  goal?: "strength" | "muscle" | "health";
  experience?: "new" | "some" | "years";
  daysPerWeek?: number;
  limitations?: string[];
};

export type Db = {
  version: number;
  createdAt: number;
  auth: { signedIn: boolean };
  profile: Profile;
  exercises: Exercise[];
  plans: Plan[];
  sessions: Session[];
  activeSession: Session | null;
  split: Split;
};

/** Bump when the seed or shape changes in a way that should discard stored data during development. */
export const DB_VERSION = 2;
