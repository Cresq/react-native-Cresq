import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { useRouter } from "expo-router";
import { useTheme } from "@/theme/ThemeProvider";
import { useDb } from "@/db/DbProvider";
import { Mark } from "@/components/Brand";
import { spring } from "@/motion";

/**
 * Splash. Only the mark, no wordmark: it settles in, and once the database is
 * ready it grows toward the viewer and dissolves, and the app is there.
 */
export default function Splash() {
  const { colors } = useTheme();
  const { db, ready } = useDb();
  const router = useRouter();
  const shownAt = useRef(Date.now());
  const [leaving, setLeaving] = useState(false);
  const markScale = useSharedValue(0.72);
  const markOpacity = useSharedValue(0);

  useEffect(() => {
    markOpacity.value = withTiming(1, { duration: 260 });
    markScale.value = withSpring(1, spring(0.5, 0.85));
  }, [markOpacity, markScale]);

  /**
   * Leaving is on a clock, not on an animation finishing.
   *
   * This used to call `router.replace` from the fade's completion callback. When
   * that callback did not arrive — a dropped frame, reduced motion, the callback
   * simply not firing on web — the app sat on this screen for good, with no error
   * and no way out. A splash must never be able to trap somebody in it.
   */
  const go = useRef(router);
  go.current = router;
  const started = useRef(false);
  useEffect(() => {
    // Once, and never torn down again. Setting `leaving` used to re-run this
    // effect, and the cleanup then cancelled the very navigation the run before
    // it had just scheduled, which is how the app came to sit on this screen
    // with no error and no way out.
    if (!ready || started.current) return;
    started.current = true;
    const target = !db.auth.signedIn ? "/(auth)/sign-in" : !db.profile.onboarded ? "/onboarding" : "/(tabs)";
    const wait = Math.max(0, 1100 - (Date.now() - shownAt.current));
    const start = setTimeout(() => {
      setLeaving(true);
      markScale.value = withSequence(withTiming(1.06, { duration: 120 }), withTiming(2.4, { duration: 420, easing: Easing.in(Easing.cubic) }));
      markOpacity.value = withDelay(140, withTiming(0, { duration: 360 }));
      // Deliberately not cleared on cleanup: once the app has committed to
      // leaving, nothing gets to change its mind.
      setTimeout(() => go.current.replace(target), 430);
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
