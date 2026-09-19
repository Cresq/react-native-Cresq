import { useState } from "react";
import { Pressable, View } from "react-native";
import Animated, { FadeInDown, FadeOut } from "react-native-reanimated";
import { useTheme } from "@/theme/ThemeProvider";
import { useDb } from "@/db/DbProvider";
import { useNav } from "@/nav";
import { useT, useLanguage, localeOf } from "@/i18n";
import { haptic } from "@/haptics";
import { maintenanceOf, proposeTargets, type NeedsInput } from "@/nutrition/derive";
import type { FoodProfile, NutritionTargets } from "@/db/types";
import { Screen, Row } from "@/components/ui/Screen";
import { Txt } from "@/components/ui/Text";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { WheelPicker } from "@/components/ui/WheelPicker";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Icon, type IconName } from "@/components/ui/Icon";
import { MacroTargets } from "@/components/MacroTargets";

type Goal = FoodProfile["goal"];
type Sex = NonNullable<FoodProfile["sex"]>;
type Activity = NonNullable<FoodProfile["activity"]>;
const num = (s: string) => {
  const n = Number(s.replace(",", ".").trim());
  return Number.isFinite(n) && n > 0 ? n : 0;
};

/**
 * The first time Food is opened. A welcome, then the questions a dietitian
 * would ask before naming a number (sex, height, weight, age, how active the
 * days are, and where the person is headed), then the figures those lead to,
 * shown and editable before anything is saved. Waving it off is always a tap;
 * the tab then works without targets.
 */
export function FoodWelcome() {
  const { colors } = useTheme();
  const { db, update } = useDb();
  const router = useNav();
  const t = useT();
  const locale = localeOf(useLanguage());
  const [step, setStep] = useState(0);
  const [sex, setSex] = useState<Sex | null>(null);
  // Wheels always show a value, so they start on a plausible one rather than on nothing.
  const [height, setHeight] = useState(175);
  const [weight, setWeight] = useState(75);
  const [birthYear, setBirthYear] = useState(db.profile.birthYear ? String(db.profile.birthYear) : "");
  const [activity, setActivity] = useState<Activity | null>(null);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [proposal, setProposal] = useState<NutritionTargets | null>(null);
  const [maintenance, setMaintenance] = useState(0);
  const [draft, setDraft] = useState<NutritionTargets | null>(null);

  const year = new Date().getFullYear();
  const age = num(birthYear) ? Math.max(16, year - num(birthYear)) : 0;
  const bodyReady = !!sex && height > 0 && weight > 0 && age > 0;
  const input = (): NeedsInput => ({ weightKg: weight, heightCm: height, age, sex: sex ?? "x", activity: activity ?? "moderate", goal: goal ?? "maintain" });

  const propose = () => {
    const p = proposeTargets(input());
    setMaintenance(maintenanceOf(input()));
    setProposal(p);
    setDraft(p);
    setStep(3);
  };
  const finish = (withTargets: boolean) => {
    haptic("done");
    update((d) => ({
      ...d,
      profile: {
        ...d.profile,
        birthYear: d.profile.birthYear ?? (num(birthYear) || undefined),
        food: { weightKg: weight, heightCm: height, sex: sex ?? undefined, activity: activity ?? undefined, goal: goal ?? "maintain", onboardedAt: Date.now() },
        targets: withTargets && draft ? draft : d.profile.targets,
      },
    }));
    router.push("/done?kind=food");
  };
  const skip = () => {
    haptic("tap");
    update((d) => ({ ...d, profile: { ...d.profile, food: { goal: "maintain", onboardedAt: Date.now() } } }));
  };

  const activities: { key: Activity; icon: IconName; label: string; sub: string }[] = [
    { key: "low", icon: "rows", label: t("Mostly sitting"), sub: t("A desk, a car, an evening on the sofa") },
    { key: "moderate", icon: "pulse", label: t("On my feet a good part of the day"), sub: t("Walking, standing, running errands") },
    { key: "high", icon: "flame", label: t("Physical work"), sub: t("Lifting, building, a job that is exercise") },
  ];
  const goals: { key: Goal; icon: IconName; label: string; sub: string }[] = [
    { key: "cut", icon: "trendingDown", label: t("Lose fat"), sub: t("Under maintenance, protein kept high") },
    { key: "maintain", icon: "pulse", label: t("Stay where I am"), sub: t("Eat what you use, feel how it goes") },
    { key: "gain", icon: "trendingUp", label: t("Build muscle"), sub: t("A little over maintenance, room to grow") },
  ];
  const trainingDays = db.profile.daysPerWeek ?? 0;
  const draftReady = !!draft && draft.kcal > 0 && draft.protein > 0 && draft.carbs > 0 && draft.fat > 0;
  const n = (v: number) => Math.round(v).toLocaleString(locale);

  const option = (selected: boolean, icon: IconName, label: string, sub: string, onPress: () => void) => (
    <Pressable key={label} accessibilityRole="radio" accessibilityState={{ checked: selected }} accessibilityLabel={label} onPress={() => { haptic("select"); onPress(); }}>
      <Card padding={14} gap={0} bordered={selected} style={selected ? { borderColor: colors.fuel.sage } : undefined}>
        <Row gap={12}>
          <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: selected ? colors.fuel.soft : colors.bg.raised, alignItems: "center", justifyContent: "center" }}>
            <Icon name={icon} size={18} color={selected ? colors.fuel.sage : colors.text.secondary} strokeWidth={2} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Txt variant="labelL">{label}</Txt>
            <Txt variant="bodyS" tone="tertiary">
              {sub}
            </Txt>
          </View>
        </Row>
      </Card>
    </Pressable>
  );

  return (
    <Screen tabs>
      {step === 0 ? (
        <Animated.View key="welcome" entering={FadeInDown.duration(240)} exiting={FadeOut.duration(120)} style={{ gap: 24 }}>
          <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.fuel.soft, alignItems: "center", justifyContent: "center" }}>
            <Icon name="leaf" size={26} color={colors.fuel.sage} strokeWidth={1.9} />
          </View>
          <View style={{ gap: 8 }}>
            <Txt variant="displayXL">{t("Food, the same way you log a set")}</Txt>
            <Txt variant="bodyM" tone="secondary">
              {t("Scan a pack and it is in your day. Photograph a nutrition table and CresQ reads it, you check it. Everything stays on your phone.")}
            </Txt>
          </View>
          <View style={{ gap: 14 }}>
            {[
              [t("Scan"), t("The barcode on a pack, two taps to a portion")],
              [t("Your pattern"), t("What you ate at this hour before is offered first")],
              [t("Your need"), t("Worked out from a few questions, the way a dietitian would, and yours to change")],
            ].map(([head, body]) => (
              <Row key={head} gap={12} align="flex-start">
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.fuel.sage, marginTop: 8 }} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Txt variant="labelL">{head}</Txt>
                  <Txt variant="bodyS" tone="secondary">
                    {body}
                  </Txt>
                </View>
              </Row>
            ))}
          </View>
          <View style={{ gap: 8 }}>
            <Button label={t("A few questions, then we start")} variant="sage" iconRight="arrowRight" onPress={() => setStep(1)} />
            <Button label={t("Skip, I will set targets later")} variant="tertiary" size="M" onPress={skip} />
          </View>
        </Animated.View>
      ) : null}

      {step === 1 ? (
        <Animated.View key="body" entering={FadeInDown.duration(240)} exiting={FadeOut.duration(120)} style={{ gap: 20 }}>
          <View style={{ gap: 8 }}>
            <Txt variant="labelM" tone="tertiary">
              {t("Step {a} of {b}", { a: 1, b: 3 })}
            </Txt>
            <Txt variant="displayL">{t("About you")}</Txt>
            <Txt variant="bodyM" tone="secondary">
              {t("Only used to work out what you need. It is not shown to anyone.")}
            </Txt>
          </View>
          <Row gap={8} style={{ flexWrap: "wrap" }}>
            <Chip label={t("Man")} selected={sex === "m"} onPress={() => setSex("m")} />
            <Chip label={t("Woman")} selected={sex === "f"} onPress={() => setSex("f")} />
            <Chip label={t("Rather not say")} selected={sex === "x"} onPress={() => setSex("x")} />
          </Row>
          <Row gap={10} align="flex-start">
            <View style={{ flex: 1, gap: 6 }}>
              <Txt variant="labelS" tone="tertiary">
                {t("Height (cm)")}
              </Txt>
              <WheelPicker values={Array.from({ length: 81 }, (_, k) => 140 + k)} value={height} onChange={setHeight} format={(v) => `${v} cm`} />
            </View>
            <View style={{ flex: 1, gap: 6 }}>
              <Txt variant="labelS" tone="tertiary">
                {t("Body weight (kg)")}
              </Txt>
              <WheelPicker values={Array.from({ length: 161 }, (_, k) => 40 + k)} value={weight} onChange={setWeight} format={(v) => `${v} kg`} />
            </View>
          </Row>
          {db.profile.birthYear ? (
            <Txt variant="labelS" tone="tertiary">
              {t("Age {n}, from the year of birth you gave at sign-up.", { n: age })}
            </Txt>
          ) : (
            <Field label={t("Year of birth")} value={birthYear} onChangeText={(v) => setBirthYear(v.replace(/\D/g, "").slice(0, 4))} keyboardType="number-pad" inputMode="numeric" placeholder="1998" maxLength={4} />
          )}
          <Button label={t("Continue")} variant="sage" iconRight="arrowRight" disabled={!bodyReady} onPress={() => setStep(2)} />
        </Animated.View>
      ) : null}

      {step === 2 ? (
        <Animated.View key="days" entering={FadeInDown.duration(240)} exiting={FadeOut.duration(120)} style={{ gap: 20 }}>
          <View style={{ gap: 8 }}>
            <Txt variant="labelM" tone="tertiary">
              {t("Step {a} of {b}", { a: 2, b: 3 })}
            </Txt>
            <Txt variant="displayL">{t("Your days, and where you are headed")}</Txt>
            <Txt variant="bodyM" tone="secondary">
              {trainingDays ? t("Outside the gym. Your {n} training days a week are already counted.", { n: trainingDays }) : t("Outside the gym; training is counted separately.")}
            </Txt>
          </View>
          <View style={{ gap: 8 }}>{activities.map((a) => option(activity === a.key, a.icon, a.label, a.sub, () => setActivity(a.key)))}</View>
          <Txt variant="labelM" tone="secondary">
            {t("And the goal")}
          </Txt>
          <View style={{ gap: 8 }}>{goals.map((g) => option(goal === g.key, g.icon, g.label, g.sub, () => setGoal(g.key)))}</View>
          <Button label={t("Work out my need")} variant="sage" iconRight="arrowRight" disabled={!activity || !goal} onPress={propose} />
        </Animated.View>
      ) : null}

      {step === 3 && proposal ? (
        <Animated.View key="targets" entering={FadeInDown.duration(240)} style={{ gap: 20 }}>
          <View style={{ gap: 8 }}>
            <Txt variant="labelM" tone="tertiary">
              {t("Step {a} of {b}", { a: 3, b: 3 })}
            </Txt>
            <Txt variant="displayL">{t("Your need")}</Txt>
            <Txt variant="bodyM" tone="secondary">
              {t("Maintenance is about {m} kcal a day (Mifflin-St Jeor, the equation dietitians reach for first). With your goal that becomes {k} kcal. A starting point, not a prescription: change any figure now or later.", { m: n(maintenance), k: n(proposal.kcal) })}
            </Txt>
          </View>
          <MacroTargets initial={proposal} onChange={setDraft} />
          <View style={{ gap: 8 }}>
            <Button label={t("Save and start")} variant="sage" disabled={!draftReady} onPress={() => finish(true)} />
            <Button label={t("Start without targets")} variant="tertiary" size="M" onPress={() => finish(false)} />
          </View>
        </Animated.View>
      ) : null}
    </Screen>
  );
}
