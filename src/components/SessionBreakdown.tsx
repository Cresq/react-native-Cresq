import { View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import type { SetType } from "@/db/types";
import { useT } from "@/i18n";
import { Row } from "./ui/Screen";
import { Txt } from "./ui/Text";
import { Icon } from "./ui/Icon";
import { Divider } from "./ui/Card";
import { ExerciseMark } from "./ExerciseMark";

export type BreakdownSet = { kg: number; reps: number; type?: SetType; done?: boolean };
export type BreakdownExercise = { exerciseId?: string; name: string; note?: string; superset?: boolean; sets: BreakdownSet[] };

/**
 * What a session contained, one line per set. The exercise name sits on
 * its own row; under it every completed set reads "1   100 kg × 5", so
 * changing weights are visible at a glance. No bullets, no separators
 * between sets: the column alignment does the work.
 */
export function SessionBreakdown({ exercises }: { exercises: BreakdownExercise[] }) {
  const { colors } = useTheme();
  const t = useT();
  const typeWord = (ty?: SetType) => (ty === "warmup" ? t("warm-up") : ty === "drop" ? t("drop set") : ty === "failure" ? t("to failure") : "");
  return (
    <View>
      {exercises.map((e, i) => {
        const done = e.sets.filter((s) => s.done !== false);
        let working = 0;
        return (
          <View key={`${e.name}-${i}`}>
            {i > 0 ? <Divider /> : null}
            <View style={{ paddingVertical: 12, gap: 8 }}>
              <Row gap={10} align="center">
                <ExerciseMark exerciseId={e.exerciseId} name={e.name} size={30} />
                <Txt variant="labelL" style={{ flex: 1 }}>
                  {e.name}
                </Txt>
                {e.superset ? <Icon name="link" size={14} color={colors.text.tertiary} strokeWidth={2} /> : null}
                <Txt variant="labelS" tone="tertiary">
                  {t(done.length === 1 ? "{n} set" : "{n} sets", { n: done.length })}
                </Txt>
              </Row>
              {done.length === 0 ? (
                <Txt variant="bodyS" tone="tertiary">
                  {t("Skipped")}
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
                        {s.kg ? `${s.kg} kg × ${s.reps}` : t("{n} reps", { n: s.reps })}
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
