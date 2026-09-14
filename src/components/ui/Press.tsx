import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { springs, to } from "@/motion";

/**
 * A Pressable that answers on touch-down, not on release: it settles to a
 * slightly smaller scale the instant the finger lands and springs back when
 * it lifts. The scale lives on a wrapper so the inner Pressable keeps its own
 * function-style (pressed colours) untouched.
 */
export function Press({ scaleTo = 0.97, wrapperStyle, onPressIn, onPressOut, children, ...rest }: PressableProps & { scaleTo?: number; wrapperStyle?: StyleProp<ViewStyle>; children?: React.ReactNode }) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={[animated, wrapperStyle]}>
      <Pressable
        {...rest}
        onPressIn={(e) => {
          scale.value = to(scaleTo, springs.snappy);
          onPressIn?.(e);
        }}
        onPressOut={(e) => {
          scale.value = to(1, springs.snappy);
          onPressOut?.(e);
        }}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}
