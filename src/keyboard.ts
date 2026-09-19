import { Keyboard, Platform, TextInput } from "react-native";

/** Set by a control that deliberately keeps or restores focus, so the next touch does not undo it. */
let keepUntil = 0;

/**
 * Call from a control that focuses a field itself, like a reply button. Without
 * it the touch would read as "not for a text field" and close the keyboard the
 * control had just asked for.
 */
export function keepKeyboard() {
  keepUntil = Date.now() + 400;
}

/**
 * Whatever is being typed into, or nothing. React Native tracks this itself;
 * the web build has no `TextInput.State`, so there it is the focused element,
 * as long as that element takes typing.
 */
function typingIn(): unknown {
  if (Platform.OS === "web") {
    const el = (globalThis as { document?: { activeElement?: Element | null } }).document?.activeElement;
    if (!el) return null;
    const editable = (el as HTMLElement).isContentEditable;
    return el.tagName === "INPUT" || el.tagName === "TEXTAREA" || editable ? el : null;
  }
  return TextInput.State?.currentlyFocusedInput?.() ?? null;
}

function put(away: unknown) {
  Keyboard.dismiss();
  // On the web that call has nothing to dismiss; the field itself has to let go.
  if (Platform.OS === "web") (away as { blur?: () => void } | null)?.blur?.();
}

/**
 * Put the keyboard away when the touch was not meant for a text field.
 *
 * Wired into a container's responder capture, so it sees every touch, including
 * the ones a button underneath will handle. The trick is the wait: if the touch
 * landed on another field, focus has moved by the next tick and the keyboard
 * stays up without a flicker. If focus did not move, the touch was a button or
 * bare background, and the keyboard goes.
 */
export function dismissUnlessTyping() {
  const before = typingIn();
  if (!before) return;
  setTimeout(() => {
    if (Date.now() < keepUntil) return;
    if (typingIn() === before) put(before);
  }, 0);
}

/**
 * Spread onto the view that should catch those touches. It never claims the
 * responder, so nothing below it loses a press.
 */
export const dismissesKeyboard = {
  onStartShouldSetResponderCapture: () => {
    dismissUnlessTyping();
    return false;
  },
};
