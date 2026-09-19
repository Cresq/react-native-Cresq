import { useEffect } from "react";
import { Pressable, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { useTheme } from "@/theme/ThemeProvider";
import { springs } from "@/motion";
import { feel } from "@/haptics";

const WIDTH = 46;
const HEIGHT = 28;
const THUMB = 22;
const INSET = 2;
const TRAVEL = WIDTH - 2 - THUMB - INSET * 2;

/**
 * A switch whose thumb travels. The track is always the same size, border
 * included, so throwing it moves nothing around it; the ember fills in over
 * the resting track as the thumb crosses, and the thumb's own colour follows.
 * The value is the parent's: this only draws it, so it cannot disagree with it.
 */
export function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; /** What the switch turns on, for a screen reader: without it the switch is announced as a switch and nothing more. */ label: string }) {
  const { colors } = useTheme();
  const on = useSharedValue(value ? 1 : 0);
  useEffect(() => {
    on.value = withSpring(value ? 1 : 0, springs.snappy);
  }, [value, on]);
  const fill = useAnimatedStyle(() => ({ opacity: on.value }));
  const thumb = useAnimatedStyle(() => ({ transform: [{ translateX: INSET + TRAVEL * on.value }] }));
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      hitSlop={8}
      onPress={() => {
        feel("select");
        onChange(!value);
      }}
      style={{ width: WIDTH, height: HEIGHT, borderRadius: HEIGHT / 2, backgroundColor: colors.bg.raised, borderWidth: 1, borderColor: colors.border.strong, justifyContent: "center" }}
    >
      <Animated.View pointerEvents="none" style={[{ position: "absolute", top: -1, left: -1, right: -1, bottom: -1, borderRadius: HEIGHT / 2, backgroundColor: colors.accent.ember }, fill]} />
      <Animated.View style={[{ width: THUMB, height: THUMB, borderRadius: THUMB / 2 }, thumb]}>
        <View style={{ flex: 1, borderRadius: THUMB / 2, backgroundColor: colors.text.tertiary }} />
        <Animated.View style={[{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderRadius: THUMB / 2, backgroundColor: colors.accent.on }, fill]} />
      </Animated.View>
    </Pressable>
  );
}
