import { useCallback } from "react";
import { useDb } from "@/db/DbProvider";
import { startOfDay } from "@/db/derive";
import { health } from "@/health/provider";
import type { Burn } from "@/db/types";

const DAY = 86_400_000;
/** Asking the store again inside this window is a screen being looked at twice, not new information. */
const FRESH_MS = 60_000;
let busy = false;
let askedAt = 0;

/**
 * The link to the phone's health store. Connected, today's workouts become
 * part of the day's burned energy by themselves: they are read when the app
 * comes forward and when Food is opened, and written into the log as entries
 * of their own, so the day still adds up offline and the list shows where each
 * figure came from.
 *
 * Measured beats estimated: a session's estimate gives way to a workout from
 * the store that covers the same stretch of the day, so wearing a watch during
 * a CresQ session does not count it twice. The document is only written when
 * what the store says differs from what is already there.
 */
export function useHealth() {
  const { db, update } = useDb();
  const connected = !!db.profile.health && !health.unavailable;

  const pull = useCallback(
    async (force: boolean) => {
      if (busy) return;
      const now = Date.now();
      if (!force && now - askedAt < FRESH_MS) return;
      busy = true;
      try {
        const from = startOfDay(now);
        const found = (await health.workouts(from, from + DAY)).filter((w) => w.kcal > 0);
        askedAt = Date.now();
        update((d) => {
          // Disconnected while the store was answering: what it said no longer applies.
          if (!d.profile.health) return d;
          const covered = (start: number, end: number) => found.some((w) => w.start < end && w.end > start);
          const mine = d.burns.filter((b) => b.source === "health" && b.at >= from && b.at < from + DAY);
          const same = mine.length === found.length && found.every((w) => mine.some((b) => b.externalId === w.id && b.kcal === w.kcal));
          const stale = d.burns.some((b) => {
            if (!b.sessionId) return false;
            const s = d.sessions.find((x) => x.id === b.sessionId);
            return !!s && covered(s.startedAt, s.finishedAt ?? s.startedAt);
          });
          if (same && !stale) return d;
          const kept = d.burns.filter((b) => {
            if (b.source === "health") return !(b.at >= from && b.at < from + DAY);
            if (!b.sessionId) return true;
            const s = d.sessions.find((x) => x.id === b.sessionId);
            return !(s && covered(s.startedAt, s.finishedAt ?? s.startedAt));
          });
          const fresh: Burn[] = found.map((w) => ({ id: `health-${w.id}`, at: w.start, kcal: w.kcal, source: "health", externalId: w.id, from: w.start, to: w.end, kind: w.kind, via: w.source }));
          return { ...d, burns: [...kept, ...fresh] };
        });
      } finally {
        busy = false;
      }
    },
    [update],
  );

  /** Read today again, if connected and not asked a moment ago. */
  const sync = useCallback(
    async (force = false) => {
      if (connected) await pull(force);
    },
    [connected, pull],
  );

  /** Shows the phone's permission sheet, and on the way back reads today. False when the sheet could not be shown. */
  const connect = useCallback(async () => {
    const asked = await health.authorize();
    if (!asked) return false;
    update((d) => ({ ...d, profile: { ...d.profile, health: { connectedAt: Date.now() } } }));
    await pull(true);
    return true;
  }, [update, pull]);

  /** Today goes back to what was entered by hand; earlier days keep what counted on them. */
  const disconnect = useCallback(
    () =>
      update((d) => {
        const from = startOfDay(Date.now());
        return { ...d, burns: d.burns.filter((b) => !(b.source === "health" && b.at >= from)), profile: { ...d.profile, health: undefined } };
      }),
    [update],
  );

  return { name: health.name, unavailable: health.unavailable, connected, sync, connect, disconnect };
}
