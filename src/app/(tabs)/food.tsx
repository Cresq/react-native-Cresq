import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { useNav } from "@/nav";
import { useTheme } from "@/theme/ThemeProvider";
import { useT, useLanguage, localeOf } from "@/i18n";
import { useNow } from "@/clock";
import { haptic } from "@/haptics";
import { longDate, startOfDay } from "@/db/derive";
import { useFood } from "@/store/food";
import { useWeight } from "@/store/weight";
import { MEALS, MEAL_NAME, burnsOn, entriesOn, estimateSessionBurn, fmtG, fmtKcal, portion, totals } from "@/nutrition/derive";
import type { Burn, FoodEntry, Meal, NutritionTargets } from "@/db/types";
import { Screen, Row, Section } from "@/components/ui/Screen";
import { Txt } from "@/components/ui/Text";
import { Card, Divider } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Field } from "@/components/ui/Field";
import { BottomSheet, SheetOption } from "@/components/ui/BottomSheet";
import { FoodWelcome } from "@/components/FoodWelcome";
import { FoodMark } from "@/components/FoodMark";
import { MacroBars } from "@/components/MacroBars";
import { MacroTargets } from "@/components/MacroTargets";
import { useDb } from "@/db/DbProvider";

/** The meals that are always on the page; pre- and post-workout appear once something is logged to them. */
const MAIN: Meal[] = ["breakfast", "lunch", "dinner", "snack"];
/** Without a weight on file the session estimate assumes this, and says so. */
const ASSUMED_KG = 75;

/**
 * Food, top to bottom: what is left of the day once what was eaten and what
 * was burned are counted, four tiles (the two ways to a product, the camera
 * or typing, then energy spent and body weight), and the meals as they were
 * eaten, each with its own way in.
 *
 * Sage is this world's colour, as the theme always intended; ember stays with
 * training.
 */
export default function FoodTab() {
  const { colors, radius } = useTheme();
  const router = useNav();
  const t = useT();
  const locale = localeOf(useLanguage());
  const now = useNow();
  const { db, update } = useDb();
  const { foods, log, byId, targets, removeEntry, setTargets, burns, addBurn, removeBurn } = useFood();
  const weighedToday = useWeight().on(now);
  const [picked, setPicked] = useState<FoodEntry | null>(null);
  const [pickedBurn, setPickedBurn] = useState<Burn | null>(null);
  const [burnSheet, setBurnSheet] = useState(false);
  const [burnKcal, setBurnKcal] = useState("");
  const [burnLabel, setBurnLabel] = useState("");
  const [editingTargets, setEditingTargets] = useState(false);
  const [afterSheet, setAfterSheet] = useState<(() => void) | null>(null);
  const [draftTargets, setDraftTargets] = useState<NutritionTargets>({ kcal: 0, protein: 0, carbs: 0, fat: 0 });

  const today = useMemo(() => entriesOn(log, now), [log, now]);
  const sum = useMemo(() => totals(today, foods), [today, foods]);
  const byMeal = useMemo(() => Object.fromEntries(MEALS.map((m) => [m, today.filter((e) => e.meal === m)])) as Record<Meal, FoodEntry[]>, [today]);
  const burnedToday = useMemo(() => burnsOn(burns, now), [burns, now]);
  const burned = burnedToday.reduce((s, b) => s + b.kcal, 0);
  // What the day still holds: the target, plus what was burned, minus what was eaten.
  const left = targets ? Math.round(targets.kcal + burned - sum.kcal) : null;
  // Sessions finished today, for the estimate the sheet offers.
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

  return (
    <Screen tabs>
      <Row gap={12}>
        <View style={{ flex: 1, gap: 2 }}>
          <Txt variant="labelM" tone="tertiary">
            {longDate(now)}
          </Txt>
          <Txt variant="displayXL">{t("Food")}</Txt>
        </View>
        <IconButton name="sliders" onPress={openTargets} accessibilityLabel={t("Daily targets")} />
      </Row>

      <Card padding={20} gap={16} style={{ backgroundColor: colors.fuel.soft }}>
        <Row gap={10} align="baseline">
          <Txt variant="numberL" tabular style={{ color: colors.fuel.sage }}>
            {n(left === null ? sum.kcal : Math.abs(left))}
          </Txt>
          <Txt variant="labelM" tone="secondary">
            {left === null ? t("kcal eaten") : left >= 0 ? t("kcal left") : t("kcal over the target")}
          </Txt>
        </Row>
        <Row gap={16}>
          <Figure label={t("Eaten")} value={n(sum.kcal)} />
          <Figure label={t("Burned")} value={burned ? `+${n(burned)}` : "0"} />
          {targets ? <Figure label={t("Target")} value={n(targets.kcal)} /> : null}
        </Row>
        {targets ? (
          <MacroBars eaten={sum} targets={targets} />
        ) : (
          <View style={{ gap: 10 }}>
            <Txt variant="bodyS" tone="secondary">
              {t("{p} g protein, {c} g carbs, {f} g fat", { p: fmtG(sum.protein), c: fmtG(sum.carbs), f: fmtG(sum.fat) })}
            </Txt>
            <Button label={t("Set daily targets")} variant="tertiary" size="M" full={false} onPress={openTargets} />
          </View>
        )}
      </Card>

      {/* Two ways to a product, side by side; under them what you burned and what you weigh. */}
      <View style={{ gap: 10 }}>
        <Row gap={10} align="stretch">
          <Tile icon="camera" title={t("Scan a barcode")} sub={t("Hold the pack up")} onPress={scan} />
          <Tile icon="search" title={t("Search a product")} sub={t("Type a name or brand")} onPress={() => search()} />
        </Row>
        <Row gap={10} align="stretch">
          <Tile icon="flame" title={t("Burned")} sub={burned ? t("+{n} kcal today", { n: n(burned) }) : t("A session, or anything else")} onPress={openBurn} />
          <Tile icon="chartLine" title={t("Weight")} sub={weighedToday ? t("{kg} kg today", { kg: weighedToday.kg.toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) }) : t("Log today's weight")} onPress={() => router.push("/weight")} />
        </Row>
      </View>

      {burnedToday.length ? (
        <Section title={t("Burned")} meta={`+${n(burned)} kcal`} action={t("Add")} actionIcon="addPlus" onAction={openBurn}>
          <Card padding={16} gap={0}>
            {burnedToday.map((b, i) => (
              <View key={b.id}>
                {i > 0 ? <Divider /> : null}
                <Pressable accessibilityRole="button" accessibilityLabel={b.label ?? t("Burned")} onPress={() => setPickedBurn(b)} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 9, opacity: pressed ? 0.7 : 1 })}>
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.fuel.soft, alignItems: "center", justifyContent: "center" }}>
                    <Icon name={b.sessionId ? "dumbbell" : "flame"} size={16} color={colors.fuel.sage} strokeWidth={2} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Txt variant="labelL" numberOfLines={1}>
                      {b.label ?? t("Burned")}
                    </Txt>
                    <Txt variant="bodyS" tone="tertiary">
                      {b.sessionId ? t("Estimate from your session") : t("Entered by you")}
                    </Txt>
                  </View>
                  <Txt variant="labelL" tabular>
                    +{n(b.kcal)} kcal
                  </Txt>
                </Pressable>
              </View>
            ))}
          </Card>
        </Section>
      ) : null}

      {MEALS.filter((m) => MAIN.includes(m) || byMeal[m].length).map((m) => {
        const entries = byMeal[m];
        const mealSum = totals(entries, foods);
        return (
          <Section key={m} title={t(MEAL_NAME[m])} meta={entries.length ? `${n(mealSum.kcal)} kcal` : undefined} action={t("Add")} actionIcon="addPlus" onAction={() => search(m)}>
            {entries.length ? (
              <Card padding={16} gap={0}>
                {entries.map((e, i) => {
                  const f = byId.get(e.foodId);
                  const p = f ? portion(f, e.amount) : null;
                  return (
                    <View key={e.id}>
                      {i > 0 ? <Divider /> : null}
                      <Pressable accessibilityRole="button" accessibilityLabel={f?.name ?? t("Removed product")} onPress={() => setPicked(e)} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 9, opacity: pressed ? 0.7 : 1 })}>
                        <FoodMark photo={f?.photo} size={36} />
                        <View style={{ flex: 1, gap: 2 }}>
                          <Txt variant="labelL" numberOfLines={1}>
                            {f?.name ?? t("Removed product")}
                          </Txt>
                          <Txt variant="bodyS" tone="tertiary" numberOfLines={1}>
                            {[f?.brand, `${fmtG(e.amount)} ${f?.unit ?? "g"}`].filter(Boolean).join(", ")}
                          </Txt>
                        </View>
                        <Txt variant="labelL" tabular>
                          {p ? `${fmtKcal(p.kcal)} kcal` : ""}
                        </Txt>
                      </Pressable>
                    </View>
                  );
                })}
              </Card>
            ) : (
              <Pressable accessibilityRole="button" accessibilityLabel={t("Add {meal}", { meal: t(MEAL_NAME[m]).toLowerCase() })} onPress={() => search(m)} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: radius.card, borderWidth: 1, borderStyle: "dashed", borderColor: colors.border.strong, opacity: pressed ? 0.7 : 1 })}>
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.bg.raised, alignItems: "center", justifyContent: "center" }}>
                  <Icon name="addPlus" size={16} color={colors.text.secondary} strokeWidth={2.2} />
                </View>
                <Txt variant="labelM" tone="secondary">
                  {t("Nothing yet, add something")}
                </Txt>
              </Pressable>
            )}
          </Section>
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

      <BottomSheet visible={!!pickedBurn} onClose={() => setPickedBurn(null)} title={pickedBurn?.label ?? t("Burned")} subtitle={pickedBurn ? `+${n(pickedBurn.kcal)} kcal` : undefined}>
        <SheetOption icon="trash" label={t("Remove from today")} danger onPress={() => { if (pickedBurn) removeBurn(pickedBurn.id); haptic("tap"); setPickedBurn(null); }} />
      </BottomSheet>

      <BottomSheet visible={burnSheet} onClose={() => setBurnSheet(false)} title={t("Calories burned")} subtitle={t("Added to what the day may hold. A session offers an estimate; anything else you enter yourself.")}>
        <View style={{ gap: 4 }}>
          {sessionsToday.map((s) => {
            const minutes = Math.max(1, Math.round(((s.finishedAt ?? s.startedAt) - s.startedAt) / 60_000));
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

/** One of the day's figures under the big number. */
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

/** One of the two ways to a product: an icon in the food colour, what it is, how. */
function Tile({ icon, title, sub, onPress }: { icon: IconName; title: string; sub: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Card tone="raised" padding={14} gap={10} onPress={onPress} accessibilityLabel={title} style={{ flex: 1 }}>
      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.fuel.soft, alignItems: "center", justifyContent: "center" }}>
        <Icon name={icon} size={18} color={colors.fuel.sage} strokeWidth={2} />
      </View>
      <View style={{ gap: 2 }}>
        <Txt variant="labelL">{title}</Txt>
        <Txt variant="bodyS" tone="tertiary">
          {sub}
        </Txt>
      </View>
    </Card>
  );
}
