import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme/ThemeProvider";
import { useDb } from "@/db/DbProvider";
import { useT } from "@/i18n";
import { Txt } from "@/components/ui/Text";
import { Icon } from "@/components/ui/Icon";

/**
 * Shown only when a write to the device has failed. Silence here would be the
 * worst outcome: a person finishing a session believing it is logged when the
 * phone has no room left for it.
 */
export function SaveTrouble() {
  const { colors, radius } = useTheme();
  const { saveFailed } = useDb();
  const insets = useSafeAreaInsets();
  const t = useT();
  if (!saveFailed) return null;
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: 16, right: 16, top: insets.top + 8 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, paddingHorizontal: 14, borderRadius: radius.button, backgroundColor: colors.status.danger }}>
        <Icon name="info" size={16} color={colors.text.primary} strokeWidth={2.2} />
        <Txt variant="labelM" style={{ flex: 1, color: colors.text.primary }}>
          {t("Cannot save to this phone. Free up some space; your session is still here in the meantime.")}
        </Txt>
      </View>
    </View>
  );
}
