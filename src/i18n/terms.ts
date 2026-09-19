import type { Language } from "./translate";

/**
 * The gym's own vocabulary: the muscles and the equipment the catalogue names.
 *
 * This is a dictionary of its own rather than entries in `nl.ts`, because the
 * words collide with the app's copy. "Back" is Terug on a button and Rug on an
 * exercise, and a single flat map cannot tell those apart.
 *
 * The catalogue itself stays in English. `musclesOf` reads it to work out which
 * muscle group a set trained, and translating the stored words would quietly
 * stop that from matching. Only what reaches the screen is translated.
 */
const nlTerms: Record<string, string> = {
  /* Muscles, as the catalogue capitalises them */
  Adductors: "Adductoren",
  Back: "Rug",
  Biceps: "Biceps",
  Calves: "Kuiten",
  Cardio: "Cardio",
  Chest: "Borst",
  Core: "Core",
  Forearms: "Onderarmen",
  "Front delts": "Voorste deltoides",
  "Full body": "Hele lichaam",
  Glutes: "Bilspieren",
  Grip: "Grip",
  Hamstrings: "Hamstrings",
  Lats: "Lats",
  "Lower back": "Onderrug",
  Mobility: "Mobiliteit",
  Neck: "Nek",
  Obliques: "Schuine buikspieren",
  Quads: "Quadriceps",
  "Rear delts": "Achterste deltoides",
  Shins: "Schenen",
  Shoulders: "Schouders",
  "Side delts": "Zijdelingse deltoides",
  Traps: "Trapezius",
  Triceps: "Triceps",
  "Upper chest": "Bovenborst",
  "Upper back": "Bovenrug",

  /* Equipment */
  Band: "Elastiek",
  Barbell: "Halterstang",
  Bodyweight: "Eigen lichaamsgewicht",
  Cable: "Kabel",
  "Cardio machine": "Cardioapparaat",
  Conditioning: "Conditie",
  Dumbbells: "Dumbbells",
  Kettlebell: "Kettlebell",
  Machine: "Machine",
  Outdoor: "Buiten",
  Plate: "Schijf",
  Pool: "Zwembad",
  Sled: "Slee",
  "Smith machine": "Smithmachine",

  /* Secondary muscles, which the catalogue writes in lower case */
  abductors: "abductoren",
};

/** One word or phrase, keeping the case the catalogue used. */
function term(lang: Language, raw: string) {
  const s = raw.trim();
  if (lang === "en" || !s) return s;
  const hit = nlTerms[s];
  if (hit) return hit;
  const upper = s[0].toUpperCase() + s.slice(1);
  const found = nlTerms[upper];
  return found ? found[0].toLowerCase() + found.slice(1) : s;
}

/**
 * A comma-separated line of them: "Lower back, glutes" reads back as
 * "Onderrug, bilspieren". Anything the dictionary has never heard of comes
 * through untouched, so a new exercise never shows up blank.
 */
export function terms(lang: Language, phrase: string) {
  if (lang === "en" || !phrase) return phrase;
  return phrase.split(",").map((p) => term(lang, p)).join(", ");
}
