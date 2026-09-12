import type { ImageSourcePropType } from "react-native";
import type { Post } from "@/components/PostCard";
import type { Day } from "@/components/WeekStrip";

export const photos: Record<string, ImageSourcePropType> = {
  selfie: require("@/assets/photos/selfie.png"),
  gym1: require("@/assets/photos/gym-1.png"),
  gym2: require("@/assets/photos/gym-2.png"),
  gym3: require("@/assets/photos/gym-3.png"),
};

export const user = { name: "Nick Li", first: "Nick", handle: "@nickli", city: "Amsterdam", since: "2021", streakWeeks: 12, sessions: 142, followers: "1.2k", following: 210 };

export type SetType = "warmup" | "working" | "drop" | "failure";
export type SetEntry = { id: string; type: SetType; prevKg: number | null; prevReps: number | null; kg: number; reps: number; done: boolean };
export type ExerciseEntry = { id: string; name: string; note?: string; restSeconds: number; supersetGroup?: string; sets: SetEntry[] };

let seq = 0;
const id = () => `n${++seq}`;
const set = (type: SetType, kg: number, reps: number, prevKg: number | null = kg, prevReps: number | null = reps, done = false): SetEntry => ({ id: id(), type, prevKg, prevReps, kg, reps, done });

export const planPushA = (): ExerciseEntry[] => [
  { id: id(), name: "Bench press", note: "Feet planted, pause on the chest", restSeconds: 150, sets: [set("warmup", 60, 8), set("working", 100, 5, 97.5), set("working", 100, 5, 97.5), set("working", 100, 5, 97.5)] },
  { id: id(), name: "Incline dumbbell press", note: "Elbows tucked, pause at the bottom", restSeconds: 90, sets: [set("warmup", 20, 10, 30, 10), set("working", 30, 10), set("working", 32.5, 10, 30, 10), set("working", 32.5, 9, 30, 9)] },
  { id: id(), name: "Dips", restSeconds: 90, sets: [set("working", 0, 12), set("working", 0, 12), set("working", 0, 12)] },
  { id: id(), name: "Lateral raise", restSeconds: 60, supersetGroup: "A", sets: [set("working", 10, 15), set("working", 10, 15), set("working", 10, 15)] },
  { id: id(), name: "Overhead press", restSeconds: 60, supersetGroup: "A", sets: [set("working", 50, 8), set("working", 50, 8), set("working", 50, 8)] },
  { id: id(), name: "Cable fly", restSeconds: 60, sets: [set("working", 25, 12), set("working", 25, 12), set("working", 25, 12)] },
];

export const plans = [
  { id: "push-a", name: "Push A", focus: "Chest, shoulders, triceps", exercises: 6, minutes: 52, lastDone: "4 days ago", next: true },
  { id: "legs", name: "Legs", focus: "Quads, hamstrings, glutes", exercises: 5, minutes: 64, lastDone: "2 days ago" },
  { id: "pull", name: "Pull", focus: "Back, biceps", exercises: 6, minutes: 55, lastDone: "6 days ago" },
];

/** A day in a split: a training day mapped to a plan, or a rest day. */
export type SplitDay = { id: string; name: string; focus: string; exercises?: number; minutes?: number; rest?: boolean };

/** Templates offered when adding a day to a split. */
export const splitTemplates: Omit<SplitDay, "id">[] = [
  { name: "Push", focus: "Chest, shoulders, triceps", exercises: 6, minutes: 52 },
  { name: "Pull", focus: "Back, biceps", exercises: 6, minutes: 55 },
  { name: "Legs", focus: "Quads, hamstrings, glutes", exercises: 5, minutes: 64 },
  { name: "Chest & Back", focus: "Pressing and rowing, paired", exercises: 6, minutes: 58 },
  { name: "Arms & Shoulders", focus: "Biceps, triceps, delts", exercises: 6, minutes: 48 },
  { name: "Upper", focus: "Everything above the hips", exercises: 7, minutes: 60 },
  { name: "Lower", focus: "Squat, hinge, calves", exercises: 5, minutes: 55 },
  { name: "Full body", focus: "One lift per pattern", exercises: 5, minutes: 50 },
  { name: "Rest day", focus: "Recover. Walk, sleep, eat.", rest: true },
];

export const defaultSplit = {
  name: "Push Pull Legs, 5 days",
  nextIndex: 0,
  days: [
    { id: "sd1", ...splitTemplates[0] },
    { id: "sd2", ...splitTemplates[1] },
    { id: "sd3", ...splitTemplates[2] },
    { id: "sd4", ...splitTemplates[3] },
    { id: "sd5", ...splitTemplates[4] },
  ] as SplitDay[],
};

export type Notification = { id: string; kind: "like" | "comment" | "follow" | "record" | "reminder" | "device"; title: string; body?: string; when: string; unread?: boolean; avatar?: ImageSourcePropType };

export const notifications: { group: string; items: Notification[] }[] = [
  {
    group: "Today",
    items: [
      { id: "n1", kind: "like", title: "Sara de Vries and 11 others liked your session", body: "Push A · New record · Bench 100 kg", when: "2 h", unread: true, avatar: photos.gym2 },
      { id: "n2", kind: "comment", title: "Tom Bakker commented", body: "“Two weeks early, that forecast is scared of you.”", when: "3 h", unread: true, avatar: photos.gym3 },
      { id: "n3", kind: "record", title: "Your next record is close", body: "Bench press 100 kg is likely within two weeks. Keep three sessions.", when: "6 h", unread: true },
    ],
  },
  {
    group: "This week",
    items: [
      { id: "n4", kind: "follow", title: "Lisa Jansen started following you", when: "Tue" },
      { id: "n5", kind: "reminder", title: "Legs is up next", body: "Last done 2 days ago. Your split says today.", when: "Tue" },
      { id: "n6", kind: "device", title: "Apple Watch synced", body: "Heart rate and energy added to Pull, 8 Sep.", when: "Mon" },
    ],
  },
];

export const week: Day[] = [
  { num: "7", letter: "M", state: "done" },
  { num: "8", letter: "T", state: "rest" },
  { num: "9", letter: "W", state: "done" },
  { num: "10", letter: "T", state: "missed" },
  { num: "11", letter: "F", state: "done" },
  { num: "12", letter: "S", state: "today" },
  { num: "13", letter: "S", state: "future" },
];

export type Lift = { slug: string; name: string; e1rm: number; deltaKg: number; weeks: number; points: { value: number; record?: boolean }[]; forecast: number[]; target: number; labels: string[]; records: { kg: string; reps: string; date: string; latest?: boolean }[] };

export const lifts: Lift[] = [
  {
    slug: "bench-press",
    name: "Bench press",
    e1rm: 97.5,
    deltaKg: 7.5,
    weeks: 8,
    points: [{ value: 90 }, { value: 90.5 }, { value: 92 }, { value: 92.5, record: true }, { value: 93.5 }, { value: 95, record: true }, { value: 96 }, { value: 97.5 }],
    forecast: [98.5, 99.5, 100],
    target: 100,
    labels: ["Jun", "Jul", "Aug", "Now", "26 Sep"],
    records: [
      { kg: "95 kg", reps: "1 × 3", date: "22 Aug", latest: true },
      { kg: "92.5 kg", reps: "1 × 5", date: "8 Aug" },
      { kg: "90 kg", reps: "1 × 3", date: "3 Jul" },
    ],
  },
  { slug: "squat", name: "Squat", e1rm: 132.5, deltaKg: 5, weeks: 8, points: [{ value: 120 }, { value: 122.5 }, { value: 125, record: true }, { value: 125 }, { value: 127.5 }, { value: 130, record: true }, { value: 130 }, { value: 132.5 }], forecast: [134, 135], target: 140, labels: ["Jun", "Jul", "Aug", "Now", "Oct"], records: [{ kg: "125 kg", reps: "1 × 5", date: "30 Aug", latest: true }, { kg: "120 kg", reps: "1 × 5", date: "2 Aug" }] },
  { slug: "deadlift", name: "Deadlift", e1rm: 160, deltaKg: 10, weeks: 8, points: [{ value: 145 }, { value: 147.5 }, { value: 150, record: true }, { value: 152.5 }, { value: 155 }, { value: 155 }, { value: 157.5 }, { value: 160, record: true }], forecast: [162, 165], target: 170, labels: ["Jun", "Jul", "Aug", "Now", "Oct"], records: [{ kg: "150 kg", reps: "1 × 3", date: "5 Sep", latest: true }, { kg: "140 kg", reps: "1 × 5", date: "10 Jul" }] },
  { slug: "overhead-press", name: "Overhead press", e1rm: 62.5, deltaKg: 2.5, weeks: 8, points: [{ value: 57.5 }, { value: 57.5 }, { value: 60, record: true }, { value: 60 }, { value: 60 }, { value: 61 }, { value: 62 }, { value: 62.5 }], forecast: [63, 64], target: 65, labels: ["Jun", "Jul", "Aug", "Now", "Oct"], records: [{ kg: "57.5 kg", reps: "1 × 5", date: "20 Aug", latest: true }] },
];

export const posts: Post[] = [
  { id: "p1", name: "Nick Li", meta: "Push A · 2 h ago · Amsterdam", avatar: photos.selfie, photo: photos.gym1, record: "New record · Bench 100 kg", caption: "Two weeks ahead of the forecast. 100 on the bar.", stats: [{ value: "58", unit: "min" }, { value: "12.5k", unit: "kg" }, { value: "19", unit: "sets" }], likes: 24, liked: true, comments: 6 },
  { id: "p2", name: "Sara de Vries", meta: "Legs · yesterday", photo: photos.gym2, photoHeight: 260, caption: "Pause squats, 5 × 5 at 90 kg.", stats: [{ value: "64", unit: "min" }, { value: "9.8k", unit: "kg" }, { value: "16", unit: "sets" }], likes: 12, comments: 3 },
  { id: "p3", name: "Tom Bakker", meta: "Arms · yesterday", photo: photos.gym3, photoHeight: 260, caption: "Preacher curls to finish. Forearms gone.", stats: [{ value: "41", unit: "min" }, { value: "4.2k", unit: "kg" }, { value: "14", unit: "sets" }], likes: 8, comments: 1 },
];

export const recentWorkouts = [
  { day: "12", month: "Sep", name: "Push A", meta: "58 min · 12.5k kg · 19 sets", pr: true },
  { day: "10", month: "Sep", name: "Legs", meta: "64 min · 14.2k kg · 16 sets" },
  { day: "8", month: "Sep", name: "Pull", meta: "52 min · 9.8k kg · 17 sets" },
];

export const devices = {
  connected: [
    { key: "health", name: "Apple Health", sub: "Reads heart rate, energy, sleep, weight. Writes your sessions.", icon: "heart" as const },
    { key: "watch", name: "Apple Watch", sub: "CresQ for Watch installed. Live heart rate and wrist logging.", icon: "watch" as const, synced: "Synced 2 min ago" },
  ],
  available: [
    { key: "garmin", letter: "G", name: "Garmin Connect", sub: "Daily heart rate, sleep, Body Battery" },
    { key: "fitbit", letter: "F", name: "Fitbit", sub: "Heart rate, sleep, active minutes" },
    { key: "whoop", letter: "W", name: "Whoop", sub: "Recovery and strain" },
    { key: "oura", letter: "O", name: "Oura", sub: "Readiness, sleep, HRV" },
    { key: "strava", letter: "S", name: "Strava", sub: "Publish sessions as strength activities" },
  ],
  permissions: [
    { key: "hr", icon: "heart" as const, name: "Heart rate", sub: "Live heart rate and zones in sessions", on: true },
    { key: "energy", icon: "flame" as const, name: "Active energy", sub: "Calories per session and your daily budget", on: true },
    { key: "sleep", icon: "pulse" as const, name: "Sleep and HRV", sub: "Readiness on Home and plan adjustments", on: true },
    { key: "mass", icon: "watch" as const, name: "Body mass", sub: "Weight trend, filled in from your scale", on: false },
    { key: "write", icon: "lock" as const, name: "Write workouts", sub: "Save each session to Apple Health", on: true },
  ],
};
