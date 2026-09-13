import { useState } from "react";
import { Pressable, View, type ImageSourcePropType } from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "@/theme/ThemeProvider";
import { Card } from "./ui/Card";
import { Txt } from "./ui/Text";
import { Icon } from "./ui/Icon";
import { Avatar, PhotoSlot } from "./ui/PhotoSlot";
import { Chip } from "./ui/Chip";
import { Row } from "./ui/Screen";

export type Post = {
  id: string;
  /** Author in the people directory; undefined for your own posts. */
  userId?: string;
  name: string;
  meta: string;
  avatar?: ImageSourcePropType;
  photo?: ImageSourcePropType;
  photoHeight?: number;
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
export function PostCard({ post, preview, onPress, onMore }: { post: Post; preview?: boolean; onPress?: () => void; onMore?: () => void }) {
  const { colors } = useTheme();
  const router = useRouter();
  const [liked, setLiked] = useState(!!post.liked);
  const likes = post.likes + (liked && !post.liked ? 1 : !liked && post.liked ? -1 : 0);
  return (
    <Card padding={0} gap={0} style={{ overflow: "hidden" }}>
      <Row style={{ paddingHorizontal: 16, paddingVertical: 14 }} gap={10}>
        <Pressable accessibilityRole="button" accessibilityLabel={`${post.name}'s profile`} disabled={!post.userId} onPress={() => router.push(`/user/${post.userId}`)} style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Avatar source={post.avatar} size={36} initial={post.name[0]} />
          <View style={{ flex: 1, gap: 1 }}>
            <Txt variant="labelL">{post.name}</Txt>
            <Txt variant="labelS" tone="tertiary">
              {post.meta}
            </Txt>
          </View>
        </Pressable>
        {onMore ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Post options" hitSlop={10} onPress={onMore}>
            <Icon name="moreHorizontal" size={20} color={colors.text.tertiary} />
          </Pressable>
        ) : null}
      </Row>
      <Pressable accessibilityRole={onPress ? "button" : undefined} disabled={!onPress} onPress={onPress}>
      <PhotoSlot source={post.photo} height={post.photoHeight ?? 300} radius={0}>
        {post.record ? (
          <View style={{ position: "absolute", left: 12, top: 12 }}>
            <Chip label={post.record} icon="trophy" tone="gold" size="S" />
          </View>
        ) : null}
      </PhotoSlot>
      </Pressable>
      <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 16, gap: 12 }}>
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
        {preview ? (
          <Txt variant="labelS" tone="tertiary">
            Reactions from followers show up here
          </Txt>
        ) : (
          <Row gap={20}>
            <Pressable onPress={() => setLiked((v) => !v)} accessibilityRole="button" accessibilityLabel="Like" hitSlop={8} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Icon name="heart" size={20} color={liked ? colors.accent.ember : colors.text.secondary} fill={liked ? colors.accent.ember : undefined} strokeWidth={1.8} />
              <Txt variant="labelM" tone={liked ? "ember" : "secondary"}>
                {likes}
              </Txt>
            </Pressable>
            <Row gap={6}>
              <Icon name="chatCircle" size={20} color={colors.text.secondary} strokeWidth={1.8} />
              <Txt variant="labelM" tone="secondary">
                {post.comments}
              </Txt>
            </Row>
            <View style={{ flex: 1 }} />
            <Icon name="share" size={20} color={colors.text.secondary} strokeWidth={1.8} />
          </Row>
        )}
      </View>
    </Card>
  );
}
