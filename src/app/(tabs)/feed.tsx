import { useMemo, useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { useDb } from "@/db/DbProvider";
import { useSocial } from "@/store/social";
import { finished, fmtKg, newRecords, relativeDay, sessionStats } from "@/db/derive";
import { otherPosts, photos } from "@/data/mock";
import { Screen, Row } from "@/components/ui/Screen";
import { Txt } from "@/components/ui/Text";
import { IconButton } from "@/components/ui/IconButton";
import { Chip } from "@/components/ui/Chip";
import { PostCard, type Post } from "@/components/PostCard";

/** Feed. Your own shared sessions come from the database; other people's posts are placeholders until there is a server. */
export default function Feed() {
  const router = useRouter();
  const { db } = useDb();
  const { isFollowing } = useSocial();
  const [filter, setFilter] = useState("following");

  const mine = useMemo<Post[]>(
    () =>
      [...finished(db.sessions)]
        .reverse()
        .filter((s) => s.shared)
        .slice(0, 3)
        .map((s) => {
          const stats = sessionStats(s);
          const rec = newRecords(s, db.sessions.filter((x) => x.startedAt < s.startedAt)).sort((a, b) => b.kg - a.kg)[0];
          return {
            id: s.id,
            name: db.profile.name,
            meta: `${s.planName} · ${relativeDay(s.startedAt)}${db.profile.showCity === false ? "" : ` · ${db.profile.city}`}`,
            avatar: photos.selfie,
            photo: photos.gym1,
            record: rec ? `New record · ${rec.name} ${rec.kg} kg` : undefined,
            caption: rec ? `${rec.name} ${rec.kg} kg. ${rec.previous ? `Up ${Math.round((rec.kg - rec.previous) * 10) / 10} kg.` : "First logged best."}` : `${s.planName} done. Every set counted.`,
            stats: [
              { value: String(stats.minutes), unit: "min" },
              { value: fmtKg(stats.volume), unit: "kg" },
              { value: String(stats.setsDone), unit: "sets" },
            ],
            likes: rec ? 24 : 9,
            liked: true,
            comments: rec ? 6 : 2,
          };
        }),
    [db.sessions, db.profile],
  );
  const visible = filter === "following" ? [...mine, ...otherPosts.filter((p) => p.userId && isFollowing(p.userId))] : otherPosts.filter((p) => !p.userId || !isFollowing(p.userId));

  return (
    <Screen tabs>
      <View style={{ gap: 16 }}>
        <Row gap={10}>
          <Txt variant="displayXL" style={{ flex: 1 }}>
            Feed
          </Txt>
          <IconButton name="search" onPress={() => router.push("/search")} accessibilityLabel="Find people" />
          <IconButton name="bell" badge onPress={() => router.push("/notifications")} accessibilityLabel="Notifications" />
        </Row>
        <Row gap={8}>
          <Chip label="Following" selected={filter === "following"} onPress={() => setFilter("following")} />
          <Chip label="Discover" selected={filter === "discover"} onPress={() => setFilter("discover")} />
        </Row>
      </View>
      <View style={{ gap: 20 }}>
        {visible.map((p) => (
          <PostCard key={p.id} post={p} />
        ))}
        {visible.length === 0 ? (
          <Txt variant="bodyM" tone="secondary">
            {filter === "following" ? "Follow a few people and their sessions show up here." : "Nothing new to discover right now."}
          </Txt>
        ) : null}
      </View>
    </Screen>
  );
}
