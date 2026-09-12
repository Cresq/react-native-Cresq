import type { PropsWithChildren } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme/ThemeProvider";
import { Txt } from "./Text";
import { Icon, type IconName } from "./Icon";
import { Button } from "./Button";

export function BottomSheet({ visible, onClose, title, subtitle, children }: PropsWithChildren<{ visible: boolean; onClose: () => void; title: string; subtitle?: string }>) {
  const { colors, radius } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="Close" />
      <View style={[styles.sheet, { backgroundColor: colors.bg.surface, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, paddingBottom: Math.max(insets.bottom, 16) + 16 }]}>
        <View style={[styles.handle, { backgroundColor: colors.border.strong }]} />
        <View style={{ gap: 2, paddingHorizontal: 8, paddingTop: 14, paddingBottom: 6 }}>
          <Txt variant="displayM">{title}</Txt>
          {subtitle ? (
            <Txt variant="bodyS" tone="tertiary">
              {subtitle}
            </Txt>
          ) : null}
        </View>
        <View>{children}</View>
        <Button label="Cancel" variant="tertiary" size="M" onPress={onClose} style={{ marginTop: 8 }} />
      </View>
    </Modal>
  );
}

/** One option row. Rows share the sheet surface and are separated by spacing, not boxes. */
export function SheetOption({ icon, label, sub, onPress, danger, selected }: { icon: IconName; label: string; sub?: string; onPress: () => void; danger?: boolean; selected?: boolean }) {
  const { colors, radius } = useTheme();
  const fg = danger ? colors.status.danger : colors.text.primary;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 12, paddingHorizontal: 8, borderRadius: radius.button, backgroundColor: pressed ? colors.bg.raised : "transparent" })}
    >
      <View style={{ width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: selected ? colors.accent.soft : colors.bg.raised }}>
        <Icon name={icon} size={18} color={danger ? colors.status.danger : selected ? colors.accent.ember : colors.icon.strong} strokeWidth={1.9} />
      </View>
      <View style={{ flex: 1, gap: 1 }}>
        <Txt variant="labelL" style={{ color: fg }}>
          {label}
        </Txt>
        {sub ? (
          <Txt variant="bodyS" tone="tertiary">
            {sub}
          </Txt>
        ) : null}
      </View>
      {selected ? <Icon name="check" size={18} color={colors.accent.ember} strokeWidth={2.4} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)" },
  sheet: { paddingTop: 10, paddingHorizontal: 12 },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center" },
});
