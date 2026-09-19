import { Image, View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { Icon } from "./ui/Icon";

/**
 * The round mark a food carries in a list: the photo of it when there is one,
 * a leaf on the food colour's ground when there is not. The same shape as an
 * exercise mark, so a row of either reads the same.
 */
export function FoodMark({ photo, size = 40 }: { photo?: string; size?: number }) {
  const { colors } = useTheme();
  if (photo) return <Image source={{ uri: photo }} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.bg.raised }} resizeMode="cover" accessibilityIgnoresInvertColors />;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.fuel.soft, alignItems: "center", justifyContent: "center" }}>
      <Icon name="leaf" size={Math.round(size * 0.45)} color={colors.fuel.sage} strokeWidth={1.9} />
    </View>
  );
}
