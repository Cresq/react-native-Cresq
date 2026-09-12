import { useMemo } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "@/theme/ThemeProvider";
import { useDb } from "@/db/DbProvider";
import { useWorkout } from "@/store/workout";
import { compareToLast, fmtKg, longDate, newRecords, sessionStats, shortDate } from "@/db/derive";
import { Screen, Row, Section, Header } from "@/components/ui/Screen";
import { Txt } from "@/components/ui/Text";
import { IconButton } from "@/components/ui/IconButton";
import { Card, Divider } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { Stat, StatDivider } from "@/components/StatCard";

/**
 * Session complete. The hero is typographic: the record, or the plain fact that
 * the session counted. Figures follow on the ground; the one surface is the
 * heart-rate block; the comparison is a list. Actions are pinned below.
 */
export default function Summary() {
  const { colors } = useTheme();
  const router = useRouter();
  const { db } = useDb();
  const { session, file } = useWorkout();
  const stats = sessionStats(session);
  const recs = useMemo(() => (session ? newRecords(session, db.sessions).sort((a, b) => b.kg - a.kg) : []), [session, db.sessions]);
  const record = recs[0] ?? null;
  const cmp = useMemo(() => (session ? compareToLast(session, db.sessions) : { previous: null, rows: [] }), [session, db.sessions]);

  const savePrivately = () => {
    file(false);
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
      <Header left={<IconButton name="close" onPress={savePrivately} accessibilityLabel="Close" />} title="Session complete" subtitle={`${session?.planName ?? "Session"} · ${longDate(session?.startedAt ?? Date.now())}`} />

      <View style={{ gap: 10, paddingTop: 8 }}>
        {record ? (
          <>
            <Chip label={recs.length > 1 ? `${recs.length} new personal records` : "New personal record"} icon="trophy" tone="gold" size="S" style={{ alignSelf: "flex-start" }} />
            <Txt variant="displayXL">
              {record.name} {record.kg} kg
            </Txt>
            <Txt variant="bodyM" tone="secondary">
              {record.reps > 1 ? `${record.reps} reps at ${record.kg} kg` : `1 × ${record.reps} at ${record.kg} kg`}
              {record.previous ? `, up ${Math.round((record.kg - record.previous) * 10) / 10} kg on your previous best.` : ", your first logged best for this lift."}
              {recs.length > 1 ? ` Also ${recs.slice(1).map((r) => `${r.name.toLowerCase()} ${r.kg} kg`).join(", ")}.` : ""}
            </Txt>
          </>
        ) : (
          <>
            <Txt variant="displayXL">Logged and counted</Txt>
            <Txt variant="bodyM" tone="secondary">
              Every set is in your history. Your estimates update from this session.
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
            Sample until a watch is connected.
          </Txt>
        </View>
      </Card>

      <Section title={cmp.previous ? `Compared to last ${session?.planName}` : "This session"} meta={cmp.previous ? shortDate(cmp.previous.startedAt) : "first of its kind"} gap={0}>
        {cmp.rows.map((r, i) => (
          <View key={r.name + i}>
            {i > 0 ? <Divider /> : null}
            <Row style={{ paddingVertical: 12 }}>
              <View style={{ flex: 1, gap: 2 }}>
                <Txt variant="labelL">{r.name}</Txt>
                <Txt variant="bodyS" tone="tertiary">
                  {r.detail}
                </Txt>
              </View>
              <Chip label={r.delta} icon={r.tone === "ember" ? "trendingUp" : undefined} tone={r.tone} size="S" />
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
