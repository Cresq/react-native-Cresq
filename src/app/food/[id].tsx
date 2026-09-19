import { useState } from "react";
import { Pressable, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useNav, useOnce } from "@/nav";
import { useTheme } from "@/theme/ThemeProvider";
import { useT } from "@/i18n";
import { haptic } from "@/haptics";
import { useFood } from "@/store/food";
import { useDb } from "@/db/DbProvider";
import { setDraft } from "@/nutrition/draft";
import { MEALS, MEAL_NAME, fmtG, fmtKcal, mealAt, portion } from "@/nutrition/derive";
import type { Meal } from "@/db/types";
import { Screen, Row, Section, Header } from "@/components/ui/Screen";
import { Txt } from "@/components/ui/Text";
import { Card, Divider } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Chip } from "@/components/ui/Chip";
import { Icon } from "@/components/ui/Icon";
import { Field } from "@/components/ui/Field";
import { PhotoSlot } from "@/components/ui/PhotoSlot";
import { BottomSheet, SheetOption } from "@/components/ui/BottomSheet";
import { PhotoViewer } from "@/components/PhotoViewer";
import { pickPhoto } from "@/photo";

const num = (s: string) => {
  const n = Number(s.replace(",", ".").trim());
  return Number.isFinite(n) && n > 0 ? n : 0;
};

/**
 * One product: its figures per 100, where they came from and whether anyone
 * has checked them, and the portion about to be logged.
 */
export default function FoodDetail() {
  const { colors } = useTheme();
  const router = useNav();
  const once = useOnce();
  const t = useT();
  const { id, meal: wantedMeal } = useLocalSearchParams<{ id: string; log?: string; meal?: string }>();
  const { byId, logFood, updateFood } = useFood();
  const { db } = useDb();
  const lastFinished = db.sessions.reduce((m, x) => Math.max(m, x.finishedAt ?? 0), 0);
  const [photoSheet, setPhotoSheet] = useState(false);
  const [afterSheet, setAfterSheet] = useState<(() => void) | null>(null);
  const [zoom, setZoom] = useState(false);
  const food = byId.get(id);
  const [amount, setAmount] = useState(() => String(food?.serving ?? 100));
  // The meal the person came from, when they came from one; otherwise the clock's guess.
  const [meal, setMeal] = useState<Meal>(() => (wantedMeal && (MEALS as string[]).includes(wantedMeal) ? (wantedMeal as Meal) : mealAt(Date.now(), lastFinished)));

  const leave = () => (router.canGoBack() ? router.back() : router.replace("/(tabs)/food"));

  if (!food) {
    return (
      <Screen>
        <Header left={<IconButton name="chevronLeft" onPress={leave} accessibilityLabel={t("Back")} />} title={t("Product")} />
        <Txt variant="bodyM" tone="secondary">
          {t("This product is no longer in your list.")}
        </Txt>
      </Screen>
    );
  }

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

  const log = once(() => {
    if (!grams) return;
    logFood(food.id, grams, meal);
    haptic("done");
    leave();
  });

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

  return (
    <Screen
      bottom={150}
      footer={
        <>
          <Button label={grams ? t("Add {amount} {unit} to {meal}", { amount: fmtG(grams), unit, meal: t(MEAL_NAME[meal]).toLowerCase() }) : t("Enter an amount")} variant="sage" disabled={!grams} onPress={log} />
          <Button label={food.verified ? t("Correct the figures") : t("Check against the pack")} variant="tertiary" size="M" onPress={correct} />
        </>
      }
    >
      <Header left={<IconButton name="chevronLeft" onPress={leave} accessibilityLabel={t("Back")} />} title={food.name} subtitle={food.brand} />

      <View style={{ gap: 6 }}>
        <Txt variant="displayL">{food.name}</Txt>
        <Row gap={8}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: food.verified ? colors.fuel.sage : colors.status.warning }} />
          <Txt variant="labelM" tone="secondary">
            {origin}
          </Txt>
        </Row>
      </View>

      {/* The pack, the plate or the label: whatever helps the person recognise it in a list. */}
      {food.photo ? (
        <View style={{ gap: 8 }}>
          <Pressable accessibilityRole="button" accessibilityLabel={t("See the photo")} onPress={() => setZoom(true)}>
            <PhotoSlot source={{ uri: food.photo }} height={200} radius={18} />
          </Pressable>
          <Button label={t("Change photo")} variant="tertiary" size="M" full={false} onPress={() => setPhotoSheet(true)} />
        </View>
      ) : (
        <Pressable accessibilityRole="button" accessibilityLabel={t("Add a photo")} onPress={() => setPhotoSheet(true)} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 16, borderWidth: 1, borderStyle: "dashed", borderColor: colors.border.strong, opacity: pressed ? 0.7 : 1 })}>
          <Icon name="camera" size={18} color={colors.text.secondary} strokeWidth={1.9} />
          <View style={{ flex: 1, gap: 1 }}>
            <Txt variant="labelL">{t("Add a photo")}</Txt>
            <Txt variant="bodyS" tone="tertiary">
              {t("The pack, the label or the plate, so you know it at a glance")}
            </Txt>
          </View>
        </Pressable>
      )}
      <PhotoViewer source={food.photo ? { uri: food.photo } : undefined} visible={zoom} onClose={() => setZoom(false)} />

      <BottomSheet visible={photoSheet} onClose={() => setPhotoSheet(false)} onClosed={() => { const go = afterSheet; setAfterSheet(null); go?.(); }} title={t("Photo of this product")}>
        <SheetOption icon="camera" label={t("Take a photo")} onPress={() => choosePhoto("camera")} />
        <SheetOption icon="rows" label={t("Choose from your library")} onPress={() => choosePhoto("library")} />
        {food.photo ? <SheetOption icon="trash" label={t("Remove photo")} danger onPress={() => { updateFood(food.id, { photo: undefined }); setPhotoSheet(false); }} /> : null}
      </BottomSheet>

      <Section title={unit === "g" ? t("Per 100 g") : t("Per 100 ml")}>
        <Card padding={16} gap={0}>
          {rows.map(([label, value, sub], i) => (
            <View key={label}>
              {i > 0 ? <Divider /> : null}
              <Row justify="space-between" style={{ paddingVertical: 9, paddingLeft: sub ? 14 : 0 }}>
                <Txt variant={sub ? "bodyS" : "bodyM"} tone={sub ? "tertiary" : "primary"}>
                  {label}
                </Txt>
                <Txt variant={sub ? "bodyS" : "labelL"} tone={value ? (sub ? "secondary" : "primary") : "tertiary"} tabular>
                  {value || t("not stated")}
                </Txt>
              </Row>
            </View>
          ))}
        </Card>
      </Section>

      <Section title={t("This portion")}>
        <Field label={unit === "g" ? t("Amount (g)") : t("Amount (ml)")} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" inputMode="decimal" selectTextOnFocus />
        <Row gap={8} style={{ flexWrap: "wrap" }}>
          {food.serving ? <Chip label={t("1 portion, {n} {unit}", { n: fmtG(food.serving), unit })} selected={grams === food.serving} onPress={() => setAmount(String(food.serving))} /> : null}
          {[50, 100, 200].map((n) => (
            <Chip key={n} label={`${n} ${unit}`} selected={grams === n && grams !== food.serving} onPress={() => setAmount(String(n))} />
          ))}
        </Row>
        <Row gap={8} style={{ flexWrap: "wrap" }}>
          {MEALS.map((m) => (
            <Chip key={m} label={t(MEAL_NAME[m])} selected={meal === m} onPress={() => setMeal(m)} />
          ))}
        </Row>
        <Row gap={16} align="baseline">
          <Txt variant="numberL" tabular>
            {fmtKcal(p.kcal)}
          </Txt>
          <Txt variant="labelM" tone="secondary">
            kcal
          </Txt>
          <Txt variant="bodyS" tone="tertiary" style={{ flex: 1 }}>
            {t("{p} g protein, {c} g carbs, {f} g fat", { p: fmtG(p.protein), c: fmtG(p.carbs), f: fmtG(p.fat) })}
          </Txt>
        </Row>
      </Section>

      {food.barcode ? (
        <Txt variant="labelS" tone="tertiary">
          {t("Barcode {code}", { code: food.barcode })}
        </Txt>
      ) : null}
    </Screen>
  );
}
