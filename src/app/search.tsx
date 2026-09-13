import { useMemo, useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { useSocial } from "@/store/social";
import { Screen, Header } from "@/components/ui/Screen";
import { Txt } from "@/components/ui/Text";
import { IconButton } from "@/components/ui/IconButton";
import { Field } from "@/components/ui/Field";
import { Divider } from "@/components/ui/Card";
import { PersonRow } from "@/components/PersonRow";

/** Find people. Empty search shows people you do not follow yet, so the page is never blank. */
export default function Search() {
  const router = useRouter();
  const { people, isFollowing } = useSocial();
  const [q, setQ] = useState("");
  const t = q.trim().toLowerCase();
  const results = useMemo(() => (t ? people.filter((p) => p.name.toLowerCase().includes(t) || p.handle.toLowerCase().includes(t) || p.city.toLowerCase().includes(t)) : people.filter((p) => !isFollowing(p.id))), [people, t, isFollowing]);

  return (
    <Screen>
      <Header left={<IconButton name="chevronLeft" onPress={() => router.back()} accessibilityLabel="Back" />} title="Find people" />
      <Field label="Search" value={q} onChangeText={setQ} placeholder="Name, handle or city" icon="search" autoCorrect={false} autoCapitalize="none" autoFocus />
      <View>
        {!t ? (
          <Txt variant="labelS" tone="tertiary" style={{ paddingBottom: 4 }}>
            People you may know
          </Txt>
        ) : null}
        {results.map((p, i) => (
          <View key={p.id}>
            {i > 0 ? <Divider inset={56} /> : null}
            <PersonRow person={p} />
          </View>
        ))}
        {results.length === 0 ? (
          <Txt variant="bodyM" tone="secondary" style={{ paddingVertical: 12 }}>
            Nobody called “{q}” yet.
          </Txt>
        ) : null}
      </View>
    </Screen>
  );
}
