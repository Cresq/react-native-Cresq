import { useMemo, useState } from "react";
import { Pressable, Share, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTheme } from "@/theme/ThemeProvider";
import { useDb } from "@/db/DbProvider";
import { exerciseHistory, fmtKg, forecast, liftTrend, shortDate } from "@/db/derive";
import { Screen, Row, Header } from "@/components/ui/Screen";
import { Txt } from "@/components/ui/Text";
import { IconButton } from "@/components/ui/IconButton";
import { Card, Divider } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { Segmented } from "@/components/ui/Segmented";
import { Tabs } from "@/components/ui/Tabs";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { LineChart } from "@/components/LineChart";
import { useT } from "@/i18n";

const RANGES: Record<string, number> = { "1m": 30, "3m": 91, "6m": 182, "1y": 365, all: 100000 };

/**
 * One exercise. The number is the hero everyone shares; below it three
 * chapters: the trend with its forecast, the records, and every session.
 */
export default function LiftDetail() {
  const { colors } = useTheme();
  const router = useRouter();
  const t = useT();
  const { db } = useDb();
  const { lift: id } = useLocalSearchParams<{ lift: string }>();
  const exercise = db.exercises.find((e) => e.id === id) ?? db.exercises[0];
  const [range, setRange] = useState("3m");
  const [tab, setTab] = useState("trend");
  const [how, setHow] = useState(false);

  const all = useMemo(() => liftTrend(db.sessions, exercise.id), [db.sessions, exercise.id]);
  const since = Date.now() - RANGES[range] * 86400000;
  const points = all.filter((p) => p.date >= since);
  const shown = points.length >= 2 ? points : all;
  const fc = useMemo(() => forecast(all), [all]);
  const history = useMemo(() => exerciseHistory(db.sessions, exercise.id), [db.sessions, exercise.id]);
  const current = all.length ? all[all.length - 1].value : 0;
  const first = shown.length ? shown[0].value : current;
  const delta = Math.round((current - first) * 2) / 2;
  const weeks = shown.length ? Math.max(1, Math.round((shown[shown.length - 1].date - shown[0].date) / (7 * 86400000))) : 0;
  const bestRecords = useMemo(() => {
    const out: { kg: number; reps: number; date: number }[] = [];
    let best = 0;
    for (const h of [...history].reverse()) if (h.top && h.top.kg > best) { best = h.top.kg; out.push({ kg: h.top.kg, reps: h.top.reps, date: h.date }); }
    return out.reverse();
  }, [history]);

  return (
    <Screen>
      <Header left={<IconButton name="chevronLeft" onPress={() => router.back()} accessibilityLabel={t("Back")} />} title={exercise.name} subtitle={`${exercise.muscles}, ${exercise.equipment}`} right={<IconButton name="share" onPress={() => Share.share({ message: `${exercise.name}: ${t("Estimated 1RM")} ${current} kg, ${delta >= 0 ? "+" : ""}${delta} kg. CresQ.` })} accessibilityLabel={t("Share")} />} />

      {all.length === 0 ? (
        <View style={{ gap: 8, paddingTop: 8 }}>
          <Txt variant="displayL">{t("No sessions yet")}</Txt>
          <Txt variant="bodyM" tone="secondary">
            {t("Log {name} in a session and the trend, records and forecast appear here.", { name: exercise.name.toLowerCase() })}
          </Txt>
        </View>
      ) : (
        <>
          <View style={{ gap: 4, paddingTop: 8 }}>
            <Txt variant="labelM" tone="tertiary">
              {t("Estimated one-rep max")}
            </Txt>
            <Row gap={8} align="baseline">
              <Txt variant="numberXL" tabular>
                {current}
              </Txt>
              <Txt variant="displayS" tone="secondary">
                kg
              </Txt>
            </Row>
            <Row gap={8}>
              <Icon name="trendingUp" size={13} color={delta >= 0 ? colors.accent.ember : colors.status.warning} strokeWidth={2.2} />
              <Txt variant="labelM" tone={delta >= 0 ? "ember" : "warning"}>
                {delta >= 0 ? "+" : ""}
                {delta} kg
              </Txt>
              <Txt variant="bodyS" tone="secondary">
                {t(weeks === 1 ? "over {n} sessions in {w} week" : "over {n} sessions in {w} weeks", { n: shown.length, w: weeks })}
              </Txt>
            </Row>
          </View>

          <View style={{ gap: 16 }}>
            <Tabs
              value={tab}
              onChange={setTab}
              tabs={[
                { key: "trend", label: t("Trend") },
                { key: "records", label: t("Records"), count: bestRecords.length },
                { key: "history", label: t("History"), count: history.length },
              ]}
            />

            {tab === "trend" ? (
              <View style={{ gap: 20 }}>
                <View style={{ gap: 12 }}>
                  <Segmented size="M" value={range} onChange={setRange} segments={[{ key: "1m", label: "1M" }, { key: "3m", label: "3M" }, { key: "6m", label: "6M" }, { key: "1y", label: "1Y" }, { key: "all", label: "All" }]} />
                  <Card padding={20} gap={12}>
                    <Row gap={12}>
                      <Legend color={colors.accent.ember} label={t("Estimated 1RM")} />
                      <Legend color={colors.pr.gold} label={t("Record")} />
                      {fc ? <Legend color={colors.fuel.sage} label={t("Forecast")} /> : null}
                    </Row>
                    <LineChart points={shown} forecast={fc?.values} target={fc?.target} height={170} labels={[shortDate(shown[0].date), "", "", t("Now"), fc ? `${fc.target} kg` : ""]} scrubLabels={shown.map((p) => shortDate(p.date))} />
                  </Card>
                </View>

                <Row gap={12} align="flex-start">
                  <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: colors.bg.surface, alignItems: "center", justifyContent: "center" }}>
                    <Icon name="sun" size={18} color={colors.pr.gold} strokeWidth={2} />
                  </View>
                  <View style={{ flex: 1, gap: 8 }}>
                    {fc && fc.weeksToTarget ? (
                      <>
                        <Txt variant="displayS">{t("{kg} kg is close", { kg: fc.target })}</Txt>
                        <Txt variant="bodyM" tone="secondary">
                          {t(fc.weeksToTarget === 1 ? "Your estimated max has risen about {kg} kg a week over the last {n} sessions. Keep the same frequency and you are likely to reach {target} kg in about {w} week." : "Your estimated max has risen about {kg} kg a week over the last {n} sessions. Keep the same frequency and you are likely to reach {target} kg in about {w} weeks.", { kg: Math.round(fc.slopePerWeek * 10) / 10, n: Math.min(6, all.length), target: fc.target, w: fc.weeksToTarget })}
                        </Txt>
                      </>
                    ) : (
                      <>
                        <Txt variant="displayS">{t("Holding steady")}</Txt>
                        <Txt variant="bodyM" tone="secondary">
                          {all.length < 3 ? t("Three sessions are needed before a forecast is worth showing.") : t("The last sessions moved less than a kilo a week. A small jump in weight or an extra rep on the top set is usually enough to get the line moving.")}
                        </Txt>
                      </>
                    )}
                    <Pressable accessibilityRole="button" hitSlop={8} onPress={() => setHow(true)}>
                      <Row gap={4}>
                        <Txt variant="labelM" tone="secondary">
                          {t("How this is calculated")}
                        </Txt>
                        <Icon name="chevronRight" size={14} color={colors.text.secondary} strokeWidth={2} />
                      </Row>
                    </Pressable>
                  </View>
                </Row>
              </View>
            ) : null}

            {tab === "records" ? (
              <View>
                {bestRecords.map((r, i) => (
                  <View key={r.date}>
                    {i > 0 ? <Divider /> : null}
                    <Row gap={12} style={{ paddingVertical: 12 }}>
                      <Icon name="trophy" size={20} color={i === 0 ? colors.pr.gold : colors.text.tertiary} strokeWidth={1.9} />
                      <View style={{ flex: 1, gap: 1 }}>
                        <Row gap={8} align="baseline">
                          <Txt variant="numberM" tabular>
                            {r.kg} kg
                          </Txt>
                          <Txt variant="labelS" tone="secondary">
                            × {r.reps}
                          </Txt>
                        </Row>
                        <Txt variant="bodyS" tone="tertiary">
                          {i === 0 ? t("Current record, {date}", { date: shortDate(r.date) }) : shortDate(r.date)}
                        </Txt>
                      </View>
                    </Row>
                  </View>
                ))}
                {bestRecords.length === 0 ? (
                  <Txt variant="bodyS" tone="tertiary">
                    {t("No weighted sets logged yet.")}
                  </Txt>
                ) : null}
              </View>
            ) : null}

            {tab === "history" ? (
              <View>
                {history.map((h, i) => (
                  <View key={h.sessionId}>
                    {i > 0 ? <Divider /> : null}
                    <Row gap={12} style={{ paddingVertical: 12 }}>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Txt variant="labelL">{h.top ? `${h.top.kg ? `${h.top.kg} kg × ` : ""}${h.top.reps}` : t("no working sets")}</Txt>
                        <Txt variant="bodyS" tone="tertiary">
                          {shortDate(h.date)}, {h.planName}, {t("{n} sets", { n: h.sets })}, {fmtKg(h.volume)} kg
                        </Txt>
                      </View>
                    </Row>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        </>
      )}

      <BottomSheet visible={how} onClose={() => setHow(false)} title={t("How this is calculated")} subtitle={t("Two simple formulas, nothing hidden.")}>
        <View style={{ paddingHorizontal: 8, paddingVertical: 8, gap: 12 }}>
          <View style={{ gap: 4 }}>
            <Txt variant="labelL">{t("Estimated one-rep max")}</Txt>
            <Txt variant="bodyM" tone="secondary">
              {t("Your best working set of the session, weight × (1 + reps ÷ 30). This is the Epley formula. A set of 100 kg × 5 counts as about 117 kg.")}
            </Txt>
          </View>
          <View style={{ gap: 4 }}>
            <Txt variant="labelL">{t("Forecast")}</Txt>
            <Txt variant="bodyM" tone="secondary">
              {t("A straight line through your last six sessions. The next record is the next 5 kg step above your current estimate; the weeks are how long the line takes to get there at the same pace. It is a projection, not a promise.")}
            </Txt>
          </View>
          <Button label={t("Got it")} variant="secondary" size="M" onPress={() => setHow(false)} />
        </View>
      </BottomSheet>
    </Screen>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <Row gap={8}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
      <Txt variant="labelS" tone="tertiary">
        {label}
      </Txt>
    </Row>
  );
}
