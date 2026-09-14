import { useEffect, useState } from "react";
import { Platform, Pressable, View } from "react-native";
import { BlurView } from "expo-blur";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import type { ComponentProps } from "react";
import type { Tabs } from "expo-router";
import { useTheme } from "@/theme/ThemeProvider";
import { fmtTime, sessionStats, useWorkout } from "@/store/workout";
import { springs, to } from "@/motion";
import { Txt } from "./ui/Text";
import { Icon, type IconName } from "./ui/Icon";
import { Press } from "./ui/Press";
import { useT } from "@/i18n";

/** Props expo-router hands to a custom `tabBar`, derived so no navigation package import is needed. */
type BottomTabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>["tabBar"]>>[0];

const tabIcons: Record<string, IconName> = { index: "house", feed: "rows", train: "dumbbell", profile: "user" };
const tabLabels: Record<string, string> = { index: "Home", feed: "Feed", train: "Train", profile: "Profile" };
const tabLabelsNl: Record<string, string> = { index: "Home", feed: "Feed", train: "Train", profile: "Profiel" };

/**
 * Floating tab bar as a material: content scrolls underneath a blurred
 * surface, the active pill slides to the tab you chose, and while a session
 * runs a strip above the bar keeps the clock and a way back, on every tab.
 */
export function TabBar({ state, navigation }: BottomTabBarProps) {
  const { colors, layout, radius, shadow } = useTheme();
  const t = useT();
  const labels = t("Profile") === "Profiel" ? tabLabelsNl : tabLabels;
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
                accessibilityLabel={labels[route.name]}
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
                  {labels[route.name] ?? route.name}
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
  const { session, rest, adjustRest, skipRest, lastDiscarded, undoDiscard } = useWorkout();
  const t = useT();
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
  if (!running || !session) {
    if (!lastDiscarded) return null;
    return (
      <View style={[{ marginHorizontal: layout.tabBarInset, marginBottom: 8, borderRadius: radius.pill, backgroundColor: colors.bg.raised, flexDirection: "row", alignItems: "center", paddingVertical: 10, paddingLeft: 16, paddingRight: 8, gap: 12 }, shadow.floating]}>
        <View style={{ flex: 1, gap: 1 }}>
          <Txt variant="labelL">{t("Session discarded")}</Txt>
          <Txt variant="labelS" tone="tertiary" numberOfLines={1}>
            {t("{plan}, nothing was saved", { plan: lastDiscarded.planName })}
          </Txt>
        </View>
        <StripPill label={t("Undo")} accent onPress={undoDiscard} />
      </View>
    );
  }
  const stats = sessionStats(session);
  const current = session.exercises[session.currentIndex];
  const resting = !!rest;
  return (
    <Animated.View style={[style, { marginHorizontal: layout.tabBarInset, marginBottom: 8, borderRadius: radius.pill, backgroundColor: resting ? colors.bg.raised : colors.accent.ember, flexDirection: "row", alignItems: "center", paddingRight: 8 }, shadow.floating]}>
      <Pressable accessibilityRole="button" accessibilityLabel={t("Return to your running session")} onPress={() => router.push("/workout/active")} style={({ pressed }) => ({ flex: 1, flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, paddingLeft: 16, paddingRight: 8, opacity: pressed ? 0.8 : 1 })}>
        <Pulse color={resting ? colors.accent.ember : colors.accent.on} />
        <View style={{ flex: 1, gap: 1 }}>
          <Txt variant="labelL" style={{ color: resting ? colors.text.primary : colors.accent.on }} numberOfLines={1}>
            {resting ? t("Rest {time}", { time: fmtTime(rest.left) }) : `${session.planName}, ${current?.name ?? t("Add exercise")}`}
          </Txt>
          <Txt variant="labelS" style={{ color: resting ? colors.text.tertiary : colors.accent.on, opacity: resting ? 1 : 0.8 }} numberOfLines={1}>
            {resting ? t("{label}, {time} elapsed", { label: rest.nextLabel, time: stats.elapsed }) : t("{n} of {m} sets", { n: stats.setsDone, m: stats.setsTotal })}
          </Txt>
        </View>
        {resting ? null : (
          <Txt variant="numberM" tabular style={{ color: colors.accent.on }}>
            {stats.elapsed}
          </Txt>
        )}
      </Pressable>
      {resting ? (
        <View style={{ flexDirection: "row", gap: 6 }}>
          <StripPill label="−15" onPress={() => adjustRest(-15)} />
          <StripPill label="+15" onPress={() => adjustRest(15)} />
          <StripPill label={t("Skip")} accent onPress={skipRest} />
        </View>
      ) : (
        <Icon name="chevronRight" size={16} color={colors.accent.on} strokeWidth={2.2} />
      )}
    </Animated.View>
  );
}

function StripPill({ label, onPress, accent }: { label: string; onPress: () => void; accent?: boolean }) {
  const { colors, radius } = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label === "Skip" ? "Skip rest" : `${label} seconds`} onPress={onPress} style={({ pressed }) => ({ paddingHorizontal: 12, height: 36, justifyContent: "center", borderRadius: radius.pill, backgroundColor: accent ? colors.accent.ember : colors.bg.surface, opacity: pressed ? 0.8 : 1 })}>
      <Txt variant="buttonM" style={{ color: accent ? colors.accent.on : colors.text.primary }}>
        {label}
      </Txt>
    </Pressable>
  );
}

/** A slow breath, one cycle every two seconds: alive, not blinking. */
function Pulse({ color }: { color: string }) {
  return <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />;
}
