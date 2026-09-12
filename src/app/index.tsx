import { useEffect, useRef } from "react";
import { Animated, View } from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "@/theme/ThemeProvider";
import { useDb } from "@/db/DbProvider";
import { Lockup, Mark } from "@/components/Brand";
import { Txt } from "@/components/ui/Text";

/** Splash. Shows the brand while the database loads, then routes to auth, onboarding or the tabs. */
export default function Splash() {
  const { colors } = useTheme();
  const { db, ready } = useDb();
  const router = useRouter();
  const progress = useRef(new Animated.Value(0)).current;
  const shownAt = useRef(Date.now());

  useEffect(() => {
    Animated.timing(progress, { toValue: 1, duration: 1200, useNativeDriver: false }).start();
  }, [progress]);

  useEffect(() => {
    if (!ready) return;
    const target = !db.auth.signedIn ? "/(auth)/sign-in" : !db.profile.onboarded ? "/onboarding" : "/(tabs)";
    const wait = Math.max(0, 1300 - (Date.now() - shownAt.current));
    const t = setTimeout(() => router.replace(target), wait);
    return () => clearTimeout(t);
  }, [ready, db.auth.signedIn, db.profile.onboarded, router]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg.ground, alignItems: "center", justifyContent: "center" }}>
      <View pointerEvents="none" style={{ position: "absolute", width: 360, height: 360, borderRadius: 180, backgroundColor: colors.accent.ember, opacity: 0.16, transform: [{ scale: 1.5 }] }} />
      <View style={{ alignItems: "center", gap: 28 }}>
        <Mark size={132} />
        <Lockup width={236} />
      </View>
      <View style={{ position: "absolute", bottom: 88, alignItems: "center", gap: 20 }}>
        <Txt variant="bodyM" tone="secondary">
          Train. See it grow.
        </Txt>
        <View style={{ width: 120, height: 3, borderRadius: 2, backgroundColor: colors.border.strong, overflow: "hidden" }}>
          <Animated.View style={{ height: 3, borderRadius: 2, backgroundColor: colors.accent.ember, width: progress.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }) }} />
        </View>
      </View>
    </View>
  );
}
