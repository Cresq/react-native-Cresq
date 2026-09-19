import { useCallback, useEffect, useState } from "react";
import { useDb } from "@/db/DbProvider";
import { fetchBusyness, sendReport, type Busyness } from "@/gym/cloud";
import { gymKey, type Level } from "@/gym/busyness";

/** Reporting the same gym again inside this window changes nothing worth sending. */
const REPORT_EVERY_MS = 30 * 60_000;
/** What the phone keeps of its own reports: enough to know when it last sent one. */
const KEEP = 50;

/**
 * The person's own gym: which one it is, what is known about how busy it is,
 * and the one thing they can add to that, a report of how busy it is now.
 *
 * The home gym is a name, the same free text a session's gym is, so the first
 * one offered is wherever they trained last. What is known about it is asked
 * for when the name changes and whenever `refresh` is called; a phone that is
 * offline simply keeps the typical pattern.
 */
export function useGym() {
  const { db, update } = useDb();
  const home = db.profile.homeGym;
  const [busyness, setBusyness] = useState<Busyness | null>(null);
  const [asked, setAsked] = useState(0);

  useEffect(() => {
    if (!home) return;
    const stop = new AbortController();
    let alive = true;
    fetchBusyness(home, stop.signal).then((b) => {
      if (alive) setBusyness(b);
    });
    return () => {
      alive = false;
      stop.abort();
    };
  }, [home, asked]);

  const refresh = useCallback(() => setAsked((n) => n + 1), []);

  const setHome = useCallback(
    (name: string) => {
      const clean = name.trim();
      setBusyness(null);
      update((d) => ({ ...d, profile: { ...d.profile, homeGym: clean || undefined } }));
    },
    [update],
  );

  const mine = (db.gymReports ?? []).filter((r) => home && r.gym === gymKey(home));
  const lastReport = mine.length ? mine[mine.length - 1] : undefined;

  /** Says how busy it is now. Kept on the phone either way; shared when the network allows. */
  const report = useCallback(
    async (level: Level) => {
      if (!home) return;
      const at = Date.now();
      update((d) => ({ ...d, gymReports: [...(d.gymReports ?? []), { gym: gymKey(home), level, at }].slice(-KEEP) }));
      await sendReport(home, level);
      refresh();
    },
    [home, update, refresh],
  );

  return { home, recent: db.profile.gyms ?? [], busyness: home ? busyness : null, lastReport, canReport: (now: number) => !lastReport || now - lastReport.at > REPORT_EVERY_MS, setHome, report, refresh };
}
