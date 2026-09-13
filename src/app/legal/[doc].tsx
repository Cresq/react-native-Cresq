import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { legalDoc } from "@/data/legal";
import { Screen, Header, Row } from "@/components/ui/Screen";
import { Txt } from "@/components/ui/Text";
import { IconButton } from "@/components/ui/IconButton";
import { Icon } from "@/components/ui/Icon";
import { useTheme } from "@/theme/ThemeProvider";

/** One legal document, readable in the app without a browser. */
export default function Legal() {
  const { colors } = useTheme();
  const router = useRouter();
  const { doc: key } = useLocalSearchParams<{ doc: string }>();
  const doc = legalDoc(key);
  if (!doc) {
    return (
      <Screen>
        <Header left={<IconButton name="chevronLeft" onPress={() => router.back()} accessibilityLabel="Back" />} title="Not found" />
      </Screen>
    );
  }
  return (
    <Screen>
      <Header left={<IconButton name="chevronLeft" onPress={() => router.back()} accessibilityLabel="Back" />} title={doc.title} subtitle={`Updated ${doc.updated}`} />
      {!doc.reviewed ? (
        <Row gap={8} align="flex-start">
          <Icon name="info" size={16} color={colors.status.warning} strokeWidth={2} />
          <Txt variant="bodyS" tone="secondary" style={{ flex: 1 }}>
            Draft. This text is being reviewed by a lawyer and will be available in Dutch before launch.
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
