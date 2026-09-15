import { Pressable, View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";

export function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      onPress={() => onChange(!value)}
      style={{ width: 46, height: 28, borderRadius: 14, backgroundColor: value ? colors.accent.ember : colors.bg.raised, borderWidth: value ? 0 : 1, borderColor: colors.border.strong, justifyContent: "center" }}
    >
      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: value ? colors.accent.on : colors.text.tertiary, marginLeft: value ? 21 : 3 }} />
    </Pressable>
  );
}
