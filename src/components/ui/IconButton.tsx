import { Pressable, View, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { Icon, type IconName } from "./Icon";

export function IconButton({
  name,
  onPress,
  size = 44,
  iconSize = 20,
  tone = "surface",
  badge,
  style,
  accessibilityLabel,
}: {
  name: IconName;
  onPress?: () => void;
  size?: number;
  iconSize?: number;
  tone?: "surface" | "raised" | "ember";
  badge?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const { colors } = useTheme();
  const bg = tone === "ember" ? colors.accent.ember : tone === "raised" ? colors.bg.raised : colors.bg.surface;
  const fg = tone === "ember" ? colors.accent.on : colors.icon.strong;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? name}
      onPress={onPress}
      style={({ pressed }) => [
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: pressed ? colors.bg.raised : bg,
          borderWidth: tone === "ember" ? 0 : 1,
          borderColor: colors.border.subtle,
          alignItems: "center",
          justifyContent: "center",
        },
        style,
      ]}
    >
      <Icon name={name} size={iconSize} color={fg} strokeWidth={1.9} />
      {badge ? (
        <View
          style={{ position: "absolute", top: 6, right: 6, width: 9, height: 9, borderRadius: 5, backgroundColor: colors.accent.ember, borderWidth: 2, borderColor: colors.bg.ground }}
        />
      ) : null}
    </Pressable>
  );
}
