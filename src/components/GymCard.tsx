import { useCallback, useState } from "react";
import { View } from "react-native";
import { useFocusEffect } from "expo-router";
import { useTheme } from "@/theme/ThemeProvider";
import { useT, usePlural } from "@/i18n";
import { useNow } from "@/clock";
import { feel } from "@/haptics";
import { useGym } from "@/store/gym";
import { FIRST_HOUR, LAST_HOUR, LEVEL_NAME, dayStrip, levelOf, nextChange, shareOf, type Level } from "@/gym/busyness";
import { Row, Section } from "./ui/Screen";
import { Txt } from "./ui/Text";
import { Card } from "./ui/Card";
import { Chip } from "./ui/Chip";
import { Icon } from "./ui/Icon";
import { Field } from "./ui/Field";
import { Button } from "./ui/Button";
import { BottomSheet } from "./ui/BottomSheet";

const STRIP_HEIGHT = 40;
const TONE: Record<Level, "success" | "warning" | "danger"> = { 1: "success", 2: "warning", 3: "danger" };
const hh = (hour: number) => `${String(hour).padStart(2, "0")}:00`;

/**
 * Your gym, and how busy it is. One card at the foot of Home: the name, a word
 * for now, the day as a strip of hours with this hour lit, a line that says
 * where the figures come from, and three chips for saying how busy it is when
 * you are there.
 *
 * It never passes a guess off as a measurement. With reports from the last
 * hour and a half it says "now" and how many; with enough older reports it
 * shows that gym's own weekday; with neither it shows how gyms usually run and
 * says that it is not measured at yours.
 */
export function GymCard() {
  const { colors } = useTheme();
  const t = useT();
  const plural = usePlural();
  const now = useNow();
  const { home, recent, busyness, lastReport, canReport, setHome, report, refresh } = useGym();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  // Coming back to Home is when a report somebody just sent should show.
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const open = () => {
    setDraft(home ?? recent[0] ?? "");
    setEditing(true);
  };
  const save = () => {
    setHome(draft);
    setEditing(false);
  };

  const date = new Date(now);
  const hour = date.getHours();
  const strip = dayStrip(date, busyness?.hours ?? []);
  const live = busyness?.live ?? null;
  const here = strip.find((s) => s.hour === hour);
  const level: Level = live ? levelOf(shareOf(live.level)) : here ? levelOf(here.share) : 1;
  const change = nextChange(strip, hour);
  const source = live
    ? plural(live.n, "Now, from {n} report in the last hour and a half", "Now, from {n} reports in the last hour and a half")
    : here?.measured
      ? t("From what CresQ lifters reported here on this weekday")
      : t("How gyms usually run at this hour, not measured at yours");

  const sheet = (
    <BottomSheet visible={editing} onClose={() => setEditing(false)} title={t("Your gym")} subtitle={t("The one you usually train at. It is offered first when a session asks where you were.")}>
      <View style={{ paddingHorizontal: 8, paddingVertical: 8, gap: 12 }}>
        <Field label={t("Gym")} value={draft} onChangeText={setDraft} placeholder={t("Name of the gym")} autoCapitalize="words" autoFocus />
        {recent.length ? (
          <Row gap={8} style={{ flexWrap: "wrap" }}>
            {recent.slice(0, 6).map((g) => (
              <Chip key={g} label={g} selected={draft.trim() === g} onPress={() => setDraft(g)} />
            ))}
          </Row>
        ) : null}
        <Button label={draft.trim() ? t("Save") : t("No regular gym")} onPress={save} />
      </View>
    </BottomSheet>
  );

  if (!home) {
    return (
      <Section title={t("Your gym")}>
        <Card padding={16} gap={0} onPress={open} accessibilityLabel={t("Set your gym")}>
          <Row gap={12}>
            <Icon name="mapPin" size={18} color={colors.text.secondary} strokeWidth={1.9} />
            <View style={{ flex: 1, gap: 1 }}>
              <Txt variant="labelL">{t("Set your gym")}</Txt>
              <Txt variant="bodyS" tone="tertiary">
                {t("See when it is usually quiet, and what others report")}
              </Txt>
            </View>
            <Icon name="chevronRight" size={16} color={colors.text.tertiary} strokeWidth={2} />
          </Row>
        </Card>
        {sheet}
      </Section>
    );
  }

  return (
    <Section title={t("Your gym")} action={t("Change")} onAction={open}>
      <Card padding={16} gap={12}>
        <Row gap={10}>
          <Icon name="mapPin" size={16} color={colors.accent.ember} strokeWidth={1.9} />
          <Txt variant="labelL" numberOfLines={1} style={{ flex: 1 }}>
            {home}
          </Txt>
          <Chip label={t(LEVEL_NAME[level])} tone={TONE[level]} size="S" />
        </Row>

        {/* The day, hour by hour; this hour is the lit one. */}
        <View accessible accessibilityRole="image" accessibilityLabel={`${t(LEVEL_NAME[level])}. ${source}`} style={{ gap: 4 }}>
          <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 2, height: STRIP_HEIGHT }}>
            {strip.map((s) => (
              <View key={s.hour} style={{ flex: 1, height: Math.max(3, Math.round(s.share * STRIP_HEIGHT)), borderRadius: 2, backgroundColor: s.hour === hour ? colors.accent.ember : colors.border.strong }} />
            ))}
          </View>
          <Row justify="space-between">
            {[FIRST_HOUR, 12, 18, LAST_HOUR].map((h) => (
              <Txt key={h} variant="labelS" tone="tertiary" tabular>
                {String(h).padStart(2, "0")}
              </Txt>
            ))}
          </Row>
        </View>

        <View style={{ gap: 2 }}>
          {change ? (
            <Txt variant="labelM">
              {change.level === 1 ? t("Quiet from {time}", { time: hh(change.hour) }) : change.level === 2 ? t("Moderate from {time}", { time: hh(change.hour) }) : t("Busy from {time}", { time: hh(change.hour) })}
            </Txt>
          ) : null}
          <Txt variant="labelS" tone="tertiary">
            {source}
          </Txt>
        </View>

        {/* Being there is the only way to know; one tap shares it, without a name. */}
        {canReport(now) ? (
          <Row gap={8} style={{ flexWrap: "wrap" }}>
            <Txt variant="labelS" tone="secondary">
              {t("There now?")}
            </Txt>
            {([1, 2, 3] as Level[]).map((l) => (
              <Chip key={l} label={t(LEVEL_NAME[l])} size="S" onPress={() => { feel("select"); void report(l); }} />
            ))}
          </Row>
        ) : lastReport ? (
          <Txt variant="labelS" tone="tertiary">
            {t("Thanks, you reported {level}", { level: t(LEVEL_NAME[lastReport.level as Level]).toLowerCase() })}
          </Txt>
        ) : null}
      </Card>
      {sheet}
    </Section>
  );
}
