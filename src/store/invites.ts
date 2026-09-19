import { useCallback, useMemo } from "react";
import { useDb } from "@/db/DbProvider";
import { uid } from "@/db/storage";
import { ME, person, personByName } from "@/data/people";
import { inviteFromSession, linkInviteId } from "@/invite";
import type { InviteWorkout, Session, TrainInvite } from "@/db/types";

/** An invitation is for the session it came from. Three hours on, that session is over. */
export const INVITE_TTL_MS = 3 * 60 * 60 * 1000;
export const inviteFresh = (i: TrainInvite, now: number) => now - i.at < INVITE_TTL_MS;
/** The sender's card in the directory, if they are in it. A link can come from anybody. */
export const inviteSender = (i: TrainInvite) => (i.from ? person(i.from) : undefined) ?? personByName(i.fromName);

/**
 * Training together. Sending picks people you follow and gives each of them
 * the running session in the shape a link carries: the movements and the sets,
 * never the weights. Receiving is a banner while the app is open and a line
 * under Notifications after that; both open the screen a link would. Until
 * accounts sync a sent invitation goes no further than this phone, and every
 * received one came in through a link or is the sample.
 */
export function useInvites() {
  const { db, update } = useDb();
  const all = db.invites;
  const incoming = useMemo(() => all.filter((i) => i.to === ME).sort((a, b) => b.at - a.at), [all]);
  const sent = useMemo(() => all.filter((i) => i.from === ME).sort((a, b) => b.at - a.at), [all]);
  const byId = useCallback((id: string | undefined) => (id ? all.find((i) => i.id === id) : undefined), [all]);
  /** Who has already been asked to this session. */
  const invitedTo = useCallback((sessionId: string) => all.filter((i) => i.from === ME && i.sessionId === sessionId).map((i) => i.to), [all]);

  /** One invitation per person per session; asking twice is not two invitations. */
  const send = useCallback(
    (session: Session, to: string[], fromName: string) => {
      const workout = inviteFromSession(session, fromName);
      update((d) => {
        const fresh = to.filter((id) => !d.invites.some((i) => i.from === ME && i.to === id && i.sessionId === session.id));
        if (!fresh.length) return d;
        return { ...d, invites: [...d.invites, ...fresh.map((id): TrainInvite => ({ id: uid(), from: ME, fromName, to: id, at: workout.at, sessionId: session.id, workout, status: "pending" }))] };
      });
    },
    [update],
  );

  /** A link that was opened. What it carries is kept, once, and counts as seen: the person is looking at it. */
  const receive = useCallback(
    (workout: InviteWorkout) => {
      const id = linkInviteId(workout);
      update((d) => (d.invites.some((i) => i.id === id) ? d : { ...d, invites: [...d.invites, { id, from: personByName(workout.from)?.id, fromName: workout.from, to: ME, at: workout.at, workout, status: "pending", seenAt: Date.now() }] }));
      return id;
    },
    [update],
  );

  const markSeen = useCallback((id: string) => update((d) => (d.invites.some((i) => i.id === id && !i.seenAt) ? { ...d, invites: d.invites.map((i) => (i.id === id && !i.seenAt ? { ...i, seenAt: Date.now() } : i)) } : d)), [update]);
  const accept = useCallback((id: string) => update((d) => ({ ...d, invites: d.invites.map((i): TrainInvite => (i.id === id ? { ...i, status: "accepted", seenAt: i.seenAt ?? Date.now() } : i)) })), [update]);

  return { incoming, sent, byId, invitedTo, send, receive, markSeen, accept };
}
