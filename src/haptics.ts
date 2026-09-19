import { Platform } from "react-native";
import * as Haptics from "expo-haptics";

/**
 * Touch feedback, by meaning. Two layers, both here and nowhere else:
 *
 *   the six feelings the phone can make     selection, lightImpact, mediumImpact,
 *                                           success, warning, error
 *   the moments in the app that earn one    `moments`, below
 *
 * A screen names the moment (`feel("setDone")`), never the feeling, so what a
 * completed set feels like is decided in one line for the whole app. Fired on
 * the causal event, never decoratively, and not for every tap: most presses
 * are answered by the control moving, which is enough.
 *
 * Silent on the web, and swallowed if the device has no engine. iOS gets the
 * Taptic Engine's patterns; Android gets the platform's own equivalents through
 * the same calls, not an imitation of the iPhone's.
 */
export type Haptic = "selection" | "lightImpact" | "mediumImpact" | "success" | "warning" | "error";

export const moments = {
  /** Something chosen: a card opened, a segment picked, a switch thrown. */
  select: "selection",
  /** A small deliberate act that changes the workout. */
  addSet: "lightImpact",
  removeSet: "lightImpact",
  exerciseAdded: "lightImpact",
  exerciseRemoved: "lightImpact",
  reorder: "lightImpact",
  copyPrevious: "lightImpact",
  /** The thing the app is for. */
  setDone: "mediumImpact",
  setUndone: "selection",
  supersetLinked: "mediumImpact",
  supersetUnlinked: "lightImpact",
  workoutStarted: "mediumImpact",
  /** Rarer, so they may say more. A record is a success, not a celebration. */
  record: "success",
  workoutFinished: "success",
  sent: "success",
  /** Refused, or about to lose something. */
  refuse: "warning",
  discard: "warning",
  failed: "error",
} as const satisfies Record<string, Haptic>;

export type Moment = keyof typeof moments;

/** The same feeling twice inside this window is one event that fired twice: a re-render, a double tap, an animation frame. */
const REPEAT_MS = 80;
const last: Partial<Record<Haptic, number>> = {};

export function feedback(kind: Haptic) {
  if (Platform.OS === "web") return;
  const now = Date.now();
  if (now - (last[kind] ?? 0) < REPEAT_MS) return;
  last[kind] = now;
  const run =
    kind === "selection" ? Haptics.selectionAsync()
    : kind === "lightImpact" ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    : kind === "mediumImpact" ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    : kind === "success" ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    : kind === "warning" ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
    : Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  run.catch(() => {});
}

/** What a moment in the app feels like. */
export const feel = (moment: Moment) => feedback(moments[moment]);

/**
 * The names the app used before moments existed. Screens that have not been
 * moved over yet keep working, and feel the same as they did, except that a
 * session starting is a firm tap now rather than a thud.
 */
export function haptic(kind: "tap" | "done" | "start" | "error" | "select") {
  feedback(kind === "tap" ? "lightImpact" : kind === "select" ? "selection" : kind === "start" ? "mediumImpact" : kind === "done" ? "success" : "error");
}
