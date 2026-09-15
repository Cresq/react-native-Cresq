import { useCallback, useEffect } from "react";
import { setLocale } from "@/db/derive";
import { useDb } from "@/db/DbProvider";
import { nl } from "./nl";

export type Language = "nl" | "en";

/**
 * Translation by sentence. Source strings are the English the app was written
 * in; `nl.ts` maps them to Dutch. Missing entries fall back to English, so a
 * new string never breaks the screen, it just shows up untranslated.
 * Placeholders are written {name} and filled from the second argument.
 */
export function translate(lang: Language, source: string, vars?: Record<string, string | number>) {
  let out = lang === "nl" ? (nl[source] ?? source) : source;
  if (vars) for (const [k, v] of Object.entries(vars)) out = out.split(`{${k}}`).join(String(v));
  return out;
}

export function useLanguage(): Language {
  const { db } = useDb();
  return db.profile.language ?? "nl";
}

/**
 * One or many. Both languages need the singular, and "1 oefeningen" is the
 * kind of small wrongness that makes an app feel unfinished.
 */
export function usePlural() {
  const t = useT();
  return useCallback((n: number, one: string, other: string) => t(n === 1 ? one : other, { n }), [t]);
}

export function useT() {
  const lang = useLanguage();
  return useCallback((source: string, vars?: Record<string, string | number>) => translate(lang, source, vars), [lang]);
}

/** Locale tag for dates and numbers. */
export const localeOf = (lang: Language) => (lang === "nl" ? "nl-NL" : "en-GB");

/** Keeps the date helpers in `derive` on the same language as the profile. Render once, high in the tree. */
export function LocaleSync() {
  const lang = useLanguage();
  useEffect(() => {
    setLocale(localeOf(lang));
  }, [lang]);
  return null;
}
