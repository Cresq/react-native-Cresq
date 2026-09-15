import { ReduceMotion, withSpring, type WithSpringConfig } from "react-native-reanimated";

/**
 * Motion for CresQ, in Apple's two parameters instead of physics:
 *   response  – seconds to reach the target, roughly (lower = snappier)
 *   damping   – 1 settles without overshoot; 0.8 bounces a little
 * Bounce is only for things the user threw (a flicked sheet, a released
 * drag). Anything that merely appears is critically damped.
 * Every spring honours the system's Reduce Motion setting.
 * The helpers are worklets: gesture callbacks run on the UI thread on
 * iOS and Android, and calling a plain JS function from there crashes.
 */
export function spring(response: number, dampingRatio = 1, velocity = 0): WithSpringConfig {
  "worklet";
  const stiffness = Math.pow((2 * Math.PI) / response, 2);
  const damping = 2 * dampingRatio * Math.sqrt(stiffness);
  return { stiffness, damping, mass: 1, velocity, reduceMotion: ReduceMotion.System, overshootClamping: dampingRatio >= 1 };
}

export const springs = {
  /** Presses, indicators, most UI. */
  snappy: spring(0.22),
  /** Sheets appearing, pills moving between tabs. */
  base: spring(0.35),
  /** Things that were thrown: a released sheet, a completed set's check. */
  bouncy: spring(0.35, 0.8),
} as const;

export const to = (value: number, config: WithSpringConfig = springs.base) => withSpring(value, config);

/** Where a flick would come to rest, Apple's exponential-decay projection. */
export function project(velocity: number, decelerationRate = 0.998) {
  "worklet";
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);
}

/** Progressive resistance past a boundary, so an edge feels soft, not frozen. */
export function rubberband(overshoot: number, dimension: number, constant = 0.55) {
  "worklet";
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}
