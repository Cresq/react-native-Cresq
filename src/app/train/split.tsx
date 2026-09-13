import { useState } from "react";
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "@/theme/ThemeProvider";
import { useSplit } from "@/store/split";
import { useDb } from "@/db/DbProvider";
import { splitTemplates as templatesFor } from "@/db/seed";
import type { SplitDay } from "@/db/types";
import { Screen, Row, Section, Header } from "@/components/ui/Screen";
import { Txt } from "@/components/ui/Text";
import { IconButton } from "@/components/ui/IconButton";
import { Card, Divider } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { BottomSheet, SheetOption } from "@/components/ui/BottomSheet";

/**
 * Split editor. The order is the content: numbered rows, the next day marked,
 * one options sheet per row, one sheet to add a day from templates.
 */
export default function SplitEditor() {
  const { colors } = useTheme();
  const router = useRouter();
  const { split, nextDay, addDay, removeDay, moveDay, setNext } = useSplit();
  const { db } = useDb();
  const splitTemplates = templatesFor(db.plans);
  const [sheet, setSheet] = useState<null | { kind: "day"; day: SplitDay } | { kind: "add" }>(null);
  const training = split.days.filter((d) => !d.rest).length;

  return (
    <Screen bottom={90} footer={<Button label="Save split" onPress={() => router.back()} />}>
      <Header left={<IconButton name="chevronLeft" onPress={() => router.back()} accessibilityLabel="Back" />} title="Your split" right={<IconButton name="noteEdit" accessibilityLabel="Rename" />} />

      <View style={{ gap: 4 }}>
        <Txt variant="displayL">{split.name}</Txt>
        <Txt variant="bodyM" tone="secondary">
          {training} training days{split.days.length - training ? `, ${split.days.length - training} rest` : ""}. It repeats, so day {split.days.length} leads back to day 1.
        </Txt>
      </View>

      <Card padding={6} gap={0}>
        {split.days.map((d, i) => {
          const isNext = d.id === nextDay?.id;
          return (
            <View key={d.id}>
              {i > 0 ? <Divider inset={58} /> : null}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, paddingHorizontal: 10 }}>
                <View style={{ width: 30, height: 30, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: isNext ? colors.accent.ember : colors.bg.raised }}>
                  <Txt variant="labelM" style={{ color: isNext ? colors.accent.on : colors.text.secondary }}>
                    {i + 1}
                  </Txt>
                </View>
                <Pressable accessibilityRole="button" onPress={() => setNext(d.id)} style={{ flex: 1, gap: 2 }}>
                  <Row gap={8}>
                    <Txt variant="labelL" tone={d.rest ? "secondary" : "primary"}>
                      {d.name}
                    </Txt>
                    {isNext ? (
                      <Txt variant="labelS" tone="ember">
                        Up next
                      </Txt>
                    ) : null}
                  </Row>
                  <Txt variant="bodyS" tone="tertiary">
                    {d.rest ? d.focus : `${d.focus} · ${d.exercises} exercises · ${d.minutes} min`}
                  </Txt>
                </Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel="Day options" hitSlop={10} onPress={() => setSheet({ kind: "day", day: d })}>
                  <Icon name="moreHorizontal" size={18} color={colors.text.tertiary} />
                </Pressable>
              </View>
            </View>
          );
        })}
        <Divider inset={58} />
        <Pressable accessibilityRole="button" onPress={() => setSheet({ kind: "add" })} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, paddingHorizontal: 10 }}>
          <View style={{ width: 30, alignItems: "center" }}>
            <Icon name="addPlus" size={16} color={colors.text.secondary} strokeWidth={2} />
          </View>
          <Txt variant="labelM" tone="secondary">
            Add a day
          </Txt>
        </Pressable>
      </Card>

      <Section title="How it flows">
        <Row gap={6} style={{ flexWrap: "wrap" }}>
          {split.days.map((d, i) => (
            <Row key={d.id} gap={6}>
              <Txt variant="labelM" tone={d.id === nextDay?.id ? "ember" : d.rest ? "tertiary" : "secondary"}>
                {d.name}
              </Txt>
              {i < split.days.length - 1 ? <Icon name="chevronRight" size={12} color={colors.text.tertiary} strokeWidth={2.2} /> : null}
            </Row>
          ))}
        </Row>
      </Section>

      <BottomSheet visible={sheet?.kind === "day"} onClose={() => setSheet(null)} title={sheet?.kind === "day" ? sheet.day.name : ""} subtitle={sheet?.kind === "day" ? `Day ${split.days.findIndex((d) => d.id === sheet.day.id) + 1} of ${split.days.length}` : undefined}>
        {sheet?.kind === "day" ? (
          <>
            <SheetOption icon="circleCheck" label="Do this next" sub="Move the pointer to this day" onPress={() => { setNext(sheet.day.id); setSheet(null); }} />
            <SheetOption icon="dragVertical" label="Move up" onPress={() => { moveDay(sheet.day.id, -1); setSheet(null); }} />
            <SheetOption icon="dragVertical" label="Move down" onPress={() => { moveDay(sheet.day.id, 1); setSheet(null); }} />
            <SheetOption icon="reload" label="Swap for another day" sub="Keep the position, change the workout" onPress={() => setSheet({ kind: "add" })} />
            <SheetOption icon="trash" label="Remove from split" danger onPress={() => { removeDay(sheet.day.id); setSheet(null); }} />
          </>
        ) : null}
      </BottomSheet>

      <BottomSheet visible={sheet?.kind === "add"} onClose={() => setSheet(null)} title="Add a day" subtitle="Pick a workout or a rest day. You can reorder afterwards.">
        {splitTemplates.map((t) => (
          <SheetOption key={t.name} icon={t.rest ? "sun" : "dumbbell"} label={t.name} sub={t.rest ? t.focus : `${t.focus} · ${t.exercises} exercises`} onPress={() => { addDay(t); setSheet(null); }} />
        ))}
      </BottomSheet>
    </Screen>
  );
}
