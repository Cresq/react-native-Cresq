import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import type { ComponentProps } from "react";
import type { Tabs } from "expo-router";
import { useTheme } from "@/theme/ThemeProvider";
import { sessionStats, useWorkout } from "@/store/workout";
import { Txt } from "./ui/Text";
import { Icon, type IconName } from "./ui/Icon";

/** Props expo-router hands to a custom `tabBar`, derived so no navigation package import is needed. */
type BottomTabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>["tabBar"]>>[0];

const tabIcons: Record<string, IconName> = { index: "house", feed: "rows", train: "dumbbell", profile: "user" };
const tabLabels: Record<string, string> = { index: "Home", feed: "Feed", train: "Train", profile: "Profile" };

/**
 * Floating tab bar. Shares the surface tone, no outline, content scrolls
 * freely beneath it. While a session runs, a strip above the bar keeps the
 * clock and a way back, on every tab.
 */
export function TabBar({ state, navigation }: BottomTabBarProps) {
  const { colors, layout, radius, shadow } = useTheme();
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom, 12) + 10;
  return (
    <View pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, bottom: 0 }}>
      <RunningStrip />
      <View style={[{ marginHorizontal: layout.tabBarInset, marginBottom: bottom, flexDirection: "row", height: layout.tabBarHeight, padding: 8, borderRadius: radius.tabBar, backgroundColor: colors.bg.surface }, shadow.floating]}>
        {state.routes.map((route, i) => {
          const on = state.index === i;
          const name = tabIcons[route.name] ?? "house";
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              accessibilityLabel={tabLabels[route.name]}
              onPress={() => {
                const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
                if (!on && !event.defaultPrevented) navigation.navigate(route.name);
              }}
              style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 4, borderRadius: radius.pill, backgroundColor: on ? colors.bg.raised : "transparent" }}
            >
              <Icon name={name} size={22} color={on ? colors.text.primary : colors.text.tertiary} strokeWidth={on ? 2 : 1.7} />
              <Txt variant="labelS" tone={on ? "primary" : "tertiary"}>
                {tabLabels[route.name] ?? route.name}
              </Txt>
            </Pressable>
          );
        })}
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
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [running]);
  if (!running || !session) return null;
  const stats = sessionStats(session);
  const current = session.exercises[session.currentIndex];
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Return to your running session" onPress={() => router.push("/workout/active")} style={({ pressed }) => [{ marginHorizontal: layout.tabBarInset, marginBottom: 8, flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, paddingLeft: 16, paddingRight: 12, borderRadius: radius.pill, backgroundColor: pressed ? colors.accent.pressed : colors.accent.ember }, shadow.floating]}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent.on }} />
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
    </Pressable>
  );
}
