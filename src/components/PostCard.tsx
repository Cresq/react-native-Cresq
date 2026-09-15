import { useState } from "react";
import { Pressable, Share, View, type ImageSourcePropType } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { useRouter } from "expo-router";
import { useTheme } from "@/theme/ThemeProvider";
import { springs } from "@/motion";
import { haptic } from "@/haptics";
import { Card } from "./ui/Card";
import { Txt } from "./ui/Text";
import { Icon } from "./ui/Icon";
import { Avatar, PhotoSlot } from "./ui/PhotoSlot";
import { Chip } from "./ui/Chip";
import { Row } from "./ui/Screen";
import { useT } from "@/i18n";
import type { BreakdownExercise } from "./SessionBreakdown";

export type Post = {
  id: string;
  /** Author in the people directory; undefined for your own posts. */
  userId?: string;
  name: string;
  meta: string;
  avatar?: ImageSourcePropType;
  photo?: ImageSourcePropType;
  photoHeight?: number;
  /** Shown instead of a photo: what the session contained. */
  exercises?: { name: string; detail: string }[];
  /** Every set, for the post's own page. */
  workout?: BreakdownExercise[];
  record?: string;
  caption: string;
  stats: { value: string; unit: string }[];
  likes: number;
  liked?: boolean;
  comments: number;
};

/**
 * A post is one surface: author, photo bleeding to the edges, caption, figures, reactions.
 * The photo carries the weight; everything else stays quiet.
 */
export function PostCard({ post, preview, onPress, onMore, onComment }: { post: Post; preview?: boolean; onPress?: () => void; onMore?: () => void; onComment?: () => void }) {
  const { colors } = useTheme();
  const router = useRouter();
  const t = useT();
  const [liked, setLiked] = useState(!!post.liked);
  const likes = post.likes + (liked && !post.liked ? 1 : !liked && post.liked ? -1 : 0);
  const { toggleLike, heartStyle, ringStyle } = useLikeMotion(liked, setLiked);
  return (
    <Card padding={0} gap={0} style={{ overflow: "hidden" }}>
      <Row style={{ paddingHorizontal: 16, paddingVertical: 14 }} gap={10}>
        <Pressable accessibilityRole="button" accessibilityLabel={t("{name}'s profile", { name: post.name })} disabled={!post.userId} onPress={() => router.push(`/user/${post.userId}`)} style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Avatar source={post.avatar} size={36} initial={post.name[0]} />
          <View style={{ flex: 1, gap: 1 }}>
            <Txt variant="labelL">{post.name}</Txt>
            <Txt variant="labelS" tone="tertiary">
              {post.meta}
            </Txt>
          </View>
        </Pressable>
        {onMore ? (
          <Pressable accessibilityRole="button" accessibilityLabel={t("Post options")} hitSlop={10} onPress={onMore}>
            <Icon name="moreHorizontal" size={20} color={colors.text.tertiary} />
          </Pressable>
        ) : null}
      </Row>
      <Pressable accessibilityRole={onPress ? "button" : undefined} disabled={!onPress} onPress={onPress}>
      {post.photo ? (
      <PhotoSlot source={post.photo} height={post.photoHeight ?? 440} radius={0}>
        {post.record ? (
          <View style={{ position: "absolute", left: 12, top: 12 }}>
            <Chip label={post.record} icon="trophy" tone="gold" size="S" />
          </View>
        ) : null}
      </PhotoSlot>
      ) : (
        <View style={{ paddingHorizontal: 16, paddingTop: 2, paddingBottom: 4, gap: 0 }}>
          {post.record ? (
            <View style={{ paddingBottom: 10 }}>
              <Chip label={post.record} icon="trophy" tone="gold" size="S" style={{ alignSelf: "flex-start" }} />
            </View>
          ) : null}
          {(post.exercises ?? []).map((e, i) => (
            <View key={i} style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 12, paddingVertical: 7, borderTopWidth: i ? 1 : 0, borderTopColor: colors.border.subtle }}>
              <Txt variant="labelL" style={{ flex: 1 }} numberOfLines={1}>
                {e.name}
              </Txt>
              <Txt variant="labelM" tone="secondary" tabular>
                {e.detail}
              </Txt>
            </View>
          ))}
        </View>
      )}
      </Pressable>
      <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 16, gap: 12 }}>
        <Pressable accessibilityRole={onPress ? "button" : undefined} accessibilityLabel={t("Open this workout")} disabled={!onPress} onPress={onPress} style={{ gap: 12 }}>
          <Txt variant="displayS">{post.caption}</Txt>
          <Row gap={16}>
            {post.stats.map((s, i) => (
              <Row key={i} gap={4} align="baseline">
                <Txt variant="numberM" tabular>
                  {s.value}
                </Txt>
                <Txt variant="labelS" tone="tertiary">
                  {s.unit}
                </Txt>
              </Row>
            ))}
          </Row>
        </Pressable>
        {preview ? (
          <Txt variant="labelS" tone="tertiary">
            {t("Reactions from followers show up here")}
          </Txt>
        ) : (
          <Row gap={20}>
            <Pressable onPress={toggleLike} accessibilityRole="button" accessibilityLabel={t("Like")} hitSlop={8} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <View style={{ width: 20, height: 20, alignItems: "center", justifyContent: "center" }}>
                <Animated.View pointerEvents="none" style={[{ position: "absolute", width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.accent.ember }, ringStyle]} />
                <Animated.View style={heartStyle}>
                  <Icon name="heart" size={20} color={liked ? colors.accent.ember : colors.text.secondary} fill={liked ? colors.accent.ember : undefined} strokeWidth={1.8} />
                </Animated.View>
              </View>
              <Txt variant="labelM" tone={liked ? "ember" : "secondary"}>
                {likes}
              </Txt>
            </Pressable>
            <Pressable onPress={onComment} disabled={!onComment} accessibilityRole="button" accessibilityLabel={t("Comments")} hitSlop={8} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Icon name="chatCircle" size={20} color={colors.text.secondary} strokeWidth={1.8} />
              <Txt variant="labelM" tone="secondary">
                {post.comments}
              </Txt>
            </Pressable>
            <View style={{ flex: 1 }} />
            <Pressable onPress={() => Share.share({ message: `${post.name}: ${post.caption}, ${post.stats.map((s) => `${s.value} ${s.unit}`).join(", ")}, on CresQ` })} accessibilityRole="button" accessibilityLabel={t("Share post")} hitSlop={8}>
              <Icon name="share" size={20} color={colors.text.secondary} strokeWidth={1.8} />
            </Pressable>
          </Row>
        )}
      </View>
    </Card>
  );
}

/**
 * The like: the heart shrinks a touch, springs past its size and settles,
 * while a ring bursts outward and fades. Unliking is a small dip, nothing more.
 */
function useLikeMotion(liked: boolean, setLiked: (f: (v: boolean) => boolean) => void) {
  const scale = useSharedValue(1);
  const ring = useSharedValue(0);
  const toggleLike = () => {
    const next = !liked;
    setLiked(() => next);
    if (next) {
      haptic("tap");
      scale.value = withSequence(withTiming(0.7, { duration: 70 }), withSpring(1.35, springs.bouncy), withSpring(1, springs.snappy));
      ring.value = 0;
      ring.value = withTiming(1, { duration: 420 });
    } else {
      scale.value = withSequence(withTiming(0.85, { duration: 80 }), withSpring(1, springs.snappy));
    }
  };
  const heartStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const ringStyle = useAnimatedStyle(() => ({ opacity: ring.value === 0 ? 0 : 0.7 * (1 - ring.value), transform: [{ scale: 0.6 + ring.value * 1.6 }] }));
  return { toggleLike, heartStyle, ringStyle };
}
