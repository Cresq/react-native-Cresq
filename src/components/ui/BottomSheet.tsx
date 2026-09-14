import { useEffect, useState, type PropsWithChildren } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme/ThemeProvider";
import { useT } from "@/i18n";
import { project, rubberband, spring, springs } from "@/motion";
import { Txt } from "./Text";
import { Icon, type IconName } from "./Icon";
import { Button } from "./Button";
import { Press } from "./Press";

/**
 * A sheet that behaves like a thing, not a transition. It springs up from the
 * bottom, follows the finger 1:1 when dragged, resists going higher than it
 * is, and on release continues at the finger's speed: past the point of no
 * return it leaves, otherwise it settles back. Tapping the scrim closes it
 * along the same path it arrived on.
 */
export function BottomSheet({ visible, onClose, title, subtitle, children }: PropsWithChildren<{ visible: boolean; onClose: () => void; title: string; subtitle?: string }>) {
  const { colors, radius } = useTheme();
  const t = useT();
  const insets = useSafeAreaInsets();
  const { height: screenH } = useWindowDimensions();
  const [mounted, setMounted] = useState(visible);
  const y = useSharedValue(screenH);
  const sheetH = useSharedValue(400);
  const dragStart = useSharedValue(0);

  const settle = () => {
    "worklet";
    y.value = withSpring(0, springs.base);
  };
  const leave = (velocity = 0) => {
    "worklet";
    y.value = withSpring(sheetH.value + 40, spring(0.3, 1, velocity), (done) => {
      if (done) runOnJS(setMounted)(false);
    });
  };

  useEffect(() => {
    if (visible) {
      setMounted(true);
      y.value = sheetH.value + 40;
      requestAnimationFrame(() => {
        y.value = withSpring(0, springs.base);
      });
    } else if (mounted) {
      leave();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const pan = Gesture.Pan()
    .onStart(() => {
      dragStart.value = y.value;
    })
    .onUpdate((e) => {
      const raw = dragStart.value + e.translationY;
      y.value = raw >= 0 ? raw : rubberband(raw, sheetH.value, 0.4);
    })
    .onEnd((e) => {
      const projected = y.value + project(e.velocityY);
      if (projected > sheetH.value * 0.45 || e.velocityY > 900) {
        runOnJS(onClose)();
        leave(e.velocityY);
      } else settle();
    });

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  const scrimStyle = useAnimatedStyle(() => ({ opacity: 1 - Math.min(1, Math.max(0, y.value / Math.max(1, sheetH.value))) }));

  if (!mounted) return null;
  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <GestureHandlerRootView style={{ flex: 1, justifyContent: "flex-end" }}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.55)" }, scrimStyle]}>
          <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="Close" accessibilityRole="button" />
        </Animated.View>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} pointerEvents="box-none">
        <GestureDetector gesture={pan}>
          <Animated.View
            onLayout={(e) => {
              sheetH.value = e.nativeEvent.layout.height;
            }}
            style={[styles.sheet, { backgroundColor: colors.bg.surface, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, paddingBottom: Math.max(insets.bottom, 16) + 16 }, sheetStyle]}
          >
            <View style={[styles.handle, { backgroundColor: colors.border.strong }]} />
            <View style={{ gap: 2, paddingHorizontal: 8, paddingTop: 14, paddingBottom: 6 }}>
              <Txt variant="displayM">{title}</Txt>
              {subtitle ? (
                <Txt variant="bodyS" tone="tertiary">
                  {subtitle}
                </Txt>
              ) : null}
            </View>
            <View>{children}</View>
            <Button label={t("Cancel")} variant="tertiary" size="M" onPress={onClose} style={{ marginTop: 8 }} />
          </Animated.View>
        </GestureDetector>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  );
}

/** One option row. Rows share the sheet surface and are separated by spacing, not boxes. */
export function SheetOption({ icon, label, sub, onPress, danger, selected }: { icon: IconName; label: string; sub?: string; onPress: () => void; danger?: boolean; selected?: boolean }) {
  const { colors, radius } = useTheme();
  const fg = danger ? colors.status.danger : colors.text.primary;
  return (
    <Press
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      scaleTo={0.985}
      style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 12, paddingHorizontal: 8, borderRadius: radius.button, backgroundColor: pressed ? colors.bg.raised : "transparent" })}
    >
      <View style={{ width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: selected ? colors.accent.soft : colors.bg.raised }}>
        <Icon name={icon} size={18} color={danger ? colors.status.danger : selected ? colors.accent.ember : colors.icon.strong} strokeWidth={1.9} />
      </View>
      <View style={{ flex: 1, gap: 1 }}>
        <Txt variant="labelL" style={{ color: fg }}>
          {label}
        </Txt>
        {sub ? (
          <Txt variant="bodyS" tone="tertiary">
            {sub}
          </Txt>
        ) : null}
      </View>
      {selected ? <Icon name="check" size={18} color={colors.accent.ember} strokeWidth={2.4} /> : null}
    </Press>
  );
}

const styles = StyleSheet.create({
  sheet: { paddingTop: 10, paddingHorizontal: 12 },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center" },
});
