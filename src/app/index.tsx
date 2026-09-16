import { useEffect, useRef } from "react";
import { View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSequence, withTiming } from "react-native-reanimated";
import { useRouter } from "expo-router";
import { useTheme } from "@/theme/ThemeProvider";
import { useDb } from "@/db/DbProvider";
import { Mark } from "@/components/Brand";

/**
 * Splash. Only the mark, no wordmark.
 *
 * Three movements along one axis, so the whole thing reads as a single breath
 * rather than a set of tricks. It arrives by growing in, it keeps drifting
 * outward while the database loads so it is never a frozen picture, and then it
 * carries on along that same line, faster, until it has dissolved. Coming and
 * going by the same path is what stops a splash feeling like two animations
 * glued together.
 *
 * No spring: a spring is for motion somebody's finger started. Nothing here is
 * being touched, and a scripted curve of a known length keeps the screen honest
 * about when it will be gone.
 */

/** How long the mark is at rest before it starts to leave. */
const HOLD_MS = 1500;
/** The leaving itself: outward, and faded out before the screen is replaced. */
const GROW_MS = 560;
const FADE_DELAY_MS = 40;
const FADE_MS = 420;
/** Replaced once the mark is invisible, never over the top of it fading. */
const LEAVE_MS = FADE_DELAY_MS + FADE_MS + 40;

export default function Splash() {
  const { colors } = useTheme();
  const { db, ready } = useDb();
  const router = useRouter();
  const calm = useReducedMotion();
  const shownAt = useRef(Date.now());
  const markScale = useSharedValue(0.9);
  const markOpacity = useSharedValue(0);

  useEffect(() => {
    markOpacity.value = withTiming(1, { duration: 460, easing: Easing.out(Easing.quad) });
    markScale.value = withSequence(
      // Decisive, then soft: the mark is at its size well before it looks still.
      withTiming(1, { duration: 620, easing: Easing.bezier(0.16, 1, 0.3, 1) }),
      // The drift. Four percent over a second and a half is too slow to watch
      // and too alive to read as a still image, and it means the exit below
      // takes over from something already moving instead of starting cold.
      withTiming(1.04, { duration: 1600, easing: Easing.linear }),
    );
  }, [markOpacity, markScale]);

  /**
   * Leaving is on a clock, not on an animation finishing.
   *
   * This used to call `router.replace` from the fade's completion callback. When
   * that callback did not arrive — a dropped frame, reduced motion, the callback
   * simply not firing on web — the app sat on this screen for good, with no error
   * and no way out. A splash must never be able to trap somebody in it.
   */
  const started = useRef(false);
  useEffect(() => {
    // Once, and never torn down again. Setting `leaving` used to re-run this
    // effect, and the cleanup then cancelled the very navigation the run before
    // it had just scheduled, which is how the app came to sit on this screen
    // with no error and no way out.
    if (!ready || started.current) return;
    started.current = true;
    const target = !db.auth.signedIn ? "/(auth)/sign-in" : !db.profile.onboarded ? "/onboarding" : "/(tabs)";
    const wait = Math.max(0, HOLD_MS - (Date.now() - shownAt.current));
    const start = setTimeout(() => {
      markScale.value = withTiming(1.55, { duration: GROW_MS, easing: Easing.in(Easing.cubic) });
      // Soft at both ends: an ease-in fade would sit at full strength while the
      // mark is already moving, which reads as a lag before it goes.
      markOpacity.value = withDelay(FADE_DELAY_MS, withTiming(0, { duration: FADE_MS, easing: Easing.inOut(Easing.quad) }));
      // Deliberately not cleared on cleanup: once the app has committed to
      // leaving, nothing gets to change its mind. With motion turned down
      // there is nothing to wait for, so it does not wait.
      setTimeout(() => router.replace(target), calm ? 80 : LEAVE_MS);
    }, wait);
    return () => clearTimeout(start);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, db.auth.signedIn, db.profile.onboarded]);

  const markStyle = useAnimatedStyle(() => ({ opacity: markOpacity.value, transform: [{ scale: markScale.value }] }));

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg.ground, alignItems: "center", justifyContent: "center" }}>
      <Animated.View style={markStyle}>
        <Mark size={132} />
      </Animated.View>
    </View>
  );
}
