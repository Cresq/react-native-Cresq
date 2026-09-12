import { Pressable, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "@/theme/ThemeProvider";
import { useWorkout } from "@/store/workout";
import { useSplit } from "@/store/split";
import { plans } from "@/data/mock";
import { Screen, Row, Section } from "@/components/ui/Screen";
import { Txt } from "@/components/ui/Text";
import { Card, Divider } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { IconButton } from "@/components/ui/IconButton";

/**
 * Train. Your split decides what is up next, so the split sits directly under the
 * anchor as a sequence you can read in one line. Plans are the library beneath it.
 */
export default function Train() {
  const { colors } = useTheme();
  const router = useRouter();
  const { session, start } = useWorkout();
  const { split, nextDay } = useSplit();
  const others = plans.filter((p) => !nextDay || !p.name.toLowerCase().startsWith(nextDay.name.toLowerCase()));

  const begin = (name: string) => {
    if (!session || session.finishedAt) start(name);
    router.push("/workout/active");
  };

  return (
    <Screen tabs>
      <Row gap={10}>
        <Txt variant="displayXL" style={{ flex: 1 }}>
          Train
        </Txt>
        <IconButton name="search" />
        <IconButton name="addPlus" />
      </Row>

      <Card padding={20} gap={14}>
        <Txt variant="labelM" tone="tertiary">
          Up next · day {split.nextIndex + 1} of {split.days.length}
        </Txt>
        <View style={{ gap: 4 }}>
          <Txt variant="displayL">{nextDay?.name}</Txt>
          <Txt variant="bodyM" tone="secondary">
            {nextDay?.focus}
          </Txt>
        </View>
        {nextDay?.rest ? null : (
          <Row gap={16}>
            <Meta icon="calendar" text={`${nextDay?.exercises} exercises`} />
            <Meta icon="clock" text={`${nextDay?.minutes} min`} />
          </Row>
        )}
        <Button label={nextDay?.rest ? "Log a rest day" : "Start session"} iconRight={nextDay?.rest ? undefined : "arrowRight"} variant={nextDay?.rest ? "secondary" : "primary"} onPress={() => (nextDay?.rest ? undefined : begin(nextDay?.name ?? "Push"))} style={{ marginTop: 4 }} />
      </Card>

      <Section title="Your split" action="Edit" onAction={() => router.push("/train/split")}>
        <Pressable accessibilityRole="button" onPress={() => router.push("/train/split")}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, alignItems: "center", paddingRight: 20 }} style={{ marginHorizontal: -20, paddingHorizontal: 20 }}>
            {split.days.map((d, i) => {
              const isNext = i === split.nextIndex;
              return (
                <Row key={d.id} gap={6}>
                  <View style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, backgroundColor: isNext ? colors.accent.ember : colors.bg.surface }}>
                    <Txt variant="labelM" style={{ color: isNext ? colors.accent.on : d.rest ? colors.text.tertiary : colors.text.secondary }}>
                      {d.name}
                    </Txt>
                  </View>
                  {i < split.days.length - 1 ? <Icon name="chevronRight" size={12} color={colors.text.tertiary} strokeWidth={2.2} /> : null}
                </Row>
              );
            })}
          </ScrollView>
        </Pressable>
        <Txt variant="bodyS" tone="tertiary">
          {split.name} · repeats after day {split.days.length}
        </Txt>
      </Section>

      <Section title="Plans" action="New plan" onAction={() => {}} gap={0}>
        {others.map((p, i) => (
          <View key={p.id}>
            {i > 0 ? <Divider /> : null}
            <Pressable accessibilityRole="button" onPress={() => begin(p.name)} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 14, opacity: pressed ? 0.7 : 1 })}>
              <View style={{ flex: 1, gap: 3 }}>
                <Txt variant="labelL">{p.name}</Txt>
                <Txt variant="bodyS" tone="tertiary">
                  {p.focus} · {p.exercises} exercises · {p.minutes} min
                </Txt>
              </View>
              <Txt variant="labelS" tone="tertiary">
                {p.lastDone}
              </Txt>
              <Icon name="chevronRight" size={18} color={colors.text.tertiary} />
            </Pressable>
          </View>
        ))}
      </Section>

      <Pressable accessibilityRole="button" style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 4, opacity: pressed ? 0.7 : 1 })}>
        <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: colors.bg.surface, alignItems: "center", justifyContent: "center" }}>
          <Icon name="sun" size={18} color={colors.pr.gold} strokeWidth={2} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Txt variant="labelL">Build a plan with AI</Txt>
          <Txt variant="bodyS" tone="tertiary">
            Describe your goals and limits, edit the result line by line.
          </Txt>
        </View>
        <Txt variant="labelS" tone="tertiary">
          Soon
        </Txt>
      </Pressable>
    </Screen>
  );
}

function Meta({ icon, text }: { icon: "calendar" | "clock"; text: string }) {
  const { colors } = useTheme();
  return (
    <Row gap={6}>
      <Icon name={icon} size={14} color={colors.text.tertiary} strokeWidth={1.8} />
      <Txt variant="bodyS" tone="secondary">
        {text}
      </Txt>
    </Row>
  );
}
