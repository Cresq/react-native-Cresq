import { View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { Txt } from "./Text";

/** Thin progress line with a quiet label. The fill is the only accent on the screen it sits on. */
export function ProgressBar({ value, label, right }: { value: number; label?: string; right?: string }) {
  const { colors } = useTheme();
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View style={{ gap: 8, paddingBottom: 8 }}>
      {label ? (
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Txt variant="labelS" tone="tertiary">
            {label}
          </Txt>
          {right ? (
            <Txt variant="labelS" tone="secondary" tabular>
              {right}
            </Txt>
          ) : null}
        </View>
      ) : null}
      <View style={{ height: 3, borderRadius: 2, backgroundColor: colors.bg.raised, overflow: "hidden" }}>
        <View style={{ width: `${pct * 100}%`, height: 3, borderRadius: 2, backgroundColor: colors.accent.ember }} />
      </View>
    </View>
  );
}
