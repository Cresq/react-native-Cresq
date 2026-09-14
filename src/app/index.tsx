import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withDelay, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { useRouter } from "expo-router";
import { useTheme } from "@/theme/ThemeProvider";
import { useDb } from "@/db/DbProvider";
import { Lockup, Mark } from "@/components/Brand";
import { spring } from "@/motion";

/**
 * Splash. The mark settles in, the wordmark follows; once the database is
 * ready the mark grows toward the viewer and dissolves, and the app is there.
 */
export default function Splash() {
  const { colors } = useTheme();
  const { db, ready } = useDb();
  const router = useRouter();
  const shownAt = useRef(Date.now());
  const [leaving, setLeaving] = useState(false);
  const markScale = useSharedValue(0.72);
  const markOpacity = useSharedValue(0);
  const lockupOpacity = useSharedValue(0);
  const lockupY = useSharedValue(10);

  useEffect(() => {
    markOpacity.value = withTiming(1, { duration: 260 });
    markScale.value = withSpring(1, spring(0.5, 0.85));
    lockupOpacity.value = withDelay(220, withTiming(1, { duration: 320 }));
    lockupY.value = withDelay(220, withSpring(0, spring(0.5)));
  }, [markOpacity, markScale, lockupOpacity, lockupY]);

  useEffect(() => {
    if (!ready || leaving) return;
    const target = !db.auth.signedIn ? "/(auth)/sign-in" : !db.profile.onboarded ? "/onboarding" : "/(tabs)";
    const wait = Math.max(0, 1100 - (Date.now() - shownAt.current));
    const t = setTimeout(() => {
      setLeaving(true);
      lockupOpacity.value = withTiming(0, { duration: 180 });
      markScale.value = withSequence(withTiming(1.06, { duration: 120 }), withTiming(2.4, { duration: 420, easing: Easing.in(Easing.cubic) }));
      markOpacity.value = withDelay(140, withTiming(0, { duration: 360 }, (done) => {
        if (done) runOnJS(router.replace)(target);
      }));
    }, wait);
    return () => clearTimeout(t);
  }, [ready, leaving, db.auth.signedIn, db.profile.onboarded, router, lockupOpacity, markScale, markOpacity]);

  const markStyle = useAnimatedStyle(() => ({ opacity: markOpacity.value, transform: [{ scale: markScale.value }] }));
  const lockupStyle = useAnimatedStyle(() => ({ opacity: lockupOpacity.value, transform: [{ translateY: lockupY.value }] }));

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg.ground, alignItems: "center", justifyContent: "center" }}>
      <View style={{ alignItems: "center", gap: 28 }}>
        <Animated.View style={markStyle}>
          <Mark size={132} />
        </Animated.View>
        <Animated.View style={lockupStyle}>
          <Lockup width={236} />
        </Animated.View>
      </View>
    </View>
  );
}
