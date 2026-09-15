import { Image, View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";

const mark = require("@/assets/brand/mark-white.png");
const lockup = require("@/assets/brand/lockup-white.png");

/**
 * The artwork is a single colour on transparency, so one file serves both
 * themes: it is tinted to whatever the text colour is. Bone on near-black,
 * ink on paper, and never a white mark on a white page.
 */
export function Mark({ size = 40 }: { size?: number }) {
  const { colors } = useTheme();
  return <Image source={mark} tintColor={colors.text.primary} style={{ width: size, height: size }} resizeMode="contain" accessibilityLabel="CresQ" />;
}

/** Mark plus wordmark on one baseline. Source is 1373 × 319. */
export function Lockup({ width = 150 }: { width?: number }) {
  const { colors } = useTheme();
  return (
    <View style={{ width, height: width * (319 / 1373) }}>
      <Image source={lockup} tintColor={colors.text.primary} style={{ width: "100%", height: "100%" }} resizeMode="contain" accessibilityLabel="CresQ" />
    </View>
  );
}
