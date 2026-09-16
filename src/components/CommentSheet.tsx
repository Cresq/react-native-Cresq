import { useEffect, useMemo, useRef, useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, TextInput, View, useWindowDimensions, type ImageSourcePropType } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { project, rubberband, spring, springs } from "@/motion";
import { useTheme } from "@/theme/ThemeProvider";
import { useT, usePlural } from "@/i18n";
import { haptic } from "@/haptics";
import { dismissesKeyboard, keepKeyboard } from "@/keyboard";
import { fontFamily } from "../../constants/theme";
import { Txt } from "./ui/Text";
import { Icon } from "./ui/Icon";
import { IconButton } from "./ui/IconButton";
import { Avatar } from "./ui/PhotoSlot";

export type Comment = {
  /** Stable within one post, so an answer can point at what it answers. */
  id: string;
  name: string;
  text: string;
  avatar?: ImageSourcePropType;
  /** When it was written. Seeded comments have no stamp and simply say nothing. */
  at?: number;
  /** The comment this one answers, if it answers one. */
  replyTo?: string;
};

const shortAgo = (at: number, t: (s: string, v?: Record<string, string | number>) => string) => {
  const mins = Math.max(0, Math.round((Date.now() - at) / 60000));
  if (mins < 1) return t("now");
  if (mins < 60) return t("{n}m", { n: mins });
  const hours = Math.round(mins / 60);
  if (hours < 24) return t("{n}h", { n: hours });
  return t("{n}d", { n: Math.round(hours / 24) });
};

/**
 * Comments, the way every app that does this well does it: the name is a small
 * label on its own line and the words sit under it, with no chat bubble. A
 * bubble says "two people talking"; a comment list is many people talking past
 * each other, and boxing each one makes the column unreadable.
 *
 * Answers are indented under what they answer, one level and no deeper. Two
 * levels is a forum, and nobody reads a forum on a phone.
 */
export function CommentSheet({
  visible,
  onClose,
  title,
  comments,
  me,
  onSend,
  onOpenProfile,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  comments: Comment[];
  me: { initial: string; photo?: ImageSourcePropType };
  onSend: (text: string, replyTo?: string) => void;
  onOpenProfile: (comment: Comment) => void;
}) {
  const { colors, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: screenH } = useWindowDimensions();
  const t = useT();
  const plural = usePlural();
  const [draft, setDraft] = useState("");
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const list = useRef<ScrollView>(null);
  const input = useRef<TextInput>(null);
  const sheetH = Math.round(screenH * 0.78);

  /** Top-level comments, each carrying the answers that point at it. */
  const threads = useMemo(
    () => comments.filter((c) => !c.replyTo).map((c) => ({ comment: c, replies: comments.filter((r) => r.replyTo === c.id) })),
    [comments],
  );

  const y = useSharedValue(sheetH);
  const dragStart = useSharedValue(0);
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      y.value = sheetH;
      requestAnimationFrame(() => {
        y.value = withSpring(0, springs.base);
      });
    } else if (mounted) {
      y.value = withTiming(sheetH, { duration: 180 }, (done) => {
        if (done) runOnJS(setMounted)(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  useEffect(() => {
    if (!visible) {
      setDraft("");
      setLiked({});
      setReplyTo(null);
    }
  }, [visible]);

  const drag = Gesture.Pan()
    .onStart(() => {
      dragStart.value = y.value;
    })
    .onUpdate((e) => {
      const raw = dragStart.value + e.translationY;
      y.value = raw < 0 ? rubberband(raw, sheetH, 0.3) : raw;
    })
    .onEnd((e) => {
      const projected = y.value + project(e.velocityY);
      if (projected > sheetH * 0.3) {
        y.value = withSpring(sheetH + 40, spring(0.3, 1, e.velocityY), (done) => {
          if (done) runOnJS(onClose)();
        });
      } else {
        y.value = withSpring(0, springs.base);
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  const scrimStyle = useAnimatedStyle(() => ({ opacity: 1 - Math.min(1, Math.max(0, y.value / sheetH)) }));

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    onSend(text, replyTo?.id);
    setDraft("");
    setReplyTo(null);
    haptic("tap");
    requestAnimationFrame(() => list.current?.scrollToEnd({ animated: true }));
  };

  /** One comment. An answer is the same shape a size down and a step to the right. */
  const line = (c: Comment, isReply: boolean) => (
    <View key={c.id} style={{ flexDirection: "row", alignItems: "flex-start", gap: 10, paddingLeft: isReply ? 46 : 0 }}>
      <Pressable accessibilityRole="button" accessibilityLabel={t("Open {name}", { name: c.name })} onPress={() => onOpenProfile(c)} hitSlop={4} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
        <Avatar source={c.avatar} size={isReply ? 28 : 36} initial={c.name[0]} />
      </Pressable>

      <View style={{ flex: 1, gap: 2 }}>
        {/* The name sits above what was said, not in front of it. */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Pressable accessibilityRole="button" accessibilityLabel={t("Open {name}", { name: c.name })} onPress={() => onOpenProfile(c)} hitSlop={4} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
            <Txt variant="labelS" tone="secondary">
              {c.name}
            </Txt>
          </Pressable>
          {c.at ? (
            <Txt variant="labelS" tone="tertiary">
              {shortAgo(c.at, t)}
            </Txt>
          ) : null}
        </View>

        <Txt variant="bodyM">{c.text}</Txt>

        <Pressable accessibilityRole="button" accessibilityLabel={t("Reply to {name}", { name: c.name })} onPress={() => { keepKeyboard(); setReplyTo(c); input.current?.focus(); }} hitSlop={6} style={({ pressed }) => ({ alignSelf: "flex-start", paddingTop: 2, opacity: pressed ? 0.6 : 1 })}>
          <Txt variant="labelS" tone="tertiary">
            {t("Reply")}
          </Txt>
        </Pressable>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: !!liked[c.id] }}
        accessibilityLabel={t("Like this comment")}
        hitSlop={8}
        onPress={() => { haptic("tap"); setLiked((l) => ({ ...l, [c.id]: !l[c.id] })); }}
        style={({ pressed }) => ({ paddingTop: 3, opacity: pressed ? 0.6 : 1 })}
      >
        <Icon name="heart" size={15} color={liked[c.id] ? colors.status.danger : colors.text.tertiary} fill={liked[c.id] ? colors.status.danger : undefined} strokeWidth={1.9} />
      </Pressable>
    </View>
  );

  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <GestureHandlerRootView {...dismissesKeyboard} style={{ flex: 1, justifyContent: "flex-end" }}>
        <Animated.View style={[{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.55)" }, scrimStyle]}>
          <Pressable accessibilityRole="button" accessibilityLabel={t("Close")} onPress={onClose} style={{ flex: 1 }} />
        </Animated.View>

        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} pointerEvents="box-none">
          <Animated.View pointerEvents={visible ? "auto" : "none"} style={[{ height: sheetH, backgroundColor: colors.bg.surface, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, overflow: "hidden" }, sheetStyle]}>
            {/* The grab area is the top of the sheet, so dragging never fights the list. */}
            <GestureDetector gesture={drag}>
              <View>
                <View style={{ width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginTop: 10, backgroundColor: colors.border.strong }} />
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12 }}>
                  <View style={{ flex: 1, gap: 1 }}>
                    <Txt variant="displayM">{plural(comments.length, "{n} comment", "{n} comments")}</Txt>
                    {title ? (
                      <Txt variant="bodyS" tone="tertiary" numberOfLines={1}>
                        {title}
                      </Txt>
                    ) : null}
                  </View>
                  <IconButton name="close" onPress={onClose} accessibilityLabel={t("Close")} />
                </View>
              </View>
            </GestureDetector>

            <View style={{ height: 1, backgroundColor: colors.border.subtle }} />

            <ScrollView ref={list} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20, gap: 18 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
              {threads.length === 0 ? (
                <View style={{ alignItems: "center", gap: 6, paddingTop: 40 }}>
                  <Txt variant="labelL">{t("No comments yet")}</Txt>
                  <Txt variant="bodyS" tone="tertiary">
                    {t("Be the first to say something.")}
                  </Txt>
                </View>
              ) : null}

              {threads.map(({ comment, replies }) => (
                <View key={comment.id} style={{ gap: 14 }}>
                  {line(comment, false)}
                  {replies.map((r) => line(r, true))}
                </View>
              ))}
            </ScrollView>

            <View style={{ height: 1, backgroundColor: colors.border.subtle }} />

            {replyTo ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 2 }}>
                <Icon name="chatCircle" size={13} color={colors.text.tertiary} strokeWidth={1.9} />
                <Txt variant="labelS" tone="tertiary" style={{ flex: 1 }} numberOfLines={1}>
                  {t("Replying to {name}", { name: replyTo.name })}
                </Txt>
                <Pressable accessibilityRole="button" accessibilityLabel={t("Cancel reply")} hitSlop={8} onPress={() => setReplyTo(null)} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
                  <Icon name="close" size={14} color={colors.text.tertiary} strokeWidth={2.2} />
                </Pressable>
              </View>
            ) : null}

            <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 10, paddingHorizontal: 20, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 12) }}>
              <Avatar source={me.photo} size={32} initial={me.initial} />
              <View style={{ flex: 1, minHeight: 40, justifyContent: "center", borderRadius: radius.pill, paddingHorizontal: 16, paddingVertical: 9, backgroundColor: colors.bg.raised }}>
                <TextInput
                  ref={input}
                  value={draft}
                  onChangeText={setDraft}
                  placeholder={replyTo ? t("Reply to {name}", { name: replyTo.name }) : t("Add a comment")}
                  placeholderTextColor={colors.text.tertiary}
                  selectionColor={colors.accent.ember}
                  accessibilityLabel={t("Add a comment")}
                  multiline
                  onSubmitEditing={send}
                  style={{ color: colors.text.primary, fontFamily: fontFamily.regular, fontSize: 15, lineHeight: 20, maxHeight: 96, padding: 0 }}
                />
              </View>
              {/* The send button only exists once there is something to send. */}
              {draft.trim() ? (
                <Pressable accessibilityRole="button" accessibilityLabel={t("Post comment")} onPress={send} style={({ pressed }) => ({ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: colors.accent.ember, opacity: pressed ? 0.8 : 1 })}>
                  <Icon name="arrowRight" size={19} color={colors.accent.on} strokeWidth={2.4} />
                </Pressable>
              ) : null}
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  );
}
