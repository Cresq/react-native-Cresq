import { Pressable, View, type StyleProp, type ViewProps, type ViewStyle } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { pressScale } from "@/motion";
import type { Moment } from "@/haptics";
import { AnimatedPressable } from "./AnimatedPressable";

export type CardProps = ViewProps & {
  /** surface = one contained block per screen (the anchor); raised = inner element; transparent = layout only. */
  tone?: "surface" | "raised" | "transparent";
  padding?: number;
  radius?: number;
  gap?: number;
  /** Hairline outline. Off by default: surfaces are separated by tone and spacing, not lines. */
  bordered?: boolean;
  /** Shadow and lit top edge. On for real surfaces, off for layout-only wrappers. */
  elevated?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

export function Card({ tone = "surface", padding = 20, radius: r, gap = 12, bordered = false, elevated, onPress, style, children, ...rest }: CardProps) {
  const { colors, radius, shadow } = useTheme();
  const bg = tone === "raised" ? colors.bg.raised : tone === "transparent" ? "transparent" : colors.bg.surface;
  const lift = elevated ?? tone !== "transparent";
  // The top edge catches the light, the shadow falls below: a card you could pick up.
  const depth: ViewStyle = lift ? { ...shadow.card, borderTopWidth: 1, borderTopColor: colors.border.highlight } : {};
  const base: ViewStyle = { backgroundColor: bg, borderRadius: r ?? radius.card, padding, gap, borderWidth: bordered ? 1 : 0, borderColor: colors.border.subtle, ...depth };
  if (onPress) {
    return (
      <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [base, pressed ? { backgroundColor: colors.bg.raised } : null, style]} {...rest}>
        {children}
      </Pressable>
    );
  }
  return (
    <View style={[base, style]} {...rest}>
      {children}
    </View>
  );
}

/**
 * A card you can press. The bigger the surface the less it should move, so it
 * gives by a point and a half in a hundred and nothing else changes: no colour
 * flash, no shadow jump. `style` is the card's; `wrapperStyle` places it
 * (flex, alignSelf), because the scale lives on a wrapper.
 */
export function AnimatedCard({ onPress, feedback, wrapperStyle, accessibilityLabel, children, ...card }: Omit<CardProps, "onPress"> & { onPress: () => void; feedback?: Moment; wrapperStyle?: StyleProp<ViewStyle> }) {
  return (
    <AnimatedPressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={onPress} feedback={feedback} scaleTo={pressScale.card} wrapperStyle={wrapperStyle}>
      <Card {...card}>{children}</Card>
    </AnimatedPressable>
  );
}

/** Hairline between rows inside one surface. The only place a line is used. */
export function Divider({ inset = 0 }: { inset?: number }) {
  const { colors } = useTheme();
  return <View style={{ height: 1, backgroundColor: colors.border.subtle, marginLeft: inset }} />;
}
