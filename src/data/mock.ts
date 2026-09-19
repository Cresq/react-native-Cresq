import type { ImageSourcePropType } from "react-native";
import type { Post } from "@/components/PostCard";

/**
 * What is still mock in v1: photos, other people's posts, notifications and
 * device catalogue. Everything about the user's own training comes from the database.
 *
 * The captions, comments and bios are these people's own words, so they are
 * written in Dutch rather than kept as translation keys. A lifter in Amsterdam
 * writes Dutch whichever language the reader has picked. Everything the app
 * itself says about a post, the date and the record chip, goes through t().
 */

export const photos: Record<string, ImageSourcePropType> = {
  selfie: require("@/assets/photos/selfie.png"),
  gym1: require("@/assets/photos/gym-1.png"),
  gym2: require("@/assets/photos/gym-2.png"),
  gym3: require("@/assets/photos/gym-3.png"),
};

export const otherPosts: Post[] = [
  { id: "p2", userId: "u2", name: "Sara de Vries", title: "Legs", meta: "yesterday", place: "TrainMore Amsterdam Zuid", photo: photos.gym2, caption: "Pauzesquats, 5 × 5 op 90 kg.", workout: [{ name: "Back squat", sets: [{ kg: 60, reps: 5, type: "warmup" }, { kg: 90, reps: 5 }, { kg: 90, reps: 5 }, { kg: 90, reps: 5 }, { kg: 90, reps: 5 }, { kg: 90, reps: 5 }] }, { name: "Romanian deadlift", sets: [{ kg: 80, reps: 8 }, { kg: 80, reps: 8 }, { kg: 85, reps: 6 }] }, { name: "Leg press", sets: [{ kg: 140, reps: 12 }, { kg: 150, reps: 10 }, { kg: 150, reps: 10 }] }, { name: "Walking lunge", sets: [{ kg: 16, reps: 12 }, { kg: 16, reps: 12 }] }, { name: "Calf raise", sets: [{ kg: 60, reps: 15 }, { kg: 60, reps: 15 }, { kg: 60, reps: 12, type: "failure" }] }], stats: [{ value: "64", unit: "min" }, { value: "9.8k", unit: "kg" }, { value: "16", unit: "sets" }], commentList: [{ name: "Tom Bakker", text: "Pauzesquats op 90, sterk.", avatar: photos.gym3 }, { name: "Nick Li", text: "En die stangsnelheid zeg.", avatar: photos.selfie }], likes: 12, comments: 3 },
  { id: "p4", userId: "u4", name: "Lisa Jansen", title: "Full body", meta: "today", place: "Basic-Fit Utrecht Centrum", caption: "Derde sessie deze week. Deadlift kwam eindelijk los.", workout: [{ name: "Deadlift", sets: [{ kg: 60, reps: 5, type: "warmup" }, { kg: 90, reps: 5 }, { kg: 90, reps: 5 }, { kg: 90, reps: 5 }] }, { name: "Bench press", sets: [{ kg: 45, reps: 8 }, { kg: 45, reps: 8 }, { kg: 45, reps: 8 }] }, { name: "Lat pulldown", sets: [{ kg: 40, reps: 10 }, { kg: 40, reps: 10 }, { kg: 40, reps: 10 }] }, { name: "Plank", sets: [{ kg: 0, reps: 45 }, { kg: 0, reps: 45 }, { kg: 0, reps: 45 }] }], record: "New record, Deadlift 90 kg", exercises: [{ name: "Deadlift", detail: "3 sets" }, { name: "Bench press", detail: "3 sets" }, { name: "Lat pulldown", detail: "3 sets" }, { name: "Plank", detail: "3 sets" }], stats: [{ value: "48", unit: "min" }, { value: "4.1k", unit: "kg" }, { value: "12", unit: "sets" }], commentList: [{ name: "Sara de Vries", text: "Eindelijk! Die zat al weken vast.", avatar: photos.gym2 }, { name: "Nick Li", text: "Volgende maand 90 voor reps.", avatar: photos.selfie }], likes: 15, comments: 4 },
  { id: "p3", userId: "u3", name: "Tom Bakker", title: "Arms", meta: "yesterday", place: "SportCity Rotterdam", photo: photos.gym3, caption: "Afgesloten met preacher curls. Onderarmen op.", workout: [{ name: "Barbell curl", sets: [{ kg: 30, reps: 10 }, { kg: 30, reps: 10 }, { kg: 32.5, reps: 8 }] }, { name: "Triceps pushdown", sets: [{ kg: 30, reps: 12 }, { kg: 32.5, reps: 12 }, { kg: 35, reps: 10 }] }, { name: "Hammer curl", sets: [{ kg: 14, reps: 12 }, { kg: 14, reps: 12 }] }, { name: "Overhead extension", sets: [{ kg: 25, reps: 12 }, { kg: 25, reps: 12 }, { kg: 25, reps: 10 }] }, { name: "Preacher curl", sets: [{ kg: 20, reps: 12 }, { kg: 20, reps: 10 }, { kg: 15, reps: 12, type: "drop" }] }], stats: [{ value: "41", unit: "min" }, { value: "4.2k", unit: "kg" }, { value: "14", unit: "sets" }], commentList: [{ name: "Sara de Vries", text: "Je onderarmen vergeven het je donderdag wel.", avatar: photos.gym2 }], likes: 8, comments: 1 },
  { id: "p5", userId: "u7", name: "Noah de Groot", title: "Push", meta: "2 days ago", place: "Fit For Free Den Haag", caption: "Deloadweek. Licht, snel, klaar in veertig minuten.", workout: [{ name: "Bench press", sets: [{ kg: 50, reps: 8, type: "warmup" }, { kg: 80, reps: 6 }, { kg: 80, reps: 6 }, { kg: 80, reps: 6 }, { kg: 80, reps: 6 }] }, { name: "Overhead press", sets: [{ kg: 45, reps: 8 }, { kg: 45, reps: 8 }, { kg: 45, reps: 8 }] }, { name: "Incline dumbbell press", sets: [{ kg: 26, reps: 10 }, { kg: 26, reps: 10 }, { kg: 26, reps: 10 }] }, { name: "Cable fly", sets: [{ kg: 15, reps: 15 }, { kg: 15, reps: 15 }] }, { name: "Triceps pushdown", sets: [{ kg: 30, reps: 12 }, { kg: 30, reps: 12 }, { kg: 30, reps: 12 }] }], exercises: [{ name: "Bench press", detail: "4 sets" }, { name: "Overhead press", detail: "3 sets" }, { name: "Incline dumbbell press", detail: "3 sets" }, { name: "Cable fly", detail: "2 sets" }, { name: "Triceps pushdown", detail: "3 sets" }], stats: [{ value: "41", unit: "min" }, { value: "6.2k", unit: "kg" }, { value: "15", unit: "sets" }], likes: 6, comments: 0 },
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

/**
 * Apple Health connects for real, in a build that carries the bindings; every
 * other row offers to connect and admits it cannot yet. Garmin has no row of
 * its own to connect: it writes into Apple Health, and CresQ reads it there. The permissions list is a preview of
 * what connecting will ask for, not a set of switches that do anything.
 */
export const devices = {
  available: [
    { key: "health", icon: "heart" as const, name: "Apple Health", sub: "Heart rate, energy, sleep and weight, and your sessions written back." },
    { key: "watch", icon: "watch" as const, name: "Apple Watch", sub: "Live heart rate and logging from your wrist." },
    { key: "garmin", letter: "G", name: "Garmin Connect", sub: "Through Apple Health: let Garmin Connect write there, and your workouts arrive here." },
    { key: "fitbit", letter: "F", name: "Fitbit", sub: "Heart rate, sleep, active minutes" },
    { key: "whoop", letter: "W", name: "Whoop", sub: "Recovery and strain" },
    { key: "oura", letter: "O", name: "Oura", sub: "Readiness, sleep, HRV" },
    { key: "strava", letter: "S", name: "Strava", sub: "Publish sessions as strength activities" },
  ],
  permissions: [
    { key: "hr", icon: "heart" as const, name: "Heart rate", sub: "Live heart rate and zones in sessions" },
    { key: "energy", icon: "flame" as const, name: "Active energy", sub: "Calories per session and your daily budget" },
    { key: "sleep", icon: "pulse" as const, name: "Sleep and HRV", sub: "Readiness on Home and plan adjustments" },
    { key: "mass", icon: "watch" as const, name: "Body mass", sub: "Weight trend, filled in from your scale" },
    { key: "write", icon: "lock" as const, name: "Write workouts", sub: "Save each session to Apple Health" },
  ],
};
