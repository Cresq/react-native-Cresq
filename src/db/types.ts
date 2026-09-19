/**
 * CresQ data model, v1. One JSON document persisted on the device.
 * Small enough for a strength log (thousands of sets), and simple to move to
 * SQLite or a server later because every entity already carries a stable id.
 */

export type SetType = "warmup" | "working" | "drop" | "failure";

/**
 * `move` is the MoveKit slug for this exercise, and the key into the bundled
 * artwork in `src/data/moves.ts`. A slug and not a file path, because this
 * record is persisted to the device and written into the user's data export:
 * a bundler's module id would be meaningless in both.
 */
export type Exercise = { id: string; name: string; muscles: string; equipment: string; bodyweight?: boolean; move?: string };

export type PlannedSet = { kg: number; reps: number; type: SetType };

/**
 * `sets`, `reps` and `kg` stay as the summary the lists show. `setList`, when
 * present, is the truth per set (edited in the workout editor) and wins.
 */
export type PlanExercise = { exerciseId: string; sets: number; reps: number; kg: number; restSeconds: number; note?: string; supersetGroup?: string; setList?: PlannedSet[] };

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
  /** Caption written when sharing to the feed. */
  caption?: string;
  /** Local uri of the photo added after finishing. */
  photo?: string;
  /** What a shared post shows. Everything on when absent. */
  share?: SharePrefs;
  /** Where you trained, shown with a pin on the post. Free text for now; a map lookup can fill it later. */
  gym?: string;
};

export type SharePrefs = { exercises: boolean; stats: boolean; records: boolean };

export type SplitDay = { id: string; name: string; focus: string; planId?: string; exercises?: number; minutes?: number; rest?: boolean };

export type Split = { name: string; days: SplitDay[]; nextIndex: number; /** A workout chosen for today instead of the split's next day; cleared when a session is filed. */ overridePlanId?: string };

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
  /** Exercise ids charted on Home and listed under Profile › Lifts. Defaults to the four compound lifts. */
  favourites?: string[];
  bio?: string;
  /** Local uri of the profile photo. Absent means the app shows your initial. */
  avatar?: string;
  /** Year only, never the full date: enough for the 16+ check and for age bands, nothing more. */
  birthYear?: number;
  privateAccount?: boolean;
  showCity?: boolean;
  /** Let followers watch a session while it runs. Off by default. */
  shareLive?: boolean;
  /** Let people you follow hold their figures up against yours. On unless you say otherwise. */
  compareStats?: boolean;
  language?: "nl" | "en";
  /** "system" follows the phone; the other two override it. */
  theme?: "system" | "dark" | "light";
  /** Gyms you have trained at, most recent first, offered when a session asks where you were. */
  gyms?: string[];
  /** When the feed was last opened; Home lists what followed people did since. */
  lastFeedSeen?: number;
  /** When the notifications screen was last opened; anything newer carries a dot. */
  lastNotificationsSeen?: number;
  /** What a day should add up to. Set by the person under Food; absent until then. */
  targets?: NutritionTargets;
  /** Absent until Food has been opened once and its questions answered or waved off. */
  food?: FoodProfile;
};

/**
 * What the user has agreed to. Nothing here is on by default: no analytics,
 * no age statistics, no email, until the user turns it on. Terms acceptance
 * is stamped at sign-up and is required to hold an account.
 */
export type Consent = {
  termsAcceptedAt?: number;
  ageConfirmedAt?: number;
  analytics: boolean;
  ageStats: boolean;
  marketing: boolean;
};

/**
 * Who this log belongs to. The id is minted once on the device and never
 * changes, so when sync arrives the server adopts this account rather than
 * issuing a second one and leaving two copies of a person's training.
 * No password is kept: there is nothing here to check it against, and a
 * secret stored beside the data it guards is not a lock.
 */
export type Account = {
  id: string;
  email: string;
  createdAt: number;
  /** Set once the log has been sent to a server. Absent means this device is the only copy. */
  syncedAt?: number;
};

/** Where the figures on a food came from. */
export type FoodSource = "openfoodfacts" | "label" | "manual";

/**
 * A product or an ingredient. The figures are per 100 g, or per 100 ml for
 * something you drink, which is how every European pack states them; what a
 * portion comes to is worked out from that at the moment it is logged.
 *
 * `verified` is the person's word, not the app's: it turns true only when
 * somebody has looked at the numbers next to the pack and said they are right.
 * A product straight from Open Food Facts starts out unverified, and the app
 * says so until they check it once.
 */
export type Food = {
  id: string;
  name: string;
  brand?: string;
  /** The EAN or UPC as scanned. Absent for something without a pack. */
  barcode?: string;
  unit: "g" | "ml";
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  sugars?: number;
  saturated?: number;
  fibre?: number;
  salt?: number;
  /** One portion in g or ml, when the pack or the person says what that is. */
  serving?: number;
  source: FoodSource;
  verified: boolean;
  createdAt: number;
  /** Local uri of a photo of the pack, the food or the label, when the person added one. */
  photo?: string;
};

export type Meal = "breakfast" | "lunch" | "pre" | "post" | "dinner" | "snack";

/** One thing eaten: which food, how much of it in g or ml, at which meal, when. */
export type FoodEntry = { id: string; foodId: string; amount: number; meal: Meal; at: number };

/** What the person said when Food was first opened; the targets were proposed from it. */
export type FoodProfile = { weightKg?: number; heightCm?: number; sex?: "m" | "f" | "x"; activity?: "low" | "moderate" | "high"; goal: "cut" | "maintain" | "gain"; onboardedAt: number };

/** Daily targets. Absent until the person sets them; the app never guesses. */
export type NutritionTargets = { kcal: number; protein: number; carbs: number; fat: number };

export const DEFAULT_FAVOURITES = ["bench", "squat", "deadlift", "ohp"];
export const MIN_AGE = 16;

export type Db = {
  version: number;
  createdAt: number;
  auth: { signedIn: boolean; account?: Account };
  profile: Profile;
  exercises: Exercise[];
  plans: Plan[];
  sessions: Session[];
  activeSession: Session | null;
  split: Split;
  consent: Consent;
  /** Ids of people the user follows (mock directory until there is a server). */
  following: string[];
  /** People the user blocked: hidden everywhere, cannot follow. */
  blocked: string[];
  /** Every product and ingredient this person has scanned, read or typed in. */
  foods: Food[];
  /** What was eaten, one entry per portion. */
  foodLog: FoodEntry[];
  /**
   * Comments this device has written, by post id. Only the words and the time:
   * the name and the face are read from the profile when they are shown, so a
   * change of either does not leave old comments signed by somebody else.
   */
  comments?: Record<string, { text: string; at: number; replyTo?: string }[]>;
  /**
   * Comments this person took off their screen, as "postId:commentId": ones
   * they reported, and ones under their own posts they removed. Reports reach
   * us once accounts sync; until then this is the whole of it.
   */
  hiddenComments?: string[];
};

/**
 * Bump when the shape changes. A stored document from any older version is
 * carried forward by `migrate`; it is never discarded, because it is somebody's
 * training history.
 */
export const DB_VERSION = 5;
