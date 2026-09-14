import { useEffect, useState } from "react";
import { Pressable, View, type LayoutChangeEvent } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { useTheme } from "@/theme/ThemeProvider";
import { springs, to } from "@/motion";
import { Txt } from "./Text";

export type Tab = { key: string; label: string; count?: number };

/**
 * Chapters of one screen. Text on a hairline with an underline under the
 * open one, so it reads as "parts of this page", not as a filter (that is
 * what Segmented is for). The underline travels between chapters instead of
 * blinking from one to the next, so the eye keeps its place.
 */
export function Tabs({ tabs, value, onChange }: { tabs: Tab[]; value: string; onChange: (key: string) => void }) {
  const { colors } = useTheme();
  const [layouts, setLayouts] = useState<Record<string, { x: number; w: number }>>({});
  const x = useSharedValue(0);
  const w = useSharedValue(0);
  const measured = layouts[value];
  useEffect(() => {
    if (!measured) return;
    const first = w.value === 0;
    x.value = first ? measured.x : to(measured.x, springs.base);
    w.value = first ? measured.w : to(measured.w, springs.base);
  }, [measured, x, w]);
  const underline = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }], width: w.value }));
  const onLayout = (key: string) => (e: LayoutChangeEvent) => {
    const { x: lx, width } = e.nativeEvent.layout;
    setLayouts((l) => (l[key] && l[key].x === lx && l[key].w === width ? l : { ...l, [key]: { x: lx, w: width } }));
  };
  return (
    <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border.subtle }}>
      <View style={{ flexDirection: "row", gap: 22 }}>
        {tabs.map((t) => {
          const on = t.key === value;
          return (
            <Pressable key={t.key} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => onChange(t.key)} onLayout={onLayout(t.key)} hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }} style={({ pressed }) => ({ flexDirection: "row", alignItems: "baseline", gap: 5, paddingVertical: 10, opacity: pressed ? 0.7 : 1 })}>
              <Txt variant="labelL" tone={on ? "primary" : "tertiary"}>
                {t.label}
              </Txt>
              {t.count !== undefined ? (
                <Txt variant="labelS" tone="tertiary" tabular>
                  {t.count}
                </Txt>
              ) : null}
            </Pressable>
          );
        })}
      </View>
      <Animated.View pointerEvents="none" style={[{ position: "absolute", bottom: -1, left: 0, height: 2, borderRadius: 1, backgroundColor: colors.text.primary }, underline]} />
    </View>
  );
}
