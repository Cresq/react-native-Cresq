import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useNav } from "@/nav";
import { useTheme } from "@/theme/ThemeProvider";
import { useT } from "@/i18n";
import { useNow } from "@/clock";
import { useLoggingDay } from "@/nutrition/useLoggingDay";
import { useMeals } from "@/store/meals";
import { useFood } from "@/store/food";
import { setDraft } from "@/nutrition/draft";
import { MEAL_NAME, fmtKcal, mealAt, suggestions } from "@/nutrition/derive";
import type { Food } from "@/db/types";
import { Screen, Row, Section, Header } from "@/components/ui/Screen";
import { Txt } from "@/components/ui/Text";
import { Card, Divider } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { IconButton } from "@/components/ui/IconButton";
import { Icon } from "@/components/ui/Icon";
import { FoodMark } from "@/components/FoodMark";

/**
 * Finding something to eat by typing. The field is for the name; under it,
 * before a letter is typed, is what this hour usually holds for this person,
 * then what they added most recently. The camera is one tap away at the top
 * for anyone holding a pack, and typing the figures in sits at the bottom,
 * where it is needed only when the search comes up empty.
 */
export default function LogFood() {
  const { colors } = useTheme();
  const router = useNav();
  const t = useT();
  const now = useNow();
  const { foods, log } = useFood();
  const { meal: wanted } = useLocalSearchParams<{ meal?: string }>();
  const [q, setQ] = useState("");
  // The meal the person came from goes with them to the product, so it is preselected there.
  const meals = useMeals();
  const from = meals.known(wanted) ? wanted : null;
  const mealQ = from ? `&meal=${from}` : "";
  const onDay = useLoggingDay();

  const offered = useMemo(() => suggestions(log, foods, now), [log, foods, now]);
  const hits = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return [];
    return foods.filter((f) => `${f.name} ${f.brand ?? ""}`.toLowerCase().includes(needle)).sort((a, b) => a.name.localeCompare(b.name)).slice(0, 30);
  }, [foods, q]);
  const searching = q.trim() !== "";
  const meal = t(MEAL_NAME[mealAt(now)]).toLowerCase();

  const open = (f: Food) => router.replace(`/food/${f.id}?log=1${mealQ}`);
  const scan = () => router.replace("/food/scan");
  const byHand = () => {
    setDraft({ name: q.trim() || undefined, unit: "g", source: "manual", verified: false });
    router.replace("/food/review?from=manual");
  };

  const row = (f: Food, i: number, last: boolean) => (
    <View key={f.id}>
      {i > 0 ? <Divider /> : null}
      <Pressable accessibilityRole="button" accessibilityLabel={f.name} onPress={() => open(f)} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, opacity: pressed ? 0.7 : 1 })}>
        <FoodMark photo={f.photo} size={40} />
        <View style={{ flex: 1, gap: 2 }}>
          <Txt variant="labelL" numberOfLines={1}>
            {f.name}
          </Txt>
          <Txt variant="bodyS" tone="tertiary" numberOfLines={1}>
            {[f.brand, `${fmtKcal(f.kcal)} kcal ${f.unit === "g" ? t("per 100 g") : t("per 100 ml")}`].filter(Boolean).join(", ")}
          </Txt>
        </View>
        <Icon name="chevronRight" size={16} color={colors.text.tertiary} strokeWidth={2} />
      </Pressable>
      {last ? null : null}
    </View>
  );

  return (
    <Screen>
      <Header left={<IconButton name="close" onPress={() => router.back("/(tabs)/food")} accessibilityLabel={t("Close")} />} title={t("Search a product")} subtitle={[from ? meals.nameOf(from) : null, onDay.name].filter(Boolean).join(", ") || undefined} />
      <Field label={t("Search")} value={q} onChangeText={setQ} placeholder={t("Name or brand")} icon="search" autoCorrect={false} autoFocus />

      <Card tone="raised" padding={14} gap={0} onPress={scan} accessibilityLabel={t("Scan a barcode")}>
        <Row gap={12}>
          <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.fuel.soft, alignItems: "center", justifyContent: "center" }}>
            <Icon name="camera" size={18} color={colors.fuel.sage} strokeWidth={2} />
          </View>
          <View style={{ flex: 1, gap: 1 }}>
            <Txt variant="labelL">{t("Scan a barcode")}</Txt>
            <Txt variant="bodyS" tone="tertiary">
              {t("Barcode, or a photo of the nutrition table")}
            </Txt>
          </View>
          <Icon name="chevronRight" size={16} color={colors.text.tertiary} strokeWidth={2} />
        </Row>
      </Card>

      {searching ? (
        <Section title={hits.length ? t("In your products") : undefined}>
          {hits.length ? (
            <Card padding={16} gap={0}>{hits.map((f, i) => row(f, i, i === hits.length - 1))}</Card>
          ) : (
            <View style={{ gap: 4, paddingVertical: 8 }}>
              <Txt variant="labelL">{t("Nothing called “{q}” yet", { q: q.trim() })}</Txt>
              <Txt variant="bodyS" tone="secondary">
                {t("Scan its barcode or type the figures in below, and next time it is one tap.")}
              </Txt>
            </View>
          )}
        </Section>
      ) : (
        <>
          {offered.pattern.length ? (
            <View>
              <Section title={t("Usually at {meal}", { meal })}>
                <Card padding={16} gap={0}>{offered.pattern.map((f, i) => row(f, i, i === offered.pattern.length - 1))}</Card>
              </Section>
            </View>
          ) : null}
          {offered.recent.length ? (
            <View>
              <Section title={offered.pattern.length ? t("Recently added") : t("Your products")}>
                <Card padding={16} gap={0}>{offered.recent.map((f, i) => row(f, i, i === offered.recent.length - 1))}</Card>
              </Section>
            </View>
          ) : null}
          {!offered.pattern.length && !offered.recent.length ? (
            <Card tone="raised" padding={18} gap={6}>
              <Txt variant="labelL">{t("Nothing to offer yet")}</Txt>
              <Txt variant="bodyS" tone="secondary">
                {t("Once you have logged a few things, what you usually eat at {meal} shows up here first.", { meal })}
              </Txt>
            </Card>
          ) : null}
        </>
      )}

      <Section title={t("New product")}>
        <Card padding={16} gap={0}>
          <Pressable accessibilityRole="button" accessibilityLabel={t("Enter by hand")} onPress={byHand} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, opacity: pressed ? 0.7 : 1 })}>
            <Icon name="noteEdit" size={20} color={colors.text.secondary} strokeWidth={1.9} />
            <View style={{ flex: 1, gap: 1 }}>
              <Txt variant="labelL">{t("Enter by hand")}</Txt>
              <Txt variant="bodyS" tone="tertiary">
                {searching ? t("Start with “{q}”", { q: q.trim() }) : t("Something without a pack, or your own recipe")}
              </Txt>
            </View>
            <Icon name="chevronRight" size={16} color={colors.text.tertiary} strokeWidth={2} />
          </Pressable>
        </Card>
      </Section>
      <Row />
    </Screen>
  );
}
