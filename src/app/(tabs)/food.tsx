import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { useNav } from "@/nav";
import { useTheme } from "@/theme/ThemeProvider";
import { useT, useLanguage, localeOf } from "@/i18n";
import { useNow } from "@/clock";
import { haptic } from "@/haptics";
import { longDate } from "@/db/derive";
import { useFood } from "@/store/food";
import { setDraft } from "@/nutrition/draft";
import { MEALS, MEAL_NAME, entriesOn, fmtG, fmtKcal, portion, totals } from "@/nutrition/derive";
import type { Food, FoodEntry, Meal } from "@/db/types";
import { Screen, Row, Section } from "@/components/ui/Screen";
import { Txt } from "@/components/ui/Text";
import { Card, Divider } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Icon } from "@/components/ui/Icon";
import { Field } from "@/components/ui/Field";
import { BottomSheet, SheetOption } from "@/components/ui/BottomSheet";

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
  const { foods, log, byId, targets, removeEntry, setTargets } = useFood();
  const [picked, setPicked] = useState<FoodEntry | null>(null);
  const [editingTargets, setEditingTargets] = useState(false);
  const [afterSheet, setAfterSheet] = useState<(() => void) | null>(null);
  const [tKcal, setTKcal] = useState("");
  const [tProtein, setTProtein] = useState("");
  const [tCarbs, setTCarbs] = useState("");
  const [tFat, setTFat] = useState("");

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
  const byHand = () => {
    setDraft({ unit: "g", source: "manual", verified: false });
    router.push("/food/review?from=manual");
  };
  const openTargets = () => {
    setTKcal(targets ? String(targets.kcal) : "");
    setTProtein(targets ? String(targets.protein) : "");
    setTCarbs(targets ? String(targets.carbs) : "");
    setTFat(targets ? String(targets.fat) : "");
    setEditingTargets(true);
  };
  const num = (s: string) => {
    const v = Number(s.replace(",", ".").trim());
    return Number.isFinite(v) && v > 0 ? Math.round(v) : 0;
  };
  const targetsReady = [tKcal, tProtein, tCarbs, tFat].every((v) => num(v) > 0);
  const saveTargets = () => {
    if (!targetsReady) return;
    setTargets({ kcal: num(tKcal), protein: num(tProtein), carbs: num(tCarbs), fat: num(tFat) });
    haptic("done");
    setEditingTargets(false);
  };

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

      <Card padding={20} gap={16}>
        <Row gap={10} align="baseline">
          <Txt variant="numberL" tabular>
            {n(sum.kcal)}
          </Txt>
          <Txt variant="labelM" tone="secondary">
            {targets ? t("of {n} kcal", { n: n(targets.kcal) }) : "kcal"}
          </Txt>
        </Row>
        {targets ? (
          <View style={{ gap: 12 }}>
            <Bar label={t("Protein")} value={sum.protein} target={targets.protein} colour={colors.fuel.sage} track={colors.bg.raised} />
            <Bar label={t("Carbohydrates")} value={sum.carbs} target={targets.carbs} colour={colors.fuel.sage} track={colors.bg.raised} />
            <Bar label={t("Fat")} value={sum.fat} target={targets.fat} colour={colors.fuel.sage} track={colors.bg.raised} />
          </View>
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
        <View style={{ flex: 1 }}><Button label={t("Scan")} icon="camera" size="M" onPress={scan} /></View>
        <View style={{ flex: 1 }}><Button label={t("By hand")} icon="noteEdit" variant="secondary" size="M" onPress={byHand} /></View>
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
                      <Pressable accessibilityRole="button" accessibilityLabel={f?.name ?? t("Removed product")} onPress={() => setPicked(e)} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 11, opacity: pressed ? 0.7 : 1 })}>
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

      <BottomSheet visible={editingTargets} onClose={() => setEditingTargets(false)} title={t("Daily targets")} subtitle={t("What a day should add up to. Change them whenever your plan changes.")}>
        <View style={{ gap: 10, paddingHorizontal: 8, paddingVertical: 8 }}>
          <Field label={t("Energy (kcal)")} value={tKcal} onChangeText={setTKcal} placeholder="2400" keyboardType="number-pad" inputMode="numeric" autoFocus />
          <Row gap={10} align="flex-start">
            <View style={{ flex: 1 }}><Field label={t("Protein (g)")} value={tProtein} onChangeText={setTProtein} placeholder="160" keyboardType="number-pad" inputMode="numeric" /></View>
            <View style={{ flex: 1 }}><Field label={t("Carbohydrates (g)")} value={tCarbs} onChangeText={setTCarbs} placeholder="260" keyboardType="number-pad" inputMode="numeric" /></View>
            <View style={{ flex: 1 }}><Field label={t("Fat (g)")} value={tFat} onChangeText={setTFat} placeholder="80" keyboardType="number-pad" inputMode="numeric" /></View>
          </Row>
          <Button label={t("Save targets")} onPress={saveTargets} disabled={!targetsReady} style={{ marginTop: 4 }} />
          {targets ? <Button label={t("Clear targets")} variant="tertiary" size="M" onPress={() => { setTargets(undefined); setEditingTargets(false); }} /> : null}
        </View>
      </BottomSheet>
    </Screen>
  );
}

/** A thin line in the food colour, with the figure and the target beside it. */
function Bar({ label, value, target, colour, track }: { label: string; value: number; target: number; colour: string; track: string }) {
  const pct = Math.max(0, Math.min(1, target > 0 ? value / target : 0));
  return (
    <View style={{ gap: 6 }}>
      <Row justify="space-between">
        <Txt variant="labelS" tone="tertiary">
          {label}
        </Txt>
        <Txt variant="labelS" tone="secondary" tabular>
          {`${fmtG(value)} / ${Math.round(target)} g`}
        </Txt>
      </Row>
      <View style={{ height: 4, borderRadius: 2, backgroundColor: track, overflow: "hidden" }}>
        <View style={{ width: `${pct * 100}%`, height: 4, borderRadius: 2, backgroundColor: colour }} />
      </View>
    </View>
  );
}

function RecentRow({ food, sub, onPress, unchecked, uncheckedLabel, colour, chevron }: { food: Food; sub: string; onPress: () => void; unchecked: boolean; uncheckedLabel: string; colour: string; chevron: string }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={food.name} onPress={onPress} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 11, opacity: pressed ? 0.7 : 1 })}>
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
