import { useCallback } from "react";
import { useDb } from "@/db/DbProvider";
import { uid } from "@/db/storage";

/** Good enough to catch a typo, loose enough not to argue with a valid address. */
export const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
export const MIN_PASSWORD = 8;

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * The account is local. One device, one log, one id, minted at sign-up and kept
 * for good so a server can adopt this person's training instead of starting them
 * over. There is no password check here: with nothing to check against, a lock
 * drawn on the door is worse than no lock, because people trust it. What this
 * does enforce is that the log on this device belongs to one address, so two
 * people cannot quietly end up sharing one history.
 */
export function useAuth() {
  const { db, update, ready } = useDb();
  const account = db.auth.account ?? null;

  const signUp = useCallback(
    (email: string, name: string) =>
      update((d) => {
        const now = Date.now();
        const clean = name.trim();
        return {
          ...d,
          auth: { signedIn: true, account: { id: d.auth.account?.id ?? uid(), email: email.trim(), createdAt: d.auth.account?.createdAt ?? now } },
          profile: { ...d.profile, name: clean || d.profile.name, first: clean.split(" ")[0] || d.profile.first, handle: d.profile.handle || `@${email.trim().split("@")[0].toLowerCase()}` },
          consent: { ...d.consent, termsAcceptedAt: now, ageConfirmedAt: now },
        };
      }),
    [update],
  );

  /** Signs in when the address matches the account this device holds, or when there is none yet. */
  const signIn = useCallback(
    (email: string): { ok: true } | { ok: false; heldBy: string } => {
      const held = db.auth.account;
      if (held && held.email && !same(held.email, email)) return { ok: false, heldBy: held.email };
      update((d) => {
        // Nothing to go on but the address, so the part before the @ becomes the name until they change it.
        const guess = email.trim().split("@")[0].replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
        const profile = d.profile.name ? d.profile : { ...d.profile, name: guess, first: guess.split(" ")[0], handle: d.profile.handle || `@${email.trim().split("@")[0].toLowerCase()}` };
        return {
          ...d,
          profile,
          auth: { signedIn: true, account: d.auth.account ? { ...d.auth.account, email: d.auth.account.email || email.trim() } : { id: uid(), email: email.trim(), createdAt: Date.now() } },
        };
      });
      return { ok: true };
    },
    [db.auth.account, update],
  );

  /** Signing out locks the app, it does not erase anything. Deleting is its own, spelled-out action. */
  const signOut = useCallback(() => update((d) => ({ ...d, auth: { ...d.auth, signedIn: false } })), [update]);

  return { signedIn: db.auth.signedIn, account, ready, signUp, signIn, signOut };
}
