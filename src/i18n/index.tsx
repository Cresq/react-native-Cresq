import { useCallback, useEffect } from "react";
import { setLocale } from "@/db/derive";
import { translate, localeOf, possessive, type Language } from "./translate";
import { terms } from "./terms";
import { useLanguage } from "./language";

export { translate, localeOf, possessive, type Language };
export { terms, useLanguage };

/**
 * One or many. Both languages need the singular, and "1 oefeningen" is the
 * kind of small wrongness that makes an app feel unfinished.
 */
export function usePlural() {
  const t = useT();
  return useCallback((n: number, one: string, other: string) => t(n === 1 ? one : other, { n }), [t]);
}

/** The catalogue's muscle and equipment wording, in the reader's language. */
export function useTerms() {
  const lang = useLanguage();
  return useCallback((phrase: string) => terms(lang, phrase), [lang]);
}

export function useT() {
  const lang = useLanguage();
  return useCallback((source: string, vars?: Record<string, string | number>) => translate(lang, source, vars), [lang]);
}


/** Keeps the date helpers in `derive` on the same language as the profile. Render once, high in the tree. */
export function LocaleSync() {
  const lang = useLanguage();
  useEffect(() => {
    setLocale(localeOf(lang));
  }, [lang]);
  return null;
}
