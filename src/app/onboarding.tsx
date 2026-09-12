import { useState } from "react";
import { Pressable, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTheme } from "@/theme/ThemeProvider";
import { useDb } from "@/db/DbProvider";
import type { Profile } from "@/db/types";
import { Screen, Row, Header } from "@/components/ui/Screen";
import { Txt } from "@/components/ui/Text";
import { IconButton } from "@/components/ui/IconButton";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Chip } from "@/components/ui/Chip";

type Answers = Pick<Profile, "goal" | "experience" | "daysPerWeek" | "limitations">;

const STEPS = [
  { key: "goal", title: "What are you here for?", sub: "One answer. It sets the default rep ranges and rest." },
  { key: "experience", title: "How long have you trained?", sub: "This decides how fast your plans progress." },
  { key: "days", title: "How many days a week?", sub: "Your split will match it. You can change it any time." },
  { key: "limits", title: "Anything to work around?", sub: "Plans and the AI builder avoid movements that load these." },
] as const;

const LIMITS = ["Shoulder", "Knee", "Lower back", "Wrist", "Elbow", "Hip"];

/**
 * Onboarding. Four questions, one per screen, answered by tapping. The bar
 * starts filled because signing up already counts as progress.
 */
export default function Onboarding() {
  const { colors } = useTheme();
  const router = useRouter();
  const { db, update } = useDb();
  const { edit } = useLocalSearchParams<{ edit?: string }>();
  const [i, setI] = useState(0);
  const [a, setA] = useState<Answers>({ goal: db.profile.goal, experience: db.profile.experience, daysPerWeek: db.profile.daysPerWeek, limitations: db.profile.limitations ?? [] });
  const step = STEPS[i];
  const can = step.key === "goal" ? !!a.goal : step.key === "experience" ? !!a.experience : step.key === "days" ? !!a.daysPerWeek : true;

  const finish = () => {
    update((d) => ({ ...d, profile: { ...d.profile, ...a, onboarded: true } }));
    if (edit) router.back();
    else router.replace("/(tabs)");
  };
  const next = () => (i < STEPS.length - 1 ? setI(i + 1) : finish());

  return (
    <Screen bottom={90} footer={<Button label={i < STEPS.length - 1 ? "Continue" : edit ? "Save" : "Start training"} iconRight={i < STEPS.length - 1 ? "arrowRight" : undefined} onPress={next} disabled={!can} />}>
      <Header left={i > 0 || edit ? <IconButton name="chevronLeft" onPress={() => (i > 0 ? setI(i - 1) : router.back())} accessibilityLabel="Back" /> : undefined} />
      <ProgressBar value={0.2 + (i / STEPS.length) * 0.8} label={`Step ${i + 1} of ${STEPS.length}`} right={`${Math.round((0.2 + (i / STEPS.length) * 0.8) * 100)}%`} />

      <View style={{ gap: 6 }}>
        <Txt variant="displayL">{step.title}</Txt>
        <Txt variant="bodyM" tone="secondary">
          {step.sub}
        </Txt>
      </View>

      {step.key === "goal" ? (
        <View style={{ gap: 8 }}>
          <Option icon="dumbbell" label="Get stronger" sub="Heavier top sets, longer rest" on={a.goal === "strength"} onPress={() => setA({ ...a, goal: "strength" })} />
          <Option icon="trendingUp" label="Build muscle" sub="More sets in the 8 to 12 range" on={a.goal === "muscle"} onPress={() => setA({ ...a, goal: "muscle" })} />
          <Option icon="heart" label="Stay healthy" sub="Full body, shorter sessions" on={a.goal === "health"} onPress={() => setA({ ...a, goal: "health" })} />
        </View>
      ) : null}
      {step.key === "experience" ? (
        <View style={{ gap: 8 }}>
          <Option icon="star" label="I'm new" sub="Less than a year" on={a.experience === "new"} onPress={() => setA({ ...a, experience: "new" })} />
          <Option icon="calendar" label="A while" sub="One to three years" on={a.experience === "some"} onPress={() => setA({ ...a, experience: "some" })} />
          <Option icon="trophy" label="Years" sub="I know my numbers" on={a.experience === "years"} onPress={() => setA({ ...a, experience: "years" })} />
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
            return <Chip key={l} label={l} selected={on} onPress={() => setA({ ...a, limitations: on ? a.limitations!.filter((x) => x !== l) : [...(a.limitations ?? []), l] })} />;
          })}
          <Chip label="Nothing" selected={a.limitations?.length === 0} onPress={() => setA({ ...a, limitations: [] })} />
        </Row>
      ) : null}
    </Screen>
  );
}

function Option({ icon, label, sub, on, onPress }: { icon: IconName; label: string; sub: string; on: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: on }} onPress={onPress} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 14, padding: 14, borderRadius: 16, backgroundColor: on ? colors.accent.soft : pressed ? colors.bg.raised : colors.bg.surface })}>
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
