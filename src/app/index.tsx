import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withDelay, withSequence, withSpring, withTiming } from "react-native-reanimated";
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

  useEffect(() => {
    if (!ready || leaving) return;
    const target = !db.auth.signedIn ? "/(auth)/sign-in" : !db.profile.onboarded ? "/onboarding" : "/(tabs)";
    const wait = Math.max(0, 1100 - (Date.now() - shownAt.current));
    const t = setTimeout(() => {
      setLeaving(true);
      markScale.value = withSequence(withTiming(1.06, { duration: 120 }), withTiming(2.4, { duration: 420, easing: Easing.in(Easing.cubic) }));
      markOpacity.value = withDelay(140, withTiming(0, { duration: 360 }, (done) => {
        if (done) runOnJS(router.replace)(target);
      }));
    }, wait);
    return () => clearTimeout(t);
  }, [ready, leaving, db.auth.signedIn, db.profile.onboarded, router, markScale, markOpacity]);

  const markStyle = useAnimatedStyle(() => ({ opacity: markOpacity.value, transform: [{ scale: markScale.value }] }));

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg.ground, alignItems: "center", justifyContent: "center" }}>
      <Animated.View style={markStyle}>
        <Mark size={132} />
      </Animated.View>
    </View>
  );
}
