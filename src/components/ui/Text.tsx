import { Text, type TextProps } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { fontFamily, type TypeVariant } from "../../../constants/theme";

type TextTone = "primary" | "secondary" | "tertiary" | "inverse" | "ember" | "sage" | "gold" | "success" | "warning" | "danger" | "onAccent";

export type TxtProps = TextProps & {
  variant?: TypeVariant;
  tone?: TextTone;
  align?: "left" | "center" | "right";
  italic?: boolean;
  /** Tabular figures for numbers that sit in columns. Number variants get them by default. */
  tabular?: boolean;
};

export function Txt({ variant = "bodyM", tone = "primary", align, italic, tabular, style, ...rest }: TxtProps) {
  const { colors, type } = useTheme();
  const toneColor: Record<TextTone, string> = {
    primary: colors.text.primary,
    secondary: colors.text.secondary,
    tertiary: colors.text.tertiary,
    inverse: colors.text.inverse,
    ember: colors.accent.ember,
    sage: colors.fuel.sage,
    gold: colors.pr.gold,
    success: colors.status.success,
    warning: colors.status.warning,
    danger: colors.status.danger,
    onAccent: colors.accent.on,
  };
  const base = type[variant];
  return (
    <Text
      {...rest}
      style={[
        base,
        { color: toneColor[tone], textAlign: align },
        italic ? { fontFamily: fontFamily.italic } : null,
        tabular || variant.startsWith("number") ? { fontVariant: ["tabular-nums"] } : null,
        style,
      ]}
    />
  );
}
