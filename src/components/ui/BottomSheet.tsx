import { useEffect, useRef, useState, type PropsWithChildren } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, TextInput, View, useWindowDimensions, type TextInputProps } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedReaction, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme/ThemeProvider";
import { useT } from "@/i18n";
import { gesture, project, rubberband, spring, springs } from "@/motion";
import { useOnce } from "@/nav";
import { dismissesKeyboard } from "@/keyboard";
import { fontFamily } from "../../../constants/theme";
import { Txt } from "./Text";
import { Icon, type IconName } from "./Icon";
import { IconButton } from "./IconButton";
import { Press } from "./Press";

/** What the tick in a sheet's header does, when the sheet has one thing to confirm. */
export type SheetConfirm = { label: string; onPress: () => void; disabled?: boolean; accent?: "ember" | "sage" };

/** How far below the sheet its own colour continues, so lifting it never shows what is behind. */
const TAIL = 400;

/**
 * A sheet that behaves like a thing, not a transition. It springs up from the
 * bottom, follows the finger 1:1 when dragged, resists going higher than it
 * is, and on release continues at the finger's speed: past the point of no
 * return it leaves, otherwise it settles back. Tapping the scrim closes it
 * along the same path it arrived on.
 *
 * Going higher is a courtesy, not a direction: however far the finger goes,
 * the sheet gives no more than a small share of its own height, and its colour
 * carries on underneath so the lift never opens a gap.
 *
 * The chrome is a header and nothing else: close on the left, the title in
 * the middle, and on the right a tick when the sheet has one thing to confirm.
 * There is no Cancel at the bottom; the cross, the scrim, a swipe and the back
 * button all close it.
 */
export function BottomSheet({ visible, onClose, onClosed, title, subtitle, confirm, children }: PropsWithChildren<{ visible: boolean; onClose: () => void; /** Fired once the sheet is off the screen. Anything that must not happen over a closing modal waits for this. */ onClosed?: () => void; title: string; subtitle?: string; confirm?: SheetConfirm }>) {
  const { colors, radius } = useTheme();
  const t = useT();
  const insets = useSafeAreaInsets();
  const { height: screenH } = useWindowDimensions();
  const [mounted, setMounted] = useState(visible);
  const y = useSharedValue(screenH);
  const sheetH = useSharedValue(400);
  const dragStart = useSharedValue(0);
  const closing = useSharedValue(false);

  // Off the bottom of the screen is gone, whatever the spring is still doing
  // with its last fraction of a pixel.
  useAnimatedReaction(
    () => closing.value && y.value >= sheetH.value,
    (offScreen, before) => {
      if (offScreen && !before) {
        closing.value = false;
        runOnJS(setMounted)(false);
      }
    },
  );

  // Said once, on the way from mounted to gone. Anything that must not happen
  // over a closing modal waits for this rather than for a guessed number of ms.
  const was = useRef(mounted);
  useEffect(() => {
    if (was.current && !mounted) onClosed?.();
    was.current = mounted;
  }, [mounted, onClosed]);

  const settle = () => {
    "worklet";
    y.value = withSpring(0, springs.base);
  };
  const leave = (velocity = 0) => {
    "worklet";
    closing.value = true;
    y.value = withSpring(sheetH.value + 40, spring(0.3, 1, velocity));
  };

  useEffect(() => {
    if (visible) {
      setMounted(true);
      closing.value = false;
      y.value = sheetH.value + 40;
      requestAnimationFrame(() => {
        y.value = withSpring(0, springs.base);
      });
    } else if (mounted) {
      leave();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const lift = gesture.sheetLift;
  const pan = Gesture.Pan()
    .onStart(() => {
      dragStart.value = y.value;
    })
    .onUpdate((e) => {
      const raw = dragStart.value + e.translationY;
      // Upwards the resistance is measured against a share of the sheet, so that share is the most it can ever rise.
      y.value = raw >= 0 ? raw : rubberband(raw, sheetH.value * lift, 0.55);
    })
    .onEnd((e) => {
      const projected = y.value + project(e.velocityY);
      if (projected > sheetH.value * gesture.sheetClose || e.velocityY > gesture.flick) {
        runOnJS(onClose)();
        leave(e.velocityY);
      } else settle();
    });

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  const scrimStyle = useAnimatedStyle(() => ({ opacity: 1 - Math.min(1, Math.max(0, y.value / Math.max(1, sheetH.value))) }));

  if (!mounted) return null;
  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <GestureHandlerRootView {...dismissesKeyboard} style={{ flex: 1, justifyContent: "flex-end" }}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.55)" }, scrimStyle]}>
          <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel={t("Close")} accessibilityRole="button" />
        </Animated.View>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} pointerEvents="box-none">
        <GestureDetector gesture={pan}>
          <Animated.View
            onLayout={(e) => {
              sheetH.value = e.nativeEvent.layout.height;
            }}
            pointerEvents={visible ? "auto" : "none"}
            style={[styles.sheet, { backgroundColor: colors.bg.surface, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, paddingBottom: Math.max(insets.bottom, 16) + 8 }, sheetStyle]}
          >
            <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: "100%", height: TAIL, backgroundColor: colors.bg.surface }} />
            <View style={[styles.handle, { backgroundColor: colors.border.strong }]} />
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingTop: 12, paddingBottom: subtitle ? 6 : 12 }}>
              <IconButton name="close" size={36} iconSize={16} tone="raised" onPress={onClose} accessibilityLabel={t("Close")} />
              <Txt variant="displayS" align="center" numberOfLines={1} style={{ flex: 1 }}>
                {title}
              </Txt>
              {confirm ? <IconButton name="check" size={36} iconSize={18} tone={confirm.accent === "sage" ? "sageSolid" : "ember"} disabled={confirm.disabled} onPress={confirm.onPress} accessibilityLabel={confirm.label} /> : <View style={{ width: 36 }} />}
            </View>
            {subtitle ? (
              <Txt variant="bodyS" tone="tertiary" style={{ paddingHorizontal: 4, paddingBottom: 12 }}>
                {subtitle}
              </Txt>
            ) : null}
            <View>{children}</View>
          </Animated.View>
        </GestureDetector>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  );
}

/**
 * One thing a sheet offers: a quiet row of its own, the way a phone's own
 * settings draw them. A small icon, the words, a line under them when there
 * is something to explain, and a tick when it is the chosen one.
 */
export function SheetOption({ icon, label, sub, onPress, danger, selected }: { icon: IconName; label: string; sub?: string; onPress: () => void; danger?: boolean; selected?: boolean }) {
  const { colors, radius } = useTheme();
  const once = useOnce();
  const fg = danger ? colors.status.danger : colors.text.primary;
  return (
    <Press
      onPress={once(onPress)}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      scaleTo={0.985}
      wrapperStyle={{ marginBottom: 6 }}
      style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 50, paddingVertical: 10, paddingHorizontal: 16, borderRadius: radius.button, backgroundColor: pressed ? colors.border.strong : colors.bg.raised })}
    >
      <Icon name={icon} size={18} color={danger ? colors.status.danger : selected ? colors.accent.ember : colors.icon.default} strokeWidth={1.9} />
      <View style={{ flex: 1, gap: 1 }}>
        <Txt variant="labelL" style={{ color: fg }}>
          {label}
        </Txt>
        {sub ? (
          <Txt variant="labelS" tone="tertiary">
            {sub}
          </Txt>
        ) : null}
      </View>
      {selected ? <Icon name="check" size={18} color={colors.accent.ember} strokeWidth={2.4} /> : null}
    </Press>
  );
}

/** Rows that belong together, drawn as one rounded block with hairlines between them, and an optional line of explanation underneath. */
export function SheetGroup({ caption, children }: PropsWithChildren<{ caption?: string }>) {
  const { colors, radius } = useTheme();
  return (
    <View style={{ gap: 6, marginBottom: 10 }}>
      <View style={{ borderRadius: radius.button, backgroundColor: colors.bg.raised, overflow: "hidden" }}>{children}</View>
      {caption ? (
        <Txt variant="labelS" tone="tertiary" style={{ paddingHorizontal: 16 }}>
          {caption}
        </Txt>
      ) : null}
    </View>
  );
}

/** A figure typed inside a group: what it is on the left, the number and its unit on the right, a hairline under every row but the last. */
export function SheetInputRow({ label, unit, dot, last, ...input }: TextInputProps & { label: string; unit?: string; /** A small mark in a series colour, when the row belongs to one. */ dot?: string; last?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 50, paddingHorizontal: 16, borderBottomWidth: last ? 0 : 1, borderBottomColor: colors.border.subtle }}>
      {dot ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dot }} /> : null}
      <Txt variant="bodyM" style={{ flex: 1 }}>
        {label}
      </Txt>
      <TextInput
        accessibilityLabel={unit ? `${label} (${unit})` : label}
        placeholderTextColor={colors.text.tertiary}
        selectionColor={colors.accent.ember}
        selectTextOnFocus
        {...input}
        style={{ minWidth: 72, height: 44, textAlign: "right", color: colors.text.primary, fontFamily: fontFamily.semibold, fontSize: 16, paddingVertical: 0 }}
      />
      {unit ? (
        <Txt variant="bodyM" tone="secondary" style={{ minWidth: 30 }}>
          {unit}
        </Txt>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { paddingTop: 10, paddingHorizontal: 12 },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center" },
});
