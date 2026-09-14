import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import type { Person } from "@/data/people";
import { useSocial } from "@/store/social";
import { useT } from "@/i18n";
import { Row } from "./ui/Screen";
import { Txt } from "./ui/Text";
import { Avatar } from "./ui/PhotoSlot";
import { Button } from "./ui/Button";

/** One person in a list: avatar, name, handle, and a follow button that says what tapping it does. */
export function PersonRow({ person, sub }: { person: Person; sub?: string }) {
  const router = useRouter();
  const t = useT();
  const { isFollowing, toggleFollow } = useSocial();
  const on = isFollowing(person.id);
  return (
    <Row gap={12} style={{ paddingVertical: 10 }}>
      <Pressable accessibilityRole="button" accessibilityLabel={t("{name}'s profile", { name: person.name })} onPress={() => router.push(`/user/${person.id}`)} style={({ pressed }) => ({ flex: 1, flexDirection: "row", alignItems: "center", gap: 12, opacity: pressed ? 0.7 : 1 })}>
        <Avatar source={person.avatar} size={44} initial={person.name[0]} />
        <View style={{ flex: 1, gap: 1 }}>
          <Txt variant="labelL">{person.name}</Txt>
          <Txt variant="bodyS" tone="tertiary">
            {sub ?? `${person.handle}, ${person.city}`}
          </Txt>
        </View>
      </Pressable>
      <Button label={on ? t("Following") : t("Follow")} variant={on ? "secondary" : "primary"} size="S" full={false} onPress={() => toggleFollow(person.id)} accessibilityLabel={on ? t("Unfollow {name}", { name: person.name }) : t("Follow {name}", { name: person.name })} />
    </Row>
  );
}
