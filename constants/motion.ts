/**
 * CresQ motion tokens. Numbers only, no library: this file sits beside
 * `theme.ts` and is as much a part of the design system as the colours are.
 * `src/motion.ts` turns them into springs, timings and layout transitions;
 * components take them from there and carry no figures of their own.
 *
 * The language, in one breath: it answers the finger at once, it is over
 * quickly, nothing bounces unless it was thrown, nothing travels far, and
 * nothing moves unless the movement says something.
 */

/** Milliseconds, for things that fade or change colour. Springs have no duration; see `springSpec`. */
export const duration = {
  /** One leg of a refusal's nudge: out, across, back. */
  step: 60,
  /** A highlight coming on under the finger. */
  instant: 90,
  /** Selection, colour and opacity changes. */
  fast: 140,
  /** Content appearing. */
  base: 200,
  /** The longest anything may take; large surfaces only. */
  slow: 280,
} as const;

/**
 * Springs in Apple's two parameters, as [response in seconds, damping ratio].
 * A ratio of 1 settles without overshoot, and that is every spring here but
 * one: only what the user let go of at speed is allowed to carry past.
 */
export const springSpec = {
  /** Finger down, finger up. */
  press: [0.18, 1],
  /** Indicators, thumbs, small state changes. */
  snappy: [0.22, 1],
  /** Sheets, siblings making room, anything that travels. */
  base: [0.35, 1],
  /** Large surfaces that should arrive calmly. */
  gentle: [0.5, 1],
  /** Released with velocity: a flicked sheet, a dropped card. */
  thrown: [0.35, 0.85],
} as const;

/** How far a control gives under the finger. The bigger the surface, the less it moves. */
export const pressScale = {
  card: 0.985,
  row: 0.99,
  button: 0.97,
  chip: 0.95,
  pill: 0.94,
  icon: 0.92,
  /** The set tick: small and pressed often, so it may give a little more. */
  check: 0.9,
} as const;

export const opacity = {
  /** Text and bare rows under the finger. */
  pressed: 0.7,
  /** What a press looks like when scaling is switched off by Reduce Motion. */
  reducedPress: 0.6,
  /** Sets that are neither done nor next. */
  dimmed: 0.6,
  disabled: 0.4,
} as const;

/** Points. Nothing in the app travels further than this on its own. */
export const distance = {
  /** Content rising into place. */
  enter: 12,
  /** The "no" of a refused action: one small step each way, never a shake. */
  nudge: 3,
  /** The compact header settling as it appears. */
  settle: 6,
  /** How much a lifted card grows, as a fraction. */
  lift: 0.03,
} as const;

/** Where a gesture begins, gives up, or counts as meant. Points, and points per second. */
export const gesture = {
  /** Vertical drag of a card: start, and the sideways slip that cancels it. */
  dragStart: 8,
  dragCross: 16,
  /** Sideways swipe of a row: start, and the vertical slip that cancels it. */
  swipeStart: 12,
  swipeCross: 10,
  /** How far a row opens to show what is behind it. */
  reveal: 72,
  /** A strip pushed this far, or projected to land this far, leaves. */
  dismiss: 56,
  /** A sheet past this share of its height, or moving this fast, closes. */
  sheetClose: 0.45,
  flick: 900,
} as const;

/** The few waits the app has. Each exists so one thing is seen before the next moves. */
export const delay = {
  /** After a tick, before the highlight moves on. */
  afterTick: 120,
  /** After the last tick of an exercise, before it folds. */
  moveOn: 140,
  /** After a layout change, before scrolling to its result. */
  settle: 120,
  /** How long a superset's link stays lit after it is made. */
  linkHold: 480,
  /** How long a dropped card stays lit. */
  highlightHold: 1400,
  /** How long a refusal stays on screen. */
  refusalHold: 2500,
} as const;

/** Scroll offsets, in points, between which the compact header comes in. */
export const scroll = {
  compactFrom: 56,
  compactTo: 96,
} as const;
