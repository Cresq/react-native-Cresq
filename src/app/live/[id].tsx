import { useEffect, useState } from "react";
import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import { useTheme } from "@/theme/ThemeProvider";
import { liveProgress, person as findPerson } from "@/data/people";
import { useSocial } from "@/store/social";
import { useT } from "@/i18n";
import { Screen, Row, Header } from "@/components/ui/Screen";
import { Txt } from "@/components/ui/Text";
import { IconButton } from "@/components/ui/IconButton";
import { Avatar } from "@/components/ui/PhotoSlot";
import { Card, Divider } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { Stat, StatDivider } from "@/components/StatCard";
import { SessionBreakdown } from "@/components/SessionBreakdown";

const fmt = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

/**
 * Someone's session, as it happens. Read-only: their clock, the exercise
 * they are on, the sets they have finished. Refreshes every few seconds.
 * Only people who follow them and only when they turned live sharing on.
 */
export default function LiveSession() {
  const { colors } = useTheme();
  const router = useRouter();
  const t = useT();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isFollowing } = useSocial();
  const p = findPerson(id);
  const [, tick] = useState(0);
  useEffect(() => {
    const i = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(i);
  }, []);
  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.value = withRepeat(withSequence(withTiming(0.35, { duration: 900 }), withTiming(1, { duration: 900 })), -1, true);
  }, [pulse]);
  const dot = useAnimatedStyle(() => ({ opacity: pulse.value }));

  if (!p || !p.live || !isFollowing(p.id)) {
    return (
      <Screen>
        <Header left={<IconButton name="chevronLeft" onPress={() => router.back()} accessibilityLabel={t("Back")} />} title={t("Live")} />
        <Txt variant="bodyM" tone="secondary">
          {t("This session is over, or you do not follow this person.")}
        </Txt>
      </Screen>
    );
  }
  const live = p.live;
  const prog = liveProgress(live);
  const current = prog.exercises[prog.currentIndex];
  const volume = prog.exercises.reduce((n, e) => n + e.doneSets.reduce((m, s) => m + s.kg * s.reps, 0), 0);

  return (
    <Screen>
      <Header left={<IconButton name="chevronLeft" onPress={() => router.back()} accessibilityLabel={t("Back")} />} title={p.name} subtitle={live.planName} />

      <Row gap={12}>
        <Avatar source={p.avatar} size={44} initial={p.name[0]} />
        <View style={{ flex: 1, gap: 2 }}>
          <Row gap={8}>
            <Animated.View style={[{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.status.danger }, dot]} />
            <Txt variant="labelM" style={{ color: colors.status.danger }}>
              {prog.finished ? t("Just finished") : t("Live now")}
            </Txt>
          </Row>
          <Txt variant="bodyS" tone="tertiary">
            {t("Started {time} ago", { time: fmt(Date.now() - live.startedAt) })}
          </Txt>
        </View>
      </Row>

      <Row gap={12} align="stretch">
        <Stat label={t("Elapsed")} value={fmt(Date.now() - live.startedAt)} />
        <StatDivider />
        <Stat label={t("Volume")} value={volume >= 1000 ? `${(volume / 1000).toFixed(1)}k` : String(volume)} unit="kg" />
        <StatDivider />
        <Stat label={t("Sets")} value={String(prog.done)} unit={t("of {n}", { n: prog.total })} />
      </Row>

      {current && !prog.finished ? (
        <Card padding={20} gap={8}>
          <Txt variant="labelS" tone="ember">
            {t("Now on")}
          </Txt>
          <Txt variant="displayM">{current.name}</Txt>
          <Txt variant="bodyS" tone="secondary">
            {t("Set {a} of {b}", { a: Math.min(current.total, current.doneSets.length + 1), b: current.total })}
            {current.doneSets.length ? `, ${t("last")} ${current.doneSets[current.doneSets.length - 1].kg} kg × ${current.doneSets[current.doneSets.length - 1].reps}` : ""}
          </Txt>
        </Card>
      ) : null}

      <View style={{ gap: 4 }}>
        <Txt variant="displayS">{t("So far")}</Txt>
        <SessionBreakdown exercises={prog.exercises.filter((e) => e.doneSets.length).map((e) => ({ name: e.name, sets: e.doneSets.map((s) => ({ kg: s.kg, reps: s.reps })) }))} />
        {prog.exercises.some((e) => !e.doneSets.length) ? (
          <View>
            <Divider />
            <View style={{ paddingTop: 12, gap: 8 }}>
              <Txt variant="labelS" tone="tertiary">
                {t("Still to come")}
              </Txt>
              {prog.exercises.filter((e) => !e.doneSets.length).map((e) => (
                <Row key={e.name} gap={8}>
                  <Icon name="clock" size={13} color={colors.text.tertiary} strokeWidth={1.8} />
                  <Txt variant="bodyM" tone="secondary">
                    {e.name}, {e.total} {t("sets")}
                  </Txt>
                </Row>
              ))}
            </View>
          </View>
        ) : null}
      </View>

      <Txt variant="labelS" tone="tertiary">
        {t("Live sessions update every few seconds and disappear when the session ends.")}
      </Txt>
    </Screen>
  );
}
