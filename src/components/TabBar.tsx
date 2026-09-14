import { useEffect, useState } from "react";
import { Platform, Pressable, View } from "react-native";
import { BlurView } from "expo-blur";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import type { ComponentProps } from "react";
import type { Tabs } from "expo-router";
import { useTheme } from "@/theme/ThemeProvider";
import { sessionStats, useWorkout } from "@/store/workout";
import { springs, to } from "@/motion";
import { Txt } from "./ui/Text";
import { Icon, type IconName } from "./ui/Icon";
import { Press } from "./ui/Press";

/** Props expo-router hands to a custom `tabBar`, derived so no navigation package import is needed. */
type BottomTabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>["tabBar"]>>[0];

const tabIcons: Record<string, IconName> = { index: "house", feed: "rows", train: "dumbbell", profile: "user" };
const tabLabels: Record<string, string> = { index: "Home", feed: "Feed", train: "Train", profile: "Profile" };

/**
 * Floating tab bar as a material: content scrolls underneath a blurred
 * surface, the active pill slides to the tab you chose, and while a session
 * runs a strip above the bar keeps the clock and a way back, on every tab.
 */
export function TabBar({ state, navigation }: BottomTabBarProps) {
  const { colors, layout, radius, shadow } = useTheme();
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom, 12) + 10;
  const [inner, setInner] = useState(0);
  const n = state.routes.length;
  const slot = inner / n;
  const x = useSharedValue(0);
  useEffect(() => {
    if (inner) x.value = x.value === 0 && state.index === 0 ? 0 : to(state.index * slot, springs.base);
  }, [state.index, inner, slot, x]);
  const pill = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  return (
    <View pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, bottom: 0 }}>
      <RunningStrip />
      <View style={[{ marginHorizontal: layout.tabBarInset, marginBottom: bottom, height: layout.tabBarHeight, borderRadius: radius.tabBar, overflow: "hidden" }, shadow.floating]}>
        <BlurView intensity={Platform.OS === "android" ? 0 : 40} tint="dark" style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }} />
        <View style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: colors.bg.surface, opacity: Platform.OS === "android" ? 1 : 0.82 }} />
        <View style={{ flex: 1, flexDirection: "row", padding: 8 }} onLayout={(e) => setInner(e.nativeEvent.layout.width - 16)}>
          {inner ? <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 8, top: 8, bottom: 8, width: slot, borderRadius: radius.pill, backgroundColor: colors.bg.raised }, pill]} /> : null}
          {state.routes.map((route, i) => {
            const on = state.index === i;
            const name = tabIcons[route.name] ?? "house";
            return (
              <Press
                key={route.key}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                accessibilityLabel={tabLabels[route.name]}
                scaleTo={0.94}
                wrapperStyle={{ flex: 1 }}
                onPress={() => {
                  const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
                  if (!on && !event.defaultPrevented) navigation.navigate(route.name);
                }}
                style={{ flex: 1, height: "100%", alignItems: "center", justifyContent: "center", gap: 4 }}
              >
                <Icon name={name} size={22} color={on ? colors.text.primary : colors.text.tertiary} strokeWidth={on ? 2 : 1.7} />
                <Txt variant="labelS" tone={on ? "primary" : "tertiary"}>
                  {tabLabels[route.name] ?? route.name}
                </Txt>
              </Press>
            );
          })}
        </View>
      </View>
    </View>
  );
}

function RunningStrip() {
  const { colors, layout, radius, shadow } = useTheme();
  const router = useRouter();
  const { session } = useWorkout();
  const [, tick] = useState(0);
  const running = !!session && !session.finishedAt;
  const enter = useSharedValue(0);
  useEffect(() => {
    enter.value = withSpring(running ? 1 : 0, springs.base);
    if (!running) return;
    const t = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [running, enter]);
  const style = useAnimatedStyle(() => ({ opacity: enter.value, transform: [{ translateY: (1 - enter.value) * 24 }] }));
  if (!running || !session) return null;
  const stats = sessionStats(session);
  const current = session.exercises[session.currentIndex];
  return (
    <Animated.View style={style}>
      <Press
        accessibilityRole="button"
        accessibilityLabel="Return to your running session"
        onPress={() => router.push("/workout/active")}
        scaleTo={0.98}
        wrapperStyle={[{ marginHorizontal: layout.tabBarInset, marginBottom: 8 }, shadow.floating]}
        style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, paddingLeft: 16, paddingRight: 12, borderRadius: radius.pill, backgroundColor: pressed ? colors.accent.pressed : colors.accent.ember })}
      >
        <Pulse color={colors.accent.on} />
        <View style={{ flex: 1, gap: 1 }}>
          <Txt variant="labelL" style={{ color: colors.accent.on }} numberOfLines={1}>
            {session.planName} · {current?.name ?? "Add an exercise"}
          </Txt>
          <Txt variant="labelS" style={{ color: colors.accent.on, opacity: 0.8 }}>
            {stats.setsDone} of {stats.setsTotal} sets
          </Txt>
        </View>
        <Txt variant="numberM" tabular style={{ color: colors.accent.on }}>
          {stats.elapsed}
        </Txt>
        <Icon name="chevronRight" size={16} color={colors.accent.on} strokeWidth={2.2} />
      </Press>
    </Animated.View>
  );
}

/** A slow breath, one cycle every two seconds: alive, not blinking. */
function Pulse({ color }: { color: string }) {
  return <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />;
}
