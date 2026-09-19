import { Pressable, type GestureResponderEvent, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { opacity, pressScale, springs, useReducedMotion } from "@/motion";
import { feel, type Moment } from "@/haptics";

export type AnimatedPressableProps = PressableProps & {
  /** How far it gives under the finger; a token from `pressScale`. */
  scaleTo?: number;
  /** The moment this press is, if it is one that earns a haptic. Most presses are not. */
  feedback?: Moment;
  /** Layout for the wrapper the scale lives on (flex, alignSelf, margins). */
  wrapperStyle?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
};

/**
 * The press every control in CresQ is built on. It answers on touch-down, not
 * on release: the instant the finger lands it settles a little smaller, and it
 * springs back, without overshoot, when the finger lifts. Both run on the UI
 * thread and can be interrupted at any point, so a fast second tap finds the
 * control wherever the first one left it.
 *
 * The scale lives on a wrapper so the Pressable inside keeps its own
 * function-style (pressed colours) untouched. With Reduce Motion on nothing
 * scales; the control dims under the finger instead, so the press is still
 * answered.
 */
export function AnimatedPressable({ scaleTo = pressScale.button, feedback, wrapperStyle, onPressIn, onPressOut, onPress, children, ...rest }: AnimatedPressableProps) {
  const reduced = useReducedMotion();
  const down = useSharedValue(0);
  const dim = opacity.reducedPress;
  const animated = useAnimatedStyle(() => (reduced ? { opacity: 1 - (1 - dim) * down.value } : { transform: [{ scale: 1 - (1 - scaleTo) * down.value }] }));
  return (
    <Animated.View style={[animated, wrapperStyle]}>
      <Pressable
        {...rest}
        onPressIn={(e: GestureResponderEvent) => {
          down.value = withSpring(1, springs.press);
          onPressIn?.(e);
        }}
        onPressOut={(e: GestureResponderEvent) => {
          down.value = withSpring(0, springs.press);
          onPressOut?.(e);
        }}
        onPress={
          onPress
            ? (e: GestureResponderEvent) => {
                if (feedback) feel(feedback);
                onPress(e);
              }
            : undefined
        }
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}
