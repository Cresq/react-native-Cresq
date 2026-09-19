import { useRef, useState } from "react";
import { View, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import { Gesture } from "react-native-gesture-handler";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme/ThemeProvider";
import { useDb } from "@/db/DbProvider";
import { useT } from "@/i18n";
import { haptic } from "@/haptics";
import { Txt } from "./ui/Text";

/** How far past the top counts as a pull, and how long the hold has to last. */
const PULL = 56;
const HOLD_MS = 1000;

/**
 * Pull a page past its top and keep it there for a second, and it refreshes.
 * A thin line fills while you hold, so the second is something you can see;
 * let go early and it drains back and nothing happens. A plain scroll to the
 * top never triggers it: the pull has to start with the list already at the
 * top, and it has to keep going.
 *
 * Returns the gesture to wrap the scroll view in, the scroll handler that
 * tells it where the list is, and the line to draw over the screen.
 */
export function useHoldToRefresh(enabled: boolean) {
  const { refresh } = useDb();
  const { colors } = useTheme();
  const t = useT();
  const insets = useSafeAreaInsets();
  const atTop = useRef(true);
  const startedAtTop = useRef(false);
  const armed = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [done, setDone] = useState(false);
  const progress = useSharedValue(0);
  const shown = useSharedValue(0);

  const disarm = () => {
    if (!armed.current) return;
    armed.current = false;
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    progress.value = withTiming(0, { duration: 160 });
    shown.value = withTiming(0, { duration: 160 });
  };
  const arm = () => {
    if (armed.current) return;
    armed.current = true;
    setDone(false);
    haptic("select");
    shown.value = withTiming(1, { duration: 120 });
    progress.value = withTiming(1, { duration: HOLD_MS, easing: Easing.linear });
    timer.current = setTimeout(() => {
      timer.current = null;
      armed.current = false;
      haptic("done");
      refresh();
      setDone(true);
      shown.value = withTiming(0, { duration: 320 }, () => {
        progress.value = 0;
      });
    }, HOLD_MS);
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    atTop.current = e.nativeEvent.contentOffset.y <= 1;
  };
  // The gesture builder only stores these callbacks; nothing reads the refs until a touch calls them.
  /* eslint-disable react-hooks/refs */
  const pan = Gesture.Pan()
    .runOnJS(true)
    .onBegin(() => {
      startedAtTop.current = atTop.current;
    })
    .onUpdate((e) => {
      if (!enabled || !startedAtTop.current) return;
      if (e.translationY > PULL) arm();
      else if (e.translationY < PULL * 0.6) disarm();
    })
    .onFinalize(() => disarm());
  /* eslint-enable react-hooks/refs */
  const gesture = Gesture.Simultaneous(Gesture.Native(), pan);

  const wrap = useAnimatedStyle(() => ({ opacity: shown.value }));
  const fill = useAnimatedStyle(() => ({ transform: [{ scaleX: progress.value }] }));
  const bar = enabled ? (
    <Animated.View pointerEvents="none" style={[{ position: "absolute", top: insets.top + 8, left: 0, right: 0, alignItems: "center", gap: 6 }, wrap]}>
      <View style={{ width: 72, height: 3, borderRadius: 2, backgroundColor: colors.bg.raised, overflow: "hidden" }}>
        <Animated.View style={[{ width: 72, height: 3, borderRadius: 2, backgroundColor: colors.accent.ember, transformOrigin: "left" }, fill]} />
      </View>
      <Txt variant="labelS" tone="tertiary">
        {done ? t("Refreshed") : t("Hold to refresh")}
      </Txt>
    </Animated.View>
  ) : null;

  return { gesture, onScroll, bar };
}
