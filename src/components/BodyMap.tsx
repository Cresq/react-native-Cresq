import { View } from "react-native";
import Svg, { Circle, Ellipse, Rect } from "react-native-svg";
import { useTheme } from "@/theme/ThemeProvider";
import type { MuscleGroup } from "@/db/derive";
import { Txt } from "./ui/Text";

/**
 * Two figures, front and back, with every muscle group shaded by how much work
 * it got. It is a diagram, not anatomy: clean shapes on a quiet silhouette, so
 * an empty group reads as plainly as a hard-worked one.
 */
const W = 120;
const H = 260;

/** Blend two hex colours. 0 gives `from`, 1 gives `to`. */
function mix(from: string, to: string, amount: number) {
  const pair = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [r1, g1, b1] = pair(from);
  const [r2, g2, b2] = pair(to);
  const at = (a: number, b: number) => Math.round(a + (b - a) * Math.max(0, Math.min(1, amount)));
  return `#${[at(r1, r2), at(g1, g2), at(b1, b2)].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}

export function BodyMap({ load, peak }: { load: Partial<Record<MuscleGroup, number>>; peak: number }) {
  const { colors } = useTheme();
  const quiet = colors.bg.raised;
  // A group with no work reads the same as the head or the forearms: empty.
  const tone = (group: MuscleGroup) => {
    const sets = load[group] ?? 0;
    if (!sets) return quiet;
    // Even one set should read; the rest of the scale spreads over the hardest-worked group.
    return mix(colors.accent.soft, colors.accent.ember, peak > 1 ? (sets - 1) / (peak - 1) : 1);
  };

  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: "row", justifyContent: "center", gap: 24 }}>
        <Figure label="Front" tone={tone} quiet={quiet} colors={colors} />
        <Figure label="Back" back tone={tone} quiet={quiet} colors={colors} />
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
        <Txt variant="labelS" tone="tertiary">
          0
        </Txt>
        <View style={{ flexDirection: "row", height: 6, borderRadius: 3, overflow: "hidden" }}>
          {[0, 0.25, 0.5, 0.75, 1].map((step) => (
            <View key={step} style={{ width: 22, height: 6, backgroundColor: step === 0 ? quiet : mix(colors.accent.soft, colors.accent.ember, step) }} />
          ))}
        </View>
        <Txt variant="labelS" tone="tertiary" tabular>
          {peak}
        </Txt>
      </View>
    </View>
  );
}

function Figure({ label, back, tone, quiet, colors }: { label: string; back?: boolean; tone: (g: MuscleGroup) => string; quiet: string; colors: ReturnType<typeof useTheme>["colors"] }) {
  const skin = colors.bg.raised;
  const r = 7;
  return (
    <View style={{ alignItems: "center", gap: 8 }}>
      <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {/* The parts no group claims: head, neck, forearms, feet. They hold the shape together. */}
        <Circle cx={60} cy={20} r={15} fill={skin} />
        <Rect x={52} y={33} width={16} height={10} rx={4} fill={skin} />
        <Ellipse cx={22} cy={128} rx={9} ry={26} fill={skin} />
        <Ellipse cx={98} cy={128} rx={9} ry={26} fill={skin} />

        {back ? (
          <>
            {/* Shoulders */}
            <Ellipse cx={33} cy={56} rx={14} ry={12} fill={tone("Shoulders")} />
            <Ellipse cx={87} cy={56} rx={14} ry={12} fill={tone("Shoulders")} />
            {/* Back: traps and lats as one block */}
            <Rect x={40} y={46} width={40} height={54} rx={12} fill={tone("Back")} />
            {/* Triceps */}
            <Ellipse cx={24} cy={88} rx={9} ry={22} fill={tone("Triceps")} />
            <Ellipse cx={96} cy={88} rx={9} ry={22} fill={tone("Triceps")} />
            {/* Lower back stays quiet, it is not a group we count */}
            <Rect x={46} y={102} width={28} height={22} rx={8} fill={quiet} />
            {/* Glutes */}
            <Rect x={42} y={126} width={36} height={24} rx={11} fill={tone("Glutes")} />
            {/* Hamstrings */}
            <Rect x={42} y={152} width={16} height={46} rx={r} fill={tone("Hamstrings")} />
            <Rect x={62} y={152} width={16} height={46} rx={r} fill={tone("Hamstrings")} />
            {/* Calves */}
            <Rect x={43} y={200} width={14} height={40} rx={r} fill={tone("Calves")} />
            <Rect x={63} y={200} width={14} height={40} rx={r} fill={tone("Calves")} />
          </>
        ) : (
          <>
            {/* Shoulders */}
            <Ellipse cx={33} cy={56} rx={14} ry={12} fill={tone("Shoulders")} />
            <Ellipse cx={87} cy={56} rx={14} ry={12} fill={tone("Shoulders")} />
            {/* Chest */}
            <Rect x={41} y={46} width={18} height={26} rx={8} fill={tone("Chest")} />
            <Rect x={61} y={46} width={18} height={26} rx={8} fill={tone("Chest")} />
            {/* Biceps */}
            <Ellipse cx={24} cy={88} rx={9} ry={22} fill={tone("Biceps")} />
            <Ellipse cx={96} cy={88} rx={9} ry={22} fill={tone("Biceps")} />
            {/* Core */}
            <Rect x={46} y={76} width={28} height={48} rx={10} fill={tone("Core")} />
            {/* Hips stay quiet */}
            <Rect x={42} y={126} width={36} height={22} rx={10} fill={skin} />
            {/* Quads */}
            <Rect x={42} y={150} width={16} height={50} rx={r} fill={tone("Quads")} />
            <Rect x={62} y={150} width={16} height={50} rx={r} fill={tone("Quads")} />
            {/* Shins stay quiet */}
            <Rect x={43} y={202} width={14} height={38} rx={r} fill={skin} />
            <Rect x={63} y={202} width={14} height={38} rx={r} fill={skin} />
          </>
        )}
      </Svg>
      <Txt variant="labelS" tone="tertiary">
        {label}
      </Txt>
    </View>
  );
}
