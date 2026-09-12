import { useEffect, useRef } from "react";
import { Animated, View } from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "@/theme/ThemeProvider";
import { useAuth } from "@/store/auth";
import { Lockup, Mark } from "@/components/Brand";
import { Txt } from "@/components/ui/Text";

/** Splash. Shows the brand for a beat, then routes to auth or the tabs. */
export default function Splash() {
  const { colors } = useTheme();
  const { signedIn } = useAuth();
  const router = useRouter();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, { toValue: 1, duration: 1200, useNativeDriver: false }).start();
    const t = setTimeout(() => router.replace(signedIn ? "/(tabs)" : "/(auth)/sign-in"), 1400);
    return () => clearTimeout(t);
  }, [progress, router, signedIn]);

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
