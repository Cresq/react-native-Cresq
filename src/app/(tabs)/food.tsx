import { useCallback, useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNav } from "@/nav";
import { useTheme } from "@/theme/ThemeProvider";
import { useT, useLanguage, localeOf } from "@/i18n";
import { useNow } from "@/clock";
import { haptic } from "@/haptics";
import { opacity } from "@/motion";
import { longDate, startOfDay } from "@/db/derive";
import { useFood } from "@/store/food";
import { useHealth } from "@/store/health";
import { useRunningSession } from "@/store/workout";
import { KIND_NAME } from "@/health/types";
import { MEALS, MEAL_NAME, burnsOn, entriesOn, estimateSessionBurn, fmtG, fmtKcal, portion, totals } from "@/nutrition/derive";
import type { Burn, FoodEntry, Meal, NutritionTargets } from "@/db/types";
import { Screen, Row } from "@/components/ui/Screen";
import { Txt } from "@/components/ui/Text";
import { Card, Divider } from "@/components/ui/Card";
import { AnimatedPressable } from "@/components/ui/AnimatedPressable";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Chip } from "@/components/ui/Chip";
import { Icon } from "@/components/ui/Icon";
import { Field } from "@/components/ui/Field";
import { BottomSheet, SheetOption } from "@/components/ui/BottomSheet";
import { FoodWelcome } from "@/components/FoodWelcome";
import { MacroLegend, MacroRing } from "@/components/MacroRing";
import { MacroTargets } from "@/components/MacroTargets";
import { useDb } from "@/db/DbProvider";

/** The meals that are always on the page; pre- and post-workout appear once something is logged to them. */
const MAIN: Meal[] = ["breakfast", "lunch", "dinner", "snack"];
/** Without a weight on file the session estimate assumes this, and says so. */
const ASSUMED_KG = 75;
/** The bar that stays at the foot of the page, and the room the list leaves for it. */
const TRACK_HEIGHT = 50;
const TRACK_ROOM = TRACK_HEIGHT + 20;
/** What a running session's strip adds above the tab bar. */
const RUNNING_STRIP = 68;

/**
 * Food, in two blocks and a bar: the day as a ring, with what was burned as a
 * small chip inside it, and the meals, each a heading with its share of the
 * day and its own way in, and under it what was eaten as thin rows. Tracking
 * something is one bar that stays at the foot of the page however far the
 * list is scrolled, with the scanner as the square beside it.
 *
 * Sage is this world's colour, as the theme always intended; ember stays with
 * training, which is why the one ember thing here is the energy you burned.
 */
export default function FoodTab() {
  const { colors, layout, radius, shadow } = useTheme();
  const insets = useSafeAreaInsets();
  const running = useRunningSession();
  const router = useNav();
  const t = useT();
  const locale = localeOf(useLanguage());
  const now = useNow();
  const { db, update } = useDb();
  const { foods, log, byId, targets, removeEntry, setTargets, burns, addBurn, removeBurn } = useFood();
  const store = useHealth();
  const [picked, setPicked] = useState<FoodEntry | null>(null);
  const [burnSheet, setBurnSheet] = useState(false);
  const [burnKcal, setBurnKcal] = useState("");
  const [burnLabel, setBurnLabel] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [editingTargets, setEditingTargets] = useState(false);
  const [afterSheet, setAfterSheet] = useState<(() => void) | null>(null);
  const [draftTargets, setDraftTargets] = useState<NutritionTargets>({ kcal: 0, protein: 0, carbs: 0, fat: 0 });

  // Opening the tab is when a workout recorded since the last look should show up.
  const { sync } = store;
  useFocusEffect(
    useCallback(() => {
      void sync();
    }, [sync]),
  );

  const today = useMemo(() => entriesOn(log, now), [log, now]);
  const sum = useMemo(() => totals(today, foods), [today, foods]);
  const byMeal = useMemo(() => Object.fromEntries(MEALS.map((m) => [m, today.filter((e) => e.meal === m)])) as Record<Meal, FoodEntry[]>, [today]);
  const burnedToday = useMemo(() => burnsOn(burns, now), [burns, now]);
  const burned = burnedToday.reduce((s, b) => s + b.kcal, 0);
  // What the day still holds: the target, plus what was burned, minus what was eaten.
  const left = targets ? Math.round(targets.kcal + burned - sum.kcal) : null;
  // Sessions finished today, for the estimate the sheet offers when nothing measured covers them.
  const sessionsToday = useMemo(() => {
    const from = startOfDay(now);
    return db.sessions.filter((s) => s.finishedAt && s.finishedAt >= from && s.finishedAt < from + 86_400_000);
  }, [db.sessions, now]);
  const weightKg = db.profile.food?.weightKg;
  const burnN = Math.round(Number(burnKcal.replace(",", ".")) || 0);
  const burnOk = burnN > 0 && burnN <= 5000;

  const n = (v: number) => Math.round(v).toLocaleString(locale);
  const scan = () => router.push("/food/scan");
  const search = (meal?: Meal) => router.push(meal ? `/food/log?meal=${meal}` : "/food/log");
  const openBurn = () => {
    setBurnKcal("");
    setBurnLabel("");
    setBurnSheet(true);
  };
  const saveBurn = () => {
    if (!burnOk) return;
    addBurn({ kcal: burnN, label: burnLabel.trim() || undefined });
    haptic("done");
    setBurnKcal("");
    setBurnLabel("");
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

  // Just clear of the floating tab bar, and of a running session's strip when there is one.
  const trackBottom = Math.max(insets.bottom - 8, 10) + layout.tabBarHeight + 10 + (running ? RUNNING_STRIP : 0);

  return (
    <View style={{ flex: 1 }}>
    <Screen tabs bottom={TRACK_ROOM}>
      <View style={{ gap: 2 }}>
        <Txt variant="labelM" tone="tertiary">
          {longDate(now)}
        </Txt>
        <Txt variant="displayXL">{t("Food")}</Txt>
      </View>

      {/* The day. Pressing the figures is how the targets, and the questions behind them, are changed; what was burned is the small chip under them. */}
      <Card padding={20} gap={14} style={{ backgroundColor: colors.fuel.soft }}>
        <Pressable accessibilityRole="button" accessibilityLabel={t("Daily targets")} onPress={openTargets} style={({ pressed }) => ({ gap: 14, opacity: pressed ? opacity.pressed : 1 })}>
          <Row gap={20}>
            <MacroRing size={124} stroke={12} eaten={sum} budget={targets ? targets.kcal + burned : undefined} track={colors.fuel.sage} trackOpacity={0.16}>
              <Txt variant="numberM" tabular>
                {n(left === null ? sum.kcal : Math.abs(left))}
              </Txt>
              <Txt variant="labelS" tone="secondary">
                {left === null ? t("kcal eaten") : left >= 0 ? t("kcal left") : t("kcal over")}
              </Txt>
            </MacroRing>
            <View style={{ flex: 1 }}>
              <MacroLegend eaten={sum} targets={targets} />
            </View>
          </Row>
          <Row gap={16}>
            <Figure label={t("Eaten")} value={n(sum.kcal)} />
            <Figure label={t("Burned")} value={burned ? `+${n(burned)}` : "0"} />
            <Figure label={t("Target")} value={targets ? n(targets.kcal) : t("none")} />
          </Row>
        </Pressable>
        <Row gap={8} justify="space-between">
          <Chip label={burned ? t("+{n} kcal burned", { n: n(burned) }) : t("Add burned calories")} icon="flame" tone="ember" size="S" onPress={openBurn} />
          <Pressable accessibilityRole="button" onPress={openTargets} hitSlop={8} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 2, opacity: pressed ? opacity.pressed : 1 })}>
            <Txt variant="labelS" tone="secondary">
              {targets ? t("Change targets") : t("Set daily targets")}
            </Txt>
            <Icon name="chevronRight" size={12} color={colors.text.secondary} strokeWidth={2.2} />
          </Pressable>
        </Row>
      </Card>

      {/* The meals: a heading with its share of the day and its own way in, and under it what was eaten. An empty meal is only its heading. */}
      {MEALS.filter((m) => MAIN.includes(m) || byMeal[m].length).map((m) => {
        const entries = byMeal[m];
        const mealSum = totals(entries, foods);
        const name = t(MEAL_NAME[m]);
        const share = targets && targets.kcal > 0 ? Math.round((mealSum.kcal / targets.kcal) * 100) : null;
        return (
          <View key={m} style={{ gap: 10 }}>
            <Row gap={12}>
              <View style={{ flex: 1, gap: 1 }}>
                <Txt variant="displayS">{name}</Txt>
                <Txt variant="labelM" tone={entries.length ? "sage" : "tertiary"}>
                  {!entries.length ? t("Nothing yet") : share === null ? `${n(mealSum.kcal)} kcal` : t("{n} kcal, {p}% of your target", { n: n(mealSum.kcal), p: share })}
                </Txt>
              </View>
              <IconButton name="addPlus" size={34} iconSize={16} tone="sage" onPress={() => search(m)} accessibilityLabel={t("Add {meal}", { meal: name.toLowerCase() })} />
            </Row>
            {entries.length ? (
              <Card padding={0} gap={0} style={{ paddingHorizontal: 14, paddingVertical: 2 }}>
                {entries.map((e, i) => {
                  const f = byId.get(e.foodId);
                  const p = f ? portion(f, e.amount) : null;
                  return (
                    <View key={e.id}>
                      {i > 0 ? <Divider /> : null}
                      <Pressable accessibilityRole="button" accessibilityLabel={f?.name ?? t("Removed product")} onPress={() => setPicked(e)} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, opacity: pressed ? opacity.pressed : 1 })}>
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

      <BottomSheet
        visible={!!picked}
        onClose={() => setPicked(null)}
        onClosed={() => { const go = afterSheet; setAfterSheet(null); go?.(); }}
        title={picked ? byId.get(picked.foodId)?.name ?? t("Removed product") : ""}
        subtitle={picked ? `${fmtG(picked.amount)} ${byId.get(picked.foodId)?.unit ?? "g"}, ${t(MEAL_NAME[picked.meal])}` : undefined}
      >
        <View style={{ gap: 4 }}>
          {picked && byId.get(picked.foodId) ? <SheetOption icon="leaf" label={t("Open product")} sub={t("Figures, portion, corrections")} onPress={() => { const id = picked.foodId; setAfterSheet(() => () => router.push(`/food/${id}`)); setPicked(null); }} /> : null}
          <SheetOption icon="trash" label={t("Remove from today")} danger onPress={() => { if (picked) removeEntry(picked.id); haptic("tap"); setPicked(null); }} />
        </View>
      </BottomSheet>

      {/* What was burned, all in one sheet: where it comes from, what counts today, and adding to it by hand. */}
      <BottomSheet visible={burnSheet} onClose={() => setBurnSheet(false)} title={t("Calories burned")} subtitle={t("Added to what the day may hold.")}>
        <View style={{ gap: 4 }}>
          <Row gap={12} style={{ paddingHorizontal: 8, paddingVertical: 8 }}>
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.fuel.soft, alignItems: "center", justifyContent: "center" }}>
              <Icon name="heart" size={16} color={colors.fuel.sage} strokeWidth={2} />
            </View>
            <View style={{ flex: 1, gap: 1 }}>
              <Txt variant="labelL">{t(store.name)}</Txt>
              <Txt variant="bodyS" tone="tertiary">
                {storeLine}
              </Txt>
            </View>
            {!store.unavailable && !store.connected ? <Button label={t("Connect")} variant="sage" size="S" full={false} loading={connecting} onPress={connect} /> : null}
          </Row>

          {burnedToday.map((b) => (
            <Row key={b.id} gap={12} style={{ paddingHorizontal: 8, paddingVertical: 6 }}>
              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.bg.raised, alignItems: "center", justifyContent: "center" }}>
                <Icon name={b.source === "health" || b.sessionId ? "dumbbell" : "flame"} size={15} color={colors.text.secondary} strokeWidth={2} />
              </View>
              <View style={{ flex: 1, gap: 1 }}>
                <Txt variant="labelM" numberOfLines={1}>
                  {burnName(b)}
                </Txt>
                <Txt variant="labelS" tone="tertiary" numberOfLines={1}>
                  {burnSub(b)}
                </Txt>
              </View>
              <Txt variant="labelM" tone="secondary" tabular>
                +{n(b.kcal)} kcal
              </Txt>
              {/* What the health store reported mirrors the store; only what was entered here can be taken away here. */}
              {b.source === "health" ? <View style={{ width: 30 }} /> : <IconButton name="trash" size={30} iconSize={15} tone="raised" onPress={() => { removeBurn(b.id); haptic("tap"); }} accessibilityLabel={t("Remove from today")} />}
            </Row>
          ))}

          {sessionsToday.map((s) => {
            const end = s.finishedAt ?? s.startedAt;
            // A workout from the health store that covers this session already counts it, measured rather than estimated.
            if (burnedToday.some((b) => b.source === "health" && (b.from ?? 0) < end && (b.to ?? 0) > s.startedAt)) return null;
            if (burnedToday.some((b) => b.sessionId === s.id)) return null;
            const minutes = Math.max(1, Math.round((end - s.startedAt) / 60_000));
            const kg = weightKg ?? ASSUMED_KG;
            const est = estimateSessionBurn(minutes, kg);
            return (
              <SheetOption
                key={s.id}
                icon="dumbbell"
                label={t("Your session today, {plan}", { plan: s.planName })}
                sub={weightKg ? t("About {n} kcal, from {min} min at {kg} kg", { n: n(est), min: minutes, kg }) : t("About {n} kcal, from {min} min at an assumed {kg} kg", { n: n(est), min: minutes, kg })}
                onPress={() => {
                  addBurn({ at: s.finishedAt, kcal: est, label: s.planName, sessionId: s.id });
                  haptic("done");
                }}
              />
            );
          })}

          <Row gap={10} align="flex-start" style={{ paddingHorizontal: 8, paddingTop: 8 }}>
            <View style={{ flex: 1 }}>
              <Field label="kcal" value={burnKcal} onChangeText={setBurnKcal} keyboardType="number-pad" inputMode="numeric" placeholder="300" />
            </View>
            <View style={{ flex: 1.7 }}>
              <Field label={t("What was it?")} value={burnLabel} onChangeText={setBurnLabel} placeholder={t("Running, cycling")} autoCapitalize="sentences" />
            </View>
          </Row>
          <View style={{ paddingHorizontal: 8, paddingTop: 4 }}>
            <Button label={burnOk ? t("Add {n} kcal", { n: n(burnN) }) : t("Enter the calories")} variant="sage" size="M" disabled={!burnOk} onPress={saveBurn} />
          </View>
        </View>
      </BottomSheet>

      <BottomSheet visible={editingTargets} onClose={() => setEditingTargets(false)} title={t("Daily targets")} confirm={{ label: t("Save targets"), onPress: saveTargets, disabled: !targetsReady, accent: "sage" }}>
        {editingTargets ? <MacroTargets initial={draftTargets} onChange={setDraftTargets} /> : null}
        <SheetOption icon="reload" label={t("Answer the questions again")} sub={t("Your need is worked out afresh from your figures")} onPress={askAgain} />
        {targets ? <SheetOption icon="trash" label={t("Clear targets")} danger onPress={() => { setTargets(undefined); setEditingTargets(false); }} /> : null}
      </BottomSheet>
    </Screen>

      {/* Tracking something, always in reach: the bar opens the search, the square beside it the scanner. */}
      <View pointerEvents="box-none" style={{ position: "absolute", left: layout.screenInset, right: layout.screenInset, bottom: trackBottom, flexDirection: "row", gap: 8 }}>
        <AnimatedPressable accessibilityRole="button" accessibilityLabel={t("Track")} onPress={() => search()} wrapperStyle={[{ flex: 1, borderRadius: radius.button }, shadow.floating]} style={({ pressed }) => ({ height: TRACK_HEIGHT, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: radius.button, backgroundColor: pressed ? colors.fuel.pressed : colors.fuel.sage })}>
          <Icon name="addPlus" size={18} color={colors.fuel.on} strokeWidth={2.2} />
          <Txt variant="buttonL" style={{ color: colors.fuel.on }}>
            {t("Track")}
          </Txt>
        </AnimatedPressable>
        <AnimatedPressable accessibilityRole="button" accessibilityLabel={t("Scan a barcode")} onPress={scan} wrapperStyle={[{ borderRadius: radius.button }, shadow.floating]} style={({ pressed }) => ({ width: TRACK_HEIGHT, height: TRACK_HEIGHT, alignItems: "center", justifyContent: "center", borderRadius: radius.button, backgroundColor: pressed ? colors.border.strong : colors.bg.raised })}>
          <Icon name="camera" size={20} color={colors.fuel.sage} strokeWidth={2} />
        </AnimatedPressable>
      </View>
    </View>
  );
}

/** One of the day's figures under the ring. */
function Figure({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Txt variant="labelS" tone="tertiary">
        {label}
      </Txt>
      <Txt variant="labelL" tabular>
        {value}
      </Txt>
    </View>
  );
}
