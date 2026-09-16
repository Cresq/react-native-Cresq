import { useCallback, useMemo, useRef } from "react";
import { useRouter, type Href } from "expo-router";

/**
 * Navigation that happens once.
 *
 * Two taps in the same breath are one intention, but a router takes them both
 * and stacks the screen twice: you arrive, and the same screen is behind you.
 * Nobody taps a button twice in a fifth of a second meaning it.
 *
 * The lock is module-level and not per component on purpose. The same screen
 * can be reachable from two rows at once, and a fast thumb can catch both.
 */
const WINDOW_MS = 700;
/**
 * Going back twice quickly is a thing people mean, so that one gets a much
 * shorter window: long enough to swallow a tap that registered twice, short
 * enough that a second, deliberate press is never eaten.
 */
const BACK_MS = 300;
let last = { key: "", at: 0 };

function once(key: string, window = WINDOW_MS) {
  const now = Date.now();
  if (last.key === key && now - last.at < window) return false;
  last = { key, at: now };
  return true;
}

/**
 * The same guard for an action that is not a navigation. Adding an exercise to
 * a session twice because the tap registered twice leaves a duplicate in
 * somebody's workout, which is worse than a stacked screen: it is wrong data.
 */
export function useOnce() {
  const fired = useRef(0);
  return useCallback(<T extends unknown[]>(fn: (...args: T) => void) => (...args: T) => {
    const now = Date.now();
    if (now - fired.current < WINDOW_MS) return;
    fired.current = now;
    fn(...args);
  }, []);
}

/** Let the next navigation through even if it repeats: used after a real state change. */
export function releaseNavLock() {
  last = { key: "", at: 0 };
}

/**
 * Drop-in for `useRouter`. Same shape, same names, so a screen reads the way it
 * did; `push`, `replace` and `back` simply refuse to fire twice in a row.
 */
export function useNav() {
  const router = useRouter();
  return useMemo(
    () => ({
      push: (href: Href) => {
        if (once(`push:${String(href)}`)) router.push(href);
      },
      replace: (href: Href) => {
        if (once(`replace:${String(href)}`)) router.replace(href);
      },
      back: () => {
        if (once("back", BACK_MS)) router.back();
      },
      canGoBack: () => router.canGoBack(),
      /** The escape hatch, for the rare case a repeat really is meant. */
      force: router,
    }),
    [router],
  );
}
