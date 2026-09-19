import { useMemo } from "react";
import { View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useNav } from "@/nav";
import { useTheme } from "@/theme/ThemeProvider";
import { useDb } from "@/db/DbProvider";
import { useNow } from "@/clock";
import { person } from "@/data/people";
import { DEFAULT_FAVOURITES } from "@/db/types";
import { finished, fmtKg, liftTrend, sessionStats, startOfWeek, weeklyVolume } from "@/db/derive";
import { useT } from "@/i18n";
import { Screen, Row, Header } from "@/components/ui/Screen";
import { Txt } from "@/components/ui/Text";
import { IconButton } from "@/components/ui/IconButton";
import { Icon } from "@/components/ui/Icon";
import { Card, Divider } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/PhotoSlot";

/**
 * You against one other person. Every row is the same number for both of you,
 * with a bar split between the two so who is ahead reads before the figures do.
 * Nothing here is a score: it is two logs side by side.
 */
export default function Compare() {
  const { colors } = useTheme();
  const router = useNav();
  const t = useT();
  const { db } = useDb();
  const { id } = useLocalSearchParams<{ id: string }>();
  const them = person(id);

  const now = useNow();
  const done = useMemo(() => finished(db.sessions), [db.sessions]);
  const mine = useMemo(() => {
    const from = startOfWeek(now);
    const thisWeek = done.filter((s) => s.startedAt >= from);
    const live = db.activeSession && !db.activeSession.finishedAt && db.activeSession.startedAt >= from ? db.activeSession : null;
    const favourites = db.profile.favourites ?? DEFAULT_FAVOURITES;
    return {
      sessions: done.length,
      weekSessions: thisWeek.length + (live ? 1 : 0),
      weekVolume: weeklyVolume(db.sessions, now, db.activeSession).current,
      lifts: favourites.map((exerciseId) => {
        const points = liftTrend(db.sessions, exerciseId);
        return { exerciseId, kg: points.length ? points[points.length - 1].value : 0 };
      }),
      sets: [...thisWeek, ...(live ? [live] : [])].reduce((n, s) => n + sessionStats(s).setsDone, 0),
    };
  }, [done, db.sessions, db.activeSession, db.profile.favourites, now]);

  if (!them || !them.compare) {
    return (
      <Screen>
        <Header left={<IconButton name="chevronLeft" onPress={() => router.back("/compare")} accessibilityLabel={t("Back")} />} title={t("Compare")} />
        <Txt variant="bodyM" tone="secondary">
          {t("This person keeps their figures private.")}
        </Txt>
      </Screen>
    );
  }

  const theirs = them.compare;
  const nameOf = (exerciseId: string) => db.exercises.find((e) => e.id === exerciseId)?.name ?? exerciseId;
  const shared = mine.lifts.filter((l) => theirs.lifts.some((x) => x.exerciseId === l.exerciseId) && l.kg > 0);

  return (
    <Screen>
      <Header left={<IconButton name="chevronLeft" onPress={() => router.back("/compare")} accessibilityLabel={t("Back")} />} title={t("You and {name}", { name: them.name.split(" ")[0] })} />

      <Row gap={16} align="center" style={{ paddingVertical: 4 }}>
        <View style={{ flex: 1, alignItems: "center", gap: 8 }}>
          <Avatar size={52} initial={db.profile.name[0]} />
          <Txt variant="labelL">{t("You")}</Txt>
        </View>
        <Txt variant="labelS" tone="tertiary">
          {t("vs")}
        </Txt>
        <View style={{ flex: 1, alignItems: "center", gap: 8 }}>
          <Avatar source={them.avatar} size={52} initial={them.name[0]} />
          <Txt variant="labelL">{them.name.split(" ")[0]}</Txt>
        </View>
      </Row>

      <Card padding={20} gap={0}>
        <Line label={t("Sessions logged")} mine={mine.sessions} theirs={theirs.sessions} />
        <Divider />
        <Line label={t("Sessions this week")} mine={mine.weekSessions} theirs={theirs.weekSessions} />
        <Divider />
        <Line label={t("Volume this week")} mine={mine.weekVolume} theirs={theirs.weekVolume} unit="kg" format={fmtKg} />
      </Card>

      {shared.length ? (
        <Card padding={20} gap={0}>
          <Txt variant="labelS" tone="tertiary" style={{ paddingBottom: 12 }}>
            {t("Estimated one-rep max")}
          </Txt>
          {shared.map((l, i) => (
            <View key={l.exerciseId}>
              {i > 0 ? <Divider /> : null}
              <Line label={nameOf(l.exerciseId)} mine={l.kg} theirs={theirs.lifts.find((x) => x.exerciseId === l.exerciseId)!.kg} unit="kg" />
            </View>
          ))}
        </Card>
      ) : null}

      <Row gap={8} align="flex-start">
        <Icon name="info" size={14} color={colors.text.tertiary} strokeWidth={1.9} />
        <Txt variant="labelS" tone="tertiary" style={{ flex: 1 }}>
          {t("Bodyweight, age and years of training are not in here, so this is not a ranking. It is two logs beside each other.")}
        </Txt>
      </Row>
    </Screen>
  );
}

/** One figure for both of you, with a bar split by the share each holds. */
function Line({ label, mine, theirs, unit, format }: { label: string; mine: number; theirs: number; unit?: string; format?: (n: number) => string }) {
  const { colors } = useTheme();
  const show = (n: number) => (format ? format(n) : String(Math.round(n * 10) / 10));
  const total = Math.max(1, mine + theirs);
  const ahead = mine === theirs ? "even" : mine > theirs ? "mine" : "theirs";
  return (
    <View style={{ paddingVertical: 12, gap: 8 }}>
      <Txt variant="labelS" tone="tertiary">
        {label}
      </Txt>
      <Row gap={12} align="baseline">
        <Row gap={4} align="baseline" style={{ flex: 1 }}>
          <Txt variant="numberM" tabular tone={ahead === "mine" ? "ember" : "primary"}>
            {show(mine)}
          </Txt>
          {unit ? (
            <Txt variant="labelS" tone="secondary">
              {unit}
            </Txt>
          ) : null}
        </Row>
        <Row gap={4} align="baseline">
          {unit ? (
            <Txt variant="labelS" tone="secondary">
              {unit}
            </Txt>
          ) : null}
          <Txt variant="numberM" tabular tone={ahead === "theirs" ? "sage" : "primary"}>
            {show(theirs)}
          </Txt>
        </Row>
      </Row>
      <Row gap={4}>
        <View style={{ flex: Math.max(0.04, mine / total), height: 6, borderRadius: 3, backgroundColor: colors.accent.ember }} />
        <View style={{ flex: Math.max(0.04, theirs / total), height: 6, borderRadius: 3, backgroundColor: colors.fuel.sage }} />
      </Row>
    </View>
  );
}
