import { useMemo, useState } from "react";
import { Pressable, View, useWindowDimensions } from "react-native";
import { useNav } from "@/nav";
import { useTheme } from "@/theme/ThemeProvider";
import { useDb } from "@/db/DbProvider";
import { useMe } from "@/store/me";
import { useNow } from "@/clock";
import { useNotes } from "@/store/notifications";
import { useWorkout } from "@/store/workout";
import { useSplit } from "@/store/split";
import { finished, fmtKg, liftTrend, locale, relativeDay, startOfWeek, weekDays, weeklyVolume } from "@/db/derive";
import { estimateMinutes } from "@/db/seed";
import { DEFAULT_FAVOURITES } from "@/db/types";
import { useT, usePlural } from "@/i18n";
import { Screen, Row, Section } from "@/components/ui/Screen";
import { Txt } from "@/components/ui/Text";
import { Icon } from "@/components/ui/Icon";
import { IconButton } from "@/components/ui/IconButton";
import { Avatar } from "@/components/ui/PhotoSlot";
import { WeekStrip } from "@/components/WeekStrip";
import { Card, Divider } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Stat, StatDivider } from "@/components/StatCard";
import { MacroLegend, MacroRing } from "@/components/MacroRing";
import { burnsOn, entriesOn, totals } from "@/nutrition/derive";
import { LineChart } from "@/components/LineChart";
import { BottomSheet, SheetGroup, SheetOption } from "@/components/ui/BottomSheet";
import { useSocial } from "@/store/social";
import { useWeight } from "@/store/weight";
import { GymCard } from "@/components/GymCard";
import { otherPosts } from "@/data/mock";
import { person } from "@/data/people";

/**
 * One line, always. The size follows the room next to the avatar and the bell
 * (Inter Extra Bold runs about 0.58 em per character), so a long name shrinks
 * instead of wrapping or cutting off. Native shrinks once more if needed.
 */
const greetingSize = (line: string, screenWidth: number) => {
  const room = screenWidth - 32 - 44 - 12 - 44 - 12;
  const size = Math.max(20, Math.min(28, Math.floor(room / (line.length * 0.58))));
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
  const router = useNav();
  const t = useT();
  const plural = usePlural();
  const { db } = useDb();
  const me = useMe();
  const now = useNow();
  const { unread } = useNotes();
  const { session, start } = useWorkout();
  const { split, nextDay, setOverride } = useSplit();
  const { isFollowing } = useSocial();
  const [choosing, setChoosing] = useState(false);
  const { width: screenWidth } = useWindowDimensions();

  const override = split.overridePlanId ? db.plans.find((p) => p.id === split.overridePlanId) : undefined;
  const plan = override ?? db.plans.find((p) => p.id === nextDay?.planId);
  const missed = useMemo(() => {
    const since = db.profile.lastFeedSeen ?? 0;
    const ageMs = (meta: string) => (/today/.test(meta) ? 2 * 3600000 : /yesterday/.test(meta) ? 26 * 3600000 : 3 * 86400000);
    return otherPosts.filter((p) => p.userId && isFollowing(p.userId) && now - ageMs(p.meta) > since).map((p) => ({ post: p, who: person(p.userId!) }));
  }, [db.profile.lastFeedSeen, isFollowing, now]);
  const running = !!session && !session.finishedAt;
  const done = useMemo(() => finished(db.sessions), [db.sessions]);
  const week = useMemo(() => weekDays(db.sessions), [db.sessions]);
  const eaten = useMemo(() => totals(entriesOn(db.foodLog, now), db.foods), [db.foodLog, db.foods, now]);
  const burned = useMemo(() => burnsOn(db.burns, now).reduce((s, b) => s + b.kcal, 0), [db.burns, now]);
  const weight = useWeight();
  const weighedToday = weight.on(now);
  const volume = useMemo(() => weeklyVolume(db.sessions, now, db.activeSession), [db.sessions, db.activeSession, now]);
  const thisWeek = useMemo(() => done.filter((s) => s.startedAt >= startOfWeek(now)).length, [done, now]);
  const goal = db.profile.daysPerWeek ?? 3;

  const favourites = db.profile.favourites ?? DEFAULT_FAVOURITES;
  const lifts = useMemo(
    () => favourites.map((id) => db.exercises.find((e) => e.id === id)).filter((e): e is NonNullable<typeof e> => !!e).map((ex) => ({ ex, points: liftTrend(db.sessions, ex.id) })),
    [favourites, db.exercises, db.sessions],
  );
  const lift = lifts.find((l) => l.points.length >= 2) ?? lifts[0] ?? null;
  const current = lift && lift.points.length ? lift.points[lift.points.length - 1].value : 0;
  const delta = lift && lift.points.length ? Math.round((current - lift.points[0].value) * 2) / 2 : 0;

  const startSession = () => {
    if (!running) start(plan?.id, plan?.name ?? nextDay?.name);
    router.push("/workout/active");
  };

  return (
    <Screen tabs>
      <Row gap={12}>
        <Pressable accessibilityRole="button" accessibilityLabel={t("Your profile")} onPress={() => router.push("/(tabs)/profile")}>
          <Avatar source={me.photo} size={44} initial={me.initial} />
        </Pressable>
        <View style={{ flex: 1, gap: 2 }}>
          <Txt variant="labelS" tone="tertiary">
            {new Date().toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long" })}
          </Txt>
          <Txt variant="pageTitle" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} style={greetingSize(`${t(greetingKey())}, ${db.profile.first}`, screenWidth)}>
            {t(greetingKey())}, {db.profile.first}
          </Txt>
        </View>
        <IconButton name="bell" badge={unread > 0} onPress={() => router.push("/notifications")} accessibilityLabel={t("Notifications")} />
      </Row>

      {/* Where you train, and how busy it is there: the first thing on the page. */}
      <GymCard />

      <View style={{ gap: 20 }}>
        <WeekStrip days={week} onPress={(d) => d.sessionId && router.push(`/workout/${d.sessionId}`)} />

        <Card padding={16} gap={8}>
          <Txt variant="labelM" tone={running ? "ember" : "tertiary"}>
            {running ? t("Session running") : t("Today")}
          </Txt>
              <Pressable accessibilityRole="button" accessibilityLabel={t("Choose another workout")} disabled={running} onPress={() => setChoosing(true)} hitSlop={10} style={({ pressed }) => ({ gap: 4, opacity: pressed ? 0.7 : 1 })}>
                <Row gap={8}>
                  <Txt variant="displayM">{running ? session?.planName : plan ? plan.name : (nextDay?.rest ? t("Rest day") : nextDay?.name) ?? t("Quick session")}</Txt>
                  {!running ? <Icon name="chevronDown" size={18} color={colors.text.tertiary} strokeWidth={2} /> : null}
                </Row>
                {override && !running ? (
                  <Txt variant="labelS" tone="tertiary">
                    {t("Instead of {name} from your split", { name: nextDay?.name ?? "" })}
                  </Txt>
                ) : null}
              </Pressable>
          {plan ? (
            <Txt variant="labelS" tone="tertiary">
              {plural(plan.exercises.length, "{n} exercise", "{n} exercises")}, {t("{n} min", { n: estimateMinutes(plan) })}
            </Txt>
          ) : null}
          <Button label={running ? t("Continue session") : nextDay?.rest ? t("Rest day, start anyway") : t("Start session")} size="M" iconRight="arrowRight" onPress={startSession} style={{ marginTop: 4 }} />
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
                  {missed.map((m) => t(m.post.meta.split(", ")[0])).join(", ")}
                </Txt>
              </View>
              <Icon name="chevronRight" size={18} color={colors.text.tertiary} />
            </Pressable>
          ) : null}

      {/* Food and weight in one row, not as equals: food carries a ring and its key and takes the room, weight is one figure and takes what is left. */}
      <Row gap={12} align="stretch">
        <Card padding={14} gap={10} onPress={() => router.push("/(tabs)/food")} accessibilityLabel={t("Food")} style={{ flex: 1.9 }}>
          <Txt variant="labelM" tone="secondary">
            {t("Food")}
          </Txt>
          {db.profile.food ? (
            <Row gap={10}>
              <MacroRing size={72} stroke={8} eaten={eaten} budget={db.profile.targets ? db.profile.targets.kcal + burned : undefined}>
                <Txt variant="labelL" tabular>
                  {Math.abs(Math.round(db.profile.targets ? db.profile.targets.kcal + burned - eaten.kcal : eaten.kcal)).toLocaleString(locale)}
                </Txt>
                <Txt variant="labelS" tone="secondary">
                  {!db.profile.targets ? t("kcal eaten") : db.profile.targets.kcal + burned - eaten.kcal >= 0 ? t("kcal left") : t("kcal over")}
                </Txt>
              </MacroRing>
              <View style={{ flex: 1 }}>
                <MacroLegend eaten={eaten} short />
              </View>
            </Row>
          ) : (
            <Txt variant="bodyS" tone="secondary">
              {t("A few questions and your need is worked out.")}
            </Txt>
          )}
        </Card>

        <Card padding={14} gap={6} onPress={() => router.push("/weight")} accessibilityLabel={t("Weight")} style={{ flex: 1 }}>
          <Txt variant="labelM" tone="secondary">
            {t("Weight")}
          </Txt>
          <View style={{ flex: 1, justifyContent: "center", gap: 2 }}>
            <Row gap={3} align="baseline">
              <Txt variant="numberM" tabular>
                {weight.latest ? weight.latest.kg.toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : "–"}
              </Txt>
              <Txt variant="labelS" tone="secondary">
                kg
              </Txt>
            </Row>
            <Txt variant="labelS" tone="tertiary" numberOfLines={2}>
              {weighedToday ? t("Today") : weight.latest ? relativeDay(weight.latest.at) : t("Not logged yet")}
            </Txt>
          </View>
          {weighedToday ? null : (
            <Row gap={2}>
              <Txt variant="labelS" tone="sage">
                {t("Log today")}
              </Txt>
              <Icon name="chevronRight" size={12} color={colors.fuel.sage} strokeWidth={2.2} />
            </Row>
          )}
        </Card>
      </Row>

      {/* One glance at the data, and a door to the rest of it. */}
      <Section title={t("Data")} action={t("Open")} onAction={() => router.push("/progress")}>
        <Card padding={20} gap={16} onPress={() => router.push("/progress")}>
          <Row gap={16} align="stretch">
            <Stat
              size="M"
              label={t("This week")}
              value={fmtKg(volume.current)}
              unit="kg"
              delta={volume.delta === null ? t("First week with a session") : t("{p}% on last week", { p: `${volume.delta >= 0 ? "+" : ""}${volume.delta}` })}
              deltaTone={volume.delta === null ? "tertiary" : volume.delta >= 0 ? "success" : "danger"}
              deltaIcon={volume.delta !== null && volume.delta < 0 ? "trendingDown" : "trendingUp"}
            />
            <StatDivider />
            <Stat size="M" label={t("Sessions")} value={String(thisWeek)} unit={t("of {n}", { n: goal })} />
          </Row>

          {lift && lift.points.length >= 2 ? (
            <View style={{ gap: 8 }}>
              <Divider />
              <Row gap={12} align="baseline" style={{ paddingTop: 4 }}>
                <Txt variant="labelM" tone="secondary" style={{ flex: 1 }} numberOfLines={1}>
                  {lift.ex.name}
                </Txt>
                <Row gap={4} align="baseline">
                  <Txt variant="numberM" tabular>
                    {current}
                  </Txt>
                  <Txt variant="labelS" tone="secondary">
                    kg
                  </Txt>
                  <Txt variant="labelS" tone={delta >= 0 ? "ember" : "danger"} style={{ paddingLeft: 4 }}>
                    {delta >= 0 ? "+" : ""}
                    {delta}
                  </Txt>
                </Row>
              </Row>
              <LineChart points={lift.points.slice(-8)} height={56} still />
            </View>
          ) : null}

          <Row gap={8}>
            <Txt variant="labelS" tone="tertiary" style={{ flex: 1 }}>
              {t("Volume per week, muscle groups, every lift")}
            </Txt>
            <Icon name="chevronRight" size={16} color={colors.text.tertiary} strokeWidth={2} />
          </Row>
        </Card>
      </Section>

      <BottomSheet visible={choosing} onClose={() => setChoosing(false)} title={t("Today's workout")} subtitle={t("Your split says {name}. Pick something else for today; the split keeps its order.", { name: nextDay?.rest ? t("Rest day") : (nextDay?.name ?? "") })}>
        <SheetGroup>
        {db.plans.map((p) => (
          <SheetOption key={p.id} icon="dumbbell" label={p.name} sub={[p.focus, plural(p.exercises.length, "{n} exercise", "{n} exercises")].filter(Boolean).join(", ")} selected={plan?.id === p.id} onPress={() => { setOverride(p.id === nextDay?.planId ? undefined : p.id); setChoosing(false); }} />
        ))}
        </SheetGroup>
        {override ? (
          <SheetGroup>
            <SheetOption icon="reload" label={t("Back to the split")} sub={nextDay?.name} onPress={() => { setOverride(undefined); setChoosing(false); }} />
          </SheetGroup>
        ) : null}
      </BottomSheet>
    </Screen>
  );
}

