import { useState } from "react";
import { Pressable, ScrollView, TextInput, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import Animated from "react-native-reanimated";
import { useNav, useOnce } from "@/nav";
import { useTheme } from "@/theme/ThemeProvider";
import { useT } from "@/i18n";
import { haptic } from "@/haptics";
import { layouts, opacity } from "@/motion";
import { useFood } from "@/store/food";
import { useDb } from "@/db/DbProvider";
import { setDraft } from "@/nutrition/draft";
import { MEALS, MEAL_NAME, fmtG, fmtKcal, mealAt, portion } from "@/nutrition/derive";
import { loggingAt } from "@/nutrition/day";
import { useLoggingDay } from "@/nutrition/useLoggingDay";
import { useMeals } from "@/store/meals";
import type { Food, Meal, MealKey } from "@/db/types";
import { Screen, Row, Header } from "@/components/ui/Screen";
import { Txt } from "@/components/ui/Text";
import { Card, Divider } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Chip } from "@/components/ui/Chip";
import { Icon, type IconName } from "@/components/ui/Icon";
import { BottomSheet, SheetGroup, SheetOption, SheetTextRow } from "@/components/ui/BottomSheet";
import { PhotoViewer } from "@/components/PhotoViewer";
import { FoodMark } from "@/components/FoodMark";
import { pickPhoto } from "@/photo";
import { fontFamily } from "../../../constants/theme";

const num = (s: string) => {
  const n = Number(s.replace(",", ".").trim());
  return Number.isFinite(n) && n > 0 ? n : 0;
};

/** What one press on minus or plus moves the amount by. */
const STEP = 10;
const MEAL_ICON: Record<Meal, IconName> = { breakfast: "sun", lunch: "leaf", pre: "dumbbell", post: "dumbbell", dinner: "leaf", snack: "leaf" };

/**
 * One product, laid out for the thing people come here to do: log a portion.
 *
 * Top to bottom: what it is (name, brand, a thumbnail that takes the photo,
 * and whether anyone has checked the figures), then one card that holds the
 * whole decision, what this portion comes to, how much, and at which meal,
 * and under it the pack's own table, folded away until it is asked for. One
 * button at the bottom. Arriving to log starts with the table folded; arriving
 * to look at the product starts with it open.
 *
 * The page itself only finds the product. What it shows lives in `Product`,
 * which is built once the product is known, so the amount starts from that
 * product's own portion even when the log was still loading a moment before.
 */
export default function FoodDetail() {
  const router = useNav();
  const t = useT();
  const { id, log: toLog, meal: wantedMeal } = useLocalSearchParams<{ id: string; log?: string; meal?: string }>();
  const { byId } = useFood();
  const { ready } = useDb();
  const food = byId.get(id);
  const leave = () => router.back("/(tabs)/food");

  if (!food) {
    return (
      <Screen>
        <Header left={<IconButton name="chevronLeft" onPress={leave} accessibilityLabel={t("Back")} />} title={t("Product")} />
        {ready ? (
          <Txt variant="bodyM" tone="secondary">
            {t("This product is no longer in your list.")}
          </Txt>
        ) : null}
      </Screen>
    );
  }
  return <Product key={food.id} food={food} toLog={!!toLog} wantedMeal={wantedMeal} />;
}

function Product({ food, toLog, wantedMeal }: { food: Food; toLog: boolean; wantedMeal?: string }) {
  const { colors, radius } = useTheme();
  const router = useNav();
  const once = useOnce();
  const t = useT();
  const { logFood, updateFood } = useFood();
  const { db } = useDb();
  const onDay = useLoggingDay();
  const meals = useMeals();
  /** A meal of one's own is named here, in the sheet that was already open to pick one. */
  const [newMeal, setNewMeal] = useState<string | null>(null);
  const lastFinished = db.sessions.reduce((m, x) => Math.max(m, x.finishedAt ?? 0), 0);
  const [photoSheet, setPhotoSheet] = useState(false);
  const [mealSheet, setMealSheet] = useState(false);
  const [afterSheet, setAfterSheet] = useState<(() => void) | null>(null);
  const [zoom, setZoom] = useState(false);
  const [table, setTable] = useState(!toLog);
  const [amount, setAmount] = useState(() => String(food.serving ?? 100));
  // The meal the person came from, when they came from one; otherwise the clock's guess.
  const [meal, setMeal] = useState<MealKey>(() => (meals.known(wantedMeal) ? wantedMeal : mealAt(Date.now(), lastFinished)));

  const leave = () => router.back("/(tabs)/food");

  const grams = num(amount);
  const p = portion(food, grams);
  const unit = food.unit;
  const origin = food.verified ? t("Checked by you") : food.source === "openfoodfacts" ? t("From Open Food Facts, not checked yet") : food.source === "label" ? t("Read from the pack, not checked yet") : t("Entered by hand");

  const correct = () => {
    setDraft(null);
    router.push(`/food/review?from=edit&id=${food.id}`);
  };
  const takePhoto = async (source: "library" | "camera") => {
    const uri = await pickPhoto(source);
    if (uri) {
      updateFood(food.id, { photo: uri });
      haptic("done");
    }
  };
  // The picker waits for the sheet to be gone: iOS refuses to present one over a modal still on its way out.
  const choosePhoto = (source: "library" | "camera") => {
    setAfterSheet(() => () => void takePhoto(source));
    setPhotoSheet(false);
  };
  const step = (by: number) => {
    haptic("tap");
    // From the amount as it is now, not as it was when this was drawn: two quick presses are two steps.
    setAmount((was) => String(Math.max(0, Math.round(num(was) + by))));
  };

  const log = once(() => {
    if (!grams) return;
    logFood(food.id, grams, meal, loggingAt());
    haptic("done");
    leave();
  });

  // Today needs no saying. Another day is named on the button, and a day still to come is planned rather than added.
  const said = { amount: fmtG(grams), unit, meal: meals.nameOf(meal).toLowerCase(), day: onDay.name ?? "" };
  const closeMeals = () => {
    setMealSheet(false);
    setNewMeal(null);
  };
  const makeMeal = () => {
    const name = (newMeal ?? "").trim();
    if (!name) return;
    setMeal(meals.add(name));
    haptic("done");
    closeMeals();
  };
  const addLabel = !grams ? t("Enter an amount") : !onDay.name ? t("Add {amount} {unit} to {meal}", said) : onDay.ahead ? t("Plan {amount} {unit} for {meal}, {day}", said) : t("Add {amount} {unit} to {meal}, {day}", said);

  const rows: [string, string, boolean?][] = [
    [t("Energy"), `${fmtKcal(food.kcal)} kcal`],
    [t("Fat"), `${fmtG(food.fat)} g`],
    [t("of which saturated"), food.saturated === undefined ? "" : `${fmtG(food.saturated)} g`, true],
    [t("Carbohydrates"), `${fmtG(food.carbs)} g`],
    [t("of which sugars"), food.sugars === undefined ? "" : `${fmtG(food.sugars)} g`, true],
    [t("Fibre"), food.fibre === undefined ? "" : `${fmtG(food.fibre)} g`],
    [t("Protein"), `${fmtG(food.protein)} g`],
    [t("Salt"), food.salt === undefined ? "" : `${fmtG(food.salt)} g`],
  ];
  const macros: [string, string, string][] = [
    [colors.macro.protein, t("Protein"), fmtG(p.protein)],
    [colors.macro.carbs, t("Carbs"), fmtG(p.carbs)],
    [colors.macro.fat, t("Fat"), fmtG(p.fat)],
  ];

  return (
    <Screen bottom={90} contentStyle={{ gap: 16 }} footer={<Button label={addLabel} variant="sage" disabled={!grams} onPress={log} />}>
      <Header left={<IconButton name="chevronLeft" onPress={leave} accessibilityLabel={t("Back")} />} />

      {/* What it is. The thumbnail is the photo, and the way to add or change it. */}
      <Row gap={14} align="flex-start">
        <View style={{ flex: 1, gap: 4 }}>
          <Txt variant="displayM" numberOfLines={2}>
            {food.name}
          </Txt>
          {food.brand ? (
            <Txt variant="bodyS" tone="tertiary" numberOfLines={1}>
              {food.brand}
            </Txt>
          ) : null}
          <Pressable accessibilityRole="button" accessibilityLabel={food.verified ? t("Correct the figures") : t("Check against the pack")} onPress={correct} hitSlop={8} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 6, paddingTop: 2, opacity: pressed ? opacity.pressed : 1 })}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: food.verified ? colors.fuel.sage : colors.status.warning }} />
            <Txt variant="labelS" tone="secondary" numberOfLines={1} style={{ flexShrink: 1 }}>
              {origin}
            </Txt>
            <Txt variant="labelS" tone="sage">
              {food.verified ? t("Correct") : t("Check")}
            </Txt>
          </Pressable>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={food.photo ? t("Change photo") : t("Add a photo")} onPress={() => setPhotoSheet(true)} style={({ pressed }) => ({ opacity: pressed ? opacity.pressed : 1 })}>
          <FoodMark photo={food.photo} size={56} />
          <View style={{ position: "absolute", right: -2, bottom: -2, width: 22, height: 22, borderRadius: 11, backgroundColor: colors.bg.raised, borderWidth: 2, borderColor: colors.bg.ground, alignItems: "center", justifyContent: "center" }}>
            <Icon name="camera" size={11} color={colors.text.secondary} strokeWidth={2.2} />
          </View>
        </Pressable>
      </Row>

      {/* The whole decision in one card: what it comes to, how much, and when. */}
      <Card padding={16} gap={14}>
        <View style={{ gap: 10 }}>
          <Row gap={6} align="baseline">
            <Txt variant="numberL" tabular>
              {fmtKcal(p.kcal)}
            </Txt>
            <Txt variant="labelM" tone="secondary">
              kcal
            </Txt>
          </Row>
          <Row gap={12}>
            {macros.map(([hue, name, value]) => (
              <View key={name} style={{ flex: 1, gap: 1 }}>
                <Txt variant="labelL" tabular>
                  {value} g
                </Txt>
                <Row gap={5}>
                  <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: hue }} />
                  <Txt variant="labelS" tone="tertiary" numberOfLines={1}>
                    {name}
                  </Txt>
                </Row>
              </View>
            ))}
          </Row>
        </View>

        <Divider />

        <View style={{ gap: 10 }}>
          <Row gap={10}>
            <Txt variant="labelM" tone="secondary" style={{ flex: 1 }}>
              {t("Amount")}
            </Txt>
            <IconButton name="minus" size={34} iconSize={16} tone="raised" onPress={() => step(-STEP)} accessibilityLabel={t("{n} {unit} less", { n: STEP, unit })} />
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, minWidth: 96, height: 40, paddingHorizontal: 12, borderRadius: radius.input, backgroundColor: colors.bg.raised }}>
              <TextInput
                value={amount}
                onChangeText={(v) => setAmount(v.replace(/[^0-9.,]/g, ""))}
                keyboardType="decimal-pad"
                inputMode="decimal"
                selectTextOnFocus
                selectionColor={colors.fuel.sage}
                accessibilityLabel={unit === "g" ? t("Amount (g)") : t("Amount (ml)")}
                // As wide as its digits and no wider: a browser gives a bare input a width of its own, which pushed the unit to the far edge.
                style={{ width: Math.max(2, amount.length) * 11 + 4, height: 40, textAlign: "right", color: colors.text.primary, fontFamily: fontFamily.displaySemi, fontSize: 18, paddingVertical: 0 }}
              />
              <Txt style={{ fontFamily: fontFamily.regular, fontSize: 18, lineHeight: 24, color: colors.text.secondary }}>{unit}</Txt>
            </View>
            <IconButton name="addPlus" size={34} iconSize={16} tone="raised" onPress={() => step(STEP)} accessibilityLabel={t("{n} {unit} more", { n: STEP, unit })} />
          </Row>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 6, flexGrow: 1, justifyContent: "center" }}>
            {food.serving ? <Chip label={t("1 portion, {n} {unit}", { n: fmtG(food.serving), unit })} selected={grams === food.serving} onPress={() => setAmount(String(food.serving))} /> : null}
            {[50, 100, 200].map((n) => (
              <Chip key={n} label={`${n} ${unit}`} selected={grams === n && grams !== food.serving} onPress={() => setAmount(String(n))} />
            ))}
          </ScrollView>
        </View>

        <Divider />

        <Pressable accessibilityRole="button" accessibilityLabel={`${t("Meal")}, ${meals.nameOf(meal)}`} onPress={() => setMealSheet(true)} hitSlop={12} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 10, opacity: pressed ? opacity.pressed : 1 })}>
          <Txt variant="labelM" tone="secondary" style={{ flex: 1 }}>
            {t("Meal")}
          </Txt>
          <Txt variant="labelL">{meals.nameOf(meal)}</Txt>
          <Icon name="chevronDown" size={16} color={colors.text.tertiary} strokeWidth={2} />
        </Pressable>
      </Card>

      {/* The pack's own table: a line until it is asked for. */}
      <Card padding={16} gap={0}>
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: table }} accessibilityLabel={unit === "g" ? t("Per 100 g") : t("Per 100 ml")} onPress={() => setTable((v) => !v)} hitSlop={12} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 10, opacity: pressed ? opacity.pressed : 1 })}>
          <Txt variant="labelL" style={{ flex: 1 }}>
            {unit === "g" ? t("Per 100 g") : t("Per 100 ml")}
          </Txt>
          <Txt variant="labelM" tone="secondary" tabular>
            {fmtKcal(food.kcal)} kcal
          </Txt>
          <View style={{ transform: [{ rotate: table ? "180deg" : "0deg" }] }}>
            <Icon name="chevronDown" size={16} color={colors.text.tertiary} strokeWidth={2} />
          </View>
        </Pressable>
        {table ? (
          <Animated.View entering={layouts.enter} exiting={layouts.exit} style={{ paddingTop: 8 }}>
            {rows.map(([label, value, sub]) => (
              <View key={label}>
                <Divider />
                <Row justify="space-between" style={{ paddingVertical: 7, paddingLeft: sub ? 12 : 0 }}>
                  <Txt variant="bodyS" tone={sub ? "tertiary" : "secondary"}>
                    {label}
                  </Txt>
                  <Txt variant={sub ? "bodyS" : "labelM"} tone={value ? (sub ? "secondary" : "primary") : "tertiary"} tabular>
                    {value || t("not stated")}
                  </Txt>
                </Row>
              </View>
            ))}
            {food.barcode ? (
              <Txt variant="labelS" tone="tertiary" style={{ paddingTop: 8 }}>
                {t("Barcode {code}", { code: food.barcode })}
              </Txt>
            ) : null}
          </Animated.View>
        ) : null}
      </Card>

      <PhotoViewer source={food.photo ? { uri: food.photo } : undefined} visible={zoom} onClose={() => setZoom(false)} />

      <BottomSheet visible={photoSheet} onClose={() => setPhotoSheet(false)} onClosed={() => { const go = afterSheet; setAfterSheet(null); go?.(); }} title={t("Photo of this product")}>
        <SheetGroup>
          {food.photo ? <SheetOption icon="search" label={t("See the photo")} onPress={() => { setAfterSheet(() => () => setZoom(true)); setPhotoSheet(false); }} /> : null}
          <SheetOption icon="camera" label={t("Take a photo")} onPress={() => choosePhoto("camera")} />
          <SheetOption icon="rows" label={t("Choose from your library")} onPress={() => choosePhoto("library")} />
        </SheetGroup>
        {food.photo ? (
          <SheetGroup>
            <SheetOption icon="trash" label={t("Remove photo")} danger onPress={() => { updateFood(food.id, { photo: undefined }); setPhotoSheet(false); }} />
          </SheetGroup>
        ) : null}
      </BottomSheet>

      {/* One sheet with two faces: picking a meal, and naming a new one. */}
      <BottomSheet visible={mealSheet} onClose={closeMeals} title={newMeal === null ? t("Meal") : t("New meal")} confirm={newMeal === null ? undefined : { label: t("Add meal"), onPress: makeMeal, disabled: !newMeal.trim(), accent: "sage" }}>
        {newMeal === null ? (
          <>
            <SheetGroup>
              {MEALS.map((m) => (
                <SheetOption key={m} icon={MEAL_ICON[m]} label={t(MEAL_NAME[m])} selected={meal === m} onPress={() => { setMeal(m); haptic("select"); closeMeals(); }} />
              ))}
            </SheetGroup>
            {meals.own.length ? (
              <SheetGroup title={t("Your own")}>
                {meals.own.map((m) => (
                  <SheetOption
                    key={m.id}
                    icon="star"
                    label={m.name}
                    selected={meal === m.id}
                    onPress={() => { setMeal(m.id); haptic("select"); closeMeals(); }}
                    right={<IconButton name="trash" size={30} iconSize={15} tone="surface" onPress={() => { if (meal === m.id) setMeal("snack"); meals.remove(m.id); haptic("tap"); }} accessibilityLabel={t("Remove {name}", { name: m.name })} />}
                  />
                ))}
              </SheetGroup>
            ) : null}
            <SheetGroup>
              <SheetOption icon="addPlus" label={t("Add a meal")} sub={t("With a name of your own, such as snacks after dinner")} onPress={() => setNewMeal("")} />
            </SheetGroup>
          </>
        ) : (
          <SheetGroup caption={t("It joins your meals on the Food page. Taking it away later moves what was in it to snacks.")}>
            <SheetTextRow value={newMeal} onChangeText={setNewMeal} placeholder={t("Snacks after dinner")} accessibilityLabel={t("Name of the meal")} maxLength={32} autoCapitalize="sentences" autoFocus returnKeyType="done" onSubmitEditing={makeMeal} />
          </SheetGroup>
        )}
      </BottomSheet>
    </Screen>
  );
}
