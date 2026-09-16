import { useMemo, useState } from "react";
import { View } from "react-native";
import { useNav } from "@/nav";
import { useSocial } from "@/store/social";
import { useT } from "@/i18n";
import { Screen, Header } from "@/components/ui/Screen";
import { Txt } from "@/components/ui/Text";
import { IconButton } from "@/components/ui/IconButton";
import { Field } from "@/components/ui/Field";
import { Divider } from "@/components/ui/Card";
import { PersonRow } from "@/components/PersonRow";

/** Find people. Empty search shows people you do not follow yet, so the page is never blank. */
export default function Search() {
  const router = useNav();
  const t = useT();
  const { people, isFollowing } = useSocial();
  const [q, setQ] = useState("");
  const term = q.trim().toLowerCase();
  const results = useMemo(() => (term ? people.filter((p) => p.name.toLowerCase().includes(term) || p.handle.toLowerCase().includes(term) || p.city.toLowerCase().includes(term)) : people.filter((p) => !isFollowing(p.id))), [people, term, isFollowing]);

  return (
    <Screen>
      <Header left={<IconButton name="chevronLeft" onPress={() => router.back()} accessibilityLabel={t("Back")} />} title={t("Find people")} />
      <Field label={t("Search")} value={q} onChangeText={setQ} placeholder={t("Name, handle or city")} icon="search" autoCorrect={false} autoCapitalize="none" autoFocus />
      <View>
        {!term ? (
          <Txt variant="labelS" tone="tertiary" style={{ paddingBottom: 4 }}>
            {t("People you may know")}
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
            {t("Nobody called “{q}” yet.", { q })}
          </Txt>
        ) : null}
      </View>
    </Screen>
  );
}
