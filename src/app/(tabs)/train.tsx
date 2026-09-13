import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "@/theme/ThemeProvider";
import { useDb } from "@/db/DbProvider";
import { useWorkout } from "@/store/workout";
import { useSplit } from "@/store/split";
import { finished, relativeDay } from "@/db/derive";
import { estimateMinutes } from "@/db/seed";
import { uid } from "@/db/storage";
import { Screen, Row } from "@/components/ui/Screen";
import { Txt } from "@/components/ui/Text";
import { Card, Divider } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { IconButton } from "@/components/ui/IconButton";
import { Tabs } from "@/components/ui/Tabs";

/**
 * Train. The next session is the anchor everyone shares. Under it, two
 * chapters: the plans you own, and the split that orders them.
 */
export default function Train() {
  const { colors } = useTheme();
  const router = useRouter();
  const { db, update } = useDb();
  const { session, start } = useWorkout();
  const { split, nextDay } = useSplit();
  const [tab, setTab] = useState("plans");
  const running = !!session && !session.finishedAt;
  const nextPlan = db.plans.find((p) => p.id === nextDay?.planId);
  const done = finished(db.sessions);
  const lastDone = (name: string) => [...done].reverse().find((s) => s.planName === name);

  const begin = (planId?: string, name?: string) => {
    if (!running) start(planId, name);
    router.push("/workout/active");
  };
  const newPlan = () => {
    const id = uid();
    update((d) => ({ ...d, plans: [...d.plans, { id, name: "New plan", focus: "", exercises: [], createdAt: Date.now() }] }));
    router.push(`/train/plan/${id}`);
  };

  return (
    <Screen tabs>
      <Row gap={10}>
        <Txt variant="displayXL" style={{ flex: 1 }}>
          Train
        </Txt>
        <IconButton name="search" onPress={() => router.push("/exercises")} accessibilityLabel="Exercise library" />
        <IconButton name="addPlus" onPress={newPlan} accessibilityLabel="New plan" />
      </Row>

      <Card padding={20} gap={14}>
        <Txt variant="labelM" tone={running ? "ember" : "tertiary"}>
          {running ? `Session running · ${session?.planName}` : `Up next · day ${split.nextIndex + 1} of ${split.days.length}`}
        </Txt>
        <View style={{ gap: 4 }}>
          <Txt variant="displayL">{nextDay?.name ?? "Quick session"}</Txt>
          <Txt variant="bodyM" tone="secondary">
            {nextDay?.focus}
          </Txt>
        </View>
        {nextPlan ? (
          <Row gap={16}>
            <Meta icon="calendar" text={`${nextPlan.exercises.length} exercises`} />
            <Meta icon="clock" text={`${estimateMinutes(nextPlan)} min`} />
            {lastDone(nextPlan.name) ? <Meta icon="check" text={`Last ${relativeDay(lastDone(nextPlan.name)!.startedAt)}`} /> : null}
          </Row>
        ) : null}
        <Button label={running ? "Continue session" : nextDay?.rest ? "Rest day · start anyway" : "Start session"} iconRight="arrowRight" onPress={() => begin(nextPlan?.id, nextDay?.name)} style={{ marginTop: 4 }} />
      </Card>

      <View style={{ gap: 4 }}>
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { key: "plans", label: "Plans", count: db.plans.length },
            { key: "split", label: "Split", count: split.days.length },
          ]}
        />

        {tab === "plans" ? (
          <View>
            {db.plans.map((p, i) => {
              const last = lastDone(p.name);
              return (
                <View key={p.id}>
                  {i > 0 ? <Divider /> : null}
                  <Pressable accessibilityRole="button" onPress={() => router.push(`/train/plan/${p.id}`)} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 14, opacity: pressed ? 0.7 : 1 })}>
                    <View style={{ flex: 1, gap: 3 }}>
                      <Txt variant="labelL">{p.name}</Txt>
                      <Txt variant="bodyS" tone="tertiary">
                        {[p.focus, `${p.exercises.length} exercises`, `${estimateMinutes(p)} min`].filter(Boolean).join(" · ")}
                      </Txt>
                    </View>
                    <Txt variant="labelS" tone="tertiary">
                      {last ? relativeDay(last.startedAt) : "not yet"}
                    </Txt>
                    <Icon name="chevronRight" size={18} color={colors.text.tertiary} />
                  </Pressable>
                </View>
              );
            })}
            <Divider />
            <Pressable accessibilityRole="button" onPress={newPlan} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 14, opacity: pressed ? 0.7 : 1 })}>
              <Icon name="addPlus" size={18} color={colors.text.secondary} strokeWidth={2} />
              <Txt variant="labelL" tone="secondary" style={{ flex: 1 }}>
                New plan
              </Txt>
            </Pressable>
            <Pressable accessibilityRole="button" style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 14, opacity: pressed ? 0.7 : 1 })}>
              <Icon name="sun" size={18} color={colors.pr.gold} strokeWidth={2} />
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
          </View>
        ) : (
          <View style={{ gap: 16, paddingTop: 12 }}>
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
            <View>
              {split.days.map((d, i) => {
                const plan = db.plans.find((p) => p.id === d.planId);
                const isNext = i === split.nextIndex;
                return (
                  <View key={d.id}>
                    {i > 0 ? <Divider /> : null}
                    <Row gap={14} style={{ paddingVertical: 12 }}>
                      <Txt variant="numberM" tabular tone={isNext ? "ember" : "tertiary"} style={{ width: 28 }}>
                        {i + 1}
                      </Txt>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Txt variant="labelL">{d.name}</Txt>
                        <Txt variant="bodyS" tone="tertiary">
                          {d.rest ? "Rest" : plan ? `${plan.exercises.length} exercises · ${estimateMinutes(plan)} min` : d.focus}
                        </Txt>
                      </View>
                      {isNext ? (
                        <Txt variant="labelS" tone="ember">
                          Up next
                        </Txt>
                      ) : null}
                    </Row>
                  </View>
                );
              })}
            </View>
            <Button label="Edit split" variant="secondary" size="M" icon="rows" onPress={() => router.push("/train/split")} />
            <Txt variant="bodyS" tone="tertiary">
              {split.name} · repeats after day {split.days.length}. Finishing a session moves you to the next day.
            </Txt>
          </View>
        )}
      </View>
    </Screen>
  );
}

function Meta({ icon, text }: { icon: "calendar" | "clock" | "check"; text: string }) {
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
