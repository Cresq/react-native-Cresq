import { View } from "react-native";
import { useNav } from "@/nav";
import { useTheme } from "@/theme/ThemeProvider";
import { useDb } from "@/db/DbProvider";
import { useSocial } from "@/store/social";
import { useT } from "@/i18n";
import { Screen, Row, Header, Section } from "@/components/ui/Screen";
import { Txt } from "@/components/ui/Text";
import { IconButton } from "@/components/ui/IconButton";
import { Icon } from "@/components/ui/Icon";
import { Divider } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/PhotoSlot";
import { Press } from "@/components/ui/Press";

/**
 * Who you can hold your figures up against: the people you follow who share
 * theirs. Someone who keeps them private is listed and said to be private,
 * rather than quietly left out.
 */
export default function CompareList() {
  const { colors } = useTheme();
  const router = useNav();
  const t = useT();
  const { db } = useDb();
  const { following, people } = useSocial();
  const followed = people.filter((p) => following.includes(p.id));
  const open = followed.filter((p) => p.compare);
  const closed = followed.filter((p) => !p.compare);

  return (
    <Screen>
      <Header left={<IconButton name="chevronLeft" onPress={() => router.back()} accessibilityLabel={t("Back")} />} title={t("Compare with others")} subtitle={db.profile.compareStats === false ? t("Your own figures are private") : undefined} />

      {db.profile.compareStats === false ? (
        <Row gap={12} align="flex-start">
          <Icon name="lock" size={16} color={colors.status.warning} strokeWidth={1.9} />
          <Txt variant="bodyS" tone="warning" style={{ flex: 1 }}>
            {t("You can see theirs, they cannot see yours. Turn sharing on in Account and privacy.")}
          </Txt>
        </Row>
      ) : null}

      {open.length === 0 && closed.length === 0 ? (
        <View style={{ gap: 4, paddingVertical: 8 }}>
          <Txt variant="displayM">{t("Nobody to compare with yet")}</Txt>
          <Txt variant="bodyM" tone="secondary">
            {t("Follow a few people and the ones who share their figures show up here.")}
          </Txt>
        </View>
      ) : null}

      {open.length ? (
        <View>
          {open.map((p, i) => (
            <View key={p.id}>
              {i > 0 ? <Divider inset={56} /> : null}
              <Press accessibilityRole="button" accessibilityLabel={t("Compare with {name}", { name: p.name })} scaleTo={0.99} onPress={() => router.push(`/compare/${p.id}`)} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 }}>
                <Avatar source={p.avatar} size={44} initial={p.name[0]} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Txt variant="labelL">{p.name}</Txt>
                  <Txt variant="bodyS" tone="tertiary">
                    {t("{n} sessions, {k} a week", { n: p.compare!.sessions, k: p.compare!.weekSessions })}
                  </Txt>
                </View>
                <Icon name="chevronRight" size={18} color={colors.text.tertiary} />
              </Press>
            </View>
          ))}
        </View>
      ) : null}

      {closed.length ? (
        <Section title={t("Keeping theirs private")} gap={0}>
          {closed.map((p, i) => (
            <View key={p.id}>
              {i > 0 ? <Divider inset={56} /> : null}
              <Row gap={12} style={{ paddingVertical: 12, opacity: 0.6 }}>
                <Avatar source={p.avatar} size={44} initial={p.name[0]} />
                <Txt variant="labelL" style={{ flex: 1 }}>
                  {p.name}
                </Txt>
                <Icon name="lock" size={16} color={colors.text.tertiary} strokeWidth={1.8} />
              </Row>
            </View>
          ))}
        </Section>
      ) : null}

      <Txt variant="labelS" tone="tertiary">
        {t("Comparing shows session counts, this week's volume and your estimated one-rep maxes. Nothing else.")}
      </Txt>
    </Screen>
  );
}
