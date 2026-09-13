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
  { id: "p2", userId: "u2", name: "Sara de Vries", meta: "Legs · yesterday", photo: photos.gym2, photoHeight: 260, caption: "Pause squats, 5 × 5 at 90 kg.", stats: [{ value: "64", unit: "min" }, { value: "9.8k", unit: "kg" }, { value: "16", unit: "sets" }], likes: 12, comments: 3 },
  { id: "p3", userId: "u3", name: "Tom Bakker", meta: "Arms · yesterday", photo: photos.gym3, photoHeight: 260, caption: "Preacher curls to finish. Forearms gone.", stats: [{ value: "41", unit: "min" }, { value: "4.2k", unit: "kg" }, { value: "14", unit: "sets" }], likes: 8, comments: 1 },
];

export type Notification = { id: string; kind: "like" | "comment" | "follow" | "record" | "reminder" | "device"; title: string; body?: string; when: string; unread?: boolean; avatar?: ImageSourcePropType };

export const notifications: { group: string; items: Notification[] }[] = [
  {
    group: "Today",
    items: [
      { id: "n1", kind: "like", title: "Sara de Vries and 11 others liked your session", body: "Push · New record · Bench 100 kg", when: "2 h", unread: true, avatar: photos.gym2 },
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
