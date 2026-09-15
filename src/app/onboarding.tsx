import { useState } from "react";
import { Pressable, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTheme } from "@/theme/ThemeProvider";
import { useDb } from "@/db/DbProvider";
import { MIN_AGE, type Consent, type Profile } from "@/db/types";
import { Screen, Row, Header } from "@/components/ui/Screen";
import { Txt } from "@/components/ui/Text";
import { IconButton } from "@/components/ui/IconButton";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Chip } from "@/components/ui/Chip";
import { Field } from "@/components/ui/Field";
import { Toggle } from "@/components/ui/Toggle";
import { Divider } from "@/components/ui/Card";
import { useT } from "@/i18n";

type Answers = Pick<Profile, "goal" | "experience" | "daysPerWeek" | "limitations" | "birthYear">;
type Choices = Pick<Consent, "analytics" | "ageStats">;

const STEPS = [
  { key: "birth", title: "What year were you born?", sub: "CresQ is for people aged {n} and over. We only ask the year, and only for this check." },
  { key: "goal", title: "What are you here for?", sub: "One answer. It sets the default rep ranges and rest." },
  { key: "experience", title: "How long have you trained?", sub: "This decides how fast your plans progress." },
  { key: "days", title: "How many days a week?", sub: "Your split will match it. You can change it any time." },
  { key: "limits", title: "Anything to work around?", sub: "Plans and the AI builder avoid movements that load these." },
  { key: "data", title: "What may we collect?", sub: "Both are off. Your log stays on your device either way. Change this any time in Account and privacy." },
] as const;

const LIMITS = ["Shoulder", "Knee", "Lower back", "Wrist", "Elbow", "Hip"];

/**
 * Onboarding. Six short screens: the age check first, four training
 * questions, and one honest screen about data, with everything off by default.
 */
export default function Onboarding() {
  const { colors } = useTheme();
  const router = useRouter();
  const t = useT();
  const { db, update } = useDb();
  const { edit } = useLocalSearchParams<{ edit?: string }>();
  const [i, setI] = useState(0);
  const [a, setA] = useState<Answers>({ goal: db.profile.goal, experience: db.profile.experience, daysPerWeek: db.profile.daysPerWeek, limitations: db.profile.limitations ?? [], birthYear: db.profile.birthYear });
  const [c, setC] = useState<Choices>({ analytics: db.consent.analytics, ageStats: db.consent.ageStats });
  const [yearText, setYearText] = useState(db.profile.birthYear ? String(db.profile.birthYear) : "");
  const step = STEPS[i];
  const stepTitle = t(step.title);
  const stepSub = t(step.sub, { n: MIN_AGE });
  const year = new Date().getFullYear();
  const tooYoung = !!a.birthYear && a.birthYear > year - MIN_AGE;
  const can = step.key === "birth" ? !!a.birthYear && !tooYoung && a.birthYear > year - 120 : step.key === "goal" ? !!a.goal : step.key === "experience" ? !!a.experience : step.key === "days" ? !!a.daysPerWeek : true;

  const finish = () => {
    update((d) => ({ ...d, profile: { ...d.profile, ...a, onboarded: true }, consent: { ...d.consent, ...c, ageStats: c.ageStats && !!a.birthYear } }));
    if (edit) router.back();
    else router.replace("/(tabs)");
  };
  const next = () => (i < STEPS.length - 1 ? setI(i + 1) : finish());

  return (
    <Screen bottom={90} footer={<Button label={i < STEPS.length - 1 ? t("Continue") : edit ? t("Save") : t("Start training")} iconRight={i < STEPS.length - 1 ? "arrowRight" : undefined} onPress={next} disabled={!can} />}>
      <Header left={i > 0 || edit ? <IconButton name="chevronLeft" onPress={() => (i > 0 ? setI(i - 1) : router.back())} accessibilityLabel={t("Back")} /> : undefined} />
      <ProgressBar value={0.2 + (i / STEPS.length) * 0.8} label={t("Step {a} of {b}", { a: i + 1, b: STEPS.length })} right={`${Math.round((0.2 + (i / STEPS.length) * 0.8) * 100)}%`} />

      <View style={{ gap: 8 }}>
        <Txt variant="displayL">{stepTitle}</Txt>
        <Txt variant="bodyM" tone="secondary">
          {stepSub}
        </Txt>
      </View>

      {step.key === "birth" ? (
        <View style={{ gap: 12 }}>
          <Field label={t("Year of birth")} value={yearText} onChangeText={(t) => { const v = t.replace(/\D/g, "").slice(0, 4); setYearText(v); setA({ ...a, birthYear: v.length === 4 ? Number(v) : undefined }); }} keyboardType="number-pad" maxLength={4} placeholder="1998" autoFocus />
          {tooYoung ? (
            <Row gap={8} align="flex-start">
              <Icon name="info" size={16} color={colors.status.warning} strokeWidth={2} />
              <Txt variant="bodyS" tone="warning" style={{ flex: 1 }}>
                {t("Sorry, CresQ is for people aged {n} and over. You are welcome back when you are {n}.", { n: MIN_AGE })}
              </Txt>
            </Row>
          ) : null}
        </View>
      ) : null}
      {step.key === "goal" ? (
        <View style={{ gap: 8 }}>
          <Option icon="dumbbell" label={t("Get stronger")} sub={t("Heavier top sets, longer rest")} on={a.goal === "strength"} onPress={() => setA({ ...a, goal: "strength" })} />
          <Option icon="trendingUp" label={t("Build muscle")} sub={t("More sets in the 8 to 12 range")} on={a.goal === "muscle"} onPress={() => setA({ ...a, goal: "muscle" })} />
          <Option icon="heart" label={t("Stay healthy")} sub={t("Full body, shorter sessions")} on={a.goal === "health"} onPress={() => setA({ ...a, goal: "health" })} />
        </View>
      ) : null}
      {step.key === "experience" ? (
        <View style={{ gap: 8 }}>
          <Option icon="star" label={t("I'm new")} sub={t("Less than a year")} on={a.experience === "new"} onPress={() => setA({ ...a, experience: "new" })} />
          <Option icon="calendar" label={t("A while")} sub={t("One to three years")} on={a.experience === "some"} onPress={() => setA({ ...a, experience: "some" })} />
          <Option icon="trophy" label={t("Years")} sub={t("I know my numbers")} on={a.experience === "years"} onPress={() => setA({ ...a, experience: "years" })} />
        </View>
      ) : null}
      {step.key === "days" ? (
        <Row gap={8}>
          {[2, 3, 4, 5, 6].map((n) => (
            <Pressable key={n} accessibilityRole="button" accessibilityState={{ selected: a.daysPerWeek === n }} onPress={() => setA({ ...a, daysPerWeek: n })} style={{ flex: 1, height: 64, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: a.daysPerWeek === n ? colors.accent.ember : colors.bg.surface }}>
              <Txt variant="numberM" style={{ color: a.daysPerWeek === n ? colors.accent.on : colors.text.primary }}>
                {n}
              </Txt>
            </Pressable>
          ))}
        </Row>
      ) : null}
      {step.key === "limits" ? (
        <Row gap={8} style={{ flexWrap: "wrap" }}>
          {LIMITS.map((l) => {
            const on = a.limitations?.includes(l);
            return <Chip key={l} label={t(l)} selected={on} onPress={() => setA({ ...a, limitations: on ? a.limitations!.filter((x) => x !== l) : [...(a.limitations ?? []), l] })} />;
          })}
          <Chip label={t("Nothing")} selected={a.limitations?.length === 0} onPress={() => setA({ ...a, limitations: [] })} />
        </Row>
      ) : null}
      {step.key === "data" ? (
        <View>
          <Row gap={12} style={{ paddingVertical: 12 }}>
            <View style={{ flex: 1, gap: 2 }}>
              <Txt variant="labelL">{t("Anonymous usage statistics")}</Txt>
              <Txt variant="bodyS" tone="tertiary">
                {t("Which screens are used and how often. No names, no log data.")}
              </Txt>
            </View>
            <Toggle value={c.analytics} onChange={(v) => setC({ ...c, analytics: v })} />
          </Row>
          <Divider />
          <Row gap={12} style={{ paddingVertical: 12 }}>
            <View style={{ flex: 1, gap: 2 }}>
              <Txt variant="labelL">{t("Age statistics")}</Txt>
              <Txt variant="bodyS" tone="tertiary">
                {t("Your age as a band, such as 25 to 34, to see who CresQ serves.")}
              </Txt>
            </View>
            <Toggle value={c.ageStats} onChange={(v) => setC({ ...c, ageStats: v })} />
          </Row>
          <Divider />
          <Pressable accessibilityRole="link" onPress={() => router.push("/legal/privacy")} hitSlop={8} style={{ paddingVertical: 12 }}>
            <Row gap={4}>
              <Txt variant="labelM" tone="secondary">
                {t("Read the Privacy Policy")}
              </Txt>
              <Icon name="chevronRight" size={14} color={colors.text.secondary} strokeWidth={2} />
            </Row>
          </Pressable>
        </View>
      ) : null}
    </Screen>
  );
}

function Option({ icon, label, sub, on, onPress }: { icon: IconName; label: string; sub: string; on: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: on }} onPress={onPress} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 16, backgroundColor: on ? colors.accent.soft : pressed ? colors.bg.raised : colors.bg.surface })}>
      <View style={{ width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: on ? colors.accent.ember : colors.bg.raised }}>
        <Icon name={icon} size={18} color={on ? colors.accent.on : colors.icon.strong} strokeWidth={1.9} />
      </View>
      <View style={{ flex: 1, gap: 1 }}>
        <Txt variant="labelL" tone={on ? "ember" : "primary"}>
          {label}
        </Txt>
        <Txt variant="bodyS" tone="tertiary">
          {sub}
        </Txt>
      </View>
      {on ? <Icon name="check" size={18} color={colors.accent.ember} strokeWidth={2.4} /> : null}
    </Pressable>
  );
}
