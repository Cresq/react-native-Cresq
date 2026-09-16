import { View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useNav } from "@/nav";
import { legalDoc } from "@/data/legal";
import { Screen, Header, Row } from "@/components/ui/Screen";
import { Txt } from "@/components/ui/Text";
import { IconButton } from "@/components/ui/IconButton";
import { Icon } from "@/components/ui/Icon";
import { useTheme } from "@/theme/ThemeProvider";
import { useT } from "@/i18n";

/** One legal document, readable in the app without a browser. */
export default function Legal() {
  const { colors } = useTheme();
  const router = useNav();
  const t = useT();
  const { doc: key } = useLocalSearchParams<{ doc: string }>();
  const doc = legalDoc(key);
  if (!doc) {
    return (
      <Screen>
        <Header left={<IconButton name="chevronLeft" onPress={() => router.back()} accessibilityLabel={t("Back")} />} title={t("Not found")} />
        <Txt variant="bodyM" tone="secondary">
          {t("That document does not exist. The ones that do are listed under Account and privacy.")}
        </Txt>
      </Screen>
    );
  }
  return (
    <Screen>
      <Header left={<IconButton name="chevronLeft" onPress={() => router.back()} accessibilityLabel={t("Back")} />} title={doc.title} subtitle={t("Updated {date}", { date: doc.updated })} />
      {!doc.reviewed ? (
        <Row gap={8} align="flex-start">
          <Icon name="info" size={16} color={colors.status.warning} strokeWidth={2} />
          <Txt variant="bodyS" tone="secondary" style={{ flex: 1 }}>
            {t("Draft. A lawyer is reading this, and it will be in Dutch before launch.")}
          </Txt>
        </Row>
      ) : null}
      {doc.sections.map((s) => (
        <View key={s.h} style={{ gap: 8 }}>
          <Txt variant="displayS">{s.h}</Txt>
          {s.p.map((p, i) => (
            <Txt key={i} variant="bodyM" tone="secondary">
              {p}
            </Txt>
          ))}
        </View>
      ))}
    </Screen>
  );
}
