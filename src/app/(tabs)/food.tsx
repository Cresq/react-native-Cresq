import { useCallback, useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { useNav } from "@/nav";
import { useTheme } from "@/theme/ThemeProvider";
import { useT, useLanguage, localeOf } from "@/i18n";
import { useNow } from "@/clock";
import { haptic } from "@/haptics";
import { gesture, opacity, springs, timings, useReducedMotion } from "@/motion";
import { useTween } from "@/tween";
import { startOfDay, startOfWeek } from "@/db/derive";
import { useFood } from "@/store/food";
import { useHealth } from "@/store/health";
import { useMeals } from "@/store/meals";
import { KIND_NAME } from "@/health/types";
import { MEALS, burnsOn, entriesOn, estimateSessionBurn, fmtG, fmtKcal, portion, totals } from "@/nutrition/derive";
import { addDays, dayMarks, dayOffset, kcalOnTarget, macroReached, setLoggingDay } from "@/nutrition/day";
import type { Burn, FoodEntry, Meal, MealKey, NutritionTargets } from "@/db/types";
import { Screen, Row } from "@/components/ui/Screen";
import { Txt } from "@/components/ui/Text";
import { Card, Divider } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Chip } from "@/components/ui/Chip";
import { Icon } from "@/components/ui/Icon";
import { BottomSheet, SheetGroup, SheetInputRow, SheetOption, SheetTextRow } from "@/components/ui/BottomSheet";
import { DayCalendar, DayDot } from "@/components/DayCalendar";
import { FoodMark } from "@/components/FoodMark";
import { FoodWelcome } from "@/components/FoodWelcome";
import { MacroBars, MacroRing } from "@/components/MacroRing";
import { MacroTargets } from "@/components/MacroTargets";
import { useDb } from "@/db/DbProvider";

/** The meals that are always on the page; pre- and post-workout appear once something is logged to them. */
const MAIN: Meal[] = ["breakfast", "lunch", "dinner", "snack"];
/** Without a weight on file the session estimate assumes this, and says so. */
const ASSUMED_KG = 75;
/** The product's picture in a row of the day: big enough to recognise a pack by, small enough that the row stays a row. */
const ROW_MARK = 34;
/** How far the days go: two years back, because a log is worth looking back in, and two months ahead, which is as far as anybody plans what they eat. */
const DAYS_BACK = 730;
const DAYS_AHEAD = 60;

/**
 * Food, one day at a time. The day on the page is today unless another is
 * picked: a swipe to either side turns to the next or the previous day, the
 * week under the title jumps within it, and the calendar goes anywhere. A day
 * that is behind can still be filled in, a day that is ahead can be planned,
 * and every day wears a small mark that says whether anything is in it.
 *
 * The page is an overview first: the day as a ring with the three macros as
 * bars beside it, then the meals as one line each with what was eaten under
 * them. Adding something is the plus at the top, where the thumb of the other
 * hand already is for the calendar.
 *
 * Sage is this world's colour, as the theme always intended; ember stays with
 * training, which is why the one ember thing here is the energy you burned.
 */
export default function FoodTab() {
  const { colors, scheme } = useTheme();
  const router = useNav();
  const t = useT();
  const locale = localeOf(useLanguage());
  const now = useNow();
  const reduced = useReducedMotion();
  const { db, update } = useDb();
  const { foods, log, byId, targets, removeEntry, setTargets, burns, addBurn, removeBurn } = useFood();
  const store = useHealth();
  const meals = useMeals();
  /** The day on the page. Nothing chosen means today, so a page left open over midnight moves on with the date. */
  const [chosen, setChosen] = useState<number | null>(null);
  const [calendar, setCalendar] = useState(false);
  const [picked, setPicked] = useState<FoodEntry | null>(null);
  const [burnSheet, setBurnSheet] = useState(false);
  const [burnKcal, setBurnKcal] = useState("");
  const [burnLabel, setBurnLabel] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [editingTargets, setEditingTargets] = useState(false);
  const [afterSheet, setAfterSheet] = useState<(() => void) | null>(null);
  const [draftTargets, setDraftTargets] = useState<NutritionTargets>({ kcal: 0, protein: 0, carbs: 0, fat: 0 });
  const slide = useSharedValue(0);
  const fade = useSharedValue(1);

  // Opening the tab is when a workout recorded since the last look should show up.
  const { sync } = store;
  useFocusEffect(
    useCallback(() => {
      void sync();
    }, [sync]),
  );

  const today = startOfDay(now);
  const day = chosen ?? today;
  const offset = dayOffset(day, now);
  const ahead = day > today;
  const earliest = addDays(today, -DAYS_BACK);
  const latest = addDays(today, DAYS_AHEAD);

  const entries = useMemo(() => entriesOn(log, day), [log, day]);
  const sum = useMemo(() => totals(entries, foods), [entries, foods]);
  // The meals on the page, in the order of a day: the app's six with the person's own after them. Pre- and post-workout only show once something is in them; a meal somebody made is always there, because they made it to use it.
  const mealKeys: MealKey[] = [...MEALS, ...meals.own.map((m) => m.id)];
  const shownMeals = mealKeys.filter((m) => MAIN.includes(m as Meal) || m.startsWith("own_") || entries.some((e) => e.meal === m));
  const burnedDay = useMemo(() => burnsOn(burns, day), [burns, day]);
  const burned = burnedDay.reduce((s, b) => s + b.kcal, 0);
  // What the day still holds: the target, plus what was burned, minus what was eaten.
  const left = targets ? Math.round(targets.kcal + burned - sum.kcal) : null;
  const [shownKcal] = useTween([left === null ? sum.kcal : Math.abs(left)]);
  const marks = useMemo(() => dayMarks(log, foods, burns, targets), [log, foods, burns, targets]);
  // Sessions finished on this day, for the estimate the sheet offers when nothing measured covers them.
  const sessionsDay = useMemo(() => db.sessions.filter((s) => s.finishedAt && s.finishedAt >= day && s.finishedAt < addDays(day, 1)), [db.sessions, day]);
  const weightKg = db.profile.food?.weightKg;
  const burnN = Math.round(Number(burnKcal.replace(",", ".")) || 0);
  const burnOk = burnN > 0 && burnN <= 5000;

  const n = (v: number) => Math.round(v).toLocaleString(locale);
  const dateOf = (d: number, options: Intl.DateTimeFormatOptions) => new Date(d).toLocaleDateString(locale, options);
  // A day close to today is named by how close it is; any other by its weekday.
  const dayLabel = offset === 0 ? `${t("Today")}, ${dateOf(day, { day: "numeric", month: "long" })}` : offset === -1 ? `${t("Yesterday")}, ${dateOf(day, { day: "numeric", month: "long" })}` : offset === 1 ? `${t("Tomorrow")}, ${dateOf(day, { day: "numeric", month: "long" })}` : dateOf(day, { weekday: "long", day: "numeric", month: "long" });

  /** Turn to a day. The page comes in from the side it lies on, so the direction of time stays where the thumb left it. */
  const goTo = (d: number) => {
    const to = Math.min(latest, Math.max(earliest, startOfDay(d)));
    if (to === day) {
      slide.set(withSpring(0, springs.snappy));
      return;
    }
    haptic("select");
    setChosen(to === today ? null : to);
    slide.set(reduced ? 0 : (to > day ? 1 : -1) * gesture.pageEnter);
    slide.set(withSpring(0, springs.snappy));
    fade.set(0);
    fade.set(withTiming(1, timings.base));
  };
  const turn = (by: number) => goTo(addDays(day, by));

  const follow = gesture.pageFollow;
  const commit = gesture.pageCommit;
  const flick = gesture.flick;
  const swipe = Gesture.Pan()
    .activeOffsetX([-gesture.pageStart, gesture.pageStart])
    .failOffsetY([-gesture.pageCross, gesture.pageCross])
    .onUpdate((e) => {
      slide.set(e.translationX * follow);
    })
    .onEnd((e) => {
      const meant = Math.abs(e.translationX) > commit || Math.abs(e.velocityX) > flick;
      if (meant) runOnJS(turn)(e.translationX < 0 ? 1 : -1);
      else slide.set(withSpring(0, springs.snappy));
    });
  const pageStyle = useAnimatedStyle(() => ({ opacity: fade.get(), transform: [{ translateX: slide.get() }] }));

  // Whatever is added from here belongs to the day on the page; the screens behind the plus read it from there.
  const scan = () => {
    setLoggingDay(chosen);
    router.push("/food/scan");
  };
  const search = (meal?: MealKey) => {
    setLoggingDay(chosen);
    router.push(meal ? `/food/log?meal=${meal}` : "/food/log");
  };
  const openBurn = () => {
    setBurnKcal("");
    setBurnLabel("");
    setBurnSheet(true);
  };
  const saveBurn = () => {
    if (!burnOk) return;
    // Today it is stamped with now; on another day it is filed at that day's noon.
    addBurn({ kcal: burnN, label: burnLabel.trim() || undefined, at: chosen === null ? undefined : day + 43_200_000 });
    haptic("done");
    setBurnKcal("");
    setBurnLabel("");
    setBurnSheet(false);
  };
  const connect = async () => {
    setConnecting(true);
    const ok = await store.connect();
    setConnecting(false);
    if (ok) haptic("done");
  };
  const openTargets = () => {
    setDraftTargets(targets ?? { kcal: 0, protein: 0, carbs: 0, fat: 0 });
    setEditingTargets(true);
  };
  const targetsReady = draftTargets.kcal > 0 && draftTargets.protein > 0 && draftTargets.carbs > 0 && draftTargets.fat > 0;
  const saveTargets = () => {
    if (!targetsReady) return;
    setTargets(draftTargets);
    haptic("done");
    setEditingTargets(false);
  };
  /** Back to the questions: the welcome takes the tab again until they are answered. */
  const askAgain = () => {
    setEditingTargets(false);
    update((d) => ({ ...d, profile: { ...d.profile, food: undefined } }));
  };

  // The first time: a welcome and two questions, in the tab itself, before any of this.
  if (!db.profile.food) return <FoodWelcome />;

  // Where the burned figures come from, said plainly whichever case this phone is in.
  const storeLine = store.connected
    ? t("Connected. Today's workouts count by themselves.")
    : store.unavailable === "needs-build"
      ? t("Connecting works in the installed CresQ app, not yet in Expo Go.")
      : store.unavailable === "android"
        ? t("Health Connect follows. Until then you add it yourself.")
        : store.unavailable === "web"
          ? t("Connecting happens on your phone.")
          : store.unavailable === "no-store"
            ? t("This device has no health app to read from.")
            : t("Connect it and the workouts from your watch count by themselves.");
  const burnName = (b: Burn) => (b.source === "health" ? t(KIND_NAME[b.kind ?? "other"]) : (b.label ?? t("Burned")));
  const burnSub = (b: Burn) => (b.source === "health" ? [t(store.name), b.via].filter(Boolean).join(", ") : b.sessionId ? t("Estimate from your session") : t("Entered by you"));

  // This day's sessions that nothing counts yet: not covered by a measured workout from the health store, not added already.
  const openSessions = sessionsDay
    .filter((s) => {
      const end = s.finishedAt ?? s.startedAt;
      if (burnedDay.some((b) => b.source === "health" && (b.from ?? 0) < end && (b.to ?? 0) > s.startedAt)) return false;
      return !burnedDay.some((b) => b.sessionId === s.id);
    })
    .map((s) => {
      const minutes = Math.max(1, Math.round(((s.finishedAt ?? s.startedAt) - s.startedAt) / 60_000));
      const kg = weightKg ?? ASSUMED_KG;
      return { s, minutes, kg, est: estimateSessionBurn(minutes, kg) };
    });

  // What the day has reached, said with a small mark rather than a banner: the energy, and all three macros with it.
  const kcalReached = !ahead && !!targets && kcalOnTarget(sum.kcal, targets.kcal + burned);
  const allReached = kcalReached && (["protein", "carbs", "fat"] as const).every((k) => macroReached(k, sum[k], targets?.[k]));
  const week = Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(day), i));

  return (
    <Screen tabs>
      <GestureDetector gesture={swipe} touchAction="pan-y">
        <View style={{ gap: 16 }}>
          <Row gap={10} align="flex-end">
            <View style={{ flex: 1, gap: 1 }}>
              <Txt variant="labelM" tone="tertiary" numberOfLines={1}>
                {dayLabel}
              </Txt>
              <Txt variant="pageTitle">{t("Food")}</Txt>
            </View>
            <IconButton name="calendar" onPress={() => setCalendar(true)} accessibilityLabel={t("Go to a day")} />
            <IconButton name="addPlus" tone="sageSolid" onPress={() => search()} accessibilityLabel={t("Add food")} />
          </Row>

          {/* The week the day is in. Each day wears its mark: something in it, on target, or planned. */}
          <View style={{ gap: 6 }}>
            <Row gap={0}>
              {week.map((d) => {
                const on = d === day;
                const out = d < earliest || d > latest;
                return (
                  <Pressable
                    key={d}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on, disabled: out }}
                    accessibilityLabel={dateOf(d, { weekday: "long", day: "numeric", month: "long" })}
                    disabled={out}
                    onPress={() => goTo(d)}
                    hitSlop={{ top: 6, bottom: 6 }}
                    style={({ pressed }) => ({ flex: 1, alignItems: "center", gap: 3, opacity: out ? 0.3 : pressed ? opacity.pressed : 1 })}
                  >
                    <Txt variant="labelS" tone={d === today ? "sage" : "tertiary"}>
                      {dateOf(d, { weekday: "narrow" })}
                    </Txt>
                    <View style={{ width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: on ? colors.fuel.sage : "transparent", borderWidth: d === today && !on ? 1 : 0, borderColor: colors.fuel.sage }}>
                      <Txt variant="labelM" tabular style={{ color: on ? colors.fuel.on : d > today ? colors.text.secondary : colors.text.primary }}>
                        {new Date(d).getDate()}
                      </Txt>
                    </View>
                    <DayDot mark={marks.get(d)} future={d > today} />
                  </Pressable>
                );
              })}
            </Row>
            {chosen !== null ? (
              <Pressable accessibilityRole="button" onPress={() => goTo(today)} hitSlop={10} style={({ pressed }) => ({ alignSelf: "center", flexDirection: "row", alignItems: "center", gap: 4, opacity: pressed ? opacity.pressed : 1 })}>
                <Icon name={ahead ? "chevronLeft" : "chevronRight"} size={12} color={colors.fuel.sage} strokeWidth={2.4} />
                <Txt variant="labelS" tone="sage">
                  {t("Back to today")}
                </Txt>
              </Pressable>
            ) : null}
          </View>

          <Animated.View style={[{ gap: 16 }, pageStyle]}>
            {/* The day. Pressing the figures is how the targets, and the questions behind them, are changed; what was burned is the small chip under them. */}
            <Card padding={16} gap={12} style={{ backgroundColor: colors.fuel.soft, borderWidth: 1, borderColor: colors.fuel.line }}>
              <Pressable accessibilityRole="button" accessibilityLabel={t("Daily targets")} onPress={openTargets} style={({ pressed }) => ({ gap: 12, opacity: pressed ? opacity.pressed : 1 })}>
                <Row gap={16}>
                  <MacroRing size={104} stroke={10} eaten={sum} budget={targets ? targets.kcal + burned : undefined} track={colors.fuel.sage} trackOpacity={scheme === "light" ? 0.3 : 0.16}>
                    <Txt variant="numberM" tabular>
                      {n(shownKcal)}
                    </Txt>
                    <Txt variant="labelS" tone="secondary">
                      {left === null ? (ahead ? t("kcal planned") : t("kcal eaten")) : left >= 0 ? t("kcal left") : t("kcal over")}
                    </Txt>
                  </MacroRing>
                  <View style={{ flex: 1 }}>
                    <MacroBars eaten={sum} targets={targets} />
                  </View>
                </Row>
                <Row gap={12}>
                  <Figure label={ahead ? t("Planned") : t("Eaten")} value={n(sum.kcal)} />
                  <Figure label={t("Burned")} value={burned ? `+${n(burned)}` : "0"} />
                  <Figure label={t("Target")} value={targets ? n(targets.kcal) : t("none")} />
                </Row>
              </Pressable>
              {kcalReached ? <Chip label={allReached ? t("Calories and all three macros on target") : t("Calories on target")} icon={allReached ? "trophy" : "circleCheck"} tone={allReached ? "gold" : "success"} size="S" style={{ alignSelf: "flex-start" }} /> : null}
              <Row gap={8} justify="space-between">
                {ahead ? <View /> : <Chip label={burned ? t("+{n} kcal burned", { n: n(burned) }) : t("Add burned kcal")} icon="flame" tone="ember" size="S" onPress={openBurn} />}
                <Pressable accessibilityRole="button" onPress={openTargets} hitSlop={8} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 2, opacity: pressed ? opacity.pressed : 1 })}>
                  <Txt variant="labelS" tone="secondary">
                    {targets ? t("Change targets") : t("Set daily targets")}
                  </Txt>
                  <Icon name="chevronRight" size={12} color={colors.text.secondary} strokeWidth={2.2} />
                </Pressable>
              </Row>
            </Card>

            {/* The meals: one line each, its energy and its own way in, and under it what was eaten. An empty meal is only its line. */}
            <View style={{ gap: 12 }}>
              {shownMeals.map((m) => {
                const list = entries.filter((e) => e.meal === m);
                const mealSum = totals(list, foods);
                const name = meals.nameOf(m);
                const share = targets && targets.kcal > 0 ? Math.round((mealSum.kcal / targets.kcal) * 100) : null;
                return (
                  <View key={m} style={{ gap: 8 }}>
                    <Row gap={8}>
                      <Txt variant="labelL">{name}</Txt>
                      <Txt variant="labelS" tone="sage" numberOfLines={1} style={{ flex: 1 }}>
                        {!list.length ? "" : share === null ? `${n(mealSum.kcal)} kcal` : t("{n} kcal, {p}%", { n: n(mealSum.kcal), p: share })}
                      </Txt>
                      <IconButton name="addPlus" size={30} iconSize={14} tone="sage" onPress={() => search(m)} accessibilityLabel={t("Add {meal}", { meal: name.toLowerCase() })} />
                    </Row>
                    {list.length ? (
                      <Card padding={0} gap={0} style={{ paddingHorizontal: 12, paddingVertical: 2 }}>
                        {list.map((e, i) => {
                          const f = byId.get(e.foodId);
                          const p = f ? portion(f, e.amount) : null;
                          return (
                            <View key={e.id}>
                              {i > 0 ? <Divider /> : null}
                              <Pressable accessibilityRole="button" accessibilityLabel={f?.name ?? t("Removed product")} onPress={() => setPicked(e)} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, opacity: pressed ? opacity.pressed : 1 })}>
                                <FoodMark photo={f?.photo} size={ROW_MARK} />
                                <Txt variant="labelM" numberOfLines={1} style={{ flexShrink: 1 }}>
                                  {f?.name ?? t("Removed product")}
                                </Txt>
                                <Txt variant="labelS" tone="tertiary" numberOfLines={1} style={{ flex: 1 }}>
                                  {`${fmtG(e.amount)} ${f?.unit ?? "g"}`}
                                </Txt>
                                <Txt variant="labelM" tone="secondary" tabular>
                                  {p ? `${fmtKcal(p.kcal)} kcal` : ""}
                                </Txt>
                              </Pressable>
                            </View>
                          );
                        })}
                      </Card>
                    ) : null}
                  </View>
                );
              })}
            </View>

            {/* The scanner, one tap from the page, for the pack that is in the hand right now. */}
            <Pressable accessibilityRole="button" onPress={scan} hitSlop={8} style={({ pressed }) => ({ alignSelf: "center", flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 4, opacity: pressed ? opacity.pressed : 1 })}>
              <Icon name="camera" size={14} color={colors.text.secondary} strokeWidth={2} />
              <Txt variant="labelM" tone="secondary">
                {t("Scan a barcode")}
              </Txt>
            </Pressable>
          </Animated.View>
        </View>
      </GestureDetector>

      <BottomSheet visible={calendar} onClose={() => setCalendar(false)} title={t("Go to a day")}>
        <DayCalendar day={day} now={now} marks={marks} earliest={earliest} latest={latest} onPick={(d) => { setCalendar(false); goTo(d); }} />
      </BottomSheet>

      <BottomSheet
        visible={!!picked}
        onClose={() => setPicked(null)}
        onClosed={() => { const go = afterSheet; setAfterSheet(null); go?.(); }}
        title={picked ? byId.get(picked.foodId)?.name ?? t("Removed product") : ""}
        subtitle={picked ? `${fmtG(picked.amount)} ${byId.get(picked.foodId)?.unit ?? "g"}, ${meals.nameOf(picked.meal)}` : undefined}
      >
        {picked && byId.get(picked.foodId) ? (
          <SheetGroup>
            <SheetOption icon="leaf" label={t("Open product")} sub={t("Figures, portion, corrections")} onPress={() => { const id = picked.foodId; setAfterSheet(() => () => router.push(`/food/${id}`)); setPicked(null); }} />
          </SheetGroup>
        ) : null}
        <SheetGroup>
          <SheetOption icon="trash" label={chosen === null ? t("Remove from today") : t("Remove from this day")} danger onPress={() => { if (picked) removeEntry(picked.id); haptic("tap"); setPicked(null); }} />
        </SheetGroup>
      </BottomSheet>

      {/* What was burned, all in one sheet: adding to it by hand, what counts on this day, and where it can come from by itself. */}
      <BottomSheet visible={burnSheet} onClose={() => setBurnSheet(false)} title={t("Calories burned")} subtitle={t("Added to what the day may hold.")} confirm={{ label: burnOk ? t("Add {n} kcal", { n: n(burnN) }) : t("Enter the calories"), onPress: saveBurn, disabled: !burnOk, accent: "sage" }}>
        <SheetGroup>
          <SheetInputRow label={t("Burned")} unit="kcal" value={burnKcal} onChangeText={setBurnKcal} keyboardType="number-pad" inputMode="numeric" placeholder="300" />
          <SheetTextRow label={t("What was it?")} value={burnLabel} onChangeText={setBurnLabel} placeholder={t("Running, cycling")} autoCapitalize="sentences" />
        </SheetGroup>

        {burnedDay.length || openSessions.length ? (
          <SheetGroup title={dayLabel}>
            {burnedDay.map((b) => (
              <SheetOption
                key={b.id}
                icon={b.source === "health" || b.sessionId ? "dumbbell" : "flame"}
                label={burnName(b)}
                sub={burnSub(b)}
                right={
                  <Row gap={8}>
                    <Txt variant="labelM" tone="secondary" tabular>
                      +{n(b.kcal)} kcal
                    </Txt>
                    {/* What the health store reported mirrors the store; only what was entered here can be taken away here. */}
                    {b.source === "health" ? null : <IconButton name="trash" size={30} iconSize={15} tone="surface" onPress={() => { removeBurn(b.id); haptic("tap"); }} accessibilityLabel={chosen === null ? t("Remove from today") : t("Remove from this day")} />}
                  </Row>
                }
              />
            ))}
            {openSessions.map(({ s, minutes, kg, est }) => (
              <SheetOption
                key={s.id}
                icon="addPlus"
                label={chosen === null ? t("Your session today, {plan}", { plan: s.planName }) : t("Your session, {plan}", { plan: s.planName })}
                sub={weightKg ? t("About {n} kcal, from {min} min at {kg} kg", { n: n(est), min: minutes, kg }) : t("About {n} kcal, from {min} min at an assumed {kg} kg", { n: n(est), min: minutes, kg })}
                onPress={() => {
                  addBurn({ at: s.finishedAt, kcal: est, label: s.planName, sessionId: s.id });
                  haptic("done");
                }}
              />
            ))}
          </SheetGroup>
        ) : null}

        <SheetGroup>
          <SheetOption icon="heart" label={t(store.name)} sub={storeLine} right={!store.unavailable && !store.connected ? <Button label={t("Connect")} variant="sage" size="S" full={false} loading={connecting} onPress={connect} /> : undefined} />
        </SheetGroup>
      </BottomSheet>

      <BottomSheet visible={editingTargets} onClose={() => setEditingTargets(false)} title={t("Daily targets")} confirm={{ label: t("Save targets"), onPress: saveTargets, disabled: !targetsReady, accent: "sage" }}>
        {editingTargets ? <MacroTargets initial={draftTargets} onChange={setDraftTargets} /> : null}
        <SheetGroup>
          <SheetOption icon="reload" label={t("Answer the questions again")} sub={t("Your need is worked out afresh from your figures")} onPress={askAgain} />
        </SheetGroup>
        {targets ? (
          <SheetGroup>
            <SheetOption icon="trash" label={t("Clear targets")} danger onPress={() => { setTargets(undefined); setEditingTargets(false); }} />
          </SheetGroup>
        ) : null}
      </BottomSheet>
    </Screen>
  );
}

/** One of the day's figures under the ring. */
function Figure({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, gap: 1 }}>
      <Txt variant="labelS" tone="tertiary">
        {label}
      </Txt>
      <Txt variant="labelL" tabular>
        {value}
      </Txt>
    </View>
  );
}
