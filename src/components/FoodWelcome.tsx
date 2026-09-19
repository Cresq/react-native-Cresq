import { useState } from "react";
import { Pressable, View } from "react-native";
import Animated, { FadeInDown, FadeOut } from "react-native-reanimated";
import { useTheme } from "@/theme/ThemeProvider";
import { useDb } from "@/db/DbProvider";
import { useT } from "@/i18n";
import { haptic } from "@/haptics";
import { proposeTargets } from "@/nutrition/derive";
import type { FoodProfile } from "@/db/types";
import { Screen, Row } from "@/components/ui/Screen";
import { Txt } from "@/components/ui/Text";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Icon, type IconName } from "@/components/ui/Icon";

type Goal = FoodProfile["goal"];
const num = (s: string) => {
  const n = Number(s.replace(",", ".").trim());
  return Number.isFinite(n) && n > 0 ? n : 0;
};

/**
 * The first time Food is opened. Three short screens: what this is, two
 * questions, and the four figures those questions lead to, shown before
 * anything is saved so the person can change every one. Waving it off is
 * always possible; the tab then works without targets.
 */
export function FoodWelcome() {
  const { colors } = useTheme();
  const { update } = useDb();
  const t = useT();
  const [step, setStep] = useState(0);
  const [weight, setWeight] = useState("");
  const [goal, setGoal] = useState<Goal | null>(null);
  const [kcal, setKcal] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");

  const propose = () => {
    const p = proposeTargets(num(weight), goal ?? "maintain");
    setKcal(String(p.kcal));
    setProtein(String(p.protein));
    setCarbs(String(p.carbs));
    setFat(String(p.fat));
    setStep(2);
  };
  const finish = (withTargets: boolean) => {
    haptic("done");
    update((d) => ({
      ...d,
      profile: {
        ...d.profile,
        food: { weightKg: num(weight) || undefined, goal: goal ?? "maintain", onboardedAt: Date.now() },
        targets: withTargets ? { kcal: num(kcal), protein: num(protein), carbs: num(carbs), fat: num(fat) } : d.profile.targets,
      },
    }));
  };
  const skip = () => {
    haptic("tap");
    update((d) => ({ ...d, profile: { ...d.profile, food: { goal: "maintain", onboardedAt: Date.now() } } }));
  };

  const goals: { key: Goal; icon: IconName; label: string; sub: string }[] = [
    { key: "cut", icon: "trendingDown", label: t("Lose fat"), sub: t("A little under maintenance, protein kept high") },
    { key: "maintain", icon: "pulse", label: t("Stay where I am"), sub: t("Eat what you use, feel how it goes") },
    { key: "gain", icon: "trendingUp", label: t("Build muscle"), sub: t("A little over maintenance, room to grow") },
  ];
  const targetsReady = [kcal, protein, carbs, fat].every((v) => num(v) > 0);

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
              [t("Targets"), t("A starting point from two questions, yours to change")],
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
            <Button label={t("Two questions, then we start")} iconRight="arrowRight" onPress={() => setStep(1)} />
            <Button label={t("Skip, I will set targets later")} variant="tertiary" size="M" onPress={skip} />
          </View>
        </Animated.View>
      ) : null}

      {step === 1 ? (
        <Animated.View key="questions" entering={FadeInDown.duration(240)} exiting={FadeOut.duration(120)} style={{ gap: 24 }}>
          <View style={{ gap: 8 }}>
            <Txt variant="labelM" tone="tertiary">
              {t("Step {a} of {b}", { a: 1, b: 2 })}
            </Txt>
            <Txt variant="displayL">{t("What do you weigh, and where are you headed?")}</Txt>
            <Txt variant="bodyM" tone="secondary">
              {t("Only used to propose your targets. It is not shown to anyone.")}
            </Txt>
          </View>
          <Field label={t("Body weight (kg)")} value={weight} onChangeText={setWeight} keyboardType="decimal-pad" inputMode="decimal" placeholder="80" autoFocus />
          <View style={{ gap: 8 }}>
            {goals.map((g) => (
              <Pressable key={g.key} accessibilityRole="radio" accessibilityState={{ checked: goal === g.key }} accessibilityLabel={g.label} onPress={() => { haptic("select"); setGoal(g.key); }}>
                <Card padding={16} gap={0} bordered={goal === g.key} style={goal === g.key ? { borderColor: colors.fuel.sage } : undefined}>
                  <Row gap={12}>
                    <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: goal === g.key ? colors.fuel.soft : colors.bg.raised, alignItems: "center", justifyContent: "center" }}>
                      <Icon name={g.icon} size={18} color={goal === g.key ? colors.fuel.sage : colors.text.secondary} strokeWidth={2} />
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Txt variant="labelL">{g.label}</Txt>
                      <Txt variant="bodyS" tone="tertiary">
                        {g.sub}
                      </Txt>
                    </View>
                  </Row>
                </Card>
              </Pressable>
            ))}
          </View>
          <Button label={t("Propose my targets")} iconRight="arrowRight" disabled={!goal || !num(weight)} onPress={propose} />
        </Animated.View>
      ) : null}

      {step === 2 ? (
        <Animated.View key="targets" entering={FadeInDown.duration(240)} style={{ gap: 24 }}>
          <View style={{ gap: 8 }}>
            <Txt variant="labelM" tone="tertiary">
              {t("Step {a} of {b}", { a: 2, b: 2 })}
            </Txt>
            <Txt variant="displayL">{t("A starting point, not a prescription")}</Txt>
            <Txt variant="bodyM" tone="secondary">
              {t("From your weight and your goal. Change any figure now or later under the sliders on the Food tab; the app never adjusts them on its own.")}
            </Txt>
          </View>
          <View style={{ gap: 10 }}>
            <Field label={t("Energy (kcal)")} value={kcal} onChangeText={setKcal} keyboardType="number-pad" inputMode="numeric" />
            <Row gap={10} align="flex-start">
              <View style={{ flex: 1 }}><Field label={t("Protein (g)")} value={protein} onChangeText={setProtein} keyboardType="number-pad" inputMode="numeric" /></View>
              <View style={{ flex: 1 }}><Field label={t("Carbohydrates (g)")} value={carbs} onChangeText={setCarbs} keyboardType="number-pad" inputMode="numeric" /></View>
              <View style={{ flex: 1 }}><Field label={t("Fat (g)")} value={fat} onChangeText={setFat} keyboardType="number-pad" inputMode="numeric" /></View>
            </Row>
          </View>
          <View style={{ gap: 8 }}>
            <Button label={t("Save and start")} disabled={!targetsReady} onPress={() => finish(true)} />
            <Button label={t("Start without targets")} variant="tertiary" size="M" onPress={() => finish(false)} />
          </View>
        </Animated.View>
      ) : null}
    </Screen>
  );
}
