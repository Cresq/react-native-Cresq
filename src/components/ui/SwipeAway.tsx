import type { PropsWithChildren } from "react";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { gesture, project, rubberband, spring, springs } from "@/motion";

/**
 * A bar you can push out of the way. It follows the finger, resists being
 * pulled the wrong way, and on release carries on at the speed it was let go
 * at: past the point of no return it leaves, otherwise it settles back.
 *
 * Every temporary strip in the app uses this, because a thing that appears
 * uninvited should be dismissable without hunting for a button.
 */
export function SwipeAway({
  onDismiss,
  direction = "down",
  children,
}: PropsWithChildren<{ onDismiss: () => void; direction?: "up" | "down" }>) {
  const sign = direction === "down" ? 1 : -1;
  const ty = useSharedValue(0);
  const gone = useSharedValue(false);

  const pan = Gesture.Pan()
    .activeOffsetY(direction === "down" ? [-16, 10] : [-10, 16])
    .failOffsetX([-20, 20])
    .onUpdate((e) => {
      const raw = e.translationY;
      // Going the way it dismisses is free; the other way resists.
      ty.value = raw * sign > 0 ? raw : rubberband(raw, 140, 0.25);
    })
    .onEnd((e) => {
      const projected = ty.value + project(e.velocityY);
      if (projected * sign > gesture.dismiss) {
        gone.value = true;
        ty.value = withSpring(sign * 260, spring(0.3, 1, e.velocityY), (done) => {
          if (done) runOnJS(onDismiss)();
        });
      } else {
        ty.value = withSpring(0, springs.base);
      }
    });

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: ty.value }],
    opacity: Math.max(0, 1 - Math.abs(ty.value) / 140),
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={style}>{children}</Animated.View>
    </GestureDetector>
  );
}
