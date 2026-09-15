import type { ImageSourcePropType } from "react-native";
import { photos } from "./mock";

/**
 * A mock directory of people until there is a server. Names are invented;
 * the photos are Nick's own gym photos, reused as placeholders. `u1` is the
 * signed-in user and is never listed. Counts on other profiles are derived
 * from these lists so nothing on screen contradicts itself.
 */
export type Person = {
  id: string;
  name: string;
  handle: string;
  city: string;
  since: string;
  bio?: string;
  avatar?: ImageSourcePropType;
  /** Ids this person follows. */
  following: string[];
  /** A few recent workouts for the grid on their profile. */
  recent: { name: string; date: string; photo?: ImageSourcePropType; records?: number }[];
  /** A session running right now, if this person shares live workouts. */
  live?: LiveSession;
  /**
   * What a comparison shows. Off means this person keeps their figures to
   * themselves, and CresQ says so rather than showing anything.
   */
  compare?: { sessions: number; weekSessions: number; weekVolume: number; lifts: { exerciseId: string; kg: number }[] };
};

export type LiveSession = { planName: string; startedAt: number; exercises: { name: string; sets: { kg: number; reps: number }[] }[] };

const minutesAgo = (m: number) => Date.now() - m * 60000;

export const ME = "u1";

export const people: Person[] = [
  { id: "u2", name: "Sara de Vries", handle: "@saradv", compare: { sessions: 214, weekSessions: 4, weekVolume: 38200, lifts: [{ exerciseId: "squat", kg: 112 }, { exerciseId: "deadlift", kg: 140 }, { exerciseId: "bench", kg: 72 }, { exerciseId: "ohp", kg: 45 }] }, city: "Utrecht", since: "2022", bio: "Powerlifting, mostly squats.", avatar: photos.gym2, following: ["u1", "u3", "u5"], live: { planName: "Legs", startedAt: minutesAgo(23), exercises: [{ name: "Back squat", sets: [{ kg: 60, reps: 5 }, { kg: 90, reps: 5 }, { kg: 90, reps: 5 }, { kg: 92.5, reps: 5 }, { kg: 92.5, reps: 5 }] }, { name: "Romanian deadlift", sets: [{ kg: 80, reps: 8 }, { kg: 80, reps: 8 }, { kg: 85, reps: 6 }] }, { name: "Leg press", sets: [{ kg: 150, reps: 10 }, { kg: 150, reps: 10 }, { kg: 150, reps: 10 }] }, { name: "Calf raise", sets: [{ kg: 60, reps: 15 }, { kg: 60, reps: 15 }, { kg: 60, reps: 12 }] }] }, recent: [{ name: "Legs", date: "12 Sept", photo: photos.gym2, records: 1 }, { name: "Push", date: "10 Sept" }, { name: "Pull", date: "8 Sept" }, { name: "Legs", date: "6 Sept" }] },
  { id: "u3", name: "Tom Bakker", handle: "@tombakker", compare: { sessions: 96, weekSessions: 3, weekVolume: 21400, lifts: [{ exerciseId: "bench", kg: 98 }, { exerciseId: "squat", kg: 105 }, { exerciseId: "deadlift", kg: 155 }, { exerciseId: "ohp", kg: 62 }] }, city: "Rotterdam", since: "2023", bio: "Arms day is every day.", avatar: photos.gym3, following: ["u1", "u2"], recent: [{ name: "Arms & Shoulders", date: "12 Sept", photo: photos.gym3 }, { name: "Chest & Back", date: "10 Sept", records: 2 }, { name: "Arms & Shoulders", date: "8 Sept" }] },
  { id: "u4", name: "Lisa Jansen", handle: "@lisaj", compare: { sessions: 41, weekSessions: 3, weekVolume: 12800, lifts: [{ exerciseId: "deadlift", kg: 92 }, { exerciseId: "bench", kg: 47 }, { exerciseId: "squat", kg: 68 }] }, city: "Amsterdam", since: "2024", bio: "Three days a week, no excuses.", following: ["u1", "u2", "u6"], recent: [{ name: "Full body", date: "11 Sept" }, { name: "Full body", date: "9 Sept", records: 1 }, { name: "Full body", date: "7 Sept" }] },
  { id: "u5", name: "Daan Visser", handle: "@daanv", city: "Den Haag", since: "2021", bio: "Chasing a 200 kg deadlift.", avatar: photos.gym1, following: ["u2", "u3"], recent: [{ name: "Pull", date: "12 Sept", photo: photos.gym1, records: 1 }, { name: "Legs", date: "10 Sept" }] },
  { id: "u6", name: "Emma Smit", handle: "@emmasmit", compare: { sessions: 158, weekSessions: 5, weekVolume: 44600, lifts: [{ exerciseId: "squat", kg: 165 }, { exerciseId: "deadlift", kg: 200 }, { exerciseId: "bench", kg: 125 }, { exerciseId: "ohp", kg: 80 }] }, city: "Eindhoven", since: "2023", following: ["u1", "u4"], recent: [{ name: "Upper", date: "11 Sept" }, { name: "Lower", date: "9 Sept" }] },
  { id: "u7", name: "Noah de Groot", handle: "@noahdg", compare: { sessions: 73, weekSessions: 2, weekVolume: 16900, lifts: [{ exerciseId: "bench", kg: 88 }, { exerciseId: "ohp", kg: 55 }, { exerciseId: "squat", kg: 96 }] }, city: "Groningen", since: "2022", bio: "Coach. Ask me about programming.", following: ["u1", "u2", "u3", "u5"], live: { planName: "Push", startedAt: minutesAgo(9), exercises: [{ name: "Bench press", sets: [{ kg: 60, reps: 8 }, { kg: 85, reps: 6 }, { kg: 85, reps: 6 }, { kg: 85, reps: 6 }] }, { name: "Overhead press", sets: [{ kg: 45, reps: 8 }, { kg: 45, reps: 8 }, { kg: 45, reps: 8 }] }, { name: "Incline dumbbell press", sets: [{ kg: 26, reps: 10 }, { kg: 26, reps: 10 }, { kg: 26, reps: 10 }] }, { name: "Cable fly", sets: [{ kg: 15, reps: 15 }, { kg: 15, reps: 15 }] }] }, recent: [{ name: "Push", date: "12 Sept" }, { name: "Pull", date: "11 Sept" }, { name: "Legs", date: "10 Sept" }] },
  { id: "u8", name: "Julia Meijer", handle: "@juliam", city: "Amsterdam", since: "2025", following: ["u1"], recent: [{ name: "Full body", date: "10 Sept" }] },
  { id: "u9", name: "Bram Mulder", handle: "@brammulder", city: "Leiden", since: "2024", following: ["u2"], recent: [{ name: "Push", date: "9 Sept" }, { name: "Pull", date: "7 Sept" }] },
  { id: "u10", name: "Fleur Bos", handle: "@fleurbos", city: "Haarlem", since: "2023", following: ["u1", "u7"], recent: [{ name: "Legs", date: "12 Sept", records: 1 }, { name: "Upper", date: "10 Sept" }] },
];

export const person = (id: string) => people.find((p) => p.id === id);

/**
 * How far a mock live session has come: one set every ~3.5 minutes since it
 * started. Real data will replace this with the follower's actual progress.
 */
export function liveProgress(live: LiveSession, now = Date.now()) {
  const total = live.exercises.reduce((n, e) => n + e.sets.length, 0);
  const done = Math.min(total, Math.floor((now - live.startedAt) / 210000));
  let left = done;
  const exercises = live.exercises.map((e) => {
    const d = Math.max(0, Math.min(e.sets.length, left));
    left -= d;
    return { name: e.name, doneSets: e.sets.slice(0, d), total: e.sets.length };
  });
  const currentIndex = Math.max(0, exercises.findIndex((e) => e.doneSets.length < e.total));
  return { total, done, exercises, currentIndex: currentIndex === -1 ? exercises.length - 1 : currentIndex, finished: done >= total };
}
/** Everyone whose list contains `id`. */
export const followersOf = (id: string) => people.filter((p) => p.following.includes(id));
