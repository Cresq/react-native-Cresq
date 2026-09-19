import { Image, View, type ImageSourcePropType, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { Icon } from "./Icon";
import { Txt } from "./Text";
import { fontFamily } from "../../../constants/theme";

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

/**
 * A face, or the letter it starts with. Nobody arrives with a photo, and a
 * row of identical grey silhouettes tells you nothing about who is who.
 */
export function Avatar({ source, size = 38, initial, ground }: { source?: ImageSourcePropType; size?: number; initial?: string; /** What the circle is filled with when there is no photo. It defaults to the raised colour, which disappears on a raised block: there the caller names another. */ ground?: string }) {
  const { colors } = useTheme();
  const letter = initial?.trim().charAt(0).toUpperCase();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, overflow: "hidden", backgroundColor: ground ?? colors.bg.raised, alignItems: "center", justifyContent: "center" }}>
      {source ? (
        <Image source={source} style={{ width: size, height: size }} resizeMode="cover" />
      ) : letter ? (
        <Txt style={{ fontSize: Math.round(size * 0.4), lineHeight: Math.round(size * 0.5), color: colors.text.secondary, fontFamily: fontFamily.semibold }}>{letter}</Txt>
      ) : (
        <Icon name="user" size={size * 0.5} color={colors.text.tertiary} />
      )}
    </View>
  );
}
