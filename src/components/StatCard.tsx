import { View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { Txt } from "./ui/Text";
import { Icon, type IconName } from "./ui/Icon";

/**
 * A figure with its label and change. Sits on the ground, no box: the number is the object.
 * Put several in a <Row> with a hairline between them.
 */
export function Stat({ label, value, unit, delta, deltaTone = "ember", deltaIcon = "trendingUp", size = "L" }: { label: string; value: string; unit?: string; delta?: string; deltaTone?: "ember" | "sage" | "success" | "warning" | "danger" | "tertiary"; deltaIcon?: IconName; size?: "L" | "M" }) {
  const { colors } = useTheme();
  const toneColor = { ember: colors.accent.ember, sage: colors.fuel.sage, success: colors.status.success, warning: colors.status.warning, danger: colors.status.danger, tertiary: colors.text.tertiary }[deltaTone];
  return (
    <View style={{ flex: 1, gap: 4 }}>
      <Txt variant="labelS" tone="tertiary">
        {label}
      </Txt>
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4 }}>
        <Txt variant={size === "L" ? "numberL" : "numberM"} tabular>
          {value}
        </Txt>
        {unit ? (
          <Txt variant="labelM" tone="secondary">
            {unit}
          </Txt>
        ) : null}
      </View>
      {delta ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Icon name={deltaIcon} size={12} color={toneColor} strokeWidth={2.2} />
          <Txt variant="labelS" style={{ color: toneColor }}>
            {delta}
          </Txt>
        </View>
      ) : null}
    </View>
  );
}

/** Vertical hairline between stats in a row. */
export function StatDivider() {
  const { colors } = useTheme();
  return <View style={{ width: 1, alignSelf: "stretch", backgroundColor: colors.border.subtle, marginHorizontal: 4 }} />;
}
