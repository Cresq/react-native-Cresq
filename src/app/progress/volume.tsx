import { View } from "react-native";
import { useMemo } from "react";
import { useRouter } from "expo-router";
import { useTheme } from "@/theme/ThemeProvider";
import { useDb } from "@/db/DbProvider";
import { fmtKg, shortDate, volumeByWeek } from "@/db/derive";
import { useT } from "@/i18n";
import { Screen, Row, Header } from "@/components/ui/Screen";
import { Txt } from "@/components/ui/Text";
import { IconButton } from "@/components/ui/IconButton";
import { Divider } from "@/components/ui/Card";

/**
 * Volume week by week. One row per week, newest first, with a bar as long as
 * that week's share of the best week, so the shape of the last three months
 * reads without a chart.
 */
export default function Volume() {
  const { colors, radius } = useTheme();
  const router = useRouter();
  const t = useT();
  const { db } = useDb();
  const weeks = useMemo(() => volumeByWeek(db.sessions, 12, Date.now(), db.activeSession), [db.sessions, db.activeSession]);
  const peak = Math.max(1, ...weeks.map((w) => w.volume));
  const trained = weeks.filter((w) => w.volume > 0);
  const average = trained.length ? trained.reduce((n, w) => n + w.volume, 0) / trained.length : 0;

  return (
    <Screen>
      <Header left={<IconButton name="chevronLeft" onPress={() => router.back()} accessibilityLabel={t("Back")} />} title={t("Volume per week")} subtitle={trained.length ? t("{n} kg a week on average", { n: fmtKg(Math.round(average)) }) : undefined} />

      <View>
        {weeks.map((w, i) => {
          const share = w.volume / peak;
          const now = i === 0;
          return (
            <View key={w.start}>
              {i > 0 ? <Divider /> : null}
              <View style={{ paddingVertical: 12, gap: 8 }}>
                <Row gap={12} align="baseline">
                  <Txt variant="labelL" tone={now ? "ember" : "primary"} style={{ flex: 1 }}>
                    {t("Week {n}", { n: w.week })}
                  </Txt>
                  <Row gap={4} align="baseline">
                    <Txt variant="numberM" tabular tone={w.volume ? "primary" : "tertiary"}>
                      {fmtKg(w.volume)}
                    </Txt>
                    <Txt variant="labelS" tone="secondary">
                      kg
                    </Txt>
                  </Row>
                </Row>
                <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.bg.surface, overflow: "hidden" }}>
                  <View style={{ width: `${Math.max(w.volume ? 3 : 0, share * 100)}%`, height: 6, borderRadius: 3, backgroundColor: now ? colors.accent.ember : colors.text.tertiary }} />
                </View>
                <Txt variant="labelS" tone="tertiary">
                  {shortDate(w.start)}, {w.sessions ? t(w.sessions === 1 ? "{n} session" : "{n} sessions", { n: w.sessions }) : t("No sessions")}
                </Txt>
              </View>
            </View>
          );
        })}
      </View>

      <Txt variant="labelS" tone="tertiary" style={{ borderRadius: radius.input }}>
        {t("Volume is weight times reps, warm-up sets left out.")}
      </Txt>
    </Screen>
  );
}
