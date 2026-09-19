import type { PropsWithChildren } from "react";
import type { LayoutChangeEvent, StyleProp, ViewStyle } from "react-native";
import Animated from "react-native-reanimated";
import { layouts } from "@/motion";

/**
 * A row, or a card, in a list that changes. It fades in where it belongs,
 * fades out where it was, and whenever anything around it is added, removed,
 * folded or moved it travels to its new place instead of jumping there.
 *
 * Wrap the list in Reanimated's `<LayoutAnimationConfig skipEntering
 * skipExiting>` so that what is there when the list first appears, or still
 * there when it goes, does not animate: only changes do.
 */
export function AnimatedListItem({ children, style, onLayout, still }: PropsWithChildren<{ style?: StyleProp<ViewStyle>; onLayout?: (e: LayoutChangeEvent) => void; /** Makes room for others but does not fade itself. */ still?: boolean }>) {
  return (
    <Animated.View layout={layouts.reflow} entering={still ? undefined : layouts.enter} exiting={still ? undefined : layouts.exit} onLayout={onLayout} style={style}>
      {children}
    </Animated.View>
  );
}
