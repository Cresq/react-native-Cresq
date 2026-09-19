import { useMemo, useState } from "react";
import { Image, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useNav, useOnce } from "@/nav";
import { locale } from "@/db/derive";
import { useTheme } from "@/theme/ThemeProvider";
import { useT } from "@/i18n";
import { haptic } from "@/haptics";
import { useFood } from "@/store/food";
import { getDraft, setDraft } from "@/nutrition/draft";
import type { Food } from "@/db/types";
import { Screen, Row, Header } from "@/components/ui/Screen";
import { Txt } from "@/components/ui/Text";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Icon } from "@/components/ui/Icon";
import { Card } from "@/components/ui/Card";
import { Segmented } from "@/components/ui/Segmented";

type From = "label" | "manual" | "edit";

/** "12,5" is how a Dutch pack writes it, and how a Dutch thumb types it. */
const num = (s: string): number | undefined => {
  const n = Number(s.replace(",", ".").trim());
  return s.trim() === "" || !Number.isFinite(n) ? undefined : n;
};
const str = (n: number | undefined) => (n === undefined ? "" : (Math.round(n * 10) / 10).toLocaleString(locale));

/**
 * The one form every product passes through. Read off a photo, it arrives
 * filled in and asks to be checked; typed by hand, it arrives empty; opened
 * from a product, it holds what is there. Saving is what marks the figures
 * verified, because saving is the person saying so.
 */
export default function Review() {
  const { colors } = useTheme();
  const router = useNav();
  const once = useOnce();
  const t = useT();
  const { from = "manual", id } = useLocalSearchParams<{ from?: From; id?: string }>();
  const { byId, addFood, updateFood } = useFood();

  const existing = id ? byId.get(id) : undefined;
  const draft = useMemo(() => (from === "edit" ? existing : getDraft()) ?? { unit: "g" as const }, [from, existing]);

  const [name, setName] = useState(draft.name ?? "");
  const [brand, setBrand] = useState(draft.brand ?? "");
  const [unit, setUnit] = useState<Food["unit"]>(draft.unit ?? "g");
  const [kcal, setKcal] = useState(str(draft.kcal));
  const [fat, setFat] = useState(str(draft.fat));
  const [saturated, setSaturated] = useState(str(draft.saturated));
  const [carbs, setCarbs] = useState(str(draft.carbs));
  const [sugars, setSugars] = useState(str(draft.sugars));
  const [fibre, setFibre] = useState(str(draft.fibre));
  const [protein, setProtein] = useState(str(draft.protein));
  const [salt, setSalt] = useState(str(draft.salt));
  const [serving, setServing] = useState(str(draft.serving));

  const unreadable = from === "label" && "legible" in draft && draft.legible === false;
  const photo = "photoUri" in draft ? draft.photoUri : undefined;
  const note = "note" in draft ? draft.note : undefined;
  const ready = name.trim() !== "" && [kcal, fat, carbs, protein].every((v) => num(v) !== undefined);

  const save = once(() => {
    if (!ready) return;
    const food = {
      name: name.trim(),
      brand: brand.trim() || undefined,
      barcode: draft.barcode,
      unit,
      kcal: num(kcal)!,
      fat: num(fat)!,
      carbs: num(carbs)!,
      protein: num(protein)!,
      saturated: num(saturated),
      sugars: num(sugars),
      fibre: num(fibre),
      salt: num(salt),
      serving: num(serving),
      // The photo of the table stays with the product; a correction keeps whatever photo it had.
      photo: from === "edit" && existing ? existing.photo : photo,
      source: from === "edit" && existing ? existing.source : from === "label" ? ("label" as const) : ("manual" as const),
      verified: true,
    };
    haptic("done");
    setDraft(null);
    if (from === "edit" && existing) {
      updateFood(existing.id, food);
      router.back();
    } else {
      const newId = addFood(food);
      router.replace(`/food/${newId}?log=1`);
    }
  });

  const title = from === "edit" ? t("Correct the figures") : from === "label" ? t("Check the figures") : t("New product");
  const intro = from === "edit" ? t("Whatever you change here is what every portion is counted from.") : from === "label" ? t("Read off your photo. Hold each number against the pack before you save; saving is you saying they are right.") : t("Per 100 g or 100 ml, as the pack states it. Only the name and the four main figures are needed.");
  const per = unit === "g" ? t("per 100 g") : t("per 100 ml");

  return (
    <Screen bottom={90} footer={<Button label={from === "edit" ? t("Save changes") : t("Save and use")} onPress={save} disabled={!ready} />}>
      <Header left={<IconButton name={from === "edit" ? "chevronLeft" : "close"} onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/food"))} accessibilityLabel={from === "edit" ? t("Back") : t("Close")} />} title={title} />

      <View style={{ gap: 6 }}>
        <Txt variant="displayL">{title}</Txt>
        <Txt variant="bodyM" tone="secondary">
          {intro}
        </Txt>
      </View>

      {unreadable ? (
        <Card tone="raised" padding={14} gap={6}>
          <Row gap={8} align="flex-start">
            <Icon name="info" size={16} color={colors.status.warning} strokeWidth={2} />
            <View style={{ flex: 1, gap: 4 }}>
              <Txt variant="labelL">{t("The table could not be made out")}</Txt>
              <Txt variant="bodyS" tone="secondary">
                {note || t("Fill in what the pack says.")}
              </Txt>
            </View>
          </Row>
        </Card>
      ) : note ? (
        <Txt variant="bodyS" tone="tertiary">
          {note}
        </Txt>
      ) : null}

      {photo ? <Image source={{ uri: photo }} accessibilityLabel={t("Your photo of the table")} style={{ width: "100%", height: 180, borderRadius: 16, backgroundColor: colors.bg.raised }} resizeMode="cover" /> : null}

      <View style={{ gap: 10 }}>
        <Field label={t("Name")} value={name} onChangeText={setName} placeholder={t("Skyr natural")} autoCapitalize="sentences" />
        <Field label={t("Brand")} value={brand} onChangeText={setBrand} placeholder={t("Optional")} autoCapitalize="words" />
      </View>

      <View style={{ gap: 12 }}>
        <Segmented size="M" value={unit} onChange={(k) => setUnit(k as Food["unit"])} segments={[{ key: "g", label: t("Per 100 g") }, { key: "ml", label: t("Per 100 ml") }]} />
        <Txt variant="labelS" tone="tertiary">
          {t("Every figure below is {per}, as printed on the pack.", { per })}
        </Txt>
      </View>

      <View style={{ gap: 10 }}>
        <Field label={t("Energy (kcal)")} value={kcal} onChangeText={setKcal} placeholder="0" keyboardType="decimal-pad" inputMode="decimal" />
        <Row gap={10} align="flex-start">
          <View style={{ flex: 1 }}><Field label={t("Fat (g)")} value={fat} onChangeText={setFat} placeholder="0" keyboardType="decimal-pad" inputMode="decimal" /></View>
          <View style={{ flex: 1 }}><Field label={t("of which saturated (g)")} value={saturated} onChangeText={setSaturated} placeholder={t("Optional")} keyboardType="decimal-pad" inputMode="decimal" /></View>
        </Row>
        <Row gap={10} align="flex-start">
          <View style={{ flex: 1 }}><Field label={t("Carbohydrates (g)")} value={carbs} onChangeText={setCarbs} placeholder="0" keyboardType="decimal-pad" inputMode="decimal" /></View>
          <View style={{ flex: 1 }}><Field label={t("of which sugars (g)")} value={sugars} onChangeText={setSugars} placeholder={t("Optional")} keyboardType="decimal-pad" inputMode="decimal" /></View>
        </Row>
        <Row gap={10} align="flex-start">
          <View style={{ flex: 1 }}><Field label={t("Fibre (g)")} value={fibre} onChangeText={setFibre} placeholder={t("Optional")} keyboardType="decimal-pad" inputMode="decimal" /></View>
          <View style={{ flex: 1 }}><Field label={t("Protein (g)")} value={protein} onChangeText={setProtein} placeholder="0" keyboardType="decimal-pad" inputMode="decimal" /></View>
        </Row>
        <Row gap={10} align="flex-start">
          <View style={{ flex: 1 }}><Field label={t("Salt (g)")} value={salt} onChangeText={setSalt} placeholder={t("Optional")} keyboardType="decimal-pad" inputMode="decimal" /></View>
          <View style={{ flex: 1 }}><Field label={unit === "g" ? t("One portion (g)") : t("One portion (ml)")} value={serving} onChangeText={setServing} placeholder={t("Optional")} keyboardType="decimal-pad" inputMode="decimal" /></View>
        </Row>
      </View>

      {draft.barcode ? (
        <Txt variant="labelS" tone="tertiary">
          {t("Barcode {code}", { code: draft.barcode })}
        </Txt>
      ) : null}
    </Screen>
  );
}
