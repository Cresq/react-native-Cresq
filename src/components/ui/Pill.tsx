import { useTheme } from "@/theme/ThemeProvider";
import { Press } from "./Press";
import { Txt } from "./Text";

/**
 * The small round-ended button used inside bars and strips, where a full
 * Button would be too tall: the rest controls, and anything else that sits
 * beside a figure. One height, one shape, and it answers on touch-down like
 * every other control in the app.
 */
export function Pill({ label, onPress, tone = "surface", accessibilityLabel }: { label: string; onPress: () => void; tone?: "surface" | "accent"; accessibilityLabel?: string }) {
  const { colors, radius } = useTheme();
  const accent = tone === "accent";
  return (
    <Press
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      scaleTo={0.94}
      onPress={onPress}
      style={({ pressed }) => ({ paddingHorizontal: 12, height: 36, alignItems: "center", justifyContent: "center", borderRadius: radius.pill, backgroundColor: pressed ? (accent ? colors.accent.pressed : colors.border.strong) : accent ? colors.accent.ember : colors.bg.surface })}
    >
      <Txt variant="buttonM" style={{ color: accent ? colors.accent.on : colors.text.primary }}>
        {label}
      </Txt>
    </Press>
  );
}
