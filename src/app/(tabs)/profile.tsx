import { useMemo } from "react";
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "@/theme/ThemeProvider";
import { useDb } from "@/db/DbProvider";
import { finished, fmtKg, liftTrend, newRecords, records, sessionStats, streakWeeks } from "@/db/derive";
import { photos, social } from "@/data/mock";
import { Screen, Row, Section } from "@/components/ui/Screen";
import { Txt } from "@/components/ui/Text";
import { IconButton } from "@/components/ui/IconButton";
import { Avatar, PhotoSlot } from "@/components/ui/PhotoSlot";
import { Chip } from "@/components/ui/Chip";
import { Card, Divider } from "@/components/ui/Card";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Stat, StatDivider } from "@/components/StatCard";

/** Profile. Identity and figures on the ground, one surface for the shortcuts, then plain lists. */
export default function Profile() {
  const { colors } = useTheme();
  const router = useRouter();
  const { db } = useDb();
  const done = useMemo(() => finished(db.sessions), [db.sessions]);
  const streak = useMemo(() => streakWeeks(db.sessions), [db.sessions]);
  const allRecords = useMemo(() => records(db.sessions, db.exercises), [db.sessions, db.exercises]);
  const bench = useMemo(() => liftTrend(db.sessions, "bench"), [db.sessions]);
  const recent = useMemo(() => [...done].reverse().slice(0, 3).map((s) => ({ s, stats: sessionStats(s), prs: newRecords(s, db.sessions.filter((x) => x.startedAt < s.startedAt)).length })), [done, db.sessions]);

  const shortcuts: { icon: IconName; label: string; sub: string; onPress?: () => void }[] = [
    { icon: "trendingUp", label: "Progress", sub: bench.length ? `Bench ${bench[bench.length - 1].value} kg estimated max` : "Trends for every lift", onPress: () => router.push("/progress") },
    { icon: "trophy", label: "Records", sub: `${allRecords.length} personal records`, onPress: () => router.push("/progress") },
    { icon: "flag", label: "Goals and limitations", sub: db.profile.goal ? `${goalLabel(db.profile.goal)} · ${db.profile.daysPerWeek ?? 3} days a week` : "Feeds your plans", onPress: () => router.push("/onboarding?edit=1") },
    { icon: "sliders", label: "Settings", sub: "Devices, units, language", onPress: () => router.push("/settings") },
  ];

  return (
    <Screen tabs>
      <Row gap={10}>
        <Txt variant="displayXL" style={{ flex: 1 }}>
          Profile
        </Txt>
        <IconButton name="share" />
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

      <Card padding={6} gap={0}>
        {shortcuts.map((s, i) => (
          <View key={s.label}>
            {i > 0 ? <Divider inset={52} /> : null}
            <Pressable accessibilityRole="button" onPress={s.onPress} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 12, paddingHorizontal: 10, borderRadius: 16, backgroundColor: pressed ? colors.bg.raised : "transparent" })}>
              <Icon name={s.icon} size={20} color={colors.text.secondary} strokeWidth={1.8} />
              <View style={{ flex: 1, gap: 1 }}>
                <Txt variant="labelL">{s.label}</Txt>
                <Txt variant="bodyS" tone="tertiary">
                  {s.sub}
                </Txt>
              </View>
              <Icon name="chevronRight" size={18} color={colors.text.tertiary} />
            </Pressable>
          </View>
        ))}
      </Card>

      <Section title="Recent workouts" action={done.length ? `See all ${done.length}` : undefined} onAction={() => router.push("/progress")} gap={0}>
        {recent.length === 0 ? (
          <Txt variant="bodyM" tone="secondary">
            Your finished sessions will show up here.
          </Txt>
        ) : null}
        {recent.map(({ s, stats, prs }, i) => {
          const d = new Date(s.startedAt);
          return (
            <View key={s.id}>
              {i > 0 ? <Divider /> : null}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 12 }}>
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
              </View>
            </View>
          );
        })}
      </Section>

      <Section title="Photos" action="See all" onAction={() => {}}>
        <Row gap={8}>
          {[photos.gym1, photos.gym2, photos.gym3].map((p, i) => (
            <PhotoSlot key={i} source={p} height={118} radius={14} style={{ flex: 1 }} />
          ))}
        </Row>
      </Section>
    </Screen>
  );
}

export const goalLabel = (g: string) => ({ strength: "Get stronger", muscle: "Build muscle", health: "Stay healthy" })[g] ?? g;
