import { useCallback } from "react";
import { useDb } from "@/db/DbProvider";
import { useMe } from "@/store/me";
import { useSocial } from "@/store/social";
import { personByName } from "@/data/people";
import type { Post } from "@/components/PostCard";
import type { Comment, CommentActions } from "@/components/CommentSheet";

/**
 * Comments on a post, wherever the post is shown: what it came with plus what
 * this device wrote, minus what this person took off their screen and minus
 * anything by somebody they blocked. The feed and a session's own page share
 * this, so a comment written in one place is there in the other.
 */
export function useComments() {
  const { db, update } = useDb();
  const me = useMe();
  const { block } = useSocial();

  const commentsOf = useCallback(
    (p: Post): Comment[] => {
      const hidden = new Set(db.hiddenComments ?? []);
      const byBlocked = (c: Comment) => {
        const who = personByName(c.name);
        return !!who && db.blocked.includes(who.id);
      };
      return [
        ...(p.commentList ?? []).map((c, i) => ({ ...c, id: `seed-${i}` })),
        ...(db.comments?.[p.id] ?? []).map((c) => ({ id: String(c.at), name: db.profile.name, text: c.text, at: c.at, replyTo: c.replyTo, avatar: me.photo })),
      ].filter((c) => !hidden.has(`${p.id}:${c.id}`) && !byBlocked(c));
    },
    [db.hiddenComments, db.blocked, db.comments, db.profile.name, me.photo],
  );

  const add = useCallback(
    (postId: string, text: string, replyTo?: string) =>
      update((d) => ({ ...d, comments: { ...(d.comments ?? {}), [postId]: [...(d.comments?.[postId] ?? []), { text, at: Date.now(), replyTo }] } })),
    [update],
  );
  /** Your own words, gone for good; anything answering them goes with them. */
  const remove = useCallback(
    (postId: string, id: string) => update((d) => ({ ...d, comments: { ...(d.comments ?? {}), [postId]: (d.comments?.[postId] ?? []).filter((c) => String(c.at) !== id && c.replyTo !== id) } })),
    [update],
  );
  /** Somebody else's words, off your screen. */
  const hide = useCallback((postId: string, id: string) => update((d) => ({ ...d, hiddenComments: [...(d.hiddenComments ?? []), `${postId}:${id}`] })), [update]);

  /**
   * What holding a comment offers. Your own: delete. Under your own post:
   * delete anything. Somebody else's, anywhere: report it, block them.
   */
  const actionsFor = useCallback(
    (post: Post, c: Comment): CommentActions => {
      const mine = c.name === db.profile.name && !c.id.startsWith("seed-");
      const myPost = !post.userId;
      const who = personByName(c.name);
      return {
        delete: mine ? () => remove(post.id, c.id) : myPost ? () => hide(post.id, c.id) : undefined,
        report: mine ? undefined : () => hide(post.id, c.id),
        block: !mine && who ? { name: who.name.split(" ")[0], run: () => block(who.id) } : undefined,
      };
    },
    [db.profile.name, remove, hide, block],
  );

  /** How many a post has, for the count under it. */
  const countOf = useCallback((p: Post) => commentsOf(p).length, [commentsOf]);

  return { commentsOf, countOf, add, remove, hide, actionsFor, me };
}
