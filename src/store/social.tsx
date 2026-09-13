import { useCallback } from "react";
import { useDb } from "@/db/DbProvider";
import { ME, followersOf, people, person } from "@/data/people";

/** Who you follow lives in the database document; the directory itself is mock until there is a server. */
export function useSocial() {
  const { db, update } = useDb();
  const blocked = db.blocked;
  const following = db.following.filter((id) => !blocked.includes(id));
  const isFollowing = useCallback((id: string) => following.includes(id), [following]);
  const toggleFollow = useCallback((id: string) => update((d) => ({ ...d, following: d.following.includes(id) ? d.following.filter((x) => x !== id) : [...d.following, id] })), [update]);
  const block = useCallback((id: string) => update((d) => ({ ...d, blocked: d.blocked.includes(id) ? d.blocked : [...d.blocked, id], following: d.following.filter((x) => x !== id) })), [update]);
  const unblock = useCallback((id: string) => update((d) => ({ ...d, blocked: d.blocked.filter((x) => x !== id) })), [update]);
  const visible = people.filter((p) => !blocked.includes(p.id));
  const followers = followersOf(ME).filter((p) => !blocked.includes(p.id));
  return { following, followers, blocked, isFollowing, toggleFollow, block, unblock, people: visible, person };
}
