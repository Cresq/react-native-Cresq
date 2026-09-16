import { useState } from "react";
import { View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import type { SetType } from "@/db/types";
import { useT, usePlural } from "@/i18n";
import { SUPERSET_INK, supersetColor } from "@/superset";
import { Row } from "./ui/Screen";
import { Txt } from "./ui/Text";
import { Icon } from "./ui/Icon";
import { Card } from "./ui/Card";
import { ExerciseMark, findExercise } from "./ExerciseMark";
import { MoveViewer } from "./MoveViewer";

export type BreakdownSet = { kg: number; reps: number; type?: SetType; done?: boolean };
export type BreakdownExercise = {
  exerciseId?: string;
  name: string;
  note?: string;
  /** The group letter this exercise was paired under, if it was part of a superset. */
  supersetGroup?: string;
  sets: BreakdownSet[];
};

/** A superset is one block; a loose exercise is a block of one. Same shape the workout had. */
function blocks(exercises: BreakdownExercise[]) {
  const out: BreakdownExercise[][] = [];
  for (const e of exercises) {
    const last = out[out.length - 1];
    if (e.supersetGroup && last && last[0].supersetGroup === e.supersetGroup) last.push(e);
    else out.push([e]);
  }
  return out;
}

/**
 * What a session contained. One card per exercise, grouped the way it was
 * trained: exercises that were supersetted sit under one band in the colour
 * they had on the day, so the pairing is visible here and not only while
 * you were doing it.
 *
 * Every set carries a thin bar of its weight against the heaviest of that
 * exercise. That is the whole reason to read this screen rather than the
 * figures at the top: you can see the ramp, the back-off, the drop set,
 * without reading a single number.
 */
export function SessionBreakdown({ exercises }: { exercises: BreakdownExercise[] }) {
  const { colors } = useTheme();
  const t = useT();
  const plural = usePlural();
  const typeWord = (ty?: SetType) => (ty === "warmup" ? t("warm-up") : ty === "drop" ? t("drop set") : ty === "failure" ? t("to failure") : "");
  const [watching, setWatching] = useState<{ exerciseId?: string; name: string } | null>(null);

  return (
    <View style={{ gap: 12 }}>
      {blocks(exercises).map((group, gi) => {
        const hue = supersetColor(group[0].supersetGroup);
        return (
          <View key={`${group[0].name}-${gi}`} style={{ gap: 8 }}>
            {group.map((e, i) => {
              const done = e.sets.filter((s) => s.done !== false);
              // Bodyweight work has no weight to scale, so the reps carry the bar instead.
              const heaviest = Math.max(...done.map((s) => s.kg), 0);
              const mostReps = Math.max(...done.map((s) => s.reps), 0);
              let working = 0;
              return (
                <Card key={`${e.name}-${i}`} padding={14} gap={10}>
                  <Row gap={10} align="center">
                    <ExerciseMark exerciseId={e.exerciseId} name={e.name} size={38} onPress={() => setWatching({ exerciseId: e.exerciseId, name: e.name })} />
                    <View style={{ flex: 1, gap: 3 }}>
                      <Txt variant="labelL" numberOfLines={2}>
                        {e.name}
                      </Txt>
                      {/* Afterwards there is room for the word, and the word is clearer than a badge. */}
                      {hue ? (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: hue }}>
                          <Icon name="link" size={11} color={SUPERSET_INK} strokeWidth={2.2} />
                          <Txt variant="labelS" style={{ color: SUPERSET_INK }}>
                            {t("Superset")}
                          </Txt>
                        </View>
                      ) : null}
                    </View>
                    <Txt variant="labelS" tone="tertiary">
                      {plural(done.length, "{n} set", "{n} sets")}
                    </Txt>
                  </Row>

                  {done.length === 0 ? (
                    <Txt variant="bodyS" tone="tertiary" style={{ paddingLeft: 40 }}>
                      {t("Skipped")}
                    </Txt>
                  ) : (
                    <View style={{ gap: 6 }}>
                      {done.map((s, k) => {
                        if (!s.type || s.type === "working") working++;
                        const warm = s.type === "warmup";
                        const label = warm ? "W" : s.type === "drop" ? "D" : s.type === "failure" ? "F" : String(working);
                        const share = heaviest > 0 ? s.kg / heaviest : mostReps > 0 ? s.reps / mostReps : 1;
                        const top = !warm && heaviest > 0 && s.kg === heaviest;
                        return (
                          <Row key={k} gap={10} align="center">
                            <Txt variant="labelS" tone="tertiary" tabular style={{ width: 14 }}>
                              {label}
                            </Txt>
                            {/* The figures stay at reading size. This is a page you scan, not a scoreboard. */}
                            <Txt variant="labelL" tabular tone={warm ? "tertiary" : "primary"} style={{ width: 104 }} numberOfLines={1}>
                              {s.kg ? `${s.kg} kg × ${s.reps}` : t("{n} reps", { n: s.reps })}
                            </Txt>
                            <View style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: colors.border.subtle, overflow: "hidden" }}>
                              <View
                                style={{
                                  width: `${Math.max(6, Math.round(share * 100))}%`,
                                  height: "100%",
                                  borderRadius: 2,
                                  backgroundColor: warm ? colors.text.tertiary : colors.accent.ember,
                                  opacity: warm ? 0.5 : top ? 0.75 : 0.4,
                                }}
                              />
                            </View>
                            {typeWord(s.type) ? (
                              <Txt variant="labelS" tone="tertiary">
                                {typeWord(s.type)}
                              </Txt>
                            ) : null}
                          </Row>
                        );
                      })}
                    </View>
                  )}

                  {e.note ? (
                    <Txt variant="bodyS" tone="tertiary" italic>
                      {e.note}
                    </Txt>
                  ) : null}
                </Card>
              );
            })}
          </View>
        );
      })}

      <MoveViewer exercise={watching ? findExercise(watching.exerciseId, watching.name) ?? null : null} onClose={() => setWatching(null)} />
    </View>
  );
}
