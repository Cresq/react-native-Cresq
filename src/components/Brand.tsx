import { Image, View } from "react-native";

const mark = require("@/assets/brand/mark-white.png");
const lockup = require("@/assets/brand/lockup-white.png");

/** CQ monogram. Bone on dark. Minimum 24 pt. */
export function Mark({ size = 40 }: { size?: number }) {
  return <Image source={mark} style={{ width: size, height: size }} resizeMode="contain" accessibilityLabel="CresQ" />;
}

/** Mark plus wordmark on one baseline. Source is 1373 × 319. */
export function Lockup({ width = 150 }: { width?: number }) {
  return (
    <View style={{ width, height: width * (319 / 1373) }}>
      <Image source={lockup} style={{ width: "100%", height: "100%" }} resizeMode="contain" accessibilityLabel="CresQ" />
    </View>
  );
}
