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
import { Screen, Row, Header } from "@/components/ui/Screen";
import { Txt } from "@/components/ui/Text";
import { Divider } from "@/components/ui/Card";
import { IconButton } from "@/components/ui/IconButton";
import { Segmented } from "@/components/ui/Segmented";
import { WheelField } from "@/components/ui/WheelField";
import { WheelPicker } from "@/components/ui/WheelPicker";
import { BottomSheet, SheetOption } from "@/components/ui/BottomSheet";
import { LineChart } from "@/components/LineChart";

const KILOS = Array.from({ length: 221 }, (_, i) => i + 30);
const TENTHS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
/** How far back a missed day can still be filled in: yesterday to two months ago. */
const DAYS_BACK = Array.from({ length: 60 }, (_, i) => i + 1);
const DAY = 86_400_000;
/** How far back the line looks, in days. */
const RANGES: Record<string, number> = { "1w": 7, "1m": 30, "3m": 91, "1y": 365, all: 100_000 };
/** How many weigh-ins the list shows before it is asked for the rest. */
const SHORT = 7;

/**
 * Body weight, once a day, on a page that stays out of the way: one field
 * with today's figure, which brings the wheels up when it is pressed (whole
 * kilos and tenths, because a tenth is what a day moves), the line over the
 * period you pick, and the weigh-ins underneath.
 *
 * Whether a change is good news depends on what the person is after, so its
 * colour follows their food goal: down is green for somebody cutting, up is
 * green for somebody gaining, and for maintenance it is simply stated.
 */
export default function Weight() {
  const router = useNav();
  const t = useT();
  const locale = localeOf(useLanguage());
  const now = useNow();
  const { db } = useDb();
  const { entries, latest, on, log, remove } = useWeight();
  const [range, setRange] = useState("1m");
  const [all, setAll] = useState(false);
  const [picked, setPicked] = useState<WeightEntry | null>(null);
  const [kilo, setKilo] = useState(75);
  const [tenth, setTenth] = useState(0);
  const [ago, setAgo] = useState(1);

  const f = (kg: number) => kg.toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const decimal = (1.1).toLocaleString(locale).charAt(1);
  const leave = () => router.back();
  const today = on(now);
  // The wheels open on what is known: today's figure, else the last one, else the food profile's.
  const openWheels = () => {
    const tenths = Math.round((today?.kg ?? latest?.kg ?? db.profile.food?.weightKg ?? 75) * 10);
    setKilo(Math.min(250, Math.max(30, Math.floor(tenths / 10))));
    setTenth(tenths % 10);
  };
  const draft = kilo + tenth / 10;
  // An earlier day is filed at its noon, so it sorts inside its own day whatever the clock says now.
  const noonOf = (daysAgo: number) => startOfDay(now) - daysAgo * DAY + DAY / 2;
  const dayName = (daysAgo: number) => (daysAgo === 1 ? t("Yesterday") : new Date(noonOf(daysAgo)).toLocaleDateString(locale, { weekday: "short", day: "numeric", month: "short" }).replace(/\./g, ""));

  // The period on the chart, and where the weight went within it, first weigh-in to last.
  const shown = entries.filter((w) => w.at >= now - RANGES[range] * DAY);
  const first = shown[0];
  const last = shown[shown.length - 1];
  const change = first && last && first.id !== last.id ? Math.round((last.kg - first.kg) * 10) / 10 : null;
  const days = first && last ? Math.max(1, Math.round((startOfDay(last.at) - startOfDay(first.at)) / DAY)) : 0;
  const goal = db.profile.food?.goal;
  const tone = change === null || change === 0 || !goal || goal === "maintain" ? "secondary" : (goal === "cut" ? change < 0 : change > 0) ? "success" : "danger";
  const history = [...entries].reverse();

  return (
    <Screen contentStyle={{ gap: 20 }}>
      <Header left={<IconButton name="chevronLeft" onPress={leave} accessibilityLabel={t("Back")} />} title={t("Weight")} />

      <View style={{ gap: 8 }}>
        <WheelField
          label={t("Today")}
          text={today ? `${f(today.kg)} kg` : undefined}
          placeholder={t("Tap to log")}
          title={t("Weight today")}
          confirm={today ? t("Change today to {kg} kg", { kg: f(draft) }) : t("Log {kg} kg for today", { kg: f(draft) })}
          accent="sage"
          onOpen={openWheels}
          onConfirm={() => {
            log(draft);
            haptic("done");
          }}
        >
          <Row gap={12}>
            <View style={{ flex: 1 }}>
              <WheelPicker values={KILOS} value={kilo} onChange={setKilo} />
            </View>
            <View style={{ flex: 1 }}>
              <WheelPicker values={TENTHS} value={tenth} onChange={setTenth} format={(v) => `${decimal}${v} kg`} />
            </View>
          </Row>
        </WheelField>
        {!today && latest ? (
          <Txt variant="labelS" tone="tertiary" style={{ paddingLeft: 4 }}>
            {t("Last logged, {when}", { when: relativeDay(latest.at) })}: {f(latest.kg)} kg
          </Txt>
        ) : null}
        {/* A day that was missed: the same wheels, with the day beside them. Logging a day that already has a figure corrects it. */}
        <WheelField
          label={t("An earlier day")}
          placeholder={t("Fill in a day you missed")}
          title={t("Weight on an earlier day")}
          confirm={t("Log {kg} kg for {day}", { kg: f(draft), day: dayName(ago) })}
          accent="sage"
          onOpen={() => {
            openWheels();
            setAgo(1);
          }}
          onConfirm={() => {
            log(draft, noonOf(ago));
            haptic("done");
          }}
        >
          <Row gap={10}>
            <View style={{ flex: 1.5 }}>
              <WheelPicker values={DAYS_BACK} value={ago} onChange={setAgo} format={dayName} />
            </View>
            <View style={{ flex: 1 }}>
              <WheelPicker values={KILOS} value={kilo} onChange={setKilo} />
            </View>
            <View style={{ flex: 1 }}>
              <WheelPicker values={TENTHS} value={tenth} onChange={setTenth} format={(v) => `${decimal}${v} kg`} />
            </View>
          </Row>
        </WheelField>
      </View>

      <View style={{ gap: 12 }}>
        <Segmented
          size="M"
          value={range}
          onChange={setRange}
          segments={[
            { key: "1w", label: t("1W") },
            { key: "1m", label: "1M" },
            { key: "3m", label: "3M" },
            { key: "1y", label: t("1Y") },
            { key: "all", label: t("All") },
          ]}
        />
        {shown.length >= 2 ? (
          <View style={{ gap: 8 }}>
            {change !== null ? (
              <Txt variant="labelM" tone={tone}>
                {t(days === 1 ? "{change} kg in {n} day" : "{change} kg in {n} days", { change: `${change > 0 ? "+" : ""}${f(change)}`, n: days })}
              </Txt>
            ) : null}
            <LineChart points={shown.map((w) => ({ value: w.kg }))} scrubLabels={shown.map((w) => shortDate(w.at))} labels={[shortDate(first.at), shortDate(last.at)]} height={140} unit="kg" hint={t("Touch the line to read a weigh-in")} />
          </View>
        ) : (
          <Txt variant="bodyS" tone="tertiary" style={{ paddingVertical: 8 }}>
            {entries.length ? t("Not enough weigh-ins in this period for a line yet.") : t("Log it once a day and the line shows where it is going, which a single weigh-in never does.")}
          </Txt>
        )}
      </View>

      {history.length ? (
        <View>
          {(all ? history : history.slice(0, SHORT)).map((w, i) => (
            <View key={w.id}>
              {i > 0 ? <Divider /> : null}
              <Pressable accessibilityRole="button" accessibilityLabel={`${longDate(w.at)}, ${f(w.kg)} kg`} onPress={() => setPicked(w)} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, opacity: pressed ? 0.7 : 1 })}>
                <Txt variant="bodyS" tone="secondary" style={{ flex: 1 }}>
                  {longDate(w.at)}
                </Txt>
                <Txt variant="labelM" tabular>
                  {f(w.kg)} kg
                </Txt>
              </Pressable>
            </View>
          ))}
          {history.length > SHORT ? (
            <Pressable accessibilityRole="button" onPress={() => setAll((v) => !v)} hitSlop={8} style={{ paddingTop: 10, alignSelf: "flex-start" }}>
              <Txt variant="labelM" tone="secondary">
                {all ? t("Show less") : t("Show all {n}", { n: history.length })}
              </Txt>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <BottomSheet visible={!!picked} onClose={() => setPicked(null)} title={picked ? longDate(picked.at) : ""} subtitle={picked ? `${f(picked.kg)} kg` : undefined}>
        <SheetOption icon="trash" label={t("Remove this weigh-in")} danger onPress={() => { if (picked) remove(picked.id); haptic("tap"); setPicked(null); }} />
      </BottomSheet>
    </Screen>
  );
}
