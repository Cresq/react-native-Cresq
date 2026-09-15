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
import { Field } from "@/components/ui/Field";
import { BottomSheet, SheetOption } from "@/components/ui/BottomSheet";
import { useT, usePlural } from "@/i18n";

/**
 * Split editor. The order is the content: numbered rows, the next day marked,
 * one options sheet per row, one sheet to add a day from templates.
 */
export default function SplitEditor() {
  const { colors } = useTheme();
  const router = useRouter();
  const t = useT();
  const plural = usePlural();
  const { split, nextDay, rename, addDay, removeDay, moveDay, setNext } = useSplit();
  const [renaming, setRenaming] = useState(false);
  const [nameText, setNameText] = useState(split.name);
  const { db } = useDb();
  const splitTemplates = templatesFor(db.plans);
  const [sheet, setSheet] = useState<null | { kind: "day"; day: SplitDay } | { kind: "add" }>(null);
  const training = split.days.filter((d) => !d.rest).length;

  return (
    <Screen bottom={90} footer={<Button label={t("Save split")} onPress={() => router.back()} />}>
      <Header left={<IconButton name="chevronLeft" onPress={() => router.back()} accessibilityLabel={t("Back")} />} title={t("Your split")} right={<IconButton name="noteEdit" onPress={() => { setNameText(split.name); setRenaming(true); }} accessibilityLabel={t("Rename split")} />} />

      <BottomSheet visible={renaming} onClose={() => setRenaming(false)} title={t("Rename your split")}>
        <View style={{ paddingHorizontal: 8, paddingVertical: 8, gap: 12 }}>
          <Field label={t("Name")} value={nameText} onChangeText={setNameText} placeholder="Push Pull Legs" autoFocus />
          <Button label={t("Save name")} onPress={() => { if (nameText.trim()) rename(nameText.trim()); setRenaming(false); }} disabled={!nameText.trim()} />
        </View>
      </BottomSheet>

      <View style={{ gap: 4 }}>
        <Txt variant="displayL">{split.name}</Txt>
        <Txt variant="bodyM" tone="secondary">
          {t("{n} training days", { n: training })}{split.days.length - training ? `, ${t("{n} rest", { n: split.days.length - training })}` : ""}. {t("It repeats, so day {n} leads back to day 1.", { n: split.days.length })}
        </Txt>
      </View>

      <Card padding={8} gap={0}>
        {split.days.map((d, i) => {
          const isNext = d.id === nextDay?.id;
          return (
            <View key={d.id}>
              {i > 0 ? <Divider inset={58} /> : null}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, paddingHorizontal: 12 }}>
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
                        {t("Up next")}
                      </Txt>
                    ) : null}
                  </Row>
                  <Txt variant="bodyS" tone="tertiary">
                    {d.rest ? d.focus : `${d.focus}, ${plural(d.exercises ?? 0, "{n} exercise", "{n} exercises")}, ${t("{n} min", { n: d.minutes ?? 0 })}`}
                  </Txt>
                </Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel={t("Day options")} hitSlop={10} onPress={() => setSheet({ kind: "day", day: d })}>
                  <Icon name="moreHorizontal" size={18} color={colors.text.tertiary} />
                </Pressable>
              </View>
            </View>
          );
        })}
        <Divider inset={58} />
        <Pressable accessibilityRole="button" onPress={() => setSheet({ kind: "add" })} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, paddingHorizontal: 12 }}>
          <View style={{ width: 30, alignItems: "center" }}>
            <Icon name="addPlus" size={16} color={colors.text.secondary} strokeWidth={2} />
          </View>
          <Txt variant="labelM" tone="secondary">
            {t("Add a day")}
          </Txt>
        </Pressable>
      </Card>

      <Section title={t("How it flows")}>
        <Row gap={8} style={{ flexWrap: "wrap" }}>
          {split.days.map((d, i) => (
            <Row key={d.id} gap={8}>
              <Txt variant="labelM" tone={d.id === nextDay?.id ? "ember" : d.rest ? "tertiary" : "secondary"}>
                {d.name}
              </Txt>
              {i < split.days.length - 1 ? <Icon name="chevronRight" size={12} color={colors.text.tertiary} strokeWidth={2.2} /> : null}
            </Row>
          ))}
        </Row>
      </Section>

      <BottomSheet visible={sheet?.kind === "day"} onClose={() => setSheet(null)} title={sheet?.kind === "day" ? sheet.day.name : ""} subtitle={sheet?.kind === "day" ? t("Day {a} of {b}", { a: split.days.findIndex((d) => d.id === sheet.day.id) + 1, b: split.days.length }) : undefined}>
        {sheet?.kind === "day" ? (
          <>
            <SheetOption icon="circleCheck" label={t("Do this next")} sub={t("Move the pointer to this day")} onPress={() => { setNext(sheet.day.id); setSheet(null); }} />
            <SheetOption icon="dragVertical" label={t("Move up")} onPress={() => { moveDay(sheet.day.id, -1); setSheet(null); }} />
            <SheetOption icon="dragVertical" label={t("Move down")} onPress={() => { moveDay(sheet.day.id, 1); setSheet(null); }} />
            <SheetOption icon="reload" label={t("Swap for another day")} sub={t("Keep the position, change the workout")} onPress={() => setSheet({ kind: "add" })} />
            <SheetOption icon="trash" label={t("Remove from split")} danger onPress={() => { removeDay(sheet.day.id); setSheet(null); }} />
          </>
        ) : null}
      </BottomSheet>

      <BottomSheet visible={sheet?.kind === "add"} onClose={() => setSheet(null)} title={t("Add a day")} subtitle={t("Pick a workout or a rest day. You can reorder afterwards.")}>
        {splitTemplates.map((tpl) => (
          <SheetOption key={tpl.name} icon={tpl.rest ? "sun" : "dumbbell"} label={tpl.rest ? t("Rest day") : tpl.name} sub={tpl.rest ? tpl.focus : `${tpl.focus}, ${plural(tpl.exercises ?? 0, "{n} exercise", "{n} exercises")}`} onPress={() => { addDay(tpl); setSheet(null); }} />
        ))}
      </BottomSheet>
    </Screen>
  );
}
