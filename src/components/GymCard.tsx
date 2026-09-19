import { useCallback, useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { useFocusEffect } from "expo-router";
import Animated from "react-native-reanimated";
import { useTheme } from "@/theme/ThemeProvider";
import { useT, usePlural } from "@/i18n";
import { useNow } from "@/clock";
import { feel } from "@/haptics";
import { layouts, opacity } from "@/motion";
import { useGym } from "@/store/gym";
import { FIRST_HOUR, LAST_HOUR, LEVEL_NAME, dayStrip, levelOf, nextChange, shareOf, type Level } from "@/gym/busyness";
import { gymAddress, gymLabel, searchGyms } from "@/gym/places";
import type { GymPlace } from "@/db/types";
import { Row } from "./ui/Screen";
import { Txt } from "./ui/Text";
import { Card, Divider } from "./ui/Card";
import { Chip } from "./ui/Chip";
import { Icon } from "./ui/Icon";
import { Field } from "./ui/Field";
import { Button } from "./ui/Button";
import { BottomSheet } from "./ui/BottomSheet";

const STRIP_HEIGHT = 40;
/** Typing stops for this long before the search goes out: one question per word, not one per letter. */
const SEARCH_AFTER_MS = 350;
const MIN_LETTERS = 3;
const TONE: Record<Level, "success" | "warning" | "danger"> = { 1: "success", 2: "warning", 3: "danger" };
const hh = (hour: number) => `${String(hour).padStart(2, "0")}:00`;

/**
 * Your gym, and how busy it is, at the head of Home. Folded it is two lines:
 * the gym and a word for now, then where that word comes from and when it
 * changes. Opened it adds the day as a strip of hours with this hour lit, and
 * three chips for saying how busy it is when you are there.
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
  const { home, busyness, lastReport, canReport, setHome, report, refresh } = useGym();
  const [open, setOpen] = useState(false);
  const [picking, setPicking] = useState(false);

  // Coming back to Home is when a report somebody just sent should show.
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const picker = <GymPicker visible={picking} current={home} onClose={() => setPicking(false)} onPick={(g) => { setHome(g); setPicking(false); }} />;

  if (!home) {
    return (
      <>
        <Card padding={14} gap={0} onPress={() => setPicking(true)} accessibilityLabel={t("Set your gym")}>
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
        {picker}
      </>
    );
  }

  const date = new Date(now);
  const hour = date.getHours();
  const strip = dayStrip(date, busyness?.hours ?? []);
  const live = busyness?.live ?? null;
  const here = strip.find((s) => s.hour === hour);
  const level: Level = live ? levelOf(shareOf(live.level)) : here ? levelOf(here.share) : 1;
  const change = nextChange(strip, hour);
  const advice = change ? (change.level === 1 ? t("Quiet from {time}", { time: hh(change.hour) }) : change.level === 2 ? t("Moderate from {time}", { time: hh(change.hour) }) : t("Busy from {time}", { time: hh(change.hour) })) : null;
  // The word carries where it comes from: "now" only when somebody reported it, "usually" for a pattern. The full account is one tap away.
  const state = live ? t("Now {level}", { level: t(LEVEL_NAME[level]).toLowerCase() }) : t("Usually {level}", { level: t(LEVEL_NAME[level]).toLowerCase() });
  const source = live
    ? plural(live.n, "Now, from {n} report in the last hour and a half", "Now, from {n} reports in the last hour and a half")
    : here?.measured
      ? t("From what CresQ lifters reported here on this weekday")
      : t("How gyms usually run at this hour, not measured at yours");

  return (
    <>
      <Card padding={14} gap={12}>
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} accessibilityLabel={`${gymLabel(home)}, ${t(LEVEL_NAME[level])}`} onPress={() => setOpen((v) => !v)} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 10, opacity: pressed ? opacity.pressed : 1 })}>
          <Icon name="mapPin" size={16} color={colors.accent.ember} strokeWidth={1.9} />
          <View style={{ flex: 1, gap: 2 }}>
            <Txt variant="labelL" numberOfLines={1}>
              {gymLabel(home)}
            </Txt>
            <Row gap={6}>
              <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: colors.status[TONE[level]] }} />
              <Txt variant="labelS" tone="secondary" numberOfLines={2} style={{ flex: 1 }}>
                {[state, advice ? advice.charAt(0).toLowerCase() + advice.slice(1) : null].filter(Boolean).join(", ")}
              </Txt>
            </Row>
          </View>
          <View style={{ transform: [{ rotate: open ? "180deg" : "0deg" }] }}>
            <Icon name="chevronDown" size={16} color={colors.text.tertiary} strokeWidth={2} />
          </View>
        </Pressable>

        {open ? (
          <Animated.View entering={layouts.enter} exiting={layouts.exit} style={{ gap: 12 }}>
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
            <Txt variant="labelS" tone="tertiary">
              {source}
            </Txt>

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

            <Pressable accessibilityRole="button" onPress={() => setPicking(true)} hitSlop={8} style={({ pressed }) => ({ alignSelf: "flex-start", opacity: pressed ? opacity.pressed : 1 })}>
              <Txt variant="labelM" tone="secondary">
                {t("Another gym")}
              </Txt>
            </Pressable>
          </Animated.View>
        ) : null}
      </Card>
      {picker}
    </>
  );
}

type Found = { q: string; items: GymPlace[]; failed: boolean };

/**
 * Picking a gym that exists. You type a name and a town; what comes back are
 * places mapped as gyms, each with its address, and one of those is what gets
 * linked. There is no free text to fall back on: a gym that is only a string
 * is a gym nobody else can be talking about.
 */
function GymPicker({ visible, current, onClose, onPick }: { visible: boolean; current?: GymPlace; onClose: () => void; onPick: (g: GymPlace | null) => void }) {
  const { colors } = useTheme();
  const t = useT();
  const [q, setQ] = useState("");
  const [found, setFound] = useState<Found | null>(null);
  const wanted = q.trim();

  useEffect(() => {
    if (!visible || wanted.length < MIN_LETTERS) return;
    const stop = new AbortController();
    const timer = setTimeout(() => {
      searchGyms(wanted, stop.signal)
        .then((items) => setFound({ q: wanted, items, failed: false }))
        .catch(() => {
          if (!stop.signal.aborted) setFound({ q: wanted, items: [], failed: true });
        });
    }, SEARCH_AFTER_MS);
    return () => {
      clearTimeout(timer);
      stop.abort();
    };
  }, [visible, wanted]);

  // An answer counts only for the words it was asked with; anything else on screen is still being looked for.
  const answer = found && found.q === wanted ? found : null;
  const pick = (g: GymPlace | null) => {
    feel("select");
    setQ("");
    onPick(g);
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title={t("Your gym")} subtitle={t("Search for the gym you usually train at. It is offered first after a session, and it is the one whose busyness you see.")}>
      <View style={{ paddingHorizontal: 8, paddingVertical: 8, gap: 8 }}>
        <Field label={t("Name and town")} value={q} onChangeText={setQ} placeholder={t("Basic-Fit Zwolle")} icon="search" autoCorrect={false} autoCapitalize="words" autoFocus />
        {wanted.length < MIN_LETTERS ? null : !answer ? (
          <Txt variant="bodyS" tone="tertiary" style={{ paddingVertical: 8 }}>
            {t("Searching")}
          </Txt>
        ) : answer.failed ? (
          <Txt variant="bodyS" tone="secondary" style={{ paddingVertical: 8 }}>
            {t("The search could not be reached. Check your connection and try again.")}
          </Txt>
        ) : answer.items.length === 0 ? (
          <Txt variant="bodyS" tone="secondary" style={{ paddingVertical: 8 }}>
            {t("No gym found. Try its name together with the town.")}
          </Txt>
        ) : (
          <View>
            {answer.items.slice(0, 5).map((g, i) => (
              <View key={g.id}>
                {i > 0 ? <Divider /> : null}
                <Pressable accessibilityRole="button" accessibilityLabel={`${g.name}, ${gymAddress(g)}`} onPress={() => pick(g)} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, opacity: pressed ? opacity.pressed : 1 })}>
                  <View style={{ flex: 1, gap: 1 }}>
                    <Txt variant="labelL" numberOfLines={1}>
                      {g.name}
                    </Txt>
                    <Txt variant="bodyS" tone="tertiary" numberOfLines={1}>
                      {gymAddress(g)}
                    </Txt>
                  </View>
                  {current?.id === g.id ? <Icon name="check" size={18} color={colors.status.success} strokeWidth={2.4} /> : null}
                </Pressable>
              </View>
            ))}
          </View>
        )}
        <Txt variant="labelS" tone="tertiary">
          {t("Places from OpenStreetMap")}
        </Txt>
        {current ? <Button label={t("No regular gym")} variant="tertiary" size="M" onPress={() => pick(null)} /> : null}
      </View>
    </BottomSheet>
  );
}
