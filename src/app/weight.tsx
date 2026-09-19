import { useState } from "react";
import { Pressable, View } from "react-native";
import { useNav } from "@/nav";
import { useDb } from "@/db/DbProvider";
import { useNow } from "@/clock";
import { useT, useLanguage, localeOf } from "@/i18n";
import { haptic } from "@/haptics";
import { longDate, relativeDay, shortDate, startOfDay } from "@/db/derive";
import { useWeight } from "@/store/weight";
import type { WeightEntry } from "@/db/types";
import { Screen, Row, Section, Header } from "@/components/ui/Screen";
import { Txt } from "@/components/ui/Text";
import { Card, Divider } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { WheelPicker } from "@/components/ui/WheelPicker";
import { BottomSheet, SheetOption } from "@/components/ui/BottomSheet";
import { LineChart } from "@/components/LineChart";

const KILOS = Array.from({ length: 221 }, (_, i) => i + 30);
const TENTHS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const DAY = 86_400_000;

/**
 * Body weight, once a day. The figure on top, two wheels to set today's (whole
 * kilos and tenths, because a tenth is what a day moves), the line of the last
 * thirty weigh-ins, and every one of them underneath.
 *
 * Whether a change is good news depends on what the person is after, so the
 * colour follows their food goal: down is green for somebody cutting, up is
 * green for somebody gaining, and for maintenance it is simply stated.
 */
export default function Weight() {
  const router = useNav();
  const t = useT();
  const locale = localeOf(useLanguage());
  const now = useNow();
  const { db, ready } = useDb();
  const { entries, latest, on, log, remove } = useWeight();
  const [picked, setPicked] = useState<WeightEntry | null>(null);

  const f = (kg: number) => kg.toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const leave = () => (router.canGoBack() ? router.back() : router.replace("/(tabs)"));
  const today = on(now);
  const start = today?.kg ?? latest?.kg ?? db.profile.food?.weightKg ?? 75;

  // Where it went over the last thirty days, first weigh-in to last.
  const month = entries.filter((w) => w.at >= now - 30 * DAY);
  const first = month[0];
  const change = latest && first && first.id !== latest.id ? Math.round((latest.kg - first.kg) * 10) / 10 : null;
  const days = latest && first ? Math.max(1, Math.round((startOfDay(latest.at) - startOfDay(first.at)) / DAY)) : 0;
  const goal = db.profile.food?.goal;
  const tone = change === null || change === 0 || !goal || goal === "maintain" ? "secondary" : (goal === "cut" ? change < 0 : change > 0) ? "success" : "danger";
  const shown = entries.slice(-30);

  return (
    <Screen>
      <Header left={<IconButton name="chevronLeft" onPress={leave} accessibilityLabel={t("Back")} />} title={t("Weight")} />

      <View style={{ gap: 4 }}>
        <Txt variant="labelM" tone="tertiary">
          {today ? t("Today") : latest ? t("Last logged, {when}", { when: relativeDay(latest.at) }) : t("Not logged yet")}
        </Txt>
        <Row gap={6} align="baseline">
          <Txt variant="displayXL" tabular>
            {latest ? f(latest.kg) : "–"}
          </Txt>
          <Txt variant="labelL" tone="secondary">
            kg
          </Txt>
        </Row>
        {change !== null ? (
          <Txt variant="labelM" tone={tone}>
            {t(days === 1 ? "{change} kg in {n} day" : "{change} kg in {n} days", { change: `${change > 0 ? "+" : ""}${f(change)}`, n: days })}
          </Txt>
        ) : null}
      </View>

      {/* The wheels are built from what is known, so they wait for the stored log, and start again from a new figure once it is in. */}
      {ready ? <Wheels key={`${latest?.id ?? "none"}`} start={start} changing={!!today} format={f} decimal={(1.1).toLocaleString(locale).charAt(1)} onLog={(kg) => { log(kg); haptic("done"); }} /> : null}

      {shown.length >= 2 ? (
        <Section title={t("The last 30 weigh-ins")}>
          <Card padding={16} gap={0}>
            <LineChart points={shown.map((w) => ({ value: w.kg }))} scrubLabels={shown.map((w) => shortDate(w.at))} height={120} unit="kg" />
          </Card>
        </Section>
      ) : null}

      {entries.length ? (
        <Section title={t("History")}>
          <Card padding={16} gap={0}>
            {[...entries].reverse().slice(0, 60).map((w, i) => (
              <View key={w.id}>
                {i > 0 ? <Divider /> : null}
                <Pressable accessibilityRole="button" accessibilityLabel={`${longDate(w.at)}, ${f(w.kg)} kg`} onPress={() => setPicked(w)} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 11, opacity: pressed ? 0.7 : 1 })}>
                  <Txt variant="bodyM" style={{ flex: 1 }}>
                    {longDate(w.at)}
                  </Txt>
                  <Txt variant="labelL" tabular>
                    {f(w.kg)} kg
                  </Txt>
                </Pressable>
              </View>
            ))}
          </Card>
        </Section>
      ) : (
        <Card tone="raised" padding={18} gap={6}>
          <Txt variant="labelL">{t("No weight logged yet")}</Txt>
          <Txt variant="bodyS" tone="secondary">
            {t("Log it once a day and the line shows where it is going, which a single weigh-in never does.")}
          </Txt>
        </Card>
      )}

      <BottomSheet visible={!!picked} onClose={() => setPicked(null)} title={picked ? longDate(picked.at) : ""} subtitle={picked ? `${f(picked.kg)} kg` : undefined}>
        <SheetOption icon="trash" label={t("Remove this weigh-in")} danger onPress={() => { if (picked) remove(picked.id); haptic("tap"); setPicked(null); }} />
      </BottomSheet>
    </Screen>
  );
}

function Wheels({ start, changing, format, decimal, onLog }: { start: number; changing: boolean; format: (kg: number) => string; decimal: string; onLog: (kg: number) => void }) {
  const t = useT();
  const tenths = Math.round(start * 10);
  const [kilo, setKilo] = useState(Math.min(250, Math.max(30, Math.floor(tenths / 10))));
  const [tenth, setTenth] = useState(tenths % 10);
  const kg = kilo + tenth / 10;
  return (
    <View style={{ gap: 12 }}>
      <Row gap={12}>
        <View style={{ flex: 1 }}>
          <WheelPicker values={KILOS} value={kilo} onChange={setKilo} />
        </View>
        <View style={{ flex: 1 }}>
          <WheelPicker values={TENTHS} value={tenth} onChange={setTenth} format={(v) => `${decimal}${v} kg`} />
        </View>
      </Row>
      <Button label={changing ? t("Change today to {kg} kg", { kg: format(kg) }) : t("Log {kg} kg for today", { kg: format(kg) })} variant="sage" onPress={() => onLog(kg)} />
      <Txt variant="labelS" tone="tertiary">
        {t("Weigh yourself at the same moment each day, first thing in the morning for instance. One figure a day; logging again changes today's.")}
      </Txt>
    </View>
  );
}
