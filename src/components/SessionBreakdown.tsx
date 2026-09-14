import { View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import type { SetType } from "@/db/types";
import { Row } from "./ui/Screen";
import { Txt } from "./ui/Text";
import { Icon } from "./ui/Icon";
import { Divider } from "./ui/Card";

export type BreakdownSet = { kg: number; reps: number; type?: SetType; done?: boolean };
export type BreakdownExercise = { name: string; note?: string; superset?: boolean; sets: BreakdownSet[] };

const typeWord = (t?: SetType) => (t === "warmup" ? "warm-up" : t === "drop" ? "drop set" : t === "failure" ? "to failure" : "");

/**
 * What a session contained, one line per set. The exercise name sits on
 * its own row; under it every completed set reads "1   100 kg × 5", so
 * changing weights are visible at a glance. No bullets, no separators
 * between sets: the column alignment does the work.
 */
export function SessionBreakdown({ exercises }: { exercises: BreakdownExercise[] }) {
  const { colors } = useTheme();
  return (
    <View>
      {exercises.map((e, i) => {
        const done = e.sets.filter((s) => s.done !== false);
        let working = 0;
        return (
          <View key={`${e.name}-${i}`}>
            {i > 0 ? <Divider /> : null}
            <View style={{ paddingVertical: 12, gap: 6 }}>
              <Row gap={8}>
                <Txt variant="labelL" style={{ flex: 1 }}>
                  {e.name}
                </Txt>
                {e.superset ? <Icon name="link" size={14} color={colors.text.tertiary} strokeWidth={2} /> : null}
                <Txt variant="labelS" tone="tertiary">
                  {done.length} set{done.length === 1 ? "" : "s"}
                </Txt>
              </Row>
              {done.length === 0 ? (
                <Txt variant="bodyS" tone="tertiary">
                  Skipped
                </Txt>
              ) : (
                done.map((s, k) => {
                  if (!s.type || s.type === "working") working++;
                  const label = s.type === "warmup" ? "W" : s.type === "drop" ? "D" : s.type === "failure" ? "F" : String(working);
                  return (
                    <Row key={k} gap={12} style={{ paddingVertical: 2 }}>
                      <Txt variant="labelM" tone={s.type === "warmup" ? "tertiary" : "secondary"} tabular style={{ width: 22 }}>
                        {label}
                      </Txt>
                      <Txt variant="numberM" tabular style={{ flex: 1 }}>
                        {s.kg ? `${s.kg} kg × ${s.reps}` : `${s.reps} reps`}
                      </Txt>
                      {typeWord(s.type) ? (
                        <Txt variant="labelS" tone="tertiary">
                          {typeWord(s.type)}
                        </Txt>
                      ) : null}
                    </Row>
                  );
                })
              )}
              {e.note ? (
                <Txt variant="bodyS" tone="tertiary" italic>
                  {e.note}
                </Txt>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}
