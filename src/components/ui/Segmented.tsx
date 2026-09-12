import { Pressable, View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { Txt } from "./Text";
import { Icon, type IconName } from "./Icon";

/**
 * Two kinds of segmented control share one shape:
 *   filters (range, feed) use the inverse pill;
 *   mode switches (Gym | Food) give each mode its own colour, so the switch
 *   reads as "which world am I in", not "which filter is on".
 */
export type Segment = { key: string; label: string; icon?: IconName; color?: "ember" | "sage" };

export function Segmented({ segments, value, onChange, size = "L" }: { segments: Segment[]; value: string; onChange: (key: string) => void; size?: "L" | "M" }) {
  const { colors, radius } = useTheme();
  return (
    <View style={{ flexDirection: "row", padding: 4, gap: 4, backgroundColor: colors.bg.surface, borderRadius: radius.pill }}>
      {segments.map((s) => {
        const on = s.key === value;
        const bg = !on ? "transparent" : s.color === "ember" ? colors.accent.ember : s.color === "sage" ? colors.fuel.sage : colors.bg.inverse;
        const fg = !on ? colors.text.secondary : s.color ? colors.accent.on : colors.text.inverse;
        return (
          <Pressable
            key={s.key}
            onPress={() => onChange(s.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            style={{ flex: 1, flexDirection: "row", gap: 7, alignItems: "center", justifyContent: "center", paddingVertical: size === "L" ? 10 : 8, borderRadius: radius.pill, backgroundColor: bg }}
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
