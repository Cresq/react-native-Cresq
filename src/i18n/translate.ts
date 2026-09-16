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
