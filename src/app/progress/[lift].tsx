import { useState } from "react";
import { Pressable, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTheme } from "@/theme/ThemeProvider";
import { lifts } from "@/data/mock";
import { Screen, Row, Section, Header } from "@/components/ui/Screen";
import { Txt } from "@/components/ui/Text";
import { IconButton } from "@/components/ui/IconButton";
import { Card, Divider } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { Segmented } from "@/components/ui/Segmented";
import { LineChart } from "@/components/LineChart";

/** Lift detail. The number is the hero, the chart is the one surface, the forecast reads as a note under it. */
export default function LiftDetail() {
  const { colors } = useTheme();
  const router = useRouter();
  const { lift: slug } = useLocalSearchParams<{ lift: string }>();
  const lift = lifts.find((l) => l.slug === slug) ?? lifts[0];
  const [range, setRange] = useState("3m");

  return (
    <Screen>
      <Header left={<IconButton name="chevronLeft" onPress={() => router.back()} accessibilityLabel="Back" />} title={lift.name} right={<IconButton name="share" />} />

      <View style={{ gap: 4, paddingTop: 8 }}>
        <Txt variant="labelM" tone="tertiary">
          Estimated one-rep max
        </Txt>
        <Row gap={6} align="baseline">
          <Txt variant="numberXL" tabular>
            {lift.e1rm}
          </Txt>
          <Txt variant="displayS" tone="secondary">
            kg
          </Txt>
        </Row>
        <Row gap={6}>
          <Icon name="trendingUp" size={13} color={colors.accent.ember} strokeWidth={2.2} />
          <Txt variant="labelM" tone="ember">
            +{lift.deltaKg} kg
          </Txt>
          <Txt variant="bodyS" tone="secondary">
            in the last {lift.weeks} weeks
          </Txt>
        </Row>
      </View>

      <View style={{ gap: 12 }}>
        <Segmented size="M" value={range} onChange={setRange} segments={[{ key: "1m", label: "1M" }, { key: "3m", label: "3M" }, { key: "6m", label: "6M" }, { key: "1y", label: "1Y" }, { key: "all", label: "All" }]} />
        <Card padding={18} gap={12}>
          <Row gap={14}>
            <Legend color={colors.accent.ember} label="Estimated 1RM" />
            <Legend color={colors.pr.gold} label="Record" />
            <Legend color={colors.fuel.sage} label="Forecast" />
          </Row>
          <LineChart points={lift.points} forecast={lift.forecast} target={lift.target} height={170} labels={lift.labels} />
        </Card>
      </View>

      <Row gap={14} align="flex-start">
        <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: colors.bg.surface, alignItems: "center", justifyContent: "center" }}>
          <Icon name="sun" size={18} color={colors.pr.gold} strokeWidth={2} />
        </View>
        <View style={{ flex: 1, gap: 6 }}>
          <Txt variant="displayS">{lift.target} kg is close</Txt>
          <Txt variant="bodyM" tone="secondary">
            Your estimated max has risen about {(lift.deltaKg / lift.weeks).toFixed(1)} kg a week over 12 sessions. Keep three {lift.name.toLowerCase()} sessions in the next two weeks and you are likely to reach {lift.target} kg around {lift.labels[lift.labels.length - 1]}.
          </Txt>
          <Pressable accessibilityRole="button" hitSlop={8}>
            <Row gap={4}>
              <Txt variant="labelM" tone="secondary">
                How this is calculated
              </Txt>
              <Icon name="chevronRight" size={14} color={colors.text.secondary} strokeWidth={2} />
            </Row>
          </Pressable>
        </View>
      </Row>

      <Section title="Records" action="See all" onAction={() => {}} gap={0}>
        {lift.records.map((r, i) => (
          <View key={r.date}>
            {i > 0 ? <Divider /> : null}
            <Pressable accessibilityRole="button" onPress={() => {}} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 12, opacity: pressed ? 0.7 : 1 })}>
              <Icon name="trophy" size={20} color={r.latest ? colors.pr.gold : colors.text.tertiary} strokeWidth={1.9} />
              <View style={{ flex: 1, gap: 1 }}>
                <Row gap={6} align="baseline">
                  <Txt variant="numberM" tabular>
                    {r.kg}
                  </Txt>
                  <Txt variant="labelS" tone="secondary">
                    {r.reps}
                  </Txt>
                </Row>
                <Txt variant="bodyS" tone="tertiary">
                  {r.latest ? `Current record · ${r.date}` : r.date}
                </Txt>
              </View>
              <Icon name="chevronRight" size={18} color={colors.text.tertiary} />
            </Pressable>
          </View>
        ))}
      </Section>
    </Screen>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <Row gap={6}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
      <Txt variant="labelS" tone="tertiary">
        {label}
      </Txt>
    </Row>
  );
}
