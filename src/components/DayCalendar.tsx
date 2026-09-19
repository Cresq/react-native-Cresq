import { useState } from "react";
import { Pressable, View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { useT, useLanguage, localeOf } from "@/i18n";
import { opacity } from "@/motion";
import { startOfDay } from "@/db/derive";
import { addDays, type DayMark } from "@/nutrition/day";
import { Txt } from "./ui/Text";
import { Icon } from "./ui/Icon";
import { IconButton } from "./ui/IconButton";
import { SheetGroup, SheetOption } from "./ui/BottomSheet";

const CELL = 42;

/**
 * What a day carries under its number: a tick when it ended on target, a dot
 * when something is in it, a ring when what is in it is still a plan. Shared by
 * the week on the Food tab and the month in this sheet, so the two never mean
 * different things by the same mark.
 */
export function DayDot({ mark, future, on }: { mark?: DayMark; future: boolean; /** Drawn on the selected day's fill, where it has to wear that fill's ink. */ on?: boolean }) {
  const { colors } = useTheme();
  const ink = on ? colors.fuel.on : colors.fuel.sage;
  if (!mark) return <View style={{ width: 10, height: 10 }} />;
  if (mark.onTarget && !future) return <Icon name="check" size={10} color={ink} strokeWidth={3.2} />;
  return (
    <View style={{ width: 10, height: 10, alignItems: "center", justifyContent: "center" }}>
      <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: future ? "transparent" : ink, borderWidth: future ? 1.2 : 0, borderColor: ink }} />
    </View>
  );
}

/**
 * A month to pick a day from, the body of the sheet behind the calendar button
 * on the Food tab. Days wear the same marks as the week strip. How far it goes
 * is the caller's to say; a day outside that is drawn faint and does nothing.
 */
export function DayCalendar({ day, now, marks, earliest, latest, onPick }: { day: number; now: number; marks: Map<number, DayMark>; earliest: number; latest: number; onPick: (day: number) => void }) {
  const { colors } = useTheme();
  const t = useT();
  const locale = localeOf(useLanguage());
  const today = startOfDay(now);
  const [month, setMonth] = useState(() => {
    const d = new Date(day);
    return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
  });

  const first = new Date(month);
  const shift = (n: number) => setMonth(new Date(first.getFullYear(), first.getMonth() + n, 1).getTime());
  const monthEnd = new Date(first.getFullYear(), first.getMonth() + 1, 0);
  // Monday first, as a Dutch calendar has it.
  const lead = (first.getDay() + 6) % 7;
  const cells: (number | null)[] = [...Array(lead).fill(null), ...Array.from({ length: monthEnd.getDate() }, (_, i) => addDays(month, i))];
  while (cells.length % 7) cells.push(null);
  const weeks = Array.from({ length: cells.length / 7 }, (_, w) => cells.slice(w * 7, w * 7 + 7));
  // 1 January 2024 was a Monday: seven days from there are the seven letters, in the reader's language.
  const letters = Array.from({ length: 7 }, (_, i) => new Date(2024, 0, 1 + i).toLocaleDateString(locale, { weekday: "narrow" }));
  const name = first.toLocaleDateString(locale, { month: "long", year: "numeric" });
  const canBack = monthEnd.getTime() > earliest && new Date(first.getFullYear(), first.getMonth(), 0).getTime() >= earliest;
  const canOn = new Date(first.getFullYear(), first.getMonth() + 1, 1).getTime() <= latest;

  return (
    <View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 4, paddingBottom: 10 }}>
        <IconButton name="chevronLeft" size={34} iconSize={16} tone="raised" disabled={!canBack} onPress={() => shift(-1)} accessibilityLabel={t("Previous month")} />
        <Txt variant="displayS" align="center" style={{ flex: 1, textTransform: "capitalize" }}>
          {name}
        </Txt>
        <IconButton name="chevronRight" size={34} iconSize={16} tone="raised" disabled={!canOn} onPress={() => shift(1)} accessibilityLabel={t("Next month")} />
      </View>

      <SheetGroup caption={t("A dot is a day with food in it, a tick a day that ended on target, a ring a day that is planned.")}>
        <View style={{ paddingHorizontal: 8, paddingVertical: 10, gap: 2 }}>
          <View style={{ flexDirection: "row" }}>
            {letters.map((l, i) => (
              <Txt key={i} variant="labelS" tone="tertiary" align="center" style={{ flex: 1, paddingBottom: 4 }}>
                {l}
              </Txt>
            ))}
          </View>
          {weeks.map((week, w) => (
            <View key={w} style={{ flexDirection: "row" }}>
              {week.map((d, i) => {
                if (d === null) return <View key={i} style={{ flex: 1, height: CELL }} />;
                const chosen = d === day;
                const out = d < earliest || d > latest;
                return (
                  <Pressable
                    key={i}
                    accessibilityRole="button"
                    accessibilityState={{ selected: chosen, disabled: out }}
                    accessibilityLabel={new Date(d).toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long" })}
                    disabled={out}
                    onPress={() => onPick(d)}
                    style={({ pressed }) => ({ flex: 1, height: CELL, alignItems: "center", justifyContent: "center", opacity: out ? 0.3 : pressed ? opacity.pressed : 1 })}
                  >
                    <View style={{ width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: chosen ? colors.fuel.sage : "transparent" }}>
                      <Txt variant="labelM" tabular style={{ color: chosen ? colors.fuel.on : d === today ? colors.fuel.sage : d > today ? colors.text.secondary : colors.text.primary }}>
                        {new Date(d).getDate()}
                      </Txt>
                    </View>
                    <DayDot mark={marks.get(d)} future={d > today} />
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
      </SheetGroup>

      {day !== today ? (
        <SheetGroup>
          <SheetOption icon="calendar" label={t("Back to today")} onPress={() => onPick(today)} />
        </SheetGroup>
      ) : null}
    </View>
  );
}
