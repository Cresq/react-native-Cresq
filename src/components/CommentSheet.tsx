import { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, TextInput, View, useWindowDimensions, type ImageSourcePropType } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme/ThemeProvider";
import { useT, usePlural } from "@/i18n";
import { haptic } from "@/haptics";
import { fontFamily } from "../../constants/theme";
import { Txt } from "./ui/Text";
import { Icon } from "./ui/Icon";
import { IconButton } from "./ui/IconButton";
import { Avatar } from "./ui/PhotoSlot";

export type Comment = {
  /** Who wrote it, in the people directory. Absent when it is yours. */
  userId?: string;
  name: string;
  text: string;
  avatar?: ImageSourcePropType;
  /** When it was written. Older seeded comments have no stamp and simply say nothing. */
  at?: number;
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
 * Comments, the way every app that does this well does it: the text is the
 * thing, the name is a small label above it, and there is no chat bubble.
 * A bubble says "two people talking"; a comment list is many people talking
 * past each other, and boxing each one makes the column unreadable.
 *
 * The composer is docked to the bottom with your own face on it, so it is
 * always clear who is about to speak.
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
  onSend: (text: string) => void;
  /** Called with the writer's name; the screen decides whose profile that is. */
  onOpenProfile: (comment: Comment) => void;
}) {
  const { colors, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: screenH } = useWindowDimensions();
  const t = useT();
  const plural = usePlural();
  const [draft, setDraft] = useState("");
  const [liked, setLiked] = useState<Record<number, boolean>>({});
  const list = useRef<ScrollView>(null);

  useEffect(() => {
    if (!visible) {
      setDraft("");
      setLiked({});
    }
  }, [visible]);

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    onSend(text);
    setDraft("");
    haptic("tap");
    requestAnimationFrame(() => list.current?.scrollToEnd({ animated: true }));
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.55)" }}>
        <Pressable accessibilityRole="button" accessibilityLabel={t("Close")} onPress={onClose} style={{ flex: 1 }} />

        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={{ height: Math.round(screenH * 0.78), backgroundColor: colors.bg.surface, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, overflow: "hidden" }}>
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

            <View style={{ height: 1, backgroundColor: colors.border.subtle }} />

            <ScrollView ref={list} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20, gap: 18 }} keyboardShouldPersistTaps="handled" style={{ flex: 1 }}>
              {comments.length === 0 ? (
                <View style={{ alignItems: "center", gap: 6, paddingTop: 40 }}>
                  <Txt variant="labelL">{t("No comments yet")}</Txt>
                  <Txt variant="bodyS" tone="tertiary">
                    {t("Be the first to say something.")}
                  </Txt>
                </View>
              ) : null}

              {comments.map((c, i) => (
                <View key={i} style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
                  <Pressable accessibilityRole="button" accessibilityLabel={t("Open {name}", { name: c.name })} onPress={() => onOpenProfile(c)} hitSlop={4} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
                    <Avatar source={c.avatar} size={36} initial={c.name[0]} />
                  </Pressable>

                  <View style={{ flex: 1, gap: 3 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Pressable accessibilityRole="button" accessibilityLabel={t("Open {name}", { name: c.name })} onPress={() => onOpenProfile(c)} hitSlop={4} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
                        <Txt variant="labelS" tone="tertiary">
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
                  </View>

                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: !!liked[i] }}
                    accessibilityLabel={t("Like this comment")}
                    hitSlop={8}
                    onPress={() => { haptic("tap"); setLiked((l) => ({ ...l, [i]: !l[i] })); }}
                    style={({ pressed }) => ({ paddingTop: 2, opacity: pressed ? 0.6 : 1 })}
                  >
                    <Icon name="heart" size={15} color={liked[i] ? colors.status.danger : colors.text.tertiary} fill={liked[i] ? colors.status.danger : undefined} strokeWidth={1.9} />
                  </Pressable>
                </View>
              ))}
            </ScrollView>

            <View style={{ height: 1, backgroundColor: colors.border.subtle }} />

            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 20, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 12) }}>
              <Avatar source={me.photo} size={32} initial={me.initial} />
              <View style={{ flex: 1, minHeight: 40, justifyContent: "center", borderRadius: radius.pill, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: colors.bg.raised }}>
                <TextInput
                  value={draft}
                  onChangeText={setDraft}
                  placeholder={t("Add a comment")}
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
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
