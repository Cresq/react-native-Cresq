import { View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { fmtG } from "@/nutrition/derive";
import type { NutritionTargets } from "@/db/types";
import { Row } from "./ui/Screen";
import { Txt } from "./ui/Text";
import { useT } from "@/i18n";

/** Three thin lines in the food colour: what was eaten against what the day asks for. */
export function MacroBars({ eaten, targets }: { eaten: { protein: number; carbs: number; fat: number }; targets: NutritionTargets }) {
  const { colors } = useTheme();
  const t = useT();
  const rows: [string, number, number][] = [
    [t("Protein"), eaten.protein, targets.protein],
    [t("Carbohydrates"), eaten.carbs, targets.carbs],
    [t("Fat"), eaten.fat, targets.fat],
  ];
  return (
    <View style={{ gap: 12 }}>
      {rows.map(([label, value, target]) => {
        const pct = Math.max(0, Math.min(1, target > 0 ? value / target : 0));
        return (
          <View key={label} style={{ gap: 6 }}>
            <Row justify="space-between">
              <Txt variant="labelS" tone="tertiary">
                {label}
              </Txt>
              <Txt variant="labelS" tone="secondary" tabular>
                {`${fmtG(value)} / ${Math.round(target)} g`}
              </Txt>
            </Row>
            <View style={{ height: 4, borderRadius: 2, backgroundColor: colors.bg.raised, overflow: "hidden" }}>
              <View style={{ width: `${pct * 100}%`, height: 4, borderRadius: 2, backgroundColor: colors.fuel.sage }} />
            </View>
          </View>
        );
      })}
    </View>
  );
}
