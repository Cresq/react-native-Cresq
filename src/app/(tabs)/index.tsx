import { useMemo, useState } from "react";
import { Pressable, ScrollView, View, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "@/theme/ThemeProvider";
import { useDb } from "@/db/DbProvider";
import { useWorkout } from "@/store/workout";
import { useSplit } from "@/store/split";
import { finished, fmtKg, liftTrend, locale, shortDate, startOfWeek, weekDays, weeklyVolume } from "@/db/derive";
import { estimateMinutes } from "@/db/seed";
import { DEFAULT_FAVOURITES } from "@/db/types";
import { photos } from "@/data/mock";
import { useLanguage, useT } from "@/i18n";
import { Screen, Row, Section } from "@/components/ui/Screen";
import { Txt } from "@/components/ui/Text";
import { Icon } from "@/components/ui/Icon";
import { IconButton } from "@/components/ui/IconButton";
import { Avatar } from "@/components/ui/PhotoSlot";
import { WeekStrip } from "@/components/WeekStrip";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { Stat, StatDivider } from "@/components/StatCard";
import { LineChart } from "@/components/LineChart";
import { BottomSheet, SheetOption } from "@/components/ui/BottomSheet";
import { useSocial } from "@/store/social";
import { otherPosts } from "@/data/mock";
import { person } from "@/data/people";

/**
 * One line, always. The size follows the room next to the avatar and the bell
 * (Inter Extra Bold runs about 0.58 em per character), so a long name shrinks
 * instead of wrapping or cutting off. Native shrinks once more if needed.
 */
const greetingSize = (line: string, screenWidth: number) => {
  const room = screenWidth - 32 - 44 - 12 - 44 - 12;
  const size = Math.max(20, Math.min(34, Math.floor(room / (line.length * 0.58))));
  return { fontSize: size, lineHeight: Math.round(size * 1.18) };
};

const greetingKey = () => {
  const h = new Date().getHours();
  return h < 12 ? "Morning" : h < 18 ? "Afternoon" : "Evening";
};

/**
 * Home is one glance and nothing more: the week so far, the session you are
 * about to do, two figures, and one lift's trend. Everything that can be read
 * a level deeper lives a level deeper.
 */
export default function Home() {
  const { colors } = useTheme();
  const router = useRouter();
  const t = useT();
  const lang = useLanguage();
  const { db, update } = useDb();
  const { session, start } = useWorkout();
  const { split, nextDay, setOverride } = useSplit();
  const { isFollowing } = useSocial();
  const [choosing, setChoosing] = useState(false);
  const [managing, setManaging] = useState(false);
  const { width: screenWidth } = useWindowDimensions();

  const override = split.overridePlanId ? db.plans.find((p) => p.id === split.overridePlanId) : undefined;
  const plan = override ?? db.plans.find((p) => p.id === nextDay?.planId);
  const missed = useMemo(() => {
    const since = db.profile.lastFeedSeen ?? 0;
    const ageMs = (meta: string) => (/today/.test(meta) ? 2 * 3600000 : /yesterday/.test(meta) ? 26 * 3600000 : 3 * 86400000);
    return otherPosts.filter((p) => p.userId && isFollowing(p.userId) && Date.now() - ageMs(p.meta) > since).map((p) => ({ post: p, who: person(p.userId!) }));
  }, [db.profile.lastFeedSeen, isFollowing]);
  const running = !!session && !session.finishedAt;
  const done = useMemo(() => finished(db.sessions), [db.sessions]);
  const week = useMemo(() => weekDays(db.sessions), [db.sessions]);
  const volume = useMemo(() => weeklyVolume(db.sessions), [db.sessions]);
  const thisWeek = useMemo(() => done.filter((s) => s.startedAt >= startOfWeek(Date.now())).length, [done]);
  const goal = db.profile.daysPerWeek ?? 3;

  const favourites = db.profile.favourites ?? DEFAULT_FAVOURITES;
  const lifts = useMemo(
    () => favourites.map((id) => db.exercises.find((e) => e.id === id)).filter((e): e is NonNullable<typeof e> => !!e).map((ex) => ({ ex, points: liftTrend(db.sessions, ex.id) })),
    [favourites, db.exercises, db.sessions],
  );
  const [liftId, setLiftId] = useState<string | null>(null);
  const lift = lifts.find((l) => l.ex.id === liftId) ?? lifts.find((l) => l.points.length >= 2) ?? lifts[0] ?? null;
  const current = lift && lift.points.length ? lift.points[lift.points.length - 1].value : 0;
  const delta = lift && lift.points.length ? Math.round((current - lift.points[0].value) * 2) / 2 : 0;

  /** Take a lift off Home. Its sessions and records are untouched. */
  const dropFavourite = (id: string) => {
    update((d) => {
      const cur = d.profile.favourites ?? DEFAULT_FAVOURITES;
      return { ...d, profile: { ...d.profile, favourites: cur.filter((x) => x !== id) } };
    });
    if (liftId === id) setLiftId(null);
  };

  const startSession = () => {
    if (!running) start(plan?.id, plan?.name ?? nextDay?.name);
    router.push("/workout/active");
  };
  const names = (running ? session!.exercises.map((e) => e.name) : plan ? plan.exercises.map((pe) => db.exercises.find((e) => e.id === pe.exerciseId)?.name ?? "") : []).map((n) => n.toLowerCase());
  const three = names.slice(0, 3).join(", ");
  const more = (n: number) => (lang === "nl" ? `+${n} meer` : `+${n} more`);
  const exerciseLine = names.length === 0 ? (nextDay?.focus ?? "") : three.length <= 44 ? (names.length > 3 ? `${three} ${more(names.length - 3)}` : three) : `${names.slice(0, 2).join(", ")} ${more(names.length - 2)}`;

  return (
    <Screen tabs>
      <Row gap={12}>
        <Pressable accessibilityRole="button" accessibilityLabel={t("Your profile")} onPress={() => router.push("/(tabs)/profile")}>
          <Avatar source={photos.selfie} size={44} />
        </Pressable>
        <View style={{ flex: 1, gap: 2 }}>
          <Txt variant="labelS" tone="tertiary">
            {new Date().toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long" })}
          </Txt>
          <Txt variant="displayXL" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} style={greetingSize(`${t(greetingKey())}, ${db.profile.first}`, screenWidth)}>
            {t(greetingKey())}, {db.profile.first}
          </Txt>
        </View>
        <IconButton name="bell" badge onPress={() => router.push("/notifications")} accessibilityLabel={t("Notifications")} />
      </Row>

      <View style={{ gap: 20 }}>
        <WeekStrip days={week} onPress={(d) => d.sessionId && router.push(`/workout/${d.sessionId}`)} />

        <Card padding={20} gap={14}>
          <Txt variant="labelM" tone={running ? "ember" : "tertiary"}>
            {running ? t("Session running") : t("Today")}
          </Txt>
              <Pressable accessibilityRole="button" accessibilityLabel={t("Choose another workout")} disabled={running} onPress={() => setChoosing(true)} style={({ pressed }) => ({ gap: 4, opacity: pressed ? 0.7 : 1 })}>
                <Row gap={6}>
                  <Txt variant="displayL">{running ? session?.planName : plan ? plan.name : (nextDay?.rest ? t("Rest day") : nextDay?.name) ?? t("Quick session")}</Txt>
                  {!running ? <Icon name="chevronDown" size={18} color={colors.text.tertiary} strokeWidth={2} /> : null}
                </Row>
                {exerciseLine ? (
                  <Txt variant="bodyM" tone="secondary">
                    {exerciseLine.charAt(0).toUpperCase() + exerciseLine.slice(1)}
                  </Txt>
                ) : null}
                {override && !running ? (
                  <Txt variant="labelS" tone="tertiary">
                    {t("Instead of {name} from your split", { name: nextDay?.name ?? "" })}
                  </Txt>
                ) : null}
              </Pressable>
          {plan ? (
            <Txt variant="labelS" tone="tertiary">
              {t("{n} exercises", { n: plan.exercises.length })}, {t("{n} min", { n: estimateMinutes(plan) })}
            </Txt>
          ) : null}
          <Button label={running ? t("Continue session") : nextDay?.rest ? t("Rest day, start anyway") : t("Start session")} iconRight="arrowRight" onPress={startSession} style={{ marginTop: 4 }} />
        </Card>
      </View>

          {missed.length ? (
            <Pressable accessibilityRole="button" accessibilityLabel={t("Open the feed")} onPress={() => router.push("/(tabs)/feed")} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, opacity: pressed ? 0.7 : 1 })}>
              <Row gap={0}>
                {missed.slice(0, 3).map(({ post, who }, i) => (
                  <View key={post.id} style={{ marginLeft: i ? -10 : 0, borderWidth: 2, borderColor: colors.bg.ground, borderRadius: 20 }}>
                    <Avatar source={who?.avatar} size={36} initial={post.name[0]} />
                  </View>
                ))}
              </Row>
              <View style={{ flex: 1, gap: 1 }}>
                <Txt variant="labelL">{missed.length === 1 ? t("{name} trained since you last looked", { name: missed[0].post.name.split(" ")[0] }) : t("{name} and {n} others trained since you last looked", { name: missed[0].post.name.split(" ")[0], n: missed.length - 1 })}</Txt>
                <Txt variant="bodyS" tone="tertiary">
                  {missed.map((m) => m.post.meta.split(", ")[0]).join(", ")}
                </Txt>
              </View>
              <Icon name="chevronRight" size={18} color={colors.text.tertiary} />
            </Pressable>
          ) : null}

      {/* Two figures, no change lines: the week strip above already says how the week is going. */}
      <Row gap={16} align="stretch">
        <Stat label={t("This week")} value={fmtKg(volume.current)} unit="kg" />
        <StatDivider />
        <Stat label={t("Sessions")} value={String(thisWeek)} unit={t("of {n}", { n: goal })} />
      </Row>

      <Section title={t("Progress")} action={t("All lifts")} onAction={() => router.push("/(tabs)/profile")}>
        <Card padding={18} gap={14}>
          {/* One lift at a time: the chips say which, the chart answers. */}
          <Row gap={10}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 8 }} style={{ flex: 1, marginLeft: -18, paddingLeft: 18 }}>
              {lifts.map((l) => (
                <Chip key={l.ex.id} label={l.ex.name} selected={lift?.ex.id === l.ex.id} onPress={() => setLiftId(l.ex.id)} />
              ))}
            </ScrollView>
            <IconButton name="addPlus" size={36} iconSize={18} tone="raised" onPress={() => setManaging(true)} accessibilityLabel={t("Choose the lifts on Home")} />
          </Row>

          {lift && lift.points.length >= 2 ? (
            <View style={{ gap: 12 }}>
              <Pressable accessibilityRole="button" accessibilityLabel={t("Open {name}", { name: lift.ex.name })} onPress={() => router.push(`/progress/${lift.ex.id}`)} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
                <Row justify="space-between" align="flex-end">
                  <Txt variant="labelS" tone="tertiary">
                    {t("Estimated 1RM")}
                  </Txt>
                  <Row gap={4} align="baseline">
                    <Txt variant="numberL" tabular>
                      {current}
                    </Txt>
                    <Txt variant="labelM" tone="secondary">
                      kg
                    </Txt>
                    <Txt variant="labelS" tone={delta >= 0 ? "ember" : "warning"} style={{ paddingLeft: 4 }}>
                      {delta >= 0 ? "+" : ""}
                      {delta}
                    </Txt>
                  </Row>
                </Row>
              </Pressable>
              <LineChart points={lift.points.slice(-8)} labels={lift.points.slice(-8).map((p, i, a) => (i === a.length - 1 ? t("Now") : shortDate(p.date)))} scrubLabels={lift.points.slice(-8).map((p) => shortDate(p.date))} height={110} onPress={() => router.push(`/progress/${lift.ex.id}`)} />
            </View>
          ) : (
            <View style={{ gap: 4, paddingVertical: 8 }}>
              <Txt variant="displayM">{lift ? lift.ex.name : t("Pick your lifts")}</Txt>
              <Txt variant="bodyM" tone="secondary">
                {lift ? t("Log {name} in two sessions and its trend appears here.", { name: lift.ex.name.toLowerCase() }) : t("Add the exercises you want to follow and their trend shows here.")}
              </Txt>
            </View>
          )}
        </Card>
      </Section>

      <BottomSheet visible={managing} onClose={() => setManaging(false)} title={t("Lifts on Home")} subtitle={t("Tap one to take it off. Its sessions and records stay.")}>
        {lifts.map((l) => (
          <SheetOption key={l.ex.id} icon="close" label={l.ex.name} sub={l.points.length ? t("{n} sessions", { n: l.points.length }) : t("Not logged yet")} onPress={() => dropFavourite(l.ex.id)} />
        ))}
        <SheetOption icon="addPlus" label={t("Add a lift")} sub={t("From your exercise library")} onPress={() => { setManaging(false); router.push("/exercises?favourite=1"); }} />
      </BottomSheet>

      <BottomSheet visible={choosing} onClose={() => setChoosing(false)} title={t("Today's workout")} subtitle={t("Your split says {name}. Pick something else for today; the split keeps its order.", { name: nextDay?.rest ? t("Rest day") : (nextDay?.name ?? "") })}>
        {db.plans.map((p) => (
          <SheetOption key={p.id} icon="dumbbell" label={p.name} sub={[p.focus, t("{n} exercises", { n: p.exercises.length })].filter(Boolean).join(", ")} selected={plan?.id === p.id} onPress={() => { setOverride(p.id === nextDay?.planId ? undefined : p.id); setChoosing(false); }} />
        ))}
        {override ? <SheetOption icon="reload" label={t("Back to the split")} sub={nextDay?.name} onPress={() => { setOverride(undefined); setChoosing(false); }} /> : null}
      </BottomSheet>
    </Screen>
  );
}

