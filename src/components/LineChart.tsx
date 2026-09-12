import { useState } from "react";
import { View, type LayoutChangeEvent } from "react-native";
import Svg, { Circle, Line, Path } from "react-native-svg";
import { useTheme } from "@/theme/ThemeProvider";
import { Txt } from "./ui/Text";

export type ChartPoint = { value: number; record?: boolean };

/**
 * The app's one chart language: faint grid, ember line with a soft fill,
 * gold rings on records, a halo on the last point, optional sage dashed forecast.
 */
export function LineChart({ points, forecast, height = 96, labels, target }: { points: ChartPoint[]; forecast?: number[]; height?: number; labels?: string[]; target?: number }) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
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

  return (
    <View style={{ gap: 8 }}>
      <View onLayout={onLayout} style={{ height }}>
        {width > 0 ? (
          <Svg width={width} height={height}>
            {[0.2, 0.5, 0.8].map((f) => (
              <Line key={f} x1={0} x2={width} y1={height * f} y2={height * f} stroke={colors.border.subtle} strokeWidth={1} />
            ))}
            {target ? <Line x1={0} x2={width} y1={y(target)} y2={y(target)} stroke={colors.pr.gold} strokeWidth={1} strokeDasharray="3 4" opacity={0.7} /> : null}
            <Path d={area} fill={colors.accent.ember} opacity={0.14} />
            <Path d={line} stroke={colors.accent.ember} strokeWidth={2.5} fill="none" strokeLinecap="round" />
            {fline ? <Path d={fline} stroke={colors.fuel.sage} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeDasharray="5 6" /> : null}
            {points.map((p, i) => (p.record ? <Circle key={i} cx={xs[i]} cy={ys[i]} r={4} fill={colors.bg.surface} stroke={colors.pr.gold} strokeWidth={2} /> : null))}
            <Circle cx={xs[xs.length - 1]} cy={ys[ys.length - 1]} r={6} fill={colors.accent.ember} opacity={0.25} />
            <Circle cx={xs[xs.length - 1]} cy={ys[ys.length - 1]} r={3.5} fill={colors.accent.ember} />
            {fline ? <Circle cx={fxs[fxs.length - 1]} cy={fys[fys.length - 1]} r={6} fill={colors.bg.surface} stroke={colors.pr.gold} strokeWidth={2} /> : null}
          </Svg>
        ) : null}
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
