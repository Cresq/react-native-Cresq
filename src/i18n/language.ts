import { createContext, useContext } from "react";
import type { Language } from "./translate";

/**
 * The reader's language, on a context of its own.
 *
 * Nearly every component translates something, so nearly every component asks
 * for the language. Read from the database context, that made each of them a
 * subscriber to the whole document: one keystroke in a set redrew every card,
 * sheet and chart on the screen, and the screens behind it. A context that
 * holds one string only moves when that string does.
 */
export const LanguageContext = createContext<Language>("nl");

export function useLanguage(): Language {
  return useContext(LanguageContext);
}
