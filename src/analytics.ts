import type { Consent, Profile } from "./db/types";

/**
 * The only door to analytics. Nothing leaves the device unless the user
 * turned "Anonymous usage statistics" on in Account and privacy, and even
 * then only what is listed here. There is no analytics provider wired in
 * yet: when one is added, it is added here and nowhere else.
 */
export type AnalyticsEvent = "session_finished" | "record_set" | "plan_created";

export function track(consent: Consent, event: AnalyticsEvent, props: Record<string, string | number | boolean> = {}) {
  if (!consent.analytics) return;
  // Provider call goes here. Until then, a development log is all this does.
  if (__DEV__) console.log("[analytics]", event, props);
}

/** Age is only ever reported as a band, and only when the user allowed age statistics. */
export function ageBand(profile: Profile, consent: Consent, now = new Date()): string | undefined {
  if (!consent.ageStats || !profile.birthYear) return undefined;
  const age = now.getFullYear() - profile.birthYear;
  if (age < 16) return undefined;
  if (age < 25) return "16-24";
  if (age < 35) return "25-34";
  if (age < 45) return "35-44";
  if (age < 55) return "45-54";
  return "55+";
}
