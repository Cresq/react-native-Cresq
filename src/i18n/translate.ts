import { nl } from "./nl";

export type Language = "nl" | "en";

/**
 * Translation by sentence. Source strings are the English the app was written
 * in; `nl.ts` maps them to Dutch. Missing entries fall back to English, so a
 * new string never breaks the screen, it just shows up untranslated.
 * Placeholders are written {name} and filled from the second argument.
 *
 * This lives apart from the hooks so the data layer can reach it. `src/i18n`
 * reads the language out of the database, and the seed builds that database,
 * which would be a circle if they shared one file.
 */
export function translate(lang: Language, source: string, vars?: Record<string, string | number>) {
  let out = lang === "nl" ? (nl[source] ?? source) : source;
  if (vars) for (const [k, v] of Object.entries(vars)) out = out.split(`{${k}}`).join(String(v));
  return out;
}

/** Locale tag for dates and numbers. */
export const localeOf = (lang: Language) => (lang === "nl" ? "nl-NL" : "en-GB");

/**
 * A name in the possessive, by the rules of the language.
 *
 * English adds 's to everything. Dutch adds a bare s (Bakkers, Jansens) except
 * after a sibilant, where only the apostrophe is left (de Vries', Max'), and
 * after a single long vowel, where the apostrophe keeps the vowel long
 * (Sara's, Li's, Timo's). A vowel written with two letters is already long,
 * so it takes the bare s (Sophies, Renees).
 */
export function possessive(lang: Language, name: string) {
  const n = name.trim();
  if (!n) return n;
  if (lang === "en") return `${n}'s`;
  const last = n.slice(-1).toLowerCase();
  const tail = n.slice(-2).toLowerCase();
  if ("sxz".includes(last)) return `${n}'`;
  if (["ee", "ie", "oe", "ue", "au", "ou", "eu", "ui"].includes(tail)) return `${n}s`;
  if ("aiouyé".includes(last)) return `${n}'s`;
  return `${n}s`;
}
