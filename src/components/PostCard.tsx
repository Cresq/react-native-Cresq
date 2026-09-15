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
import { PhotoViewer } from "./PhotoViewer";

export type Post = {
  id: string;
  /** Author in the people directory; undefined for your own posts. */
  userId?: string;
  name: string;
  meta: string;
  avatar?: ImageSourcePropType;
  photo?: ImageSourcePropType;
  /** The workout's own name, the first thing a post says. */
  title?: string;
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
  /** The first comments, shown under the post so the card has a voice before you open it. */
  commentList?: { name: string; text: string; avatar?: ImageSourcePropType }[];
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
  const [zoom, setZoom] = useState(false);
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
              {t(post.meta)}
            </Txt>
          </View>
        </Pressable>
        {onMore ? (
          <Pressable accessibilityRole="button" accessibilityLabel={t("Post options")} hitSlop={10} onPress={onMore}>
            <Icon name="moreHorizontal" size={20} color={colors.text.tertiary} />
          </Pressable>
        ) : null}
      </Row>
      {post.photo ? (
        <Pressable accessibilityRole="button" accessibilityLabel={t("See the photo")} onPress={() => setZoom(true)}>
          <PhotoSlot source={post.photo} height={post.photoHeight ?? 440} radius={0}>
            {post.record ? (
              <View style={{ position: "absolute", left: 12, top: 12 }}>
                <Chip label={t(post.record)} icon="trophy" tone="gold" size="S" />
              </View>
            ) : null}
          </PhotoSlot>
        </Pressable>
      ) : null}
      <View style={{ paddingHorizontal: 16, paddingTop: post.photo ? 14 : 4, paddingBottom: 16, gap: 12 }}>
        {/* The workout's name, then what was said about it, then what it held. */}
        <Pressable accessibilityRole={onPress ? "button" : undefined} accessibilityLabel={t("Open this workout")} disabled={!onPress} onPress={onPress} style={{ gap: 10 }}>
          {post.title ? <Txt variant="displayS">{post.title}</Txt> : null}
          <Txt variant="bodyM" tone="secondary">
            {post.caption}
          </Txt>
          {!post.photo && post.record ? <Chip label={t(post.record)} icon="trophy" tone="gold" size="S" style={{ alignSelf: "flex-start" }} /> : null}
          {!post.photo && (post.exercises ?? []).length ? (
            <View style={{ gap: 0 }}>
              {/* Three exercises at most. The rest is one tap away, on the post's own page. */}
              {(post.exercises ?? []).slice(0, 3).map((e, i) => (
                <View key={i} style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 12, paddingVertical: 5 }}>
                  <Txt variant="labelM" style={{ flex: 1 }} numberOfLines={1}>
                    {e.name}
                  </Txt>
                  <Txt variant="labelS" tone="tertiary" tabular>
                    {e.detail}
                  </Txt>
                </View>
              ))}
              {(post.exercises ?? []).length > 3 ? (
                <Txt variant="labelS" tone="tertiary" style={{ paddingTop: 5 }}>
                  {t("+{n} more", { n: (post.exercises ?? []).length - 3 })}
                </Txt>
              ) : null}
            </View>
          ) : null}
          {post.stats.length ? (
            <Txt variant="labelS" tone="tertiary" tabular>
              {post.stats.map((s) => `${s.value} ${s.unit}`).join(", ")}
            </Txt>
          ) : null}
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

        {!preview && post.commentList?.length ? (
          <Pressable accessibilityRole="button" accessibilityLabel={t("Comments")} disabled={!onComment} onPress={onComment} style={({ pressed }) => ({ gap: 8, opacity: pressed ? 0.7 : 1 })}>
            {post.commentList.slice(0, 2).map((c, i) => (
              <Row key={i} gap={8} align="flex-start">
                <Avatar source={c.avatar} size={22} initial={c.name[0]} />
                <Txt variant="bodyS" tone="secondary" style={{ flex: 1 }} numberOfLines={2}>
                  <Txt variant="labelS">{c.name.split(" ")[0]} </Txt>
                  {c.text}
                </Txt>
              </Row>
            ))}
            {post.comments > 2 ? (
              <Txt variant="labelS" tone="tertiary">
                {t("See all {n} comments", { n: post.comments })}
              </Txt>
            ) : null}
          </Pressable>
        ) : null}
      </View>
      <PhotoViewer source={post.photo} visible={zoom} onClose={() => setZoom(false)} />
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
