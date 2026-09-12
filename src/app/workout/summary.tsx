import { View } from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "@/theme/ThemeProvider";
import { fmtKg, sessionStats, useWorkout } from "@/store/workout";
import { Screen, Row, Section, Header } from "@/components/ui/Screen";
import { Txt } from "@/components/ui/Text";
import { IconButton } from "@/components/ui/IconButton";
import { Card, Divider } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { Stat, StatDivider } from "@/components/StatCard";

/** Personal record detection for v1: bench press with a completed working set at or above 100 kg. */
export function findRecord(exercises: { name: string; sets: { type: string; kg: number; reps: number; done: boolean }[] }[]) {
  const bench = exercises.find((e) => e.name === "Bench press");
  const top = bench?.sets.filter((s) => s.done && s.type !== "warmup").sort((a, b) => b.kg - a.kg)[0];
  if (top && top.kg >= 100) return { name: "Bench press", kg: top.kg, reps: top.reps, previous: 95 };
  return null;
}

/**
 * Session complete. The hero is typographic: the record, or the plain fact that
 * the session counted. Figures follow on the ground; the one surface is the
 * heart-rate block; the comparison is a list. Actions are pinned below.
 */
export default function Summary() {
  const { colors } = useTheme();
  const router = useRouter();
  const { session, discard } = useWorkout();
  const stats = sessionStats(session);
  const record = session ? findRecord(session.exercises) : null;
  const date = new Date(session?.startedAt ?? Date.now()).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

  const savePrivately = () => {
    discard();
    router.replace("/(tabs)");
  };

  const footer = (
    <>
      <Button label="Share to feed" icon="share" onPress={() => router.replace("/workout/posted")} />
      <Row gap={10}>
        <Button label="Save privately" variant="secondary" size="M" icon="lock" onPress={savePrivately} style={{ flex: 1 }} />
        <Button label="View session" variant="tertiary" size="M" iconRight="chevronRight" onPress={savePrivately} style={{ flex: 1 }} />
      </Row>
      <Txt variant="labelS" tone="tertiary" align="center">
        Shared posts go to your followers. Undo within 60 seconds.
      </Txt>
    </>
  );

  return (
    <Screen bottom={170} footer={footer}>
      <Header left={<IconButton name="close" onPress={savePrivately} accessibilityLabel="Close" />} title="Session complete" subtitle={`${session?.planName ?? "Session"} · ${date}`} />

      <View style={{ gap: 10, paddingTop: 8 }}>
        {record ? (
          <>
            <Chip label="New personal record" icon="trophy" tone="gold" size="S" style={{ alignSelf: "flex-start" }} />
            <Txt variant="displayXL">
              {record.name} {record.kg} kg
            </Txt>
            <Txt variant="bodyM" tone="secondary">
              1 × {record.reps} at {record.kg} kg, up {record.kg - record.previous} kg on your previous best. Your forecast said 26 September. You are two weeks early.
            </Txt>
          </>
        ) : (
          <>
            <Txt variant="displayXL">Logged and counted</Txt>
            <Txt variant="bodyM" tone="secondary">
              Every set is in your history. Your next record estimate updates tonight.
            </Txt>
          </>
        )}
      </View>

      <Row gap={12} align="stretch">
        <Stat label="Duration" value={String(stats.minutes)} unit="min" />
        <StatDivider />
        <Stat label="Volume" value={fmtKg(stats.volume)} unit="kg" />
        <StatDivider />
        <Stat label="Sets" value={String(stats.setsDone)} unit={`of ${stats.setsTotal}`} />
      </Row>

      <Card padding={18} gap={14}>
        <Row justify="space-between">
          <Txt variant="displayS">Heart rate and energy</Txt>
          <Row gap={5}>
            <Icon name="watch" size={13} color={colors.text.tertiary} strokeWidth={1.8} />
            <Txt variant="labelS" tone="tertiary">
              Apple Watch
            </Txt>
          </Row>
        </Row>
        <Row gap={16} align="stretch">
          <HR icon="heart" label="Average" value="126" unit="bpm" color={colors.status.danger} />
          <HR icon="pulse" label="Max" value="158" unit="bpm" color={colors.text.secondary} />
          <HR icon="flame" label="Energy" value="412" unit="kcal" color={colors.accent.ember} />
        </Row>
        <View style={{ gap: 6 }}>
          <Row gap={3}>
            {(
              [
                [4, colors.border.strong],
                [12, colors.fuel.sage],
                [28, colors.accent.ember],
                [9, colors.status.warning],
                [1, colors.status.danger],
              ] as const
            ).map(([minutes, color], i) => (
              <View key={i} style={{ flex: minutes, height: 6, borderRadius: 3, backgroundColor: color, minWidth: 6 }} />
            ))}
          </Row>
          <Txt variant="labelS" tone="tertiary">
            Zones 1 to 5: 4 · 12 · 28 · 9 · 1 min. Sample until a watch is connected.
          </Txt>
        </View>
      </Card>

      <Section title={`Compared to last ${session?.planName ?? "session"}`} meta="8 Sep" gap={0}>
        {[
          ["Bench press", "3 × 5 · 100 kg", "+5 kg", "ember"],
          ["Incline dumbbell press", "4 × 10 · 32.5 kg", "+2.5 kg", "ember"],
          ["Dips", "3 × 12", "+1 rep", "ember"],
          ["Lateral raise", "3 × 15 · 10 kg", "same", "neutral"],
          ["Overhead press", "3 × 8 · 50 kg", "-1 rep", "warning"],
        ].map(([name, detail, delta, tone], i) => (
          <View key={name}>
            {i > 0 ? <Divider /> : null}
            <Row style={{ paddingVertical: 12 }}>
              <View style={{ flex: 1, gap: 2 }}>
                <Txt variant="labelL">{name}</Txt>
                <Txt variant="bodyS" tone="tertiary">
                  {detail}
                </Txt>
              </View>
              <Chip label={delta} icon={tone === "ember" ? "trendingUp" : undefined} tone={tone as "ember" | "neutral" | "warning"} size="S" />
            </Row>
          </View>
        ))}
      </Section>
    </Screen>
  );
}

function HR({ icon, label, value, unit, color }: { icon: "heart" | "pulse" | "flame"; label: string; value: string; unit: string; color: string }) {
  return (
    <View style={{ flex: 1, gap: 3 }}>
      <Row gap={5}>
        <Icon name={icon} size={12} color={color} strokeWidth={2.2} />
        <Txt variant="labelS" tone="tertiary">
          {label}
        </Txt>
      </Row>
      <Row gap={3} align="baseline">
        <Txt variant="numberM" tabular>
          {value}
        </Txt>
        <Txt variant="labelS" tone="secondary">
          {unit}
        </Txt>
      </Row>
    </View>
  );
}
