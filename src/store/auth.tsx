import { useCallback } from "react";
import { useDb } from "@/db/DbProvider";

/** Sign-in state lives in the database document so it survives restarts. Replace with a real provider later; the hook keeps its shape. */
export function useAuth() {
  const { db, update, ready } = useDb();
  const signIn = useCallback(() => update((d) => ({ ...d, auth: { signedIn: true } })), [update]);
  const signOut = useCallback(() => update((d) => ({ ...d, auth: { signedIn: false } })), [update]);
  return { signedIn: db.auth.signedIn, ready, signIn, signOut };
}
