import { useEffect, useState } from "react";

/**
 * The time, as a value a screen can depend on.
 *
 * Reading `Date.now()` in the middle of a render makes a function look pure
 * while it is not, and the React Compiler is entitled to cache it against the
 * arguments it can see. That is exactly how the session timer came to freeze:
 * the screen re-rendered every second and recomputed nothing.
 *
 * Anything derived from the clock takes it from here instead, so the dependency
 * is written down. A minute is plenty for figures bucketed by day or week; the
 * running timers ask for a second.
 */
export function useNow(everyMs = 60_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), everyMs);
    return () => clearInterval(i);
  }, [everyMs]);
  return now;
}
