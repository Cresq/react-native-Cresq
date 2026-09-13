import { useEffect, useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTheme } from "@/theme/ThemeProvider";
import { useDb } from "@/db/DbProvider";
import { finished, fmtKg, forecast, liftTrend, newRecords, records, sessionStats, shortDate, streakWeeks } from "@/db/derive";
import { photos, social } from "@/data/mock";
import { Screen, Row, Section } from "@/components/ui/Screen";
import { Txt } from "@/components/ui/Text";
import { IconButton } from "@/components/ui/IconButton";
import { Avatar, PhotoSlot } from "@/components/ui/PhotoSlot";
import { Chip } from "@/components/ui/Chip";
import { Divider } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { Tabs } from "@/components/ui/Tabs";
import { Stat, StatDivider } from "@/components/StatCard";
import { LineChart } from "@/components/LineChart";

const MAIN_LIFTS = ["bench", "squat", "deadlift", "ohp"];
const TABS = ["lifts", "records", "workouts"];

/**
 * Profile. Who you are on top, then three chapters of what you have done:
 * lifts (one chart, then the list), records, and every workout.
 */
export default function Profile() {
  const { colors } = useTheme();
  const router = useRouter();
  const { db } = useDb();
  const { tab: wanted } = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState(TABS.includes(wanted ?? "") ? wanted! : "lifts");
  useEffect(() => {
    if (wanted && TABS.includes(wanted)) setTab(wanted);
  }, [wanted]);

  const done = useMemo(() => finished(db.sessions), [db.sessions]);
  const streak = useMemo(() => streakWeeks(db.sessions), [db.sessions]);
  const recs = useMemo(() => records(db.sessions, db.exercises), [db.sessions, db.exercises]);
  const lifts = useMemo(
    () =>
      db.exercises
        .map((ex) => ({ ex, points: liftTrend(db.sessions, ex.id) }))
        .filter((l) => l.points.length > 0)
        .map((l) => ({ ...l, current: l.points[l.points.length - 1].value, delta: Math.round((l.points[l.points.length - 1].value - l.points[0].value) * 2) / 2, last: l.points[l.points.length - 1].date }))
        .sort((a, b) => (MAIN_LIFTS.indexOf(a.ex.id) + 1 || 99) - (MAIN_LIFTS.indexOf(b.ex.id) + 1 || 99) || b.last - a.last),
    [db.exercises, db.sessions],
  );
  const hero = lifts.find((l) => l.points.length >= 2) ?? null;
  const heroFc = hero ? forecast(hero.points) : null;
  const workouts = useMemo(() => [...done].reverse().map((s) => ({ s, stats: sessionStats(s), prs: newRecords(s, db.sessions.filter((x) => x.startedAt < s.startedAt)).length })), [done, db.sessions]);

  const rowStyle = ({ pressed }: { pressed: boolean }) => ({ flexDirection: "row" as const, alignItems: "center" as const, gap: 14, paddingVertical: 12, opacity: pressed ? 0.7 : 1 });

  return (
    <Screen tabs>
      <Row gap={10}>
        <Txt variant="displayXL" style={{ flex: 1 }}>
          Profile
        </Txt>
        <IconButton name="share" />
        <IconButton name="settings" onPress={() => router.push("/settings")} accessibilityLabel="Settings" />
      </Row>

      <View style={{ gap: 20 }}>
        <Row gap={16}>
          <Avatar source={photos.selfie} size={84} />
          <View style={{ flex: 1, gap: 4 }}>
            <Txt variant="displayL">{db.profile.name}</Txt>
            <Txt variant="bodyS" tone="secondary">
              {db.profile.handle} · {db.profile.city} · since {db.profile.since}
            </Txt>
            <Row gap={5}>
              <Icon name="trendingUp" size={12} color={streak ? colors.accent.ember : colors.text.tertiary} strokeWidth={2.2} />
              <Txt variant="labelS" tone={streak ? "ember" : "tertiary"}>
                {streak ? `${streak}-week streak` : "Start a streak this week"}
              </Txt>
            </Row>
          </View>
        </Row>
        <Row gap={12} align="stretch">
          <Stat label="Sessions" value={String(done.length)} size="M" />
          <StatDivider />
          <Stat label="Followers" value={social.followers} size="M" />
          <StatDivider />
          <Stat label="Following" value={String(social.following)} size="M" />
        </Row>
      </View>

      <View style={{ gap: 4 }}>
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { key: "lifts", label: "Lifts", count: lifts.length },
            { key: "records", label: "Records", count: recs.length },
            { key: "workouts", label: "Workouts", count: done.length },
          ]}
        />

        {tab === "lifts" ? (
          <View style={{ gap: 8 }}>
            {hero ? (
              <Pressable accessibilityRole="button" onPress={() => router.push(`/progress/${hero.ex.id}`)} style={{ gap: 12, paddingTop: 16, paddingBottom: 8 }}>
                <Row justify="space-between" align="flex-end">
                  <View style={{ gap: 2 }}>
                    <Row gap={4}>
                      <Txt variant="displayM">{hero.ex.name}</Txt>
                      <Icon name="chevronRight" size={16} color={colors.text.tertiary} strokeWidth={2} />
                    </Row>
                    <Txt variant="labelS" tone="tertiary">
                      Estimated 1RM · {hero.points.length} sessions
                    </Txt>
                  </View>
                  <View style={{ alignItems: "flex-end", gap: 2 }}>
                    <Row gap={4} align="baseline">
                      <Txt variant="numberL" tabular>
                        {hero.current}
                      </Txt>
                      <Txt variant="labelM" tone="secondary">
                        kg
                      </Txt>
                    </Row>
                    <Txt variant="labelS" tone={hero.delta >= 0 ? "ember" : "warning"}>
                      {hero.delta >= 0 ? "+" : ""}
                      {hero.delta} kg
                    </Txt>
                  </View>
                </Row>
                <LineChart points={hero.points.slice(-8)} labels={hero.points.slice(-8).map((p, i, a) => (i === a.length - 1 ? "Now" : shortDate(p.date)))} height={110} />
                {heroFc?.weeksToTarget ? (
                  <Txt variant="labelS" tone="tertiary">
                    {heroFc.target} kg likely in {heroFc.weeksToTarget} week{heroFc.weeksToTarget === 1 ? "" : "s"} at this pace
                  </Txt>
                ) : null}
              </Pressable>
            ) : (
              <Txt variant="bodyM" tone="secondary" style={{ paddingTop: 12 }}>
                Finish a session and your lifts appear here.
              </Txt>
            )}
            <View>
              {lifts.map((l, i) => (
                <View key={l.ex.id}>
                  {i > 0 ? <Divider /> : null}
                  <Pressable accessibilityRole="button" onPress={() => router.push(`/progress/${l.ex.id}`)} style={rowStyle}>
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
            </View>
          </View>
        ) : null}

        {tab === "records" ? (
          <View>
            {recs.length === 0 ? (
              <Txt variant="bodyM" tone="secondary" style={{ paddingTop: 12 }}>
                Your first weighted set becomes your first record.
              </Txt>
            ) : null}
            {recs.map((r, i) => (
              <View key={r.exerciseId}>
                {i > 0 ? <Divider /> : null}
                <Pressable accessibilityRole="button" onPress={() => router.push(`/progress/${r.exerciseId}`)} style={rowStyle}>
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
          </View>
        ) : null}

        {tab === "workouts" ? (
          <View style={{ gap: 24 }}>
            <View>
              {workouts.length === 0 ? (
                <Txt variant="bodyM" tone="secondary" style={{ paddingTop: 12 }}>
                  Your finished sessions will show up here.
                </Txt>
              ) : null}
              {workouts.map(({ s, stats, prs }, i) => {
                const d = new Date(s.startedAt);
                return (
                  <View key={s.id}>
                    {i > 0 ? <Divider /> : null}
                    <Row gap={14} style={{ paddingVertical: 12 }}>
                      <View style={{ width: 40, alignItems: "center" }}>
                        <Txt variant="numberM" tabular>
                          {d.getDate()}
                        </Txt>
                        <Txt variant="labelS" tone="tertiary">
                          {d.toLocaleDateString("en-GB", { month: "short" })}
                        </Txt>
                      </View>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Row gap={8}>
                          <Txt variant="labelL">{s.planName}</Txt>
                          {prs ? <Chip label={prs === 1 ? "PR" : `${prs} PRs`} icon="trophy" tone="gold" size="S" /> : null}
                          {s.sample ? (
                            <Txt variant="labelS" tone="tertiary">
                              sample
                            </Txt>
                          ) : null}
                        </Row>
                        <Txt variant="bodyS" tone="tertiary">
                          {stats.minutes} min · {fmtKg(stats.volume)} kg · {stats.setsDone} sets
                        </Txt>
                      </View>
                    </Row>
                  </View>
                );
              })}
            </View>
            <Section title="Photos">
              <Row gap={8}>
                {[photos.gym1, photos.gym2, photos.gym3].map((p, i) => (
                  <PhotoSlot key={i} source={p} height={118} radius={14} style={{ flex: 1 }} />
                ))}
              </Row>
            </Section>
          </View>
        ) : null}
      </View>
    </Screen>
  );
}

export const goalLabel = (g: string) => ({ strength: "Get stronger", muscle: "Build muscle", health: "Stay healthy" })[g] ?? g;
