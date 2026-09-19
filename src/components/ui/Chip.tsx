import { useEffect } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { AnimatedPressable } from "./AnimatedPressable";
import { useTheme } from "@/theme/ThemeProvider";
import { pressScale, timings } from "@/motion";
import { Txt } from "./Text";
import { Icon, type IconName } from "./Icon";

/**
 * Chips carry state or a filter, never decoration.
 *   neutral – filter or option at rest
 *   selected – the active filter (inverse, like the segmented control)
 *   ember / sage / gold / warning – meaning: progress, recovery, record, caution
 *
 * A chip that can be chosen crosses over to its selected look instead of
 * switching: the selected face sits on top of the resting one and its opacity
 * is all that changes, so the label is legible at every point on the way.
 */
type Tone = "neutral" | "ember" | "sage" | "gold" | "success" | "warning" | "danger";
type Size = "S" | "M";

type ChipProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconName;
  tone?: Tone;
  size?: Size;
  style?: StyleProp<ViewStyle>;
};

function Face({ label, icon, size, fg }: { label: string; icon?: IconName; size: Size; fg: string }) {
  return (
    <>
      {icon ? <Icon name={icon} size={size === "S" ? 12 : 14} color={fg} strokeWidth={2.2} /> : null}
      <Txt variant={size === "S" ? "labelS" : "labelM"} style={{ color: fg }}>
        {label}
      </Txt>
    </>
  );
}

export function Chip({ label, selected, onPress, icon, tone = "neutral", size = "M", style }: ChipProps) {
  const { colors, radius } = useTheme();
  const tones: Record<Tone, { bg: string; fg: string }> = {
    neutral: { bg: colors.bg.raised, fg: colors.text.secondary },
    ember: { bg: colors.accent.soft, fg: colors.accent.ember },
    sage: { bg: colors.fuel.soft, fg: colors.fuel.sage },
    gold: { bg: colors.pr.gold, fg: colors.accent.on },
    success: { bg: colors.fuel.soft, fg: colors.status.success },
    warning: { bg: colors.bg.raised, fg: colors.status.warning },
    danger: { bg: colors.bg.raised, fg: colors.status.danger },
  };
  const base: ViewStyle = {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: size === "S" ? 4 : 8,
    paddingHorizontal: size === "S" ? 9 : 12,
    borderRadius: radius.pill,
  };
  const rest = tones[tone];
  if (!onPress) {
    const look = selected ? { bg: colors.bg.inverse, fg: colors.text.inverse } : rest;
    return (
      <View style={[base, { backgroundColor: look.bg }, style]}>
        <Face label={label} icon={icon} size={size} fg={look.fg} />
      </View>
    );
  }
  return (
    // A small chip is 22 points tall, and a thumb is not: the touch area reaches past the drawn one, mostly up and down so neighbours in a row keep their own.
    <AnimatedPressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: !!selected }} onPress={onPress} hitSlop={size === "S" ? { top: 11, bottom: 11, left: 4, right: 4 } : { top: 6, bottom: 6, left: 4, right: 4 }} scaleTo={pressScale.chip} wrapperStyle={style} style={[base, { backgroundColor: rest.bg, overflow: "hidden" }]}>
      <Face label={label} icon={icon} size={size} fg={rest.fg} />
      <Chosen on={!!selected} base={base} bg={colors.bg.inverse}>
        <Face label={label} icon={icon} size={size} fg={colors.text.inverse} />
      </Chosen>
    </AnimatedPressable>
  );
}

/** The selected face, laid exactly over the resting one and faded in and out. Hidden from screen readers: the chip already says it is selected. */
function Chosen({ on, base, bg, children }: { on: boolean; base: ViewStyle; bg: string; children: React.ReactNode }) {
  const shown = useSharedValue(on ? 1 : 0);
  useEffect(() => {
    shown.value = withTiming(on ? 1 : 0, timings.fast);
  }, [on, shown]);
  const fade = useAnimatedStyle(() => ({ opacity: shown.value }));
  return (
    <Animated.View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[base, { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: bg }, fade]}>
      {children}
    </Animated.View>
  );
}
