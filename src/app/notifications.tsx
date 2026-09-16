import { useEffect } from "react";
import { Pressable, View } from "react-native";
import { useNav } from "@/nav";
import { useTheme } from "@/theme/ThemeProvider";
import { useDb } from "@/db/DbProvider";
import { groupNotes, useNotes } from "@/store/notifications";
import { relativeDay } from "@/db/derive";
import { Screen, Row, Section, Header } from "@/components/ui/Screen";
import { Txt } from "@/components/ui/Text";
import { IconButton } from "@/components/ui/IconButton";
import { Divider } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { useT } from "@/i18n";

/**
 * Notifications, all of them worked out from your own log: records you set and
 * the day your split has next. Likes, comments and follows belong here too, and
 * will, once there is a server that knows about them. Until then this list
 * would have to invent them, and it will not.
 */
export default function Notifications() {
  const { colors } = useTheme();
  const router = useNav();
  const t = useT();
  const { update } = useDb();
  const { notes, seen } = useNotes();
  const groups = groupNotes(notes);

  // Opening the screen is reading it. A beat's delay so the dots are seen first.
  useEffect(() => {
    const now = Date.now();
    const timer = setTimeout(() => update((d) => ({ ...d, profile: { ...d.profile, lastNotificationsSeen: now } })), 1500);
    return () => clearTimeout(timer);
  }, [update]);

  return (
    <Screen>
      <Header left={<IconButton name="chevronLeft" onPress={() => router.back()} accessibilityLabel={t("Back")} />} title={t("Notifications")} subtitle={notes.length ? undefined : t("All caught up")} />

      {notes.length === 0 ? (
        <View style={{ gap: 4, paddingVertical: 8 }}>
          <Txt variant="displayM">{t("Nothing yet")}</Txt>
          <Txt variant="bodyM" tone="secondary">
            {t("Log a session and your records show up here.")}
          </Txt>
        </View>
      ) : null}

      {groups.map((group) => (
        <Section key={group.key} title={t(group.key)} gap={0}>
          {group.items.map((n, i) => {
            const isUnread = n.at > seen;
            return (
              <View key={n.id}>
                {i > 0 ? <Divider inset={54} /> : null}
                <Pressable accessibilityRole="button" onPress={() => n.href && router.push(n.href)} style={({ pressed }) => ({ flexDirection: "row", alignItems: "flex-start", gap: 12, paddingVertical: 12, opacity: pressed ? 0.7 : 1 })}>
                  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: n.gold ? colors.pr.soft : colors.bg.surface, alignItems: "center", justifyContent: "center" }}>
                    <Icon name={n.icon} size={18} color={n.gold ? colors.pr.gold : colors.text.secondary} strokeWidth={1.9} />
                  </View>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Txt variant={isUnread ? "labelL" : "bodyM"} tone={isUnread ? "primary" : "secondary"}>
                      {t(n.title, n.vars)}
                    </Txt>
                    {n.body ? (
                      <Txt variant="bodyS" tone="tertiary">
                        {t(n.body, n.bodyVars)}
                      </Txt>
                    ) : null}
                  </View>
                  <View style={{ alignItems: "flex-end", gap: 8, paddingTop: 2 }}>
                    <Txt variant="labelS" tone="tertiary">
                      {relativeDay(n.at)}
                    </Txt>
                    {isUnread ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent.ember }} /> : null}
                  </View>
                </Pressable>
              </View>
            );
          })}
        </Section>
      ))}

      <Row justify="center">
        <Txt variant="labelS" tone="tertiary" align="center">
          {t("Likes, comments and follows arrive here once accounts sync.")}
        </Txt>
      </Row>
    </Screen>
  );
}
