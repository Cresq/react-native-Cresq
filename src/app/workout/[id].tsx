import { useMemo } from "react";
import { Share, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTheme } from "@/theme/ThemeProvider";
import { useDb } from "@/db/DbProvider";
import { fmtKg, longDate, newRecords, sessionStats } from "@/db/derive";
import { otherPosts } from "@/data/mock";
import { person } from "@/data/people";
import { Screen, Row, Header } from "@/components/ui/Screen";
import { Txt } from "@/components/ui/Text";
import { IconButton } from "@/components/ui/IconButton";
import { Icon } from "@/components/ui/Icon";
import { Chip } from "@/components/ui/Chip";
import { Avatar, PhotoSlot } from "@/components/ui/PhotoSlot";
import { Stat, StatDivider } from "@/components/StatCard";
import { SessionBreakdown, type BreakdownExercise } from "@/components/SessionBreakdown";

/**
 * One workout, read-only: the figures, any records, the photo, then every
 * exercise with each set on its own line. Your own sessions come from the
 * log; someone else's come with their post.
 */
export default function SessionDetail() {
  const { colors } = useTheme();
  const router = useRouter();
  const { db } = useDb();
  const { id } = useLocalSearchParams<{ id: string }>();
  const session = db.sessions.find((s) => s.id === id) ?? (db.activeSession?.id === id ? db.activeSession : undefined);
  const post = session ? undefined : otherPosts.find((p) => p.id === id);
  const recs = useMemo(() => (session ? newRecords(session, db.sessions.filter((x) => x.startedAt < session.startedAt)) : []), [session, db.sessions]);

  if (!session && !post) {
    return (
      <Screen>
        <Header left={<IconButton name="chevronLeft" onPress={() => router.back()} accessibilityLabel="Back" />} title="Workout" />
        <Txt variant="bodyM" tone="secondary">
          This workout is no longer available.
        </Txt>
      </Screen>
    );
  }

  if (post) {
    const author = post.userId ? person(post.userId) : undefined;
    const exercises: BreakdownExercise[] = post.workout ?? (post.exercises ?? []).map((e) => ({ name: e.name, sets: [] }));
    const [title, ...rest] = post.meta.split(" · ");
    return (
      <Screen>
        <Header left={<IconButton name="chevronLeft" onPress={() => router.back()} accessibilityLabel="Back" />} title={title} subtitle={rest.join(" · ")} />
        <Row gap={12}>
          <Avatar source={post.avatar ?? author?.avatar} size={40} initial={post.name[0]} />
          <View style={{ flex: 1, gap: 1 }}>
            <Txt variant="labelL">{post.name}</Txt>
            {author ? (
              <Txt variant="bodyS" tone="tertiary">
                {author.handle} · {author.city}
              </Txt>
            ) : null}
          </View>
        </Row>
        <Row gap={12} align="stretch">
          {post.stats.map((s, i) => (
            <View key={i} style={{ flexDirection: "row", flex: 1 }}>
              {i > 0 ? <StatDivider /> : null}
              <Stat label={s.unit === "min" ? "Duration" : s.unit === "kg" ? "Volume" : "Sets"} value={s.value} unit={s.unit === "sets" ? undefined : s.unit} />
            </View>
          ))}
        </Row>
        {post.record ? <Chip label={post.record} icon="trophy" tone="gold" size="S" style={{ alignSelf: "flex-start" }} /> : null}
        {post.photo ? <PhotoSlot source={post.photo} height={320} radius={18} /> : null}
        <Txt variant="displayS">{post.caption}</Txt>
        <SessionBreakdown exercises={exercises} />
      </Screen>
    );
  }

  const s = session!;
  const stats = sessionStats(s);
  const exercises: BreakdownExercise[] = s.exercises.map((e) => ({ name: e.name, note: e.note, superset: !!e.supersetGroup, sets: e.sets.filter((x) => x.done).map((x) => ({ kg: x.kg, reps: x.reps, type: x.type, done: true })) }));

  return (
    <Screen>
      <Header left={<IconButton name="chevronLeft" onPress={() => router.back()} accessibilityLabel="Back" />} title={s.planName} subtitle={longDate(s.startedAt)} right={<IconButton name="share" onPress={() => Share.share({ message: `${s.planName}, ${longDate(s.startedAt)}: ${stats.setsDone} sets, ${fmtKg(stats.volume)} kg in ${stats.minutes} min. Logged with CresQ.` })} accessibilityLabel="Share" />} />

      <Row gap={12} align="stretch">
        <Stat label="Duration" value={String(stats.minutes)} unit="min" />
        <StatDivider />
        <Stat label="Volume" value={fmtKg(stats.volume)} unit="kg" />
        <StatDivider />
        <Stat label="Sets" value={String(stats.setsDone)} unit={`of ${stats.setsTotal}`} />
      </Row>

      {s.photo ? <PhotoSlot source={{ uri: s.photo }} height={320} radius={18} /> : null}

      {recs.length ? (
        <Row gap={8} style={{ flexWrap: "wrap" }}>
          {recs.map((r) => (
            <Chip key={r.exerciseId} label={`${r.name} ${r.kg} kg`} icon="trophy" tone="gold" size="S" />
          ))}
        </Row>
      ) : null}

      {s.caption ? <Txt variant="displayS">{s.caption}</Txt> : null}

      <SessionBreakdown exercises={exercises} />

      <Row gap={6}>
        <Icon name={s.shared ? "users" : "lock"} size={13} color={colors.text.tertiary} strokeWidth={1.8} />
        <Txt variant="labelS" tone="tertiary">
          {s.shared ? "Shared to your feed" : "Private"}
          {s.sample ? " · sample session" : ""}
        </Txt>
      </Row>
    </Screen>
  );
}
