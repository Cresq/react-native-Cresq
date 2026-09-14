import { View, type StyleProp, type ViewStyle } from "react-native";
import { Press } from "./Press";
import { useTheme } from "@/theme/ThemeProvider";
import { Txt } from "./Text";
import { Icon, type IconName } from "./Icon";

/**
 * Chips carry state or a filter, never decoration.
 *   neutral – filter or option at rest
 *   selected – the active filter (inverse, like the segmented control)
 *   ember / sage / gold / warning – meaning: progress, recovery, record, caution
 */
type Tone = "neutral" | "ember" | "sage" | "gold" | "success" | "warning" | "danger";

export function Chip({
  label,
  selected,
  onPress,
  icon,
  tone = "neutral",
  size = "M",
  style,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconName;
  tone?: Tone;
  size?: "S" | "M";
  style?: StyleProp<ViewStyle>;
}) {
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
  const t = selected ? { bg: colors.bg.inverse, fg: colors.text.inverse } : tones[tone];
  const content = (
    <>
      {icon ? <Icon name={icon} size={size === "S" ? 12 : 14} color={t.fg} strokeWidth={2.2} /> : null}
      <Txt variant={size === "S" ? "labelS" : "labelM"} style={{ color: t.fg }}>
        {label}
      </Txt>
    </>
  );
  const base: ViewStyle = {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: size === "S" ? 4 : 8,
    paddingHorizontal: size === "S" ? 9 : 12,
    borderRadius: radius.pill,
    backgroundColor: t.bg,
  };
  if (!onPress) return <View style={[base, style]}>{content}</View>;
  return (
    <Press accessibilityRole="button" accessibilityState={{ selected: !!selected }} onPress={onPress} scaleTo={0.95} wrapperStyle={style} style={({ pressed }) => [base, pressed ? { opacity: 0.85 } : null]}>
      {content}
    </Press>
  );
}
