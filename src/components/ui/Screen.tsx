import { useRef, type PropsWithChildren, type RefObject } from "react";
import { useScrollToTop } from "expo-router";
import { ScrollView, View, type NativeScrollEvent, type NativeSyntheticEvent, type StyleProp, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme/ThemeProvider";
import { Txt } from "./Text";
import { Icon } from "./Icon";
import { Pressable } from "react-native";
import { useRunningSession } from "@/store/workout";
import { dismissesKeyboard } from "@/keyboard";
import { GestureDetector } from "react-native-gesture-handler";
import { useHoldToRefresh } from "../HoldToRefresh";
import type { IconName } from "./Icon";

/**
 * Screen scaffold. Ground colour, safe-area top, 20 pt inset.
 * Sections are 24 pt apart; content inside a section is 12 pt apart (use <Section>).
 * `tabs` adds clearance for the floating tab bar; `footer` pins an action area.
 */
export function Screen({ children, tabs, bottom = 0, scroll = true, footer, style, contentStyle, scrollRef, onScroll }: PropsWithChildren<{ tabs?: boolean; bottom?: number; scroll?: boolean; footer?: React.ReactNode; style?: StyleProp<ViewStyle>; contentStyle?: StyleProp<ViewStyle>; /** The list itself, for a screen that has to scroll it. */ scrollRef?: RefObject<ScrollView | null>; onScroll?: (e: NativeSyntheticEvent<NativeScrollEvent>) => void }>) {
  const { colors, layout } = useTheme();
  const insets = useSafeAreaInsets();
  const running = useRunningSession();
  const paddingBottom = (tabs ? layout.tabBarClearance + (running ? 56 : 0) : 40) + bottom;
  const content: ViewStyle = { paddingTop: insets.top + 12, paddingHorizontal: layout.screenInset, paddingBottom, gap: layout.sectionGap };
  const own = useRef<ScrollView>(null);
  const scroller = scrollRef ?? own;
  const pull = useHoldToRefresh(!!tabs && scroll);
  const list = scroll ? (
    <ScrollView ref={scroller} contentContainerStyle={[content, contentStyle]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" onScroll={(e) => { pull.onScroll(e); onScroll?.(e); }} scrollEventThrottle={16}>
      {tabs ? <BackToTopOnTabPress target={scroller} /> : null}
      {children}
    </ScrollView>
  ) : (
    <View style={[{ flex: 1 }, content, contentStyle]}>{children}</View>
  );
  return (
    <View {...dismissesKeyboard} style={[{ flex: 1, backgroundColor: colors.bg.ground }, style]}>
      {/* Only a tab screen takes the pull. A stacked screen keeps its list bare, so the swipe back from the edge stays the navigator's. */}
      {tabs && scroll ? <GestureDetector gesture={pull.gesture} touchAction="pan-y">{list}</GestureDetector> : list}
      {pull.bar}
      {footer ? (
        <View pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: layout.screenInset, paddingTop: 16, paddingBottom: Math.max(insets.bottom, 16) + 8, gap: 12, backgroundColor: colors.bg.ground }}>
          {footer}
        </View>
      ) : null}
    </View>
  );
}

/**
 * Pressing the tab you are already on scrolls its screen back to the top, the
 * way every phone does it. Only a tab screen mounts this, so a stacked screen
 * never listens for a press that cannot come.
 */
function BackToTopOnTabPress({ target }: { target: RefObject<ScrollView | null> }) {
  useScrollToTop(target);
  return null;
}

export function Row({ children, gap = 12, align = "center", justify, style }: PropsWithChildren<{ gap?: number; align?: ViewStyle["alignItems"]; justify?: ViewStyle["justifyContent"]; style?: StyleProp<ViewStyle> }>) {
  return <View style={[{ flexDirection: "row", alignItems: align, justifyContent: justify, gap }, style]}>{children}</View>;
}

/** A titled section: title row (with optional action) and 12 pt to its content. */
export function Section({ title, action, actionIcon, onAction, meta, children, gap = 12 }: PropsWithChildren<{ title?: string; action?: string; actionIcon?: IconName; onAction?: () => void; /** Quiet text on the right, before the action if there is one: a date, a total. */ meta?: string; gap?: number }>) {
  const { colors } = useTheme();
  return (
    <View style={{ gap }}>
      {title ? (
        <Row justify="space-between">
          <Txt variant="displayS">{title}</Txt>
          <Row gap={12}>
            {meta ? (
              <Txt variant="labelS" tone="tertiary">
                {meta}
              </Txt>
            ) : null}
            {action ? (
              <Pressable accessibilityRole="button" onPress={onAction} hitSlop={8} style={{ flexDirection: "row", alignItems: "center", gap: actionIcon ? 5 : 2 }}>
                {actionIcon ? <Icon name={actionIcon} size={15} color={colors.text.secondary} strokeWidth={2.2} /> : null}
                <Txt variant="labelM" tone="secondary">
                  {action}
                </Txt>
                {actionIcon ? null : <Icon name="chevronRight" size={14} color={colors.text.secondary} strokeWidth={2} />}
              </Pressable>
            ) : null}
          </Row>
        </Row>
      ) : null}
      {children}
    </View>
  );
}

/** Screen header: back or close on the left, centred title, optional right slot. */
export function Header({ left, title, subtitle, right }: { left?: React.ReactNode; title?: string; subtitle?: string; right?: React.ReactNode }) {
  return (
    <Row gap={12}>
      <View style={{ minWidth: 44 }}>{left}</View>
      <View style={{ flex: 1, alignItems: "center", gap: 2 }}>
        {title ? <Txt variant="displayS">{title}</Txt> : null}
        {subtitle ? (
          <Txt variant="labelS" tone="tertiary">
            {subtitle}
          </Txt>
        ) : null}
      </View>
      <View style={{ minWidth: 44, alignItems: "flex-end" }}>{right}</View>
    </Row>
  );
}
