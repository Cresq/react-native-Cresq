import { useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { posts } from "@/data/mock";
import { Screen, Row } from "@/components/ui/Screen";
import { Txt } from "@/components/ui/Text";
import { IconButton } from "@/components/ui/IconButton";
import { Chip } from "@/components/ui/Chip";
import { PostCard } from "@/components/PostCard";

export default function Feed() {
  const router = useRouter();
  const [filter, setFilter] = useState("following");
  const visible = filter === "records" ? posts.filter((p) => p.record) : posts;
  return (
    <Screen tabs>
      <View style={{ gap: 16 }}>
        <Row gap={10}>
          <Txt variant="displayXL" style={{ flex: 1 }}>
            Feed
          </Txt>
          <IconButton name="search" />
          <IconButton name="bell" badge onPress={() => router.push("/notifications")} accessibilityLabel="Notifications" />
        </Row>
        <Row gap={8}>
          {[
            ["following", "Following"],
            ["discover", "Discover"],
            ["records", "Records"],
          ].map(([k, l]) => (
            <Chip key={k} label={l} selected={filter === k} onPress={() => setFilter(k)} />
          ))}
        </Row>
      </View>
      <View style={{ gap: 20 }}>
        {visible.map((p) => (
          <PostCard key={p.id} post={p} />
        ))}
      </View>
    </Screen>
  );
}
