import { useMemo, useState } from "react";
import { View } from "react-native";
import { useNav } from "@/nav";
import { useTheme } from "@/theme/ThemeProvider";
import { useDb } from "@/db/DbProvider";
import { useNow } from "@/clock";
import { MUSCLE_GROUPS, MUSCLE_NL, MUSCLE_SHORT, fmtKg, muscleLoad } from "@/db/derive";
import { useLanguage, useT } from "@/i18n";
import { Screen, Row, Header } from "@/components/ui/Screen";
import { Txt } from "@/components/ui/Text";
import { IconButton } from "@/components/ui/IconButton";
import { Icon } from "@/components/ui/Icon";
import { Card, Divider } from "@/components/ui/Card";
import { Segmented } from "@/components/ui/Segmented";
import { RadarChart } from "@/components/RadarChart";

/**
 * What each muscle group actually got. Sets lead, because that is what people
 * plan by; the bar is that group's share of the hardest-worked one, and the
 * arrow compares the window with the same length of time before it.
 */
export default function Muscles() {
  const { colors } = useTheme();
  const router = useNav();
  const t = useT();
  const lang = useLanguage();
  const label = (g: keyof typeof MUSCLE_NL) => (lang === "nl" ? MUSCLE_NL[g] : g);
  const { db } = useDb();
  const [range, setRange] = useState("7");
  const days = Number(range);
  const now = useNow();
  const rows = useMemo(() => muscleLoad(db.sessions, db.exercises, days, now, db.activeSession), [db.sessions, db.exercises, days, db.activeSession, now]);
  const peak = Math.max(1, ...rows.map((r) => r.sets));
  const total = rows.reduce((n, r) => n + r.sets, 0);
  const untouched = rows.filter((r) => r.sets === 0);
  // The radar keeps the anatomical order, not the ranking, so the shape means something week to week.
  const radar = useMemo(() => MUSCLE_GROUPS.map((g) => ({ label: lang === "nl" ? MUSCLE_SHORT[g] : g, value: rows.find((r) => r.group === g)?.sets ?? 0 })), [rows, lang]);

  return (
    <Screen>
      <Header left={<IconButton name="chevronLeft" onPress={() => router.back("/progress")} accessibilityLabel={t("Back")} />} title={t("Muscle groups")} subtitle={total ? t("{n} working sets", { n: total }) : undefined} />

      <Segmented
        value={range}
        onChange={setRange}
        segments={[
          { key: "7", label: t("7 days") },
          { key: "28", label: t("28 days") },
        ]}
      />

      {total > 0 ? (
        <Card padding={16} gap={12}>
          <RadarChart data={radar} max={peak} />
          <Txt variant="labelS" tone="tertiary" align="center">
            {t("Each ring is a quarter of {n} sets, your hardest-worked group", { n: peak })}
          </Txt>
        </Card>
      ) : null}

      {total === 0 ? (
        <View style={{ gap: 4, paddingVertical: 8 }}>
          <Txt variant="displayM">{t("Nothing logged yet")}</Txt>
          <Txt variant="bodyM" tone="secondary">
            {t("Finish a session and the muscles it worked appear here.")}
          </Txt>
        </View>
      ) : (
        <View>
          {rows
            .filter((r) => r.sets > 0)
            .map((r, i) => {
              const delta = r.sets - r.previous;
              return (
                <View key={r.group}>
                  {i > 0 ? <Divider /> : null}
                  <View style={{ paddingVertical: 12, gap: 8 }}>
                    <Row gap={12} align="baseline">
                      <Txt variant="labelL" style={{ flex: 1 }}>
                        {label(r.group)}
                      </Txt>
                      <Row gap={4} align="baseline">
                        <Txt variant="numberM" tabular>
                          {r.sets}
                        </Txt>
                        <Txt variant="labelS" tone="secondary">
                          {t("sets")}
                        </Txt>
                      </Row>
                    </Row>
                    <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.bg.surface, overflow: "hidden" }}>
                      <View style={{ width: `${Math.max(4, (r.sets / peak) * 100)}%`, height: 6, borderRadius: 3, backgroundColor: colors.accent.ember }} />
                    </View>
                    <Row gap={8}>
                      {/* The names give way on a narrow screen; how many more there are is never the part that is cut off. */}
                      <Row gap={4} style={{ flex: 1 }}>
                        <Txt variant="labelS" tone="tertiary" style={{ flexShrink: 1 }} numberOfLines={1}>
                          {r.exercises.slice(0, 3).join(", ")}
                        </Txt>
                        {r.exercises.length > 3 ? (
                          <Txt variant="labelS" tone="tertiary">
                            {t("+{n} more", { n: r.exercises.length - 3 })}
                          </Txt>
                        ) : null}
                      </Row>
                      {r.volume ? (
                        <Txt variant="labelS" tone="tertiary" tabular>
                          {fmtKg(r.volume)} kg
                        </Txt>
                      ) : null}
                      {r.previous ? (
                        <Row gap={4}>
                          <Icon name={delta >= 0 ? "trendingUp" : "trendingDown"} size={12} color={delta >= 0 ? colors.accent.ember : colors.status.warning} strokeWidth={2.2} />
                          <Txt variant="labelS" tone={delta >= 0 ? "ember" : "danger"} tabular>
                            {delta >= 0 ? "+" : ""}
                            {delta}
                          </Txt>
                        </Row>
                      ) : null}
                    </Row>
                  </View>
                </View>
              );
            })}
        </View>
      )}

      {untouched.length > 0 && total > 0 ? (
        <View style={{ gap: 8 }}>
          <Txt variant="labelS" tone="tertiary">
            {t("Nothing for these")}
          </Txt>
          <Row gap={8} style={{ flexWrap: "wrap" }}>
            {untouched.map((r) => (
              <View key={r.group} style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, backgroundColor: colors.bg.surface }}>
                <Txt variant="labelM" tone="tertiary">
                  {label(r.group)}
                </Txt>
              </View>
            ))}
          </Row>
        </View>
      ) : null}

      <Txt variant="labelS" tone="tertiary">
        {t("A set counts for every muscle the exercise names. The kilos count once, for the first.")}
      </Txt>
    </Screen>
  );
}
