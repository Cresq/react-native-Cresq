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
};

export const ME = "u1";

export const people: Person[] = [
  { id: "u2", name: "Sara de Vries", handle: "@saradv", city: "Utrecht", since: "2022", bio: "Powerlifting, mostly squats.", avatar: photos.gym2, following: ["u1", "u3", "u5"], recent: [{ name: "Legs", date: "12 Sept", photo: photos.gym2, records: 1 }, { name: "Push", date: "10 Sept" }, { name: "Pull", date: "8 Sept" }, { name: "Legs", date: "6 Sept" }] },
  { id: "u3", name: "Tom Bakker", handle: "@tombakker", city: "Rotterdam", since: "2023", bio: "Arms day is every day.", avatar: photos.gym3, following: ["u1", "u2"], recent: [{ name: "Arms & Shoulders", date: "12 Sept", photo: photos.gym3 }, { name: "Chest & Back", date: "10 Sept", records: 2 }, { name: "Arms & Shoulders", date: "8 Sept" }] },
  { id: "u4", name: "Lisa Jansen", handle: "@lisaj", city: "Amsterdam", since: "2024", bio: "Three days a week, no excuses.", following: ["u1", "u2", "u6"], recent: [{ name: "Full body", date: "11 Sept" }, { name: "Full body", date: "9 Sept", records: 1 }, { name: "Full body", date: "7 Sept" }] },
  { id: "u5", name: "Daan Visser", handle: "@daanv", city: "Den Haag", since: "2021", bio: "Chasing a 200 kg deadlift.", avatar: photos.gym1, following: ["u2", "u3"], recent: [{ name: "Pull", date: "12 Sept", photo: photos.gym1, records: 1 }, { name: "Legs", date: "10 Sept" }] },
  { id: "u6", name: "Emma Smit", handle: "@emmasmit", city: "Eindhoven", since: "2023", following: ["u1", "u4"], recent: [{ name: "Upper", date: "11 Sept" }, { name: "Lower", date: "9 Sept" }] },
  { id: "u7", name: "Noah de Groot", handle: "@noahdg", city: "Groningen", since: "2022", bio: "Coach. Ask me about programming.", following: ["u1", "u2", "u3", "u5"], recent: [{ name: "Push", date: "12 Sept" }, { name: "Pull", date: "11 Sept" }, { name: "Legs", date: "10 Sept" }] },
  { id: "u8", name: "Julia Meijer", handle: "@juliam", city: "Amsterdam", since: "2025", following: ["u1"], recent: [{ name: "Full body", date: "10 Sept" }] },
  { id: "u9", name: "Bram Mulder", handle: "@brammulder", city: "Leiden", since: "2024", following: ["u2"], recent: [{ name: "Push", date: "9 Sept" }, { name: "Pull", date: "7 Sept" }] },
  { id: "u10", name: "Fleur Bos", handle: "@fleurbos", city: "Haarlem", since: "2023", following: ["u1", "u7"], recent: [{ name: "Legs", date: "12 Sept", records: 1 }, { name: "Upper", date: "10 Sept" }] },
];

export const person = (id: string) => people.find((p) => p.id === id);
/** Everyone whose list contains `id`. */
export const followersOf = (id: string) => people.filter((p) => p.following.includes(id));
