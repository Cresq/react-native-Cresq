import * as Linking from "expo-linking";
import type { ExerciseEntry, Plan, Session } from "@/db/types";

/**
 * Inviting somebody to the workout you are doing.
 *
 * There is no server, so the invitation carries the workout itself. The link
 * holds the shape of the session: which movements, how many sets, at what reps
 * and rest, and which of them were paired. Everything the other person needs is
 * in the link, which means this works today, offline, between two phones that
 * have never heard of each other.
 *
 * What it deliberately does not carry is what you lifted. The structure is
 * shared; the weights are each person's own, and their app fills those in from
 * their own history the moment they start.
 */
export type Invite = {
  v: 1;
  /** Who sent it, for the screen that receives it. */
  from: string;
  /** The workout's name. */
  name: string;
  focus?: string;
  ex: { i: string; n: string; s: number; r: number; k: number; t: number; g?: string }[];
};

/** URL-safe base64 without the padding, which some messaging apps eat. */
function toBase64(input: string) {
  const bytes = new TextEncoder().encode(input);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return globalThis.btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64(input: string) {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (input.length % 4)) % 4);
  const binary = globalThis.atob(padded);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/** The running session, reduced to what somebody else needs to do the same thing. */
export function inviteFromSession(session: Session, from: string): Invite {
  const ex = session.exercises.map((e: ExerciseEntry) => {
    const working = e.sets.filter((s) => s.type !== "warmup");
    const first = working[0] ?? e.sets[0];
    return {
      i: e.exerciseId,
      n: e.name,
      s: Math.max(1, working.length || e.sets.length),
      r: first?.reps ?? 10,
      k: first?.kg ?? 0,
      t: e.restSeconds,
      ...(e.supersetGroup ? { g: e.supersetGroup } : {}),
    };
  });
  return { v: 1, from, name: session.planName, ex };
}

export const encodeInvite = (invite: Invite) => toBase64(JSON.stringify(invite));

export function decodeInvite(code: string | undefined): Invite | null {
  if (!code) return null;
  try {
    const parsed = JSON.parse(fromBase64(code)) as Invite;
    if (parsed?.v !== 1 || !Array.isArray(parsed.ex) || !parsed.ex.length || typeof parsed.name !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

/** The link to send. Opens the app on a phone that has it, the site on one that does not. */
export const inviteLink = (invite: Invite) => Linking.createURL("/join", { queryParams: { w: encodeInvite(invite) } });

/** A plan built from an invitation, ready for `sessionFromPlan`. */
export function planFromInvite(invite: Invite, id: string): Plan {
  return {
    id,
    name: invite.name,
    focus: invite.focus ?? "",
    createdAt: Date.now(),
    exercises: invite.ex.map((e) => ({ exerciseId: e.i, sets: e.s, reps: e.r, kg: e.k, restSeconds: e.t, supersetGroup: e.g })),
  };
}
