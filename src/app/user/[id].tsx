import { useState } from "react";
import { Image, Pressable, View, useWindowDimensions } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTheme } from "@/theme/ThemeProvider";
import { useSocial } from "@/store/social";
import { followersOf, person as findPerson } from "@/data/people";
import { Screen, Row, Header } from "@/components/ui/Screen";
import { Txt } from "@/components/ui/Text";
import { IconButton } from "@/components/ui/IconButton";
import { Avatar } from "@/components/ui/PhotoSlot";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { WorkoutTile } from "@/components/WorkoutTile";
import { Count } from "../(tabs)/profile";

/** Someone else's profile: the same shape as your own, with a follow button where your settings would be. */
export default function UserProfile() {
  const { colors, layout } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isFollowing, toggleFollow } = useSocial();
  const { width } = useWindowDimensions();
  const [tab, setTab] = useState("workouts");
  const p = findPerson(id);

  if (!p) {
    return (
      <Screen>
        <Header left={<IconButton name="chevronLeft" onPress={() => router.back()} accessibilityLabel="Back" />} title="Profile" />
        <Txt variant="bodyM" tone="secondary">
          This account does not exist or is private.
        </Txt>
      </Screen>
    );
  }
  const on = isFollowing(p.id);
  const followers = followersOf(p.id);
  const withPhoto = p.recent.filter((r) => r.photo);
  const gap = 6;
  const tile = Math.floor((Math.min(width, 520) - layout.screenInset * 2 - gap * 2) / 3);

  return (
    <Screen>
      <Header left={<IconButton name="chevronLeft" onPress={() => router.back()} accessibilityLabel="Back" />} title={p.handle} right={<IconButton name="moreHorizontal" accessibilityLabel="More" />} />

      <Row gap={16}>
        <Avatar source={p.avatar} size={72} initial={p.name[0]} />
        <View style={{ flex: 1, gap: 3 }}>
          <Txt variant="displayL">{p.name}</Txt>
          <Txt variant="bodyS" tone="secondary">
            {p.city} · since {p.since}
          </Txt>
          {p.bio ? (
            <Txt variant="bodyS" tone="secondary">
              {p.bio}
            </Txt>
          ) : null}
        </View>
      </Row>

      <Row gap={0} align="stretch">
        <Count label="Workouts" value={p.recent.length * 9} />
        <Count label="Followers" value={followers.length} onPress={() => router.push(`/followers?user=${p.id}&tab=followers`)} />
        <Count label="Following" value={p.following.length} onPress={() => router.push(`/followers?user=${p.id}&tab=following`)} />
      </Row>

      <Button label={on ? "Following" : "Follow"} variant={on ? "secondary" : "primary"} size="M" icon={on ? "check" : "addPlus"} onPress={() => toggleFollow(p.id)} accessibilityLabel={on ? `Unfollow ${p.name}` : `Follow ${p.name}`} />

      <View style={{ gap: 12 }}>
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { key: "workouts", label: "Workouts" },
            { key: "photos", label: "Photos", count: withPhoto.length },
          ]}
        />
        {tab === "workouts" ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap }}>
            {p.recent.map((r, i) => (
              <WorkoutTile key={i} name={r.name} date={r.date} photo={r.photo} records={r.records} size={tile} />
            ))}
          </View>
        ) : withPhoto.length === 0 ? (
          <Txt variant="bodyM" tone="secondary" style={{ paddingTop: 4 }}>
            No photos yet.
          </Txt>
        ) : (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap }}>
            {withPhoto.map((r, i) => (
              <Pressable key={i} accessibilityRole="button" accessibilityLabel={`${r.name}, ${r.date}`} style={{ width: tile, height: tile, borderRadius: 14, overflow: "hidden", backgroundColor: colors.bg.surface }}>
                <Image source={r.photo} style={{ width: tile, height: tile }} resizeMode="cover" />
              </Pressable>
            ))}
          </View>
        )}
      </View>
    </Screen>
  );
}
