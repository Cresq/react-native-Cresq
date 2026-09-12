import { useMemo } from "react";
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "@/theme/ThemeProvider";
import { useDb } from "@/db/DbProvider";
import { finished, liftTrend, records, shortDate, streakWeeks } from "@/db/derive";
import { Screen, Row, Section, Header } from "@/components/ui/Screen";
import { Txt } from "@/components/ui/Text";
import { IconButton } from "@/components/ui/IconButton";
import { Divider } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { Stat, StatDivider } from "@/components/StatCard";

/** Progress overview: every lift with history, sorted by most recent, and the record list. */
export default function Progress() {
  const { colors } = useTheme();
  const router = useRouter();
  const { db } = useDb();
  const done = useMemo(() => finished(db.sessions), [db.sessions]);
  const lifts = useMemo(
    () =>
      db.exercises
        .map((ex) => ({ ex, points: liftTrend(db.sessions, ex.id) }))
        .filter((l) => l.points.length > 0)
        .map((l) => ({ ...l, current: l.points[l.points.length - 1].value, delta: Math.round((l.points[l.points.length - 1].value - l.points[0].value) * 2) / 2, last: l.points[l.points.length - 1].date }))
        .sort((a, b) => b.last - a.last),
    [db.exercises, db.sessions],
  );
  const recs = useMemo(() => records(db.sessions, db.exercises), [db.sessions, db.exercises]);

  return (
    <Screen>
      <Header left={<IconButton name="chevronLeft" onPress={() => router.back()} accessibilityLabel="Back" />} title="Progress" />
      <Row gap={12} align="stretch">
        <Stat label="Sessions" value={String(done.length)} size="M" />
        <StatDivider />
        <Stat label="Streak" value={String(streakWeeks(db.sessions))} unit="weeks" size="M" />
        <StatDivider />
        <Stat label="Records" value={String(recs.length)} size="M" />
      </Row>

      <Section title="Lifts" gap={0}>
        {lifts.length === 0 ? (
          <Txt variant="bodyM" tone="secondary">
            Finish a session and your lifts appear here.
          </Txt>
        ) : null}
        {lifts.map((l, i) => (
          <View key={l.ex.id}>
            {i > 0 ? <Divider /> : null}
            <Pressable accessibilityRole="button" onPress={() => router.push(`/progress/${l.ex.id}`)} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 12, opacity: pressed ? 0.7 : 1 })}>
              <View style={{ flex: 1, gap: 2 }}>
                <Txt variant="labelL">{l.ex.name}</Txt>
                <Txt variant="bodyS" tone="tertiary">
                  {l.points.length} session{l.points.length === 1 ? "" : "s"} · last {shortDate(l.last)}
                </Txt>
              </View>
              <View style={{ alignItems: "flex-end", gap: 1 }}>
                <Row gap={3} align="baseline">
                  <Txt variant="numberM" tabular>
                    {l.current}
                  </Txt>
                  <Txt variant="labelS" tone="secondary">
                    kg
                  </Txt>
                </Row>
                {l.points.length > 1 ? (
                  <Txt variant="labelS" tone={l.delta >= 0 ? "ember" : "warning"}>
                    {l.delta >= 0 ? "+" : ""}
                    {l.delta} kg
                  </Txt>
                ) : null}
              </View>
              <Icon name="chevronRight" size={18} color={colors.text.tertiary} />
            </Pressable>
          </View>
        ))}
      </Section>

      <Section title="Records" gap={0}>
        {recs.slice(0, 8).map((r, i) => (
          <View key={r.exerciseId}>
            {i > 0 ? <Divider /> : null}
            <Pressable accessibilityRole="button" onPress={() => router.push(`/progress/${r.exerciseId}`)} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 12, opacity: pressed ? 0.7 : 1 })}>
              <Icon name="trophy" size={20} color={i === 0 ? colors.pr.gold : colors.text.tertiary} strokeWidth={1.9} />
              <View style={{ flex: 1, gap: 1 }}>
                <Row gap={6} align="baseline">
                  <Txt variant="numberM" tabular>
                    {r.kg} kg
                  </Txt>
                  <Txt variant="labelS" tone="secondary">
                    × {r.reps} · {r.name}
                  </Txt>
                </Row>
                <Txt variant="bodyS" tone="tertiary">
                  {shortDate(r.date)}
                  {r.previous ? ` · up from ${r.previous} kg` : ""}
                </Txt>
              </View>
              <Icon name="chevronRight" size={18} color={colors.text.tertiary} />
            </Pressable>
          </View>
        ))}
      </Section>
    </Screen>
  );
}
