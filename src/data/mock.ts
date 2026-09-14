import type { ImageSourcePropType } from "react-native";
import type { Post } from "@/components/PostCard";

/**
 * What is still mock in v1: photos, other people's posts, notifications and
 * device catalogue. Everything about the user's own training comes from the database.
 */

export const photos: Record<string, ImageSourcePropType> = {
  selfie: require("@/assets/photos/selfie.png"),
  gym1: require("@/assets/photos/gym-1.png"),
  gym2: require("@/assets/photos/gym-2.png"),
  gym3: require("@/assets/photos/gym-3.png"),
};

export const otherPosts: Post[] = [
  { id: "p2", userId: "u2", name: "Sara de Vries", meta: "Legs, yesterday", photo: photos.gym2, caption: "Pause squats, 5 × 5 at 90 kg.", workout: [{ name: "Back squat", sets: [{ kg: 60, reps: 5, type: "warmup" }, { kg: 90, reps: 5 }, { kg: 90, reps: 5 }, { kg: 90, reps: 5 }, { kg: 90, reps: 5 }, { kg: 90, reps: 5 }] }, { name: "Romanian deadlift", sets: [{ kg: 80, reps: 8 }, { kg: 80, reps: 8 }, { kg: 85, reps: 6 }] }, { name: "Leg press", sets: [{ kg: 140, reps: 12 }, { kg: 150, reps: 10 }, { kg: 150, reps: 10 }] }, { name: "Walking lunge", sets: [{ kg: 16, reps: 12 }, { kg: 16, reps: 12 }] }, { name: "Calf raise", sets: [{ kg: 60, reps: 15 }, { kg: 60, reps: 15 }, { kg: 60, reps: 12, type: "failure" }] }], stats: [{ value: "64", unit: "min" }, { value: "9.8k", unit: "kg" }, { value: "16", unit: "sets" }], likes: 12, comments: 3 },
  { id: "p4", userId: "u4", name: "Lisa Jansen", meta: "Full body, today", caption: "Third session this week. Deadlift finally moved.", workout: [{ name: "Deadlift", sets: [{ kg: 60, reps: 5, type: "warmup" }, { kg: 90, reps: 5 }, { kg: 90, reps: 5 }, { kg: 90, reps: 5 }] }, { name: "Bench press", sets: [{ kg: 45, reps: 8 }, { kg: 45, reps: 8 }, { kg: 45, reps: 8 }] }, { name: "Lat pulldown", sets: [{ kg: 40, reps: 10 }, { kg: 40, reps: 10 }, { kg: 40, reps: 10 }] }, { name: "Plank", sets: [{ kg: 0, reps: 45 }, { kg: 0, reps: 45 }, { kg: 0, reps: 45 }] }], record: "New record, Deadlift 90 kg", exercises: [{ name: "Deadlift", detail: "3 sets" }, { name: "Bench press", detail: "3 sets" }, { name: "Lat pulldown", detail: "3 sets" }, { name: "Plank", detail: "3 sets" }], stats: [{ value: "48", unit: "min" }, { value: "4.1k", unit: "kg" }, { value: "12", unit: "sets" }], likes: 15, comments: 4 },
  { id: "p3", userId: "u3", name: "Tom Bakker", meta: "Arms, yesterday", photo: photos.gym3, caption: "Preacher curls to finish. Forearms gone.", workout: [{ name: "Barbell curl", sets: [{ kg: 30, reps: 10 }, { kg: 30, reps: 10 }, { kg: 32.5, reps: 8 }] }, { name: "Triceps pushdown", sets: [{ kg: 30, reps: 12 }, { kg: 32.5, reps: 12 }, { kg: 35, reps: 10 }] }, { name: "Hammer curl", sets: [{ kg: 14, reps: 12 }, { kg: 14, reps: 12 }] }, { name: "Overhead extension", sets: [{ kg: 25, reps: 12 }, { kg: 25, reps: 12 }, { kg: 25, reps: 10 }] }, { name: "Preacher curl", sets: [{ kg: 20, reps: 12 }, { kg: 20, reps: 10 }, { kg: 15, reps: 12, type: "drop" }] }], stats: [{ value: "41", unit: "min" }, { value: "4.2k", unit: "kg" }, { value: "14", unit: "sets" }], likes: 8, comments: 1 },
  { id: "p5", userId: "u7", name: "Noah de Groot", meta: "Push, 2 days ago", caption: "Deload week. Light, fast, done in forty.", workout: [{ name: "Bench press", sets: [{ kg: 50, reps: 8, type: "warmup" }, { kg: 80, reps: 6 }, { kg: 80, reps: 6 }, { kg: 80, reps: 6 }, { kg: 80, reps: 6 }] }, { name: "Overhead press", sets: [{ kg: 45, reps: 8 }, { kg: 45, reps: 8 }, { kg: 45, reps: 8 }] }, { name: "Incline dumbbell press", sets: [{ kg: 26, reps: 10 }, { kg: 26, reps: 10 }, { kg: 26, reps: 10 }] }, { name: "Cable fly", sets: [{ kg: 15, reps: 15 }, { kg: 15, reps: 15 }] }, { name: "Triceps pushdown", sets: [{ kg: 30, reps: 12 }, { kg: 30, reps: 12 }, { kg: 30, reps: 12 }] }], exercises: [{ name: "Bench press", detail: "4 sets" }, { name: "Overhead press", detail: "3 sets" }, { name: "Incline dumbbell press", detail: "3 sets" }, { name: "Cable fly", detail: "2 sets" }, { name: "Triceps pushdown", detail: "3 sets" }], stats: [{ value: "41", unit: "min" }, { value: "6.2k", unit: "kg" }, { value: "15", unit: "sets" }], likes: 6, comments: 0 },
];

export type Notification = { id: string; kind: "like" | "comment" | "follow" | "record" | "reminder" | "device"; title: string; body?: string; when: string; unread?: boolean; avatar?: ImageSourcePropType; /** Where a tap goes. */ href?: string };

export const notifications: { group: string; items: Notification[] }[] = [
  {
    group: "Today",
    items: [
      { id: "n1", kind: "like", title: "Sara de Vries and 11 others liked your session", body: "Push, New record, Bench 100 kg", when: "2 h", unread: true, avatar: photos.gym2, href: "/(tabs)/feed" },
      { id: "n2", kind: "comment", title: "Tom Bakker commented", body: "“Two weeks early, that forecast is scared of you.”", when: "3 h", unread: true, avatar: photos.gym3, href: "/(tabs)/feed" },
      { id: "n3", kind: "record", title: "Your next record is close", body: "Bench press 100 kg is likely within two weeks. Keep three sessions.", when: "6 h", unread: true, href: "/progress/bench" },
    ],
  },
  {
    group: "This week",
    items: [
      { id: "n4", kind: "follow", title: "Lisa Jansen started following you", when: "Tue", href: "/user/u4" },
      { id: "n5", kind: "reminder", title: "Legs is up next", body: "Last done 2 days ago. Your split says today.", when: "Tue", href: "/(tabs)/train" },
      { id: "n6", kind: "device", title: "Apple Watch synced", body: "Heart rate and energy added to Pull, 8 Sep.", when: "Mon", href: "/settings/devices" },
    ],
  },
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
