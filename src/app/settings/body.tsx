import { useState } from "react";
import { View } from "react-native";
import { useNav } from "@/nav";
import { useTheme } from "@/theme/ThemeProvider";
import { useDb } from "@/db/DbProvider";
import { useT, useLanguage, localeOf } from "@/i18n";
import { haptic } from "@/haptics";
import { maintenanceOf, proposeTargets } from "@/nutrition/derive";
import { MIN_AGE, type FoodProfile, type NutritionTargets } from "@/db/types";
import { Screen, Row, Section, Header } from "@/components/ui/Screen";
import { Txt } from "@/components/ui/Text";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Chip } from "@/components/ui/Chip";
import { WheelPicker } from "@/components/ui/WheelPicker";

type Sex = NonNullable<FoodProfile["sex"]>;
type Activity = NonNullable<FoodProfile["activity"]>;
type Goal = FoodProfile["goal"];

const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

/**
 * The person's own figures, in one place: height, weight, sex, year of birth,
 * how active the days are, the goal. Saving keeps them; recalculating turns
 * them into targets, shown before they are kept.
 */
export default function Body() {
  const { db, ready } = useDb();
  // A stack screen can be the first thing on screen after a reload or a deep
  // link, before the stored document has been read; a form built then would
  // start from the seed. Wait for the document, and rebuild the form if the
  // figures it was built from change underneath it.
  if (!ready) return <Screen />;
  return <Form key={`${db.profile.food?.onboardedAt ?? 0}:${db.profile.birthYear ?? 0}`} />;
}

function Form() {
  const { colors } = useTheme();
  const router = useNav();
  const t = useT();
  const locale = localeOf(useLanguage());
  const { db, update } = useDb();
  const f = db.profile.food;
  const year = new Date().getFullYear();
  const years = range(year - 100, year - MIN_AGE);

  const [height, setHeight] = useState(f?.heightCm ?? 175);
  const [weight, setWeight] = useState(f?.weightKg ?? 75);
  const [birthYear, setBirthYear] = useState(db.profile.birthYear ?? year - 25);
  const [sex, setSex] = useState<Sex>(f?.sex ?? "x");
  const [activity, setActivity] = useState<Activity>(f?.activity ?? "moderate");
  const [goal, setGoal] = useState<Goal>(f?.goal ?? "maintain");
  const [proposal, setProposal] = useState<NutritionTargets | null>(null);
  const [savedAt, setSavedAt] = useState(0);

  const input = () => ({ weightKg: weight, heightCm: height, age: Math.max(MIN_AGE, year - birthYear), sex, activity, goal });
  const n = (v: number) => Math.round(v).toLocaleString(locale);

  const save = (targets?: NutritionTargets) => {
    haptic("done");
    update((d) => ({
      ...d,
      profile: {
        ...d.profile,
        birthYear,
        food: { ...(d.profile.food ?? { onboardedAt: Date.now() }), weightKg: weight, heightCm: height, sex, activity, goal },
        targets: targets ?? d.profile.targets,
      },
    }));
    setSavedAt(Date.now());
  };
  const recalc = () => {
    haptic("select");
    setProposal(proposeTargets(input()));
  };

  const chips = <T extends string>(items: [T, string][], value: T, set: (v: T) => void) => (
    <Row gap={8} style={{ flexWrap: "wrap" }}>
      {items.map(([k, label]) => (
        <Chip key={k} label={label} selected={value === k} onPress={() => { haptic("select"); set(k); setProposal(null); }} />
      ))}
    </Row>
  );

  return (
    <Screen bottom={90} footer={<Button label={savedAt ? t("Saved") : t("Save")} onPress={() => save()} />}>
      <Header left={<IconButton name="chevronLeft" onPress={() => router.back()} accessibilityLabel={t("Back")} />} title={t("Your figures")} subtitle={t("Only used for your food targets")} />

      <Section title={t("Height and weight")}>
        <Row gap={10} align="flex-start">
          <View style={{ flex: 1, gap: 6 }}>
            <Txt variant="labelS" tone="tertiary">
              {t("Height (cm)")}
            </Txt>
            <WheelPicker values={range(140, 220)} value={height} onChange={(v) => { setHeight(v); setProposal(null); }} format={(v) => `${v} cm`} />
          </View>
          <View style={{ flex: 1, gap: 6 }}>
            <Txt variant="labelS" tone="tertiary">
              {t("Body weight (kg)")}
            </Txt>
            <WheelPicker values={range(40, 200)} value={weight} onChange={(v) => { setWeight(v); setProposal(null); }} format={(v) => `${v} kg`} />
          </View>
        </Row>
      </Section>

      <Section title={t("Year of birth")}>
        <WheelPicker values={years} value={birthYear} onChange={(v) => { setBirthYear(v); setProposal(null); }} />
      </Section>

      <Section title={t("About you")}>
        {chips<Sex>([["m", t("Man")], ["f", t("Woman")], ["x", t("Rather not say")]], sex, setSex)}
      </Section>

      <Section title={t("Your days, outside the gym")}>
        {chips<Activity>([["low", t("Mostly sitting")], ["moderate", t("On my feet a good part of the day")], ["high", t("Physical work")]], activity, setActivity)}
      </Section>

      <Section title={t("Goal")}>
        {chips<Goal>([["cut", t("Lose fat")], ["maintain", t("Stay where I am")], ["gain", t("Build muscle")]], goal, setGoal)}
      </Section>

      <Section title={t("Targets")} gap={10}>
        <Txt variant="bodyS" tone="secondary">
          {t("Maintenance with these figures is about {m} kcal a day. Recalculating proposes new targets; your current ones stay until you keep the new ones.", { m: n(maintenanceOf(input())) })}
        </Txt>
        {proposal ? (
          <Card padding={16} gap={10} style={{ backgroundColor: colors.fuel.soft }}>
            <Row gap={8} align="baseline">
              <Txt variant="numberL" tabular style={{ color: colors.fuel.sage }}>
                {n(proposal.kcal)}
              </Txt>
              <Txt variant="labelM" tone="secondary">
                kcal
              </Txt>
            </Row>
            <Txt variant="bodyS" tone="secondary">
              {t("{p} g protein, {c} g carbs, {f} g fat", { p: proposal.protein, c: proposal.carbs, f: proposal.fat })}
            </Txt>
            <Button label={t("Keep these targets")} variant="sage" size="M" onPress={() => { save(proposal); setProposal(null); }} />
          </Card>
        ) : (
          <Button label={t("Recalculate targets")} variant="secondary" size="M" icon="reload" onPress={recalc} />
        )}
      </Section>
    </Screen>
  );
}
