import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { useTheme } from "@/theme/ThemeProvider";
import { springs, to } from "@/motion";
import { Txt } from "./Text";
import { Icon, type IconName } from "./Icon";

/**
 * Two kinds of segmented control share one shape:
 *   filters (range, feed) use the inverse pill;
 *   mode switches (Gym | Food) give each mode its own colour, so the switch
 *   reads as "which world am I in", not "which filter is on".
 * The pill slides to the chosen segment and the labels recolour under it.
 */
export type Segment = { key: string; label: string; icon?: IconName; color?: "ember" | "sage" };

export function Segmented({ segments, value, onChange, size = "L" }: { segments: Segment[]; value: string; onChange: (key: string) => void; size?: "L" | "M" }) {
  const { colors, radius } = useTheme();
  const [inner, setInner] = useState(0);
  const index = Math.max(0, segments.findIndex((s) => s.key === value));
  const slot = inner ? (inner - 4 * (segments.length - 1)) / segments.length : 0;
  const x = useSharedValue(0);
  const target = index * (slot + 4);
  useEffect(() => {
    if (!inner) return;
    x.value = x.value === 0 && index === 0 ? 0 : to(target, springs.base);
  }, [inner, index, target, x]);
  const pill = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const active = segments[index];
  const pillBg = active?.color === "ember" ? colors.accent.ember : active?.color === "sage" ? colors.fuel.sage : colors.bg.inverse;
  return (
    <View style={{ flexDirection: "row", padding: 4, gap: 4, backgroundColor: colors.bg.surface, borderRadius: radius.pill }}>
      <View style={{ position: "absolute", left: 4, right: 4, top: 4, bottom: 4 }} onLayout={(e) => setInner(e.nativeEvent.layout.width)}>
        {inner ? <Animated.View style={[{ position: "absolute", left: 0, top: 0, bottom: 0, width: slot, borderRadius: radius.pill, backgroundColor: pillBg }, pill]} /> : null}
      </View>
      {segments.map((s) => {
        const on = s.key === value;
        const fg = !on ? colors.text.secondary : s.color ? colors.accent.on : colors.text.inverse;
        return (
          <Pressable
            key={s.key}
            onPress={() => onChange(s.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            style={({ pressed }) => ({ flex: 1, flexDirection: "row", gap: 7, alignItems: "center", justifyContent: "center", paddingVertical: size === "L" ? 10 : 8, borderRadius: radius.pill, opacity: pressed && !on ? 0.7 : 1 })}
          >
            {s.icon ? <Icon name={s.icon} size={17} color={fg} strokeWidth={2} /> : null}
            <Txt variant={size === "L" ? "labelL" : "labelM"} style={{ color: fg }}>
              {s.label}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}
