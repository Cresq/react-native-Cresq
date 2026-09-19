import { useRef, useState } from "react";
import { View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { useT } from "@/i18n";
import { kcalOf } from "@/nutrition/derive";
import type { NutritionTargets } from "@/db/types";
import { SheetGroup, SheetInputRow } from "./ui/BottomSheet";

const num = (s: string) => {
  const n = Number(s.replace(",", ".").trim());
  return Number.isFinite(n) && n >= 0 ? n : 0;
};
const txt = (n: number) => (n > 0 ? String(Math.round(n)) : "");

/**
 * Four figures that are really one. Energy is what the three macros add up
 * to, four calories a gram for protein and carbohydrate, nine for fat, so
 * changing a macro moves the energy and changing the energy moves the three
 * macros in the proportion they were in. The split is remembered from the
 * last time a macro was touched, so typing a new energy figure digit by digit
 * never collapses the macros to nothing on the way.
 *
 * Drawn as two quiet groups of rows, energy on its own and the three macros
 * together, each with its name on the left and the figure on the right, so a
 * long word like "Koolhydraten" has the whole row and never breaks.
 */
export function MacroTargets({ initial, onChange, autoFocus }: { initial: NutritionTargets; onChange: (t: NutritionTargets) => void; autoFocus?: boolean }) {
  const { colors } = useTheme();
  const t = useT();
  const [kcal, setKcal] = useState(txt(initial.kcal));
  const [protein, setProtein] = useState(txt(initial.protein));
  const [carbs, setCarbs] = useState(txt(initial.carbs));
  const [fat, setFat] = useState(txt(initial.fat));
  const startKcal = kcalOf(initial.protein, initial.carbs, initial.fat);
  const split = useRef(startKcal > 0 ? { p: (initial.protein * 4) / startKcal, c: (initial.carbs * 4) / startKcal, f: (initial.fat * 9) / startKcal } : { p: 0.25, c: 0.5, f: 0.25 });

  const emit = (p: number, c: number, f: number, k: number) => onChange({ kcal: Math.round(k), protein: Math.round(p), carbs: Math.round(c), fat: Math.round(f) });

  const onMacro = (key: "p" | "c" | "f", v: string) => {
    const p = key === "p" ? num(v) : num(protein);
    const c = key === "c" ? num(v) : num(carbs);
    const f = key === "f" ? num(v) : num(fat);
    if (key === "p") setProtein(v);
    if (key === "c") setCarbs(v);
    if (key === "f") setFat(v);
    const k = kcalOf(p, c, f);
    if (k > 0) split.current = { p: (p * 4) / k, c: (c * 4) / k, f: (f * 9) / k };
    setKcal(txt(k));
    emit(p, c, f, k);
  };
  const onKcal = (v: string) => {
    setKcal(v);
    const k = num(v);
    const p = (k * split.current.p) / 4;
    const c = (k * split.current.c) / 4;
    const f = (k * split.current.f) / 9;
    setProtein(txt(p));
    setCarbs(txt(c));
    setFat(txt(f));
    emit(p, c, f, k);
  };

  const k = num(kcal);
  const pct = (part: number) => (k > 0 ? Math.round((part / k) * 100) : 0);

  return (
    <View>
      <SheetGroup>
        <SheetInputRow label={t("Energy")} unit="kcal" value={kcal} onChangeText={onKcal} placeholder="2400" keyboardType="number-pad" inputMode="numeric" autoFocus={autoFocus} />
      </SheetGroup>
      <SheetGroup
        caption={
          k > 0
            ? t("{p}% protein, {c}% carbohydrates, {f}% fat. Change a macro and the energy follows; change the energy and the three scale with it.", { p: pct(num(protein) * 4), c: pct(num(carbs) * 4), f: pct(num(fat) * 9) })
            : t("Four calories a gram of protein or carbohydrate, nine a gram of fat. The four figures stay in step with each other.")
        }
      >
        <SheetInputRow label={t("Protein")} unit="g" dot={colors.macro.protein} value={protein} onChangeText={(v) => onMacro("p", v)} placeholder="160" keyboardType="number-pad" inputMode="numeric" />
        <SheetInputRow label={t("Carbohydrates")} unit="g" dot={colors.macro.carbs} value={carbs} onChangeText={(v) => onMacro("c", v)} placeholder="260" keyboardType="number-pad" inputMode="numeric" />
        <SheetInputRow label={t("Fat")} unit="g" dot={colors.macro.fat} value={fat} onChangeText={(v) => onMacro("f", v)} placeholder="80" keyboardType="number-pad" inputMode="numeric" />
      </SheetGroup>
    </View>
  );
}
