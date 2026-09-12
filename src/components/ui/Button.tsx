import { ActivityIndicator, Pressable, StyleSheet, View, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { Txt } from "./Text";
import { Icon, type IconName } from "./Icon";

/**
 * Three levels, used in this order on any screen:
 *   primary   – the one action the screen exists for (ember). One per screen.
 *   secondary – a filled, quiet alternative (surface). No outline.
 *   tertiary  – text only. For "not now", "see all", links inside copy.
 * inverse and gold are reserved: inverse for Finish/Connect pills, gold for record moments.
 */
type Variant = "primary" | "secondary" | "tertiary" | "inverse" | "danger" | "gold";
type Size = "L" | "M" | "S";

export type ButtonProps = Omit<PressableProps, "style" | "children"> & {
  label: string;
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  iconRight?: IconName;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  loading?: boolean;
  full?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({ label, variant = "primary", size = "L", icon, iconRight, leading, trailing, loading, full = true, style, disabled, ...rest }: ButtonProps) {
  const { colors, radius } = useTheme();
  const palette: Record<Variant, { bg: string; fg: string; pressed: string }> = {
    primary: { bg: colors.accent.ember, fg: colors.accent.on, pressed: colors.accent.pressed },
    secondary: { bg: colors.bg.raised, fg: colors.text.primary, pressed: colors.border.strong },
    tertiary: { bg: "transparent", fg: colors.text.secondary, pressed: colors.bg.surface },
    inverse: { bg: colors.bg.inverse, fg: colors.text.inverse, pressed: colors.text.secondary },
    danger: { bg: "transparent", fg: colors.status.danger, pressed: colors.bg.surface },
    gold: { bg: colors.pr.gold, fg: colors.accent.on, pressed: colors.status.warning },
  };
  const p = palette[variant];
  const height = size === "L" ? 56 : size === "M" ? 48 : 40;
  const textVariant = size === "L" ? "buttonL" : "buttonM";
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      {...rest}
      style={({ pressed }) => [
        styles.base,
        {
          height,
          borderRadius: size === "S" ? radius.pill : radius.button,
          backgroundColor: pressed ? p.pressed : p.bg,
          alignSelf: full ? "stretch" : "flex-start",
          paddingHorizontal: size === "L" ? 20 : 16,
          opacity: disabled ? 0.4 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={p.fg} />
      ) : (
        <View style={styles.row}>
          {leading}
          {icon ? <Icon name={icon} size={18} color={p.fg} strokeWidth={2} /> : null}
          <Txt variant={textVariant} style={{ color: p.fg }}>
            {label}
          </Txt>
          {iconRight ? <Icon name={iconRight} size={18} color={p.fg} strokeWidth={2} /> : null}
          {trailing}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: "center", justifyContent: "center" },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
});
