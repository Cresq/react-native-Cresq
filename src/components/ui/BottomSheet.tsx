import { createContext, useContext, useEffect, useRef, useState, type PropsWithChildren, type ReactNode } from "react";
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
 * The air in a sheet. Blocks that belong to different things stand this far
 * apart, so the eye reads them as separate at a glance; rows that are each
 * their own choice stand half of it apart. Tighter than this and a sheet
 * reads as one slab.
 */
const SHEET_GAP = 20;
const OPTION_GAP = 10;
/** A row is as tall as a thumb needs, whatever is in it. */
const ROW_HEIGHT = 52;

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
type SheetProps = PropsWithChildren<{ visible: boolean; onClose: () => void; /** Fired once the sheet is off the screen. Anything that must not happen over a closing modal waits for this. */ onClosed?: () => void; title: string; subtitle?: string; confirm?: SheetConfirm }>;

export function BottomSheet(props: SheetProps) {
  const { visible, onClosed } = props;
  // A screen holds many sheets and shows one at most. One that is not showing
  // is this state and this effect and nothing else: the shared values, the
  // gesture and the animated styles belong to the body, which exists from the
  // moment the sheet is asked for until it has left the screen.
  const [alive, setAlive] = useState(visible);

  // Said once, on the way from there to gone, after the modal has left the
  // tree. Anything that must not happen over a closing modal waits for this
  // rather than for a guessed number of ms.
  const was = useRef(alive);
  useEffect(() => {
    if (was.current && !alive) onClosed?.();
    was.current = alive;
  }, [alive, onClosed]);

  if (!visible && !alive) return null;
  return <SheetBody {...props} onAlive={setAlive} />;
}

function SheetBody({ visible, onClose, onAlive, title, subtitle, confirm, children }: SheetProps & { onAlive: (alive: boolean) => void }) {
  const { colors, radius } = useTheme();
  const t = useT();
  const insets = useSafeAreaInsets();
  const { height: screenH } = useWindowDimensions();
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
        runOnJS(onAlive)(false);
      }
    },
  );

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
      onAlive(true);
      closing.value = false;
      y.value = sheetH.value + 40;
      requestAnimationFrame(() => {
        y.value = withSpring(0, springs.base);
      });
    } else {
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
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingTop: 12, paddingBottom: subtitle ? 8 : SHEET_GAP }}>
              <IconButton name="close" size={36} iconSize={16} tone="raised" onPress={onClose} accessibilityLabel={t("Close")} />
              <Txt variant="displayS" align="center" numberOfLines={1} style={{ flex: 1 }}>
                {title}
              </Txt>
              {confirm ? <IconButton name="check" size={36} iconSize={18} tone={confirm.accent === "sage" ? "sageSolid" : "ember"} disabled={confirm.disabled} onPress={confirm.onPress} accessibilityLabel={confirm.label} /> : <View style={{ width: 36 }} />}
            </View>
            {subtitle ? (
              <Txt variant="bodyS" tone="tertiary" style={{ paddingHorizontal: 4, paddingBottom: SHEET_GAP }}>
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

/** Whether a row is drawn inside a group, where it joins its neighbours instead of standing alone. */
const InGroup = createContext(false);

/** The hairline between joined rows. Every row draws one above itself and sits a point higher, so the first row's line falls outside the group's rounded clip and no row needs to know where it stands. */
const useJoin = () => {
  const { colors } = useTheme();
  return { borderTopWidth: 1, borderTopColor: colors.border.subtle, marginTop: -1 } as const;
};

/**
 * One row of a sheet, the way a phone's own settings draw them: a small icon
 * or a face, the words, a line under them when there is something to explain,
 * and at the right edge a tick when it is the chosen one, a circle when
 * several can be chosen, or whatever the caller puts there.
 *
 * Inside a `SheetGroup` it joins the rows around it with a hairline. On its
 * own it is a rounded row that stands apart from the next. Without `onPress`
 * it only shows.
 */
export function SheetOption({ icon, leading, label, sub, right, onPress, danger, selected, check, disabled, accessibilityLabel }: { icon?: IconName; /** A face or a mark in place of the icon. */ leading?: ReactNode; label: string; sub?: string; right?: ReactNode; onPress?: () => void; danger?: boolean; /** The one that is chosen: a tick. */ selected?: boolean; /** One of several that can be chosen: a circle, filled when it is. */ check?: boolean; disabled?: boolean; accessibilityLabel?: string }) {
  const { colors, radius } = useTheme();
  const once = useOnce();
  const joined = useContext(InGroup);
  const join = useJoin();
  const fg = danger ? colors.status.danger : colors.text.primary;
  const on = !!selected || !!check;
  const shape = joined ? join : { borderRadius: radius.button };
  const face = (
    <>
      {leading ?? (icon ? <Icon name={icon} size={18} color={danger ? colors.status.danger : selected ? colors.accent.ember : colors.icon.default} strokeWidth={1.9} /> : null)}
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
      {right}
      {check !== undefined ? (
        <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: check ? colors.accent.ember : colors.border.strong, backgroundColor: check ? colors.accent.ember : "transparent", alignItems: "center", justifyContent: "center" }}>
          {check ? <Icon name="check" size={13} color={colors.accent.on} strokeWidth={2.8} /> : null}
        </View>
      ) : selected ? (
        <Icon name="check" size={18} color={colors.accent.ember} strokeWidth={2.4} />
      ) : null}
    </>
  );
  const row = { flexDirection: "row", alignItems: "center", gap: 12, minHeight: ROW_HEIGHT, paddingVertical: 10, paddingHorizontal: 16 } as const;
  if (!onPress) return <View style={[row, shape, joined ? null : { backgroundColor: colors.bg.raised, marginBottom: OPTION_GAP }]}>{face}</View>;
  return (
    <Press
      onPress={once(onPress)}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: on, disabled: !!disabled }}
      scaleTo={joined ? 1 : 0.985}
      wrapperStyle={joined ? undefined : { marginBottom: OPTION_GAP }}
      style={({ pressed }) => [row, shape, { opacity: disabled ? 0.4 : 1, backgroundColor: pressed ? colors.border.strong : joined ? "transparent" : colors.bg.raised }]}
    >
      {face}
    </Press>
  );
}

/** Rows that belong together, drawn as one rounded block with hairlines between them. A line above it names the block when the rows do not; a line underneath explains it. */
export function SheetGroup({ title, caption, children }: PropsWithChildren<{ title?: string; caption?: string }>) {
  const { colors, radius } = useTheme();
  return (
    <View style={{ gap: 8, marginBottom: SHEET_GAP }}>
      {title ? (
        <Txt variant="labelS" tone="tertiary" style={{ paddingHorizontal: 16 }}>
          {title}
        </Txt>
      ) : null}
      <View style={{ borderRadius: radius.button, backgroundColor: colors.bg.raised, overflow: "hidden" }}>
        <InGroup.Provider value={true}>{children}</InGroup.Provider>
      </View>
      {caption ? (
        <Txt variant="labelS" tone="tertiary" style={{ paddingHorizontal: 16 }}>
          {caption}
        </Txt>
      ) : null}
    </View>
  );
}

/** A figure typed inside a group: what it is on the left, the number and its unit on the right. */
export function SheetInputRow({ label, unit, dot, ...input }: TextInputProps & { label: string; unit?: string; /** A small mark in a series colour, when the row belongs to one. */ dot?: string }) {
  const { colors } = useTheme();
  const join = useJoin();
  return (
    <View style={[{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: ROW_HEIGHT, paddingHorizontal: 16 }, join]}>
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
        // A width of its own: left to size itself, a browser's input takes the room of twenty characters and squeezes the unit beside it.
        style={{ width: 88, height: 44, textAlign: "right", color: colors.text.primary, fontFamily: fontFamily.semibold, fontSize: 16, paddingVertical: 0 }}
      />
      {/* One width for every unit, so the figures of a sheet end on the same line whether they are in kcal or in g. */}
      {unit ? (
        <Txt variant="bodyM" tone="secondary" style={{ width: 36, flexShrink: 0 }}>
          {unit}
        </Txt>
      ) : null}
    </View>
  );
}

/** Words typed inside a group. With a label it reads as a settings row, the name on the left and the text after it; without one the placeholder says what goes there. */
export function SheetTextRow({ label, multiline, ...input }: TextInputProps & { label?: string }) {
  const { colors } = useTheme();
  const join = useJoin();
  return (
    <View style={[{ flexDirection: "row", alignItems: multiline ? "flex-start" : "center", gap: 12, minHeight: ROW_HEIGHT, paddingHorizontal: 16 }, join]}>
      {label ? (
        <Txt variant="bodyM" style={{ width: 96, paddingTop: multiline ? 14 : 0 }} numberOfLines={1}>
          {label}
        </Txt>
      ) : null}
      <TextInput
        accessibilityLabel={label ?? input.placeholder}
        placeholderTextColor={colors.text.tertiary}
        selectionColor={colors.accent.ember}
        multiline={multiline}
        {...input}
        // minWidth: a browser's input brings a width of its own and would push the row out of the sheet.
        style={{ flex: 1, minWidth: 0, minHeight: multiline ? 84 : 44, maxHeight: multiline ? 140 : undefined, paddingVertical: multiline ? 14 : 0, textAlignVertical: multiline ? "top" : "center", color: colors.text.primary, fontFamily: fontFamily.regular, fontSize: 16 }}
      />
    </View>
  );
}

/** Words that explain, inside a group: what it is about in a heavier line, and what there is to say about it. */
export function SheetNote({ title, children }: PropsWithChildren<{ title?: string }>) {
  const join = useJoin();
  return (
    <View style={[{ gap: 4, paddingVertical: 14, paddingHorizontal: 16 }, join]}>
      {title ? <Txt variant="labelL">{title}</Txt> : null}
      <Txt variant="bodyS" tone="secondary">
        {children}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { paddingTop: 10, paddingHorizontal: 12 },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center" },
});
