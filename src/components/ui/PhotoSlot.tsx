import { Image, View, type ImageSourcePropType, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { Icon } from "./Icon";

/** Image with the raised camera placeholder when no source is set. */
export function PhotoSlot({ source, width, height, radius = 16, style, children }: { source?: ImageSourcePropType; width?: number; height: number; radius?: number; style?: StyleProp<ViewStyle>; children?: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={[{ width, height, borderRadius: radius, overflow: "hidden", backgroundColor: colors.bg.raised, alignItems: "center", justifyContent: "center" }, style]}>
      {source ? <Image source={source} style={{ width: "100%", height: "100%" }} resizeMode="cover" /> : <Icon name="camera" size={Math.min(28, height / 3)} color={colors.text.tertiary} strokeWidth={1.6} />}
      {children}
    </View>
  );
}

export function Avatar({ source, size = 38, initial = "N" }: { source?: ImageSourcePropType; size?: number; initial?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, overflow: "hidden", backgroundColor: colors.bg.raised, alignItems: "center", justifyContent: "center" }}>
      {source ? <Image source={source} style={{ width: size, height: size }} resizeMode="cover" /> : <Icon name="user" size={size * 0.5} color={colors.text.tertiary} />}
    </View>
  );
}
