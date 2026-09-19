import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { useNav } from "@/nav";
import { useTheme } from "@/theme/ThemeProvider";
import { useT, useLanguage, localeOf } from "@/i18n";
import { useNow } from "@/clock";
import { haptic } from "@/haptics";
import { longDate } from "@/db/derive";
import { useFood } from "@/store/food";
import { MEALS, MEAL_NAME, entriesOn, fmtG, fmtKcal, portion, totals } from "@/nutrition/derive";
import type { Food, FoodEntry, Meal, NutritionTargets } from "@/db/types";
import { Screen, Row, Section } from "@/components/ui/Screen";
import { Txt } from "@/components/ui/Text";
import { Card, Divider } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Icon } from "@/components/ui/Icon";
import { BottomSheet, SheetOption } from "@/components/ui/BottomSheet";
import { FoodWelcome } from "@/components/FoodWelcome";
import { FoodMark } from "@/components/FoodMark";
import { MacroBars } from "@/components/MacroBars";
import { MacroTargets } from "@/components/MacroTargets";
import { useDb } from "@/db/DbProvider";

/**
 * Food, top to bottom: what today adds up to against what you aimed for, the
 * two ways in (scan a pack, type it), the meals as they were eaten, and the
 * products you reach for most so the second time is one tap.
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
  const { foods, log, byId, targets, removeEntry, setTargets } = useFood();
  const [picked, setPicked] = useState<FoodEntry | null>(null);
  const [editingTargets, setEditingTargets] = useState(false);
  const [afterSheet, setAfterSheet] = useState<(() => void) | null>(null);
  const [draftTargets, setDraftTargets] = useState<NutritionTargets>({ kcal: 0, protein: 0, carbs: 0, fat: 0 });

  const today = useMemo(() => entriesOn(log, now), [log, now]);
  const sum = useMemo(() => totals(today, foods), [today, foods]);
  const byMeal = useMemo(() => Object.fromEntries(MEALS.map((m) => [m, today.filter((e) => e.meal === m)])) as Record<Meal, FoodEntry[]>, [today]);
  // The products you actually use, most recent first; anything never logged trails behind by when it was added.
  const recent = useMemo(() => {
    const lastUsed = new Map<string, number>();
    for (const e of log) lastUsed.set(e.foodId, Math.max(lastUsed.get(e.foodId) ?? 0, e.at));
    return [...foods].sort((a, b) => (lastUsed.get(b.id) ?? b.createdAt) - (lastUsed.get(a.id) ?? a.createdAt)).slice(0, 8);
  }, [foods, log]);

  const n = (v: number) => Math.round(v).toLocaleString(locale);
  const scan = () => router.push("/food/scan");
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
            {n(sum.kcal)}
          </Txt>
          <Txt variant="labelM" tone="secondary">
            {targets ? t("of {n} kcal", { n: n(targets.kcal) }) : "kcal"}
          </Txt>
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

      <Row gap={10}>
        <View style={{ flex: 1 }}><Button label={t("Log food")} icon="addPlus" size="M" variant="sage" onPress={() => router.push("/food/log")} /></View>
        <IconButton name="camera" size={48} iconSize={20} onPress={scan} accessibilityLabel={t("Scan a pack")} />
      </Row>

      {today.length === 0 ? (
        <Card tone="raised" padding={18} gap={6}>
          <Txt variant="labelL">{t("Nothing logged today")}</Txt>
          <Txt variant="bodyS" tone="secondary">
            {t("Scan the barcode on a pack and it is in your day in two taps. Unknown products you teach the app once.")}
          </Txt>
        </Card>
      ) : (
        MEALS.filter((m) => byMeal[m].length).map((m) => {
          const mealSum = totals(byMeal[m], foods);
          return (
            <Section key={m} title={t(MEAL_NAME[m])} meta={`${n(mealSum.kcal)} kcal`} gap={0}>
              <Card padding={16} gap={0}>
                {byMeal[m].map((e, i) => {
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
            </Section>
          );
        })
      )}

      {recent.length ? (
        <Section title={t("Your products")} gap={0}>
          <Card padding={16} gap={0}>
            {recent.map((f, i) => (
              <View key={f.id}>
                {i > 0 ? <Divider /> : null}
                <RecentRow food={f} onPress={() => router.push(`/food/${f.id}?log=1`)} sub={`${f.brand ? `${f.brand}, ` : ""}${fmtKcal(f.kcal)} kcal ${f.unit === "g" ? t("per 100 g") : t("per 100 ml")}`} unchecked={!f.verified} uncheckedLabel={t("not checked")} colour={colors.status.warning} chevron={colors.text.tertiary} />
              </View>
            ))}
          </Card>
        </Section>
      ) : null}

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

function RecentRow({ food, sub, onPress, unchecked, uncheckedLabel, colour, chevron }: { food: Food; sub: string; onPress: () => void; unchecked: boolean; uncheckedLabel: string; colour: string; chevron: string }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={food.name} onPress={onPress} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 9, opacity: pressed ? 0.7 : 1 })}>
      <FoodMark photo={food.photo} size={36} />
      <View style={{ flex: 1, gap: 2 }}>
        <Row gap={8}>
          <Txt variant="labelL" numberOfLines={1} style={{ flexShrink: 1 }}>
            {food.name}
          </Txt>
          {unchecked ? (
            <Txt variant="labelS" style={{ color: colour }}>
              {uncheckedLabel}
            </Txt>
          ) : null}
        </Row>
        <Txt variant="bodyS" tone="tertiary" numberOfLines={1}>
          {sub}
        </Txt>
      </View>
      <Icon name="chevronRight" size={16} color={chevron} strokeWidth={2} />
    </Pressable>
  );
}
