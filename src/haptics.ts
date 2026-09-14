import { Platform } from "react-native";
import * as Haptics from "expo-haptics";

/**
 * One place for touch feedback. Fires on the causal event, never decoratively:
 *   tap    – a light acknowledgement (copy previous, tick a scrub point)
 *   done   – a set completed, a session finished
 *   start  – a session begins
 *   error  – something refused (set out of order)
 * Silent on web, and swallowed if the device has no engine.
 */
export function haptic(kind: "tap" | "done" | "start" | "error" | "select") {
  if (Platform.OS === "web") return;
  const run =
    kind === "tap" ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    : kind === "select" ? Haptics.selectionAsync()
    : kind === "start" ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
    : kind === "done" ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    : Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  run.catch(() => {});
}
