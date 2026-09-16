import { useMemo } from "react";
import { useDb } from "@/db/DbProvider";
import { useSplit } from "@/store/split";
import { useNow } from "@/clock";
import { finished, newRecords, startOfDay, startOfWeek } from "@/db/derive";
import type { IconName } from "@/components/ui/Icon";

export type Note = {
  id: string;
  icon: IconName;
  /** The English source string; the screen translates it. */
  title: string;
  body?: string;
  vars?: Record<string, string | number>;
  bodyVars?: Record<string, string | number>;
  at: number;
  gold?: boolean;
  href?: string;
};

/**
 * Everything here is worked out from the person's own log. There are no likes
 * and no follows yet, because there is no server to carry them, and a made-up
 * "eleven people liked this" is worse than an empty list.
 */
export function useNotes() {
  const { db } = useDb();
  const { nextDay } = useSplit();
  const now = useNow();
  const seen = db.profile.lastNotificationsSeen ?? 0;

  const notes = useMemo(() => {
    const out: Note[] = [];
    const done = finished(db.sessions);
    // Records, newest sessions first, the last handful.
    for (const s of done.slice(-12).reverse()) {
      const prior = db.sessions.filter((x) => x.startedAt < s.startedAt);
      for (const r of newRecords(s, prior)) {
        out.push({
          id: `rec-${s.id}-${r.exerciseId}`,
          icon: "trophy",
          gold: true,
          title: "New record, {name} {kg} kg",
          vars: { name: r.name, kg: r.kg },
          body: r.previous ? "Up {kg} kg on your previous best." : "Your first logged best for this lift.",
          bodyVars: { kg: Math.round((r.kg - (r.previous ?? 0)) * 10) / 10 },
          at: s.startedAt,
          href: `/progress/${r.exerciseId}`,
        });
      }
    }
    if (nextDay && !nextDay.rest) {
      out.push({ id: "next-day", icon: "calendar", title: "{name} is up next", vars: { name: nextDay.name }, body: "Your split says this one is due.", at: startOfDay(now), href: "/(tabs)/train" });
    }
    return out.sort((a, b) => b.at - a.at).slice(0, 25);
  }, [db.sessions, nextDay, now]);

  const unread = notes.filter((n) => n.at > seen).length;
  return { notes, unread, seen };
}

/** Today, this week, before that. Empty groups are left out by the screen. */
export function groupNotes(notes: Note[]) {
  const today = startOfDay(Date.now());
  const week = startOfWeek(Date.now());
  return [
    { key: "Today", items: notes.filter((n) => n.at >= today) },
    { key: "This week", items: notes.filter((n) => n.at < today && n.at >= week) },
    { key: "Earlier", items: notes.filter((n) => n.at < week) },
  ].filter((g) => g.items.length);
}
