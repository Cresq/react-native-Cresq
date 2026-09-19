import { View } from "react-native";
import Svg, { Circle, Line, Polygon, Text as SvgText } from "react-native-svg";
import { useTheme } from "@/theme/ThemeProvider";
import { fontFamily } from "../../constants/theme";

export type RadarPoint = { label: string; value: number };

const SIZE = 320;
const C = SIZE / 2;
const R = 90;
const LABEL_R = R + 20;

/**
 * One shape for the whole week. Each spoke is a muscle group, its distance from
 * the centre is the sets it got, and the rings are quarters of the hardest-worked
 * group. A dent in the shape is a group you skipped.
 */
export function RadarChart({ data, max }: { data: RadarPoint[]; max: number }) {
  const { colors } = useTheme();
  const n = data.length;
  if (n < 3) return null;
  const top = Math.max(1, max);

  const at = (i: number, radius: number) => {
    const angle = (-90 + (i * 360) / n) * (Math.PI / 180);
    return [C + Math.cos(angle) * radius, C + Math.sin(angle) * radius] as const;
  };
  const shape = data.map((d, i) => at(i, (Math.max(0, d.value) / top) * R).join(",")).join(" ");
  const ring = (f: number) => data.map((_, i) => at(i, R * f).join(",")).join(" ");

  return (
    <View style={{ alignItems: "center" }}>
      <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <Polygon key={f} points={ring(f)} fill="none" stroke={colors.border.subtle} strokeWidth={1} />
        ))}
        {data.map((_, i) => {
          const [x, y] = at(i, R);
          return <Line key={i} x1={C} y1={C} x2={x} y2={y} stroke={colors.border.subtle} strokeWidth={1} />;
        })}

        <Polygon points={shape} fill={colors.accent.ember} fillOpacity={0.18} stroke={colors.accent.ember} strokeWidth={2} strokeLinejoin="round" />

        {data.map((d, i) => {
          const [x, y] = at(i, (Math.max(0, d.value) / top) * R);
          return <Circle key={i} cx={x} cy={y} r={d.value ? 3.5 : 2.5} fill={d.value ? colors.accent.ember : colors.text.tertiary} />;
        })}

        {data.map((d, i) => {
          const [x, y] = at(i, LABEL_R);
          const dx = x - C;
          const anchor = Math.abs(dx) < 6 ? "middle" : dx > 0 ? "start" : "end";
          return (
            <SvgText key={d.label} x={x} y={y + 4} fill={d.value ? colors.text.secondary : colors.text.tertiary} fontSize={11} fontFamily={fontFamily.medium} textAnchor={anchor}>
              {d.label}
            </SvgText>
          );
        })}
      </Svg>
    </View>
  );
}
