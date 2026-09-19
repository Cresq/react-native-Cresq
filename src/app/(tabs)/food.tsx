import { useCallback, useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { useNav } from "@/nav";
import { useTheme } from "@/theme/ThemeProvider";
import { useT, useLanguage, localeOf } from "@/i18n";
import { useNow } from "@/clock";
import { haptic } from "@/haptics";
import { longDate, startOfDay } from "@/db/derive";
import { useFood } from "@/store/food";
import { useHealth } from "@/store/health";
import { KIND_NAME } from "@/health/types";
import { MEALS, MEAL_NAME, burnsOn, entriesOn, estimateSessionBurn, fmtG, fmtKcal, portion, totals } from "@/nutrition/derive";
import type { Burn, FoodEntry, Meal, NutritionTargets } from "@/db/types";
import { Screen, Row, Section } from "@/components/ui/Screen";
import { Txt } from "@/components/ui/Text";
import { AnimatedCard, Card, Divider } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Field } from "@/components/ui/Field";
import { BottomSheet, SheetOption } from "@/components/ui/BottomSheet";
import { FoodWelcome } from "@/components/FoodWelcome";
import { FoodMark } from "@/components/FoodMark";
import { MacroLegend, MacroRing } from "@/components/MacroRing";
import { MacroTargets } from "@/components/MacroTargets";
import { useDb } from "@/db/DbProvider";

/** The meals that are always on the page; pre- and post-workout appear once something is logged to them. */
const MAIN: Meal[] = ["breakfast", "lunch", "dinner", "snack"];
/** Without a weight on file the session estimate assumes this, and says so. */
const ASSUMED_KG = 75;

/**
 * Food, in four blocks and no more: the day as a ring (press it to change the
 * targets), the two ways to a product, the meals in one list, and what was
 * burned, which the phone's health store fills in once it is connected.
 *
 * Sage is this world's colour, as the theme always intended; ember stays with
 * training.
 */
export default function FoodTab() {
  const { colors } = useTheme();
  const router = useNav();
  const t = useT();
  const locale = localeOf(useLanguage());
  const now = useNow();
  const { db, update } = useDb();
  const { foods, log, byId, targets, removeEntry, setTargets, burns, addBurn, removeBurn } = useFood();
  const store = useHealth();
  const [picked, setPicked] = useState<FoodEntry | null>(null);
  const [pickedBurn, setPickedBurn] = useState<Burn | null>(null);
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

  return (
    <Screen tabs>
      <View style={{ gap: 2 }}>
        <Txt variant="labelM" tone="tertiary">
          {longDate(now)}
        </Txt>
        <Txt variant="displayXL">{t("Food")}</Txt>
      </View>

      {/* The day. Pressing it is how its targets, and the questions behind them, are changed. */}
      <AnimatedCard onPress={openTargets} accessibilityLabel={t("Daily targets")} padding={20} gap={16} style={{ backgroundColor: colors.fuel.soft }}>
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
        <Row gap={2} justify="flex-end">
          <Txt variant="labelS" tone="secondary">
            {targets ? t("Change targets") : t("Set daily targets")}
          </Txt>
          <Icon name="chevronRight" size={12} color={colors.text.secondary} strokeWidth={2.2} />
        </Row>
      </AnimatedCard>

      {/* The two ways to a product, side by side. */}
      <Row gap={10} align="stretch">
        <Tile icon="camera" title={t("Scan a barcode")} sub={t("Hold the pack up")} onPress={scan} />
        <Tile icon="search" title={t("Search a product")} sub={t("Type a name or brand")} onPress={() => search()} />
      </Row>

      {/* The meals, in one list: each with what it holds and its own way in. */}
      <Section title={t("Meals")}>
        <Card padding={16} gap={0}>
          {MEALS.filter((m) => MAIN.includes(m) || byMeal[m].length).map((m, at) => {
            const entries = byMeal[m];
            const mealSum = totals(entries, foods);
            const name = t(MEAL_NAME[m]);
            return (
              <View key={m}>
                {at > 0 ? <Divider /> : null}
                <Row gap={12} style={{ paddingVertical: 8 }}>
                  <Pressable accessibilityRole="button" accessibilityLabel={t("Add {meal}", { meal: name.toLowerCase() })} onPress={() => search(m)} style={({ pressed }) => ({ flex: 1, gap: 1, opacity: pressed ? 0.7 : 1 })}>
                    <Txt variant="labelL">{name}</Txt>
                    <Txt variant="bodyS" tone="tertiary">
                      {entries.length ? `${n(mealSum.kcal)} kcal` : t("Nothing yet")}
                    </Txt>
                  </Pressable>
                  <IconButton name="addPlus" size={34} iconSize={16} tone="raised" onPress={() => search(m)} accessibilityLabel={t("Add {meal}", { meal: name.toLowerCase() })} />
                </Row>
                {entries.map((e) => {
                  const f = byId.get(e.foodId);
                  const p = f ? portion(f, e.amount) : null;
                  return (
                    <Pressable key={e.id} accessibilityRole="button" accessibilityLabel={f?.name ?? t("Removed product")} onPress={() => setPicked(e)} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingBottom: 10, opacity: pressed ? 0.7 : 1 })}>
                      <FoodMark photo={f?.photo} size={32} />
                      <View style={{ flex: 1, gap: 1 }}>
                        <Txt variant="labelM" numberOfLines={1}>
                          {f?.name ?? t("Removed product")}
                        </Txt>
                        <Txt variant="labelS" tone="tertiary" numberOfLines={1}>
                          {[f?.brand, `${fmtG(e.amount)} ${f?.unit ?? "g"}`].filter(Boolean).join(", ")}
                        </Txt>
                      </View>
                      <Txt variant="labelM" tone="secondary" tabular>
                        {p ? `${fmtKcal(p.kcal)} kcal` : ""}
                      </Txt>
                    </Pressable>
                  );
                })}
              </View>
            );
          })}
        </Card>
      </Section>

      {/* What was burned: the health store fills it in once connected; by hand is always there. */}
      <Section title={t("Burned")} meta={burned ? `+${n(burned)} kcal` : undefined}>
        <Card padding={16} gap={0}>
          <Row gap={12} style={{ paddingVertical: 8 }}>
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
          {burnedToday.map((b) => {
            const row = (
              <>
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
              </>
            );
            // What the health store reported mirrors the store; only what was entered here can be taken away here.
            return (
              <View key={b.id}>
                <Divider />
                {b.source === "health" ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 }}>{row}</View>
                ) : (
                  <Pressable accessibilityRole="button" accessibilityLabel={burnName(b)} onPress={() => setPickedBurn(b)} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, opacity: pressed ? 0.7 : 1 })}>
                    {row}
                  </Pressable>
                )}
              </View>
            );
          })}
          <Divider />
          <Pressable accessibilityRole="button" accessibilityLabel={t("Add it yourself")} onPress={openBurn} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingTop: 12, paddingBottom: 4, opacity: pressed ? 0.7 : 1 })}>
            <Icon name="addPlus" size={16} color={colors.text.secondary} strokeWidth={2.2} />
            <Txt variant="labelM" tone="secondary" style={{ flex: 1 }}>
              {t("Add it yourself")}
            </Txt>
          </Pressable>
        </Card>
      </Section>

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

      <BottomSheet visible={!!pickedBurn} onClose={() => setPickedBurn(null)} title={pickedBurn ? burnName(pickedBurn) : ""} subtitle={pickedBurn ? `+${n(pickedBurn.kcal)} kcal` : undefined}>
        <SheetOption icon="trash" label={t("Remove from today")} danger onPress={() => { if (pickedBurn) removeBurn(pickedBurn.id); haptic("tap"); setPickedBurn(null); }} />
      </BottomSheet>

      <BottomSheet visible={burnSheet} onClose={() => setBurnSheet(false)} title={t("Calories burned")} subtitle={t("Added to what the day may hold. A session offers an estimate; anything else you enter yourself.")}>
        <View style={{ gap: 4 }}>
          {sessionsToday.map((s) => {
            const end = s.finishedAt ?? s.startedAt;
            // A workout from the health store that covers this session already counts it, measured rather than estimated.
            if (burnedToday.some((b) => b.source === "health" && (b.from ?? 0) < end && (b.to ?? 0) > s.startedAt)) return null;
            const minutes = Math.max(1, Math.round((end - s.startedAt) / 60_000));
            const kg = weightKg ?? ASSUMED_KG;
            const est = estimateSessionBurn(minutes, kg);
            const added = burnedToday.some((b) => b.sessionId === s.id);
            return (
              <SheetOption
                key={s.id}
                icon="dumbbell"
                label={t("Your session today, {plan}", { plan: s.planName })}
                sub={added ? t("Already added") : t("About {n} kcal, from {min} min at {kg} kg", { n: n(est), min: minutes, kg })}
                selected={added}
                onPress={() => {
                  if (added) return;
                  addBurn({ at: s.finishedAt, kcal: est, label: s.planName, sessionId: s.id });
                  haptic("done");
                  setBurnSheet(false);
                }}
              />
            );
          })}
          {sessionsToday.length ? (
            <Txt variant="labelS" tone="tertiary" style={{ paddingHorizontal: 12, paddingBottom: 4 }}>
              {weightKg ? t("An estimate from your weight and the session's length, not a measurement.") : t("Weight unknown, {kg} kg assumed. Set yours under Your figures.", { kg: ASSUMED_KG })}
            </Txt>
          ) : null}
          <View style={{ paddingHorizontal: 8, paddingTop: 8, gap: 10 }}>
            <Field label={t("Calories burned")} value={burnKcal} onChangeText={setBurnKcal} keyboardType="number-pad" inputMode="numeric" placeholder="300" />
            <Field label={t("What was it?")} value={burnLabel} onChangeText={setBurnLabel} placeholder={t("Running, cycling, a walk")} autoCapitalize="sentences" />
            <Button label={burnOk ? t("Add {n} kcal", { n: n(burnN) }) : t("Enter the calories")} variant="sage" disabled={!burnOk} onPress={saveBurn} />
          </View>
        </View>
      </BottomSheet>

      <BottomSheet visible={editingTargets} onClose={() => setEditingTargets(false)} title={t("Daily targets")} subtitle={t("What a day should add up to. The four figures move together.")}>
        <View style={{ gap: 10, paddingHorizontal: 8, paddingVertical: 8 }}>
          {editingTargets ? <MacroTargets initial={draftTargets} onChange={setDraftTargets} /> : null}
          <Button label={t("Save targets")} variant="sage" onPress={saveTargets} disabled={!targetsReady} style={{ marginTop: 4 }} />
          <Button label={t("Answer the questions again")} variant="tertiary" size="M" onPress={askAgain} />
          {targets ? <Button label={t("Clear targets")} variant="tertiary" size="M" onPress={() => { setTargets(undefined); setEditingTargets(false); }} /> : null}
        </View>
      </BottomSheet>
    </Screen>
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

/**
 * One of the two ways to a product. A surface like every other card, with a
 * hairline so it holds its edge on both themes: the raised tone it used to
 * wear is for things that sit on a card, and straight on the ground it all
 * but disappears in the light theme.
 */
function Tile({ icon, title, sub, onPress }: { icon: IconName; title: string; sub: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <AnimatedCard onPress={onPress} accessibilityLabel={title} padding={14} gap={10} bordered wrapperStyle={{ flex: 1 }} style={{ flex: 1 }}>
      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.fuel.soft, alignItems: "center", justifyContent: "center" }}>
        <Icon name={icon} size={18} color={colors.fuel.sage} strokeWidth={2} />
      </View>
      <View style={{ gap: 2 }}>
        <Txt variant="labelL">{title}</Txt>
        <Txt variant="bodyS" tone="tertiary">
          {sub}
        </Txt>
      </View>
    </AnimatedCard>
  );
}
