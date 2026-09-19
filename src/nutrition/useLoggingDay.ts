import { useNow } from "@/clock";
import { useT, useLanguage, localeOf } from "@/i18n";
import { startOfDay } from "@/db/derive";
import { dayOffset, loggingDay } from "./day";

/**
 * The day that what is being added belongs to, for the screens behind the
 * plus on the Food tab. `name` is there to be said on a button or under a
 * title, and is null when the day is simply today, which needs no saying.
 */
export function useLoggingDay() {
  const t = useT();
  const locale = localeOf(useLanguage());
  const now = useNow();
  const day = loggingDay(now);
  const offset = dayOffset(day, now);
  const name = offset === 0 ? null : offset === -1 ? t("Yesterday").toLowerCase() : offset === 1 ? t("Tomorrow").toLowerCase() : new Date(day).toLocaleDateString(locale, { weekday: "short", day: "numeric", month: "short" }).replace(/\./g, "");
  return { day, name, ahead: day > startOfDay(now) };
}
