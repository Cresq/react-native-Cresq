import { Easing, FadeIn, FadeInDown, FadeInUp, FadeOut, FadeOutDown, FadeOutUp, LinearTransition, ReduceMotion, withSpring, type WithSpringConfig, type WithTimingConfig } from "react-native-reanimated";
import { distance, duration, springSpec } from "../constants/motion";

export { delay, distance, duration, gesture, opacity, pressScale, scroll } from "../constants/motion";
export { useReducedMotion } from "react-native-reanimated";

/**
 * Motion for CresQ, in Apple's two parameters instead of physics:
 *   response  – seconds to reach the target, roughly (lower = snappier)
 *   damping   – 1 settles without overshoot; 0.85 carries a little past
 * Bounce is only for things the user threw (a flicked sheet, a released
 * drag). Anything that merely appears is critically damped.
 *
 * The figures live in `constants/motion.ts`; this file turns them into what
 * Reanimated takes. Every spring and timing here honours the system's Reduce
 * Motion setting: with it on they arrive at once, so a state still changes,
 * it just does not travel.
 *
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
  /** Finger down, finger up. */
  press: spring(...springSpec.press),
  /** Presses, indicators, most UI. */
  snappy: spring(...springSpec.snappy),
  /** Sheets appearing, pills moving between tabs. */
  base: spring(...springSpec.base),
  /** Large surfaces that should arrive calmly. */
  gentle: spring(...springSpec.gentle),
  /** Things that were thrown: a released sheet, a dropped card. */
  thrown: spring(...springSpec.thrown),
  /** The old name for `thrown`, kept for the screens that have not been moved over yet. */
  bouncy: spring(...springSpec.thrown),
} as const;

/** The one curve: quick off the mark, long in the settle. */
export const easing = Easing.bezier(0.2, 0, 0, 1);

export function timing(ms: number = duration.base): WithTimingConfig {
  return { duration: ms, easing, reduceMotion: ReduceMotion.System };
}

export const timings = {
  step: timing(duration.step),
  instant: timing(duration.instant),
  fast: timing(duration.fast),
  base: timing(duration.base),
  slow: timing(duration.slow),
} as const;

export const to = (value: number, config: WithSpringConfig = springs.base) => withSpring(value, config);

/**
 * Layout transitions: how a view arrives, leaves, and makes room.
 *
 * `reflow` names its mass on purpose. A layout spring that leaves it out gets
 * Reanimated's own default of 4, which against a stiffness chosen for a mass
 * of 1 halves the damping ratio and turns "siblings make room" into a wobble.
 * Fully specified and critically damped, it cannot overshoot.
 *
 * All of them follow Reduce Motion by themselves: with it on they are skipped.
 */
const stiffness = Math.pow((2 * Math.PI) / springSpec.base[0], 2);
export const layouts = {
  /** Siblings making room when something is added, removed, folded or moved. */
  reflow: LinearTransition.springify()
    .mass(1)
    .stiffness(stiffness)
    .damping(2 * springSpec.base[1] * Math.sqrt(stiffness)),
  /** Content appearing in place: opacity only. */
  enter: FadeIn.duration(duration.base).easing(easing),
  exit: FadeOut.duration(duration.fast).easing(easing),
  /** A bar docking at the bottom: a short rise, not a slide across the screen. */
  rise: FadeInDown.duration(duration.base).easing(easing).withInitialValues({ opacity: 0, transform: [{ translateY: distance.enter }] }),
  sink: FadeOutDown.duration(duration.fast).easing(easing),
  /** A note arriving under the top edge, and leaving the way it came. */
  drop: FadeInUp.duration(duration.slow).easing(easing).withInitialValues({ opacity: 0, transform: [{ translateY: -distance.enter }] }),
  lift: FadeOutUp.duration(duration.base).easing(easing),
} as const;

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
