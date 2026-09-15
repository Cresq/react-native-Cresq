import { useState } from "react";
import { View, type LayoutChangeEvent } from "react-native";
import Svg, { Circle, Line, Path } from "react-native-svg";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { useTheme } from "@/theme/ThemeProvider";
import { useT } from "@/i18n";
import { haptic } from "@/haptics";
import { springs } from "@/motion";
import { Txt } from "./ui/Text";

export type ChartPoint = { value: number; record?: boolean };

/**
 * The app's one chart language: faint grid, ember line with a soft fill,
 * gold rings on records, a halo on the last point, optional sage dashed forecast.
 * Put a finger on it and a marker follows, snapping to the nearest session
 * with a light tick; the value and its date read above the finger.
 */
export function LineChart({ points, forecast, height = 96, labels, target, scrubLabels, unit = "kg", onScrub, onPress }: { points: ChartPoint[]; forecast?: number[]; height?: number; labels?: string[]; target?: number; /** One label per point, shown while scrubbing (usually the date). */ scrubLabels?: string[]; unit?: string; /** Fires true when a scrub starts and false when it ends, so a parent Pressable can ignore the release. */ onScrub?: (active: boolean) => void; /** A quick tap, and only that: a scrub never counts as one. */ onPress?: () => void }) {
  const { colors } = useTheme();
  const t = useT();
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const all = [...points.map((p) => p.value), ...(forecast ?? []), ...(target ? [target] : [])];
  const min = Math.min(...all);
  const max = Math.max(...all);
  const pad = 8;
  const span = max - min || 1;
  const total = points.length + (forecast?.length ?? 0);
  const x = (i: number) => (total <= 1 ? 0 : (i / (total - 1)) * width);
  const y = (v: number) => pad + (1 - (v - min) / span) * (height - pad * 2);

  const smooth = (xs: number[], ys: number[]) => {
    if (xs.length < 2) return "";
    let d = `M${xs[0]} ${ys[0]}`;
    for (let i = 1; i < xs.length; i++) {
      const cx = (xs[i - 1] + xs[i]) / 2;
      d += ` C${cx} ${ys[i - 1]},${cx} ${ys[i]},${xs[i]} ${ys[i]}`;
    }
    return d;
  };

  const xs = points.map((_, i) => x(i));
  const ys = points.map((p) => y(p.value));
  const line = smooth(xs, ys);
  const area = line ? `${line} L${xs[xs.length - 1]} ${height} L${xs[0]} ${height} Z` : "";
  const fxs = forecast ? forecast.map((_, i) => x(points.length - 1 + i + 1)) : [];
  const fys = forecast ? forecast.map((v) => y(v)) : [];
  const fline = forecast && forecast.length ? smooth([xs[xs.length - 1], ...fxs], [ys[ys.length - 1], ...fys]) : "";

  // Scrubbing: the marker's x and y live on the UI thread; the label text is React state.
  const mx = useSharedValue(0);
  const my = useSharedValue(0);
  const shown = useSharedValue(0);
  const lastIndex = useSharedValue(-1);
  const step = points.length > 1 ? width / (points.length - 1) : width;
  const pick = (fingerX: number) => {
    "worklet";
    const i = Math.max(0, Math.min(points.length - 1, Math.round(fingerX / Math.max(1, step))));
    mx.value = withSpring(xs[i], springs.snappy);
    my.value = withSpring(ys[i], springs.snappy);
    if (lastIndex.value !== i) {
      lastIndex.value = i;
      runOnJS(setActive)(i);
      runOnJS(haptic)("select");
    }
  };
  const notify = (on: boolean) => onScrub?.(on);
  const release = () => {
    "worklet";
    shown.value = withTiming(0, { duration: 160 });
    lastIndex.value = -1;
    runOnJS(setActive)(null);
    runOnJS(notify)(false);
  };
  // Two ways in, one behaviour: rest the finger 160 ms, or swipe sideways. A plain tap does
  // neither, so a card around the chart still opens on tap and stays put after a scrub.
  const begin = (e: { x: number }) => {
    "worklet";
    shown.value = withTiming(1, { duration: 120 });
    runOnJS(notify)(true);
    pick(e.x);
  };
  const hold = Gesture.Pan().activateAfterLongPress(160).onStart(begin).onUpdate((e) => pick(e.x)).onFinalize(release);
  const swipe = Gesture.Pan().activeOffsetX([-10, 10]).failOffsetY([-12, 12]).onStart(begin).onUpdate((e) => pick(e.x)).onFinalize(release);
  const fire = () => onPress?.();
  const tap = Gesture.Tap().maxDuration(220).onEnd((_e, ok) => {
    if (ok) runOnJS(fire)();
  });
  const pan = Gesture.Exclusive(Gesture.Race(hold, swipe), tap);
  const markerStyle = useAnimatedStyle(() => ({ opacity: shown.value, transform: [{ translateX: mx.value }] }));
  const dotStyle = useAnimatedStyle(() => ({ opacity: shown.value, transform: [{ translateX: mx.value - 7 }, { translateY: my.value - 7 }] }));
  const value = active !== null ? points[active]?.value : null;
  const scrubLabel = active !== null ? scrubLabels?.[active] : undefined;

  return (
    <View style={{ gap: 8 }}>
      <View style={{ height: 22, justifyContent: "flex-end" }}>
        {active !== null ? (
          <Animated.View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
            <Txt variant="numberM" tabular>
              {value}
            </Txt>
            <Txt variant="labelS" tone="secondary">
              {unit}
            </Txt>
            {scrubLabel ? (
              <Txt variant="labelS" tone="tertiary">
                {scrubLabel}
              </Txt>
            ) : null}
            {points[active]?.record ? (
              <Txt variant="labelS" style={{ color: colors.pr.gold }}>
                record
              </Txt>
            ) : null}
          </Animated.View>
        ) : (
          <Txt variant="labelS" tone="tertiary">
            {points.length > 1 && height >= 140 ? t("Touch the line to read a session") : ""}
          </Txt>
        )}
      </View>
      <View onLayout={onLayout} style={{ height }}>
      <GestureDetector gesture={pan}>
        <Animated.View style={{ height }}>
          {width > 0 ? (
            <Svg width={width} height={height}>
              {[0.2, 0.5, 0.8].map((f) => (
                <Line key={f} x1={0} x2={width} y1={height * f} y2={height * f} stroke={colors.border.subtle} strokeWidth={1} />
              ))}
              {target ? <Line x1={0} x2={width} y1={y(target)} y2={y(target)} stroke={colors.pr.gold} strokeWidth={1} strokeDasharray="3 4" opacity={0.7} /> : null}
              <Path d={area} fill={colors.accent.ember} opacity={0.07} />
              <Path d={line} stroke={colors.accent.ember} strokeWidth={2} fill="none" strokeLinecap="round" />
              {fline ? <Path d={fline} stroke={colors.fuel.sage} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeDasharray="5 6" /> : null}
              {points.map((p, i) => (p.record ? <Circle key={i} cx={xs[i]} cy={ys[i]} r={4} fill={colors.bg.surface} stroke={colors.pr.gold} strokeWidth={2} /> : null))}
              <Circle cx={xs[xs.length - 1]} cy={ys[ys.length - 1]} r={6} fill={colors.accent.ember} opacity={0.25} />
              <Circle cx={xs[xs.length - 1]} cy={ys[ys.length - 1]} r={3.5} fill={colors.accent.ember} />
              {fline ? <Circle cx={fxs[fxs.length - 1]} cy={fys[fys.length - 1]} r={6} fill={colors.bg.surface} stroke={colors.pr.gold} strokeWidth={2} /> : null}
            </Svg>
          ) : null}
          {width > 0 && points.length > 1 ? (
            <>
              <Animated.View pointerEvents="none" style={[{ position: "absolute", top: 0, bottom: 0, left: 0, width: 1, backgroundColor: colors.text.secondary }, markerStyle]} />
              <Animated.View pointerEvents="none" style={[{ position: "absolute", top: 0, left: 0, width: 14, height: 14, borderRadius: 7, backgroundColor: colors.text.primary, borderWidth: 3, borderColor: colors.accent.ember }, dotStyle]} />
            </>
          ) : null}
        </Animated.View>
      </GestureDetector>
      </View>
      {labels ? (
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          {labels.map((l, i) => (
            <Txt key={i} variant="labelS" tone={i === labels.length - 1 ? "secondary" : "tertiary"}>
              {l}
            </Txt>
          ))}
        </View>
      ) : null}
    </View>
  );
}
