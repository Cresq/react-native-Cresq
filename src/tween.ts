import { useEffect, useRef, useState } from "react";
import { duration, useReducedMotion } from "@/motion";

const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);

/**
 * Numbers that travel to their new values instead of jumping there, for the
 * few places where the change itself is the message: the ring filling up when
 * something is added, a total counting to its new figure.
 *
 * It runs on the JavaScript thread on purpose. What it drives is drawn from
 * several numbers at once (three arcs that have to stay end to end), it
 * happens once per change rather than continuously, and it is over in a
 * quarter of a second; keeping the geometry in one place is worth more here
 * than the UI thread. Anything that follows a finger belongs in Reanimated.
 *
 * With Reduce Motion on the values simply are what they are. A timer stands
 * behind the frames, so a screen that gets no frames (an app in the
 * background) still ends up on the right numbers.
 */
export function useTween(target: number[], ms: number = duration.slow): number[] {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(target);
  const shownRef = useRef(target);
  const key = target.join("|");

  useEffect(() => {
    const to = key.split("|").map(Number);
    const from = shownRef.current.length === to.length ? shownRef.current : to;
    if (from.every((v, i) => v === to[i])) return;
    let frame = 0;
    let begun = 0;
    const put = (values: number[]) => {
      shownRef.current = values;
      setShown(values);
    };
    const tick = (at: number) => {
      if (!begun) begun = at;
      const x = Math.min(1, (at - begun) / ms);
      const k = easeOut(x);
      put(from.map((v, i) => v + (to[i] - v) * k));
      if (x < 1) frame = requestAnimationFrame(tick);
    };
    if (reduced) frame = requestAnimationFrame(() => put(to));
    else frame = requestAnimationFrame(tick);
    const land = setTimeout(() => {
      cancelAnimationFrame(frame);
      put(to);
    }, ms + 80);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(land);
    };
  }, [key, ms, reduced]);

  return shown;
}
