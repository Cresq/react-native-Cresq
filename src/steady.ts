import { useLayoutEffect, useRef, useState } from "react";

/**
 * Handlers whose identity never changes, each call landing in the newest
 * render's version of it.
 *
 * A memoised child is only spared a redraw when every prop it gets is the one
 * it got last time, and a handler written inline in a list is new on every
 * render. Handing the child this object instead keeps the memo working, and
 * because each call is passed on to what the latest render defined, nothing a
 * child does acts on a stale closure.
 *
 * The set of names is fixed by the first render. The handlers are swapped in
 * at commit, before anything can be pressed.
 */
export function useSteady<T extends Record<string, (...args: never[]) => unknown>>(handlers: T): T {
  const latest = useRef(handlers);
  useLayoutEffect(() => {
    latest.current = handlers;
  });
  const [steady] = useState(() => {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(handlers)) out[key] = (...args: never[]) => latest.current[key](...args);
    return out as T;
  });
  return steady;
}
