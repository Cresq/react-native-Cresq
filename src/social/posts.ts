import type { ImageSourcePropType } from "react-native";
import type { Profile, Session } from "@/db/types";
import { fmtKg, newRecords, relativeDay, sessionRows, sessionStats } from "@/db/derive";
import type { Post } from "@/components/PostCard";

type T = (s: string, vars?: Record<string, string | number>) => string;

/**
 * A session of your own as the post it makes: the same card the feed shows,
 * built from the log so the feed and the session's own page never disagree.
 * Likes and comments start at zero and stay honest: nobody has reacted to it
 * until somebody does.
 */
export function postFromSession(s: Session, ctx: { profile: Profile; sessions: Session[]; photo?: ImageSourcePropType; comments: number; t: T }): Post {
  const { profile, sessions, photo, comments, t } = ctx;
  const stats = sessionStats(s);
  const rec = newRecords(s, sessions.filter((x) => x.startedAt < s.startedAt)).sort((a, b) => b.kg - a.kg)[0];
  return {
    id: s.id,
    name: profile.name,
    title: s.planName,
    meta: relativeDay(s.startedAt),
    place: s.gym ?? (profile.showCity === false ? undefined : profile.city || undefined),
    avatar: photo,
    photo: s.photo ? { uri: s.photo } : undefined,
    exercises: s.share?.exercises === false ? [] : sessionRows(s).map((r) => ({ exerciseId: r.exerciseId, name: r.name, detail: t(r.count === 1 ? "{n} set" : "{n} sets", { n: r.count }) })),
    record: rec && s.share?.records !== false ? t("New record, {name} {kg} kg", { name: rec.name, kg: rec.kg }) : undefined,
    caption: s.caption || t("{plan} done. Every set counted.", { plan: s.planName }),
    stats: s.share?.stats === false ? [] : [
      { value: String(stats.minutes), unit: "min" },
      { value: fmtKg(stats.volume), unit: "kg" },
      { value: String(stats.setsDone), unit: t("sets") },
    ],
    likes: 0,
    liked: false,
    comments,
  };
}
