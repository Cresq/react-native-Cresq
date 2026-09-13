import { Pressable, View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { Txt } from "./ui/Text";
import { Icon } from "./ui/Icon";

export type DayState = "done" | "rest" | "missed" | "today" | "future";
export type Day = { num: string; letter: string; state: DayState; sessionId?: string };

/** Seven days. Trained days are green, today is outlined in ember, everything else is quiet. */
export function WeekStrip({ days, onPress }: { days: Day[]; onPress?: (day: Day) => void }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 }}>
      {days.map((d, i) => {
        const s = d.state;
        const bg = s === "done" ? colors.status.success : s === "today" ? colors.accent.soft : colors.bg.surface;
        return (
          <Pressable key={i} accessibilityRole={d.sessionId ? "button" : undefined} accessibilityLabel={d.sessionId ? `Session on the ${d.num}th` : undefined} disabled={!d.sessionId || !onPress} onPress={() => onPress?.(d)} style={({ pressed }) => ({ alignItems: "center", gap: 6, opacity: pressed ? 0.7 : 1 })}>
            <Txt variant="labelS" tone={s === "today" ? "primary" : "tertiary"}>
              {d.num}
            </Txt>
            <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: bg, borderWidth: s === "today" ? 2 : 0, borderColor: colors.accent.ember, alignItems: "center", justifyContent: "center" }}>
              {s === "done" ? <Icon name="check" size={18} color={colors.accent.on} strokeWidth={2.6} /> : null}
              {s === "missed" ? <Icon name="close" size={16} color={colors.text.tertiary} strokeWidth={2.2} /> : null}
              {s === "today" ? <Icon name="addPlus" size={16} color={colors.accent.ember} strokeWidth={2.4} /> : null}
              {s === "rest" ? <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.text.tertiary }} /> : null}
            </View>
            <Txt variant="labelS" tone={s === "today" ? "ember" : "tertiary"}>
              {d.letter}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}
