import { useCallback, useEffect, useState } from "react";
import { useDb } from "@/db/DbProvider";
import { fetchBusyness, sendReport, type Busyness } from "@/gym/cloud";
import type { Level } from "@/gym/busyness";
import type { GymPlace } from "@/db/types";

/** Reporting the same gym again inside this window changes nothing worth sending. */
const REPORT_EVERY_MS = 30 * 60_000;
/** What the phone keeps of its own reports: enough to know when it last sent one. */
const KEEP = 50;

/**
 * The person's own gym: which one it is, what is known about how busy it is,
 * and the one thing they can add to that, a report of how busy it is now.
 *
 * The gym is a real place, picked from a search, with an id of its own. That
 * id is what reports are filed under, so two people who train at the same
 * branch are adding to the same picture however either of them would have
 * spelled its name. What is known about it is asked for when the gym changes
 * and whenever `refresh` is called; a phone that is offline simply keeps the
 * typical pattern.
 */
export function useGym() {
  const { db, update } = useDb();
  const home = db.profile.homeGym;
  const homeId = home?.id;
  const [busyness, setBusyness] = useState<{ id: string; data: Busyness | null } | null>(null);
  const [asked, setAsked] = useState(0);

  useEffect(() => {
    if (!homeId) return;
    const stop = new AbortController();
    let alive = true;
    fetchBusyness(homeId, stop.signal).then((data) => {
      if (alive) setBusyness({ id: homeId, data });
    });
    return () => {
      alive = false;
      stop.abort();
    };
  }, [homeId, asked]);

  const refresh = useCallback(() => setAsked((n) => n + 1), []);

  const setHome = useCallback((place: GymPlace | null) => update((d) => ({ ...d, profile: { ...d.profile, homeGym: place ?? undefined } })), [update]);

  const mine = (db.gymReports ?? []).filter((r) => r.gym === homeId);
  const lastReport = mine.length ? mine[mine.length - 1] : undefined;

  /** Says how busy it is now. Kept on the phone either way; shared when the network allows. */
  const report = useCallback(
    async (level: Level) => {
      if (!home) return;
      const at = Date.now();
      update((d) => ({ ...d, gymReports: [...(d.gymReports ?? []), { gym: home.id, level, at }].slice(-KEEP) }));
      await sendReport(home, level);
      refresh();
    },
    [home, update, refresh],
  );

  // What was fetched belongs to the gym it was fetched for; after a change of gym the old answer is not shown for the new one.
  return { home, busyness: busyness && busyness.id === homeId ? busyness.data : null, lastReport, canReport: (now: number) => !lastReport || now - lastReport.at > REPORT_EVERY_MS, setHome, report, refresh };
}
