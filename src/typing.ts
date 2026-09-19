import { useCallback, useEffect, useRef } from "react";
import { delay } from "@/motion";

/**
 * Holds what is being typed and hands it on when the typing pauses.
 *
 * What a person types has to show at once, but whoever owns the value is
 * usually the whole document, and telling it on every keystroke redraws the
 * screen under the thumb: on a phone that is lag. So the box keeps the text,
 * and the owner hears of it a moment after the last key, when the box is left,
 * or the instant something needs the value (`tell`). `forget` drops what is
 * held, for when another value is about to be written over it and the typed
 * one must not arrive afterwards.
 *
 * Patches held within one pause are merged, so two fields of one row can share
 * a holder. A holder that goes away while it still holds something hands it on
 * first: nothing typed is ever lost to a closed screen.
 */
export function useHeld<T extends object>(onChange: (patch: T) => void, pause: number = delay.typingPause) {
  const waiting = useRef<{ patch: T; timer: ReturnType<typeof setTimeout> } | null>(null);
  // The newest handler, so what is handed on late lands in the current render's logic and not in the one that was there when the key went down.
  const changeRef = useRef(onChange);
  useEffect(() => {
    changeRef.current = onChange;
  });

  const tell = useCallback(() => {
    const held = waiting.current;
    if (!held) return;
    clearTimeout(held.timer);
    waiting.current = null;
    changeRef.current(held.patch);
  }, []);

  const hold = useCallback(
    (patch: T) => {
      if (waiting.current) clearTimeout(waiting.current.timer);
      waiting.current = { patch: { ...waiting.current?.patch, ...patch }, timer: setTimeout(tell, pause) };
    },
    [tell, pause],
  );

  const forget = useCallback(() => {
    if (waiting.current) clearTimeout(waiting.current.timer);
    waiting.current = null;
  }, []);

  useEffect(() => tell, [tell]);

  return { hold, tell, forget };
}
