import { useEffect, type ReactNode } from "react";
import { View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import { useTheme } from "@/theme/ThemeProvider";
import { useT } from "@/i18n";
import { timings } from "@/motion";
import { useTween } from "@/tween";
import { fmtG } from "@/nutrition/derive";
import { macroReached } from "@/nutrition/day";
import type { NutritionTargets } from "@/db/types";
import { Txt } from "./ui/Text";
import { Icon } from "./ui/Icon";

type Eaten = { kcal: number; protein: number; carbs: number; fat: number };

/** The gap between two arcs, in points: the surface shows through, so the segments read as separate without an outline. */
const GAP = 2;

/**
 * The day as one ring. The whole circle is what the day may hold (the target
 * plus what was burned); the coloured arcs are what has been eaten, split into
 * protein, carbohydrates and fat by the energy each brought; what is left of
 * the ring is what is left of the day. Without a target there is no whole to
 * be part of, so the ring is simply how the eaten energy divides.
 *
 * When the figures change the arcs travel to their new lengths: something
 * added is seen to fill the ring, which is the point of adding it.
 *
 * The three colours are chart colours, picked and checked as a set for both
 * themes (apart under red-green colour blindness, and clear of the card they
 * sit on). Colour is never the only carrier: the order is fixed, the arcs are
 * gapped, and the legend or the bars name each one with its figure.
 */
export function MacroRing({ size, stroke = 10, eaten, budget, track, trackOpacity = 1, children }: { size: number; stroke?: number; eaten: Eaten; /** Target plus burned; absent when no target is set. */ budget?: number; /** The colour of the empty ring; the raised tone unless the card says otherwise. */ track?: string; trackOpacity?: number; children?: ReactNode }) {
  const { colors } = useTheme();
  const t = useT();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const mid = size / 2;
  // What is drawn is on its way to what is true; the label below always says what is true.
  const [protein, carbs, fat, kcal, whole] = useTween([eaten.protein * 4, eaten.carbs * 4, eaten.fat * 9, eaten.kcal, budget ?? 0]);
  const energy = [protein, carbs, fat];
  const macroKcal = protein + carbs + fat;
  // How much of the ring is filled: eaten against the budget, or all of it when there is no budget to hold it against.
  const filled = macroKcal <= 0 ? 0 : budget && whole > 0 ? Math.min(1, kcal / Math.max(whole, 1)) : 1;
  const hues = [colors.macro.protein, colors.macro.carbs, colors.macro.fat];
  const arcs: { from: number; length: number; hue: string }[] = [];
  let at = 0;
  for (let i = 0; i < 3; i++) {
    const span = macroKcal > 0 ? (energy[i] / macroKcal) * filled * c : 0;
    // A sliver thinner than the gap would vanish behind it; it keeps a point of itself instead.
    if (span > 0) arcs.push({ from: at, length: Math.max(1, span - GAP), hue: hues[i] });
    at += span;
  }
  const label = `${t("Protein")} ${fmtG(eaten.protein)} g, ${t("Carbohydrates")} ${fmtG(eaten.carbs)} g, ${t("Fat")} ${fmtG(eaten.fat)} g`;
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={label} style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ position: "absolute", top: 0, left: 0 }}>
        <Circle cx={mid} cy={mid} r={r} stroke={track ?? colors.bg.raised} strokeOpacity={trackOpacity} strokeWidth={stroke} fill="none" />
        {arcs.map((a, i) => (
          <Circle key={i} cx={mid} cy={mid} r={r} stroke={a.hue} strokeWidth={stroke} fill="none" strokeDasharray={`${a.length} ${c - a.length}`} strokeDashoffset={-a.from} transform={`rotate(-90 ${mid} ${mid})`} />
        ))}
      </Svg>
      {children}
    </View>
  );
}

/**
 * The ring's key: a dot in the arc's colour, the name, and the figure, which
 * is grams eaten, against the target when there is one. The words wear text
 * colours; only the dot carries the series colour.
 */
export function MacroLegend({ eaten, targets, short }: { eaten: Eaten; targets?: NutritionTargets; /** Narrow tiles: shorter names, no targets. */ short?: boolean }) {
  const { colors } = useTheme();
  const t = useT();
  const rows: [string, string, number, number | undefined][] = [
    [colors.macro.protein, t("Protein"), eaten.protein, targets?.protein],
    [colors.macro.carbs, short ? t("Carbs") : t("Carbohydrates"), eaten.carbs, targets?.carbs],
    [colors.macro.fat, t("Fat"), eaten.fat, targets?.fat],
  ];
  return (
    <View style={{ gap: short ? 4 : 8 }}>
      {rows.map(([hue, name, value, target]) => (
        <View key={name} style={{ flexDirection: "row", alignItems: "center", gap: short ? 6 : 8 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: hue }} />
          <Txt variant="labelS" tone="secondary" numberOfLines={1} style={{ flex: 1 }}>
            {name}
          </Txt>
          <Txt variant="labelS" tone="primary" tabular>
            {target && !short ? `${fmtG(value)} / ${Math.round(target)} g` : `${fmtG(value)} g`}
          </Txt>
        </View>
      ))}
    </View>
  );
}

/**
 * The three macros as bars that fill: the name, grams eaten against the
 * target, and under them a bar in the macro's colour, which is the same colour
 * its arc has in the ring. A small tick beside the name says the macro is
 * reached. Without targets there is nothing to fill towards, so a bar shows
 * that macro's share of what was eaten.
 */
export function MacroBars({ eaten, targets }: { eaten: Eaten; targets?: NutritionTargets }) {
  const { colors } = useTheme();
  const t = useT();
  const energy = eaten.protein * 4 + eaten.carbs * 4 + eaten.fat * 9;
  const rows: { kind: "protein" | "carbs" | "fat"; hue: string; name: string; value: number; target?: number; share: number }[] = [
    { kind: "protein", hue: colors.macro.protein, name: t("Protein"), value: eaten.protein, target: targets?.protein, share: energy ? (eaten.protein * 4) / energy : 0 },
    { kind: "carbs", hue: colors.macro.carbs, name: t("Carbohydrates"), value: eaten.carbs, target: targets?.carbs, share: energy ? (eaten.carbs * 4) / energy : 0 },
    { kind: "fat", hue: colors.macro.fat, name: t("Fat"), value: eaten.fat, target: targets?.fat, share: energy ? (eaten.fat * 9) / energy : 0 },
  ];
  return (
    <View style={{ gap: 9 }}>
      {rows.map((m) => {
        const reached = macroReached(m.kind, m.value, m.target);
        return (
          <View key={m.kind} style={{ gap: 4 }} accessible accessibilityLabel={`${m.name}, ${m.target ? `${fmtG(m.value)} / ${Math.round(m.target)} g` : `${fmtG(m.value)} g`}${reached ? `, ${t("reached")}` : ""}`}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
              <Txt variant="labelS" tone="secondary" numberOfLines={1}>
                {m.name}
              </Txt>
              {reached ? <Icon name="circleCheck" size={12} color={m.hue} strokeWidth={2.2} /> : null}
              <View style={{ flex: 1 }} />
              <Txt variant="labelS" tone="primary" tabular>
                {m.target ? `${fmtG(m.value)} / ${Math.round(m.target)} g` : `${fmtG(m.value)} g`}
              </Txt>
            </View>
            <Bar hue={m.hue} fraction={m.target ? Math.min(1, m.value / m.target) : m.share} />
          </View>
        );
      })}
    </View>
  );
}

/** One bar. The track is the macro's own colour, faint, so the bar reads as that macro even when it is empty. */
function Bar({ hue, fraction }: { hue: string; fraction: number }) {
  const { scheme } = useTheme();
  const filled = useSharedValue(fraction);
  useEffect(() => {
    filled.set(withTiming(fraction, timings.slow));
  }, [fraction, filled]);
  const fill = useAnimatedStyle(() => ({ width: `${Math.max(0, Math.min(1, filled.get())) * 100}%` }));
  return (
    <View style={{ height: 5, borderRadius: 3, overflow: "hidden" }}>
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: hue, opacity: scheme === "light" ? 0.32 : 0.2 }} />
      <Animated.View style={[{ height: 5, borderRadius: 3, backgroundColor: hue }, fill]} />
    </View>
  );
}
