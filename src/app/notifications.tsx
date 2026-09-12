import { useState } from "react";
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "@/theme/ThemeProvider";
import { notifications as data, type Notification } from "@/data/mock";
import { Screen, Row, Section, Header } from "@/components/ui/Screen";
import { Txt } from "@/components/ui/Text";
import { IconButton } from "@/components/ui/IconButton";
import { Divider } from "@/components/ui/Card";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Avatar } from "@/components/ui/PhotoSlot";
import { Button } from "@/components/ui/Button";

const kindIcon: Record<Notification["kind"], IconName> = { like: "heart", comment: "chatCircle", follow: "user", record: "trophy", reminder: "calendar", device: "watch" };

/**
 * Notifications. A plain list grouped by time. Unread rows carry a dot, not a
 * different background, so the list stays calm. Records use gold; nothing else is coloured.
 */
export default function Notifications() {
  const { colors } = useTheme();
  const router = useRouter();
  const [read, setRead] = useState<Record<string, boolean>>({});
  const unread = data.flatMap((g) => g.items).filter((n) => n.unread && !read[n.id]).length;
  const markAll = () => setRead(Object.fromEntries(data.flatMap((g) => g.items).map((n) => [n.id, true])));

  return (
    <Screen>
      <Header left={<IconButton name="chevronLeft" onPress={() => router.back()} accessibilityLabel="Back" />} title="Notifications" subtitle={unread ? `${unread} new` : "All caught up"} />

      {data.map((group) => (
        <Section key={group.group} title={group.group} gap={0}>
          {group.items.map((n, i) => {
            const isUnread = !!n.unread && !read[n.id];
            const gold = n.kind === "record";
            return (
              <View key={n.id}>
                {i > 0 ? <Divider inset={54} /> : null}
                <Pressable accessibilityRole="button" onPress={() => setRead((r) => ({ ...r, [n.id]: true }))} style={({ pressed }) => ({ flexDirection: "row", alignItems: "flex-start", gap: 14, paddingVertical: 14, opacity: pressed ? 0.7 : 1 })}>
                  {n.avatar ? (
                    <Avatar source={n.avatar} size={40} />
                  ) : (
                    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: gold ? colors.pr.soft : colors.bg.surface, alignItems: "center", justifyContent: "center" }}>
                      <Icon name={kindIcon[n.kind]} size={18} color={gold ? colors.pr.gold : colors.text.secondary} strokeWidth={1.9} />
                    </View>
                  )}
                  <View style={{ flex: 1, gap: 3 }}>
                    <Txt variant={isUnread ? "labelL" : "bodyM"} tone={isUnread ? "primary" : "secondary"}>
                      {n.title}
                    </Txt>
                    {n.body ? (
                      <Txt variant="bodyS" tone="tertiary">
                        {n.body}
                      </Txt>
                    ) : null}
                  </View>
                  <View style={{ alignItems: "flex-end", gap: 6, paddingTop: 2 }}>
                    <Txt variant="labelS" tone="tertiary">
                      {n.when}
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
        <Button label="Mark all as read" variant="tertiary" size="M" full={false} onPress={markAll} disabled={unread === 0} />
      </Row>
    </Screen>
  );
}
