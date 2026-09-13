import { useMemo } from "react";
import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTheme } from "@/theme/ThemeProvider";
import { useDb } from "@/db/DbProvider";
import { fmtKg, longDate, newRecords, sessionStats } from "@/db/derive";
import { Screen, Row, Header } from "@/components/ui/Screen";
import { Txt } from "@/components/ui/Text";
import { IconButton } from "@/components/ui/IconButton";
import { Divider } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { Chip } from "@/components/ui/Chip";
import { Stat, StatDivider } from "@/components/StatCard";

/** One logged session, read-only: the figures, any records, then every exercise with its sets. */
export default function SessionDetail() {
  const { colors } = useTheme();
  const router = useRouter();
  const { db } = useDb();
  const { id } = useLocalSearchParams<{ id: string }>();
  const session = db.sessions.find((s) => s.id === id) ?? (db.activeSession?.id === id ? db.activeSession : undefined);
  const recs = useMemo(() => (session ? newRecords(session, db.sessions.filter((x) => x.startedAt < session.startedAt)) : []), [session, db.sessions]);

  if (!session) {
    return (
      <Screen>
        <Header left={<IconButton name="chevronLeft" onPress={() => router.back()} accessibilityLabel="Back" />} title="Session" />
        <Txt variant="bodyM" tone="secondary">
          This session is no longer in your log.
        </Txt>
      </Screen>
    );
  }
  const stats = sessionStats(session);

  return (
    <Screen>
      <Header left={<IconButton name="chevronLeft" onPress={() => router.back()} accessibilityLabel="Back" />} title={session.planName} subtitle={longDate(session.startedAt)} right={<IconButton name="share" />} />

      <Row gap={12} align="stretch">
        <Stat label="Duration" value={String(stats.minutes)} unit="min" />
        <StatDivider />
        <Stat label="Volume" value={fmtKg(stats.volume)} unit="kg" />
        <StatDivider />
        <Stat label="Sets" value={String(stats.setsDone)} unit={`of ${stats.setsTotal}`} />
      </Row>

      {recs.length ? (
        <Row gap={8} style={{ flexWrap: "wrap" }}>
          {recs.map((r) => (
            <Chip key={r.exerciseId} label={`${r.name} ${r.kg} kg`} icon="trophy" tone="gold" size="S" />
          ))}
        </Row>
      ) : null}

      <View>
        {session.exercises.map((e, i) => {
          const done = e.sets.filter((s) => s.done);
          const line = done.map((s) => `${s.kg ? `${s.kg} × ` : ""}${s.reps}${s.type === "warmup" ? " w" : s.type === "drop" ? " d" : s.type === "failure" ? " f" : ""}`).join("  ·  ");
          return (
            <View key={e.id}>
              {i > 0 ? <Divider /> : null}
              <View style={{ paddingVertical: 12, gap: 3 }}>
                <Row gap={8}>
                  <Txt variant="labelL" style={{ flex: 1 }}>
                    {e.name}
                  </Txt>
                  {e.supersetGroup ? <Icon name="link" size={14} color={colors.text.tertiary} strokeWidth={2} /> : null}
                  <Txt variant="labelS" tone="tertiary">
                    {done.length} of {e.sets.length} sets
                  </Txt>
                </Row>
                <Txt variant="bodyS" tone={done.length ? "secondary" : "tertiary"} tabular>
                  {line || "skipped"}
                </Txt>
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

      <Row gap={6}>
        <Icon name={session.shared ? "users" : "lock"} size={13} color={colors.text.tertiary} strokeWidth={1.8} />
        <Txt variant="labelS" tone="tertiary">
          {session.shared ? "Shared to your feed" : "Private"}
          {session.sample ? " · sample session" : ""}
          {" · w warm-up, d drop set, f to failure"}
        </Txt>
      </Row>
    </Screen>
  );
}
