import { useCallback } from "react";
import { useDb } from "@/db/DbProvider";
import { ME, followersOf, people, person } from "@/data/people";

/** Who you follow lives in the database document; the directory itself is mock until there is a server. */
export function useSocial() {
  const { db, update } = useDb();
  const following = db.following;
  const isFollowing = useCallback((id: string) => following.includes(id), [following]);
  const toggleFollow = useCallback((id: string) => update((d) => ({ ...d, following: d.following.includes(id) ? d.following.filter((x) => x !== id) : [...d.following, id] })), [update]);
  const followers = followersOf(ME);
  return { following, followers, isFollowing, toggleFollow, people, person };
}
