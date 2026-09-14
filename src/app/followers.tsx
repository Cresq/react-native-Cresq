import { useEffect, useState } from "react";
import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useDb } from "@/db/DbProvider";
import { useSocial } from "@/store/social";
import { ME, followersOf, people, person as findPerson } from "@/data/people";
import { useT } from "@/i18n";
import { Screen, Header } from "@/components/ui/Screen";
import { Txt } from "@/components/ui/Text";
import { IconButton } from "@/components/ui/IconButton";
import { Divider } from "@/components/ui/Card";
import { Tabs } from "@/components/ui/Tabs";
import { PersonRow } from "@/components/PersonRow";

/** Followers and following, for you (?user=me or none) or for someone else (?user=ID). */
export default function Followers() {
  const router = useRouter();
  const t = useT();
  const { db } = useDb();
  const { following: myFollowing } = useSocial();
  const { user, tab: wanted } = useLocalSearchParams<{ user?: string; tab?: string }>();
  const [tab, setTab] = useState(wanted === "following" ? "following" : "followers");
  useEffect(() => {
    if (wanted === "following" || wanted === "followers") setTab(wanted);
  }, [wanted]);

  const mine = !user || user === ME;
  const subject = mine ? null : findPerson(user);
  const title = mine ? db.profile.handle : (subject?.handle ?? t("Profile"));
  const followers = mine ? followersOf(ME) : followersOf(user ?? "");
  const followingIds = mine ? myFollowing : (subject?.following ?? []);
  const following = followingIds.map((id) => people.find((p) => p.id === id)).filter((p): p is NonNullable<typeof p> => !!p);
  const list = tab === "followers" ? followers : following;

  return (
    <Screen>
      <Header left={<IconButton name="chevronLeft" onPress={() => router.back()} accessibilityLabel={t("Back")} />} title={title} />
      <View style={{ gap: 8 }}>
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { key: "followers", label: t("Followers"), count: followers.length },
            { key: "following", label: t("Following"), count: following.length },
          ]}
        />
        <View>
          {list.map((p, i) => (
            <View key={p.id}>
              {i > 0 ? <Divider inset={56} /> : null}
              <PersonRow person={p} />
            </View>
          ))}
          {list.length === 0 ? (
            <Txt variant="bodyM" tone="secondary" style={{ paddingVertical: 12 }}>
              {tab === "followers" ? t("No followers yet.") : t("Not following anyone yet.")}
            </Txt>
          ) : null}
        </View>
      </View>
    </Screen>
  );
}
