import { useState } from "react";
import { Platform, Pressable, Share, View } from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "@/theme/ThemeProvider";
import { useDb } from "@/db/DbProvider";
import { useAuth } from "@/store/auth";
import { MIN_AGE } from "@/db/types";
import { Screen, Row, Section, Header } from "@/components/ui/Screen";
import { Txt } from "@/components/ui/Text";
import { IconButton } from "@/components/ui/IconButton";
import { Field } from "@/components/ui/Field";
import { Toggle } from "@/components/ui/Toggle";
import { Divider } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { BottomSheet } from "@/components/ui/BottomSheet";

/**
 * Account and privacy. Everything the law says a user must be able to do
 * without asking us: see and change their data, choose what is collected,
 * download it, and delete the account. Every switch here is off until the
 * user turns it on.
 */
export default function Account() {
  const { colors } = useTheme();
  const router = useRouter();
  const { db, update, reset } = useDb();
  const { signOut } = useAuth();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [exported, setExported] = useState(false);
  const p = db.profile;
  const c = db.consent;
  const year = new Date().getFullYear();
  const birthOk = !p.birthYear || (p.birthYear <= year - MIN_AGE && p.birthYear > year - 120);

  const setProfile = (patch: Partial<typeof p>) => update((d) => ({ ...d, profile: { ...d.profile, ...patch } }));
  const setConsent = (patch: Partial<typeof c>) => update((d) => ({ ...d, consent: { ...d.consent, ...patch } }));

  const exportData = async () => {
    const json = JSON.stringify({ exportedAt: new Date().toISOString(), profile: db.profile, consent: db.consent, plans: db.plans, sessions: db.sessions, split: db.split, following: db.following }, null, 2);
    if (Platform.OS === "web") {
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "cresq-data.json";
      a.click();
      URL.revokeObjectURL(url);
    } else {
      await Share.share({ title: "My CresQ data", message: json });
    }
    setExported(true);
  };

  const deleteAccount = async () => {
    setConfirmDelete(false);
    signOut();
    await reset();
    router.replace("/");
  };

  return (
    <Screen>
      <Header left={<IconButton name="chevronLeft" onPress={() => router.back()} accessibilityLabel="Back" />} title="Account and privacy" />

      <Section title="Account">
        <Field label="Name" value={p.name} onChangeText={(t) => setProfile({ name: t, first: t.split(" ")[0] || t })} />
        <Field label="Handle" value={p.handle} onChangeText={(t) => setProfile({ handle: t.startsWith("@") ? t : `@${t}` })} autoCapitalize="none" />
        <Field label="City" value={p.city} onChangeText={(t) => setProfile({ city: t })} />
        <Field label="Bio" value={p.bio ?? ""} onChangeText={(t) => setProfile({ bio: t })} placeholder="A line about your training" />
        <Field label="Year of birth" value={p.birthYear ? String(p.birthYear) : ""} onChangeText={(t) => setProfile({ birthYear: /^\d{4}$/.test(t) ? Number(t) : undefined })} keyboardType="number-pad" maxLength={4} placeholder="1998" />
        <Txt variant="bodyS" tone={birthOk ? "tertiary" : "warning"}>
          {birthOk ? `Used only to check you are ${MIN_AGE} or over. We never ask for the full date.` : `CresQ is for people aged ${MIN_AGE} and over.`}
        </Txt>
      </Section>

      <Section title="Privacy" gap={0}>
        <Setting label="Private account" sub="Only people you accept see your workouts and photos" value={!!p.privateAccount} onChange={(v) => setProfile({ privateAccount: v })} />
        <Divider />
        <Setting label="Show my city" sub="On your profile and next to your posts" value={p.showCity !== false} onChange={(v) => setProfile({ showCity: v })} />
      </Section>

      <Section title="What we may collect" gap={0}>
        <Txt variant="bodyS" tone="tertiary" style={{ paddingBottom: 8 }}>
          Everything below is off until you turn it on. Your training log itself never leaves your device without your account sync being on.
        </Txt>
        <Setting label="Anonymous usage statistics" sub="Which screens are used and how often. No names, no log data." value={c.analytics} onChange={(v) => setConsent({ analytics: v })} />
        <Divider />
        <Setting label="Age statistics" sub="Your age as a band, such as 25 to 34, to see who CresQ serves. Needs your year of birth." value={c.ageStats} onChange={(v) => setConsent({ ageStats: v })} disabled={!p.birthYear} />
        <Divider />
        <Setting label="Product emails" sub="News about CresQ, at most twice a month. No partner offers." value={c.marketing} onChange={(v) => setConsent({ marketing: v })} />
        {c.termsAcceptedAt ? (
          <Txt variant="labelS" tone="tertiary" style={{ paddingTop: 10 }}>
            Terms and Privacy Policy accepted on {new Date(c.termsAcceptedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}.
          </Txt>
        ) : null}
      </Section>

      <Section title="Your data" gap={0}>
        <Row style={{ paddingVertical: 12 }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Txt variant="labelL">Download my data</Txt>
            <Txt variant="bodyS" tone="tertiary">
              {exported ? "Exported. A readable JSON file with everything CresQ holds." : "A readable JSON file with everything CresQ holds about you."}
            </Txt>
          </View>
          <Button label="Download" variant="secondary" size="S" full={false} icon="share" onPress={exportData} />
        </Row>
        <Divider />
        <Row style={{ paddingVertical: 12 }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Txt variant="labelL">Delete my account</Txt>
            <Txt variant="bodyS" tone="tertiary">
              Removes your account, log, photos and settings. Cannot be undone.
            </Txt>
          </View>
          <Button label="Delete" variant="secondary" size="S" full={false} onPress={() => setConfirmDelete(true)} />
        </Row>
      </Section>

      <Section title="Legal" gap={0}>
        {[
          ["privacy", "Privacy Policy"],
          ["terms", "Terms of Use"],
          ["cookies", "Cookies and local storage"],
          ["refunds", "Refund policy"],
          ["licences", "Licences and credits"],
        ].map(([key, label], i) => (
          <View key={key}>
            {i > 0 ? <Divider /> : null}
            <Pressable accessibilityRole="link" onPress={() => router.push(`/legal/${key}`)} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, opacity: pressed ? 0.7 : 1 })}>
              <Txt variant="labelL" style={{ flex: 1 }}>
                {label}
              </Txt>
              <Icon name="chevronRight" size={18} color={colors.text.tertiary} />
            </Pressable>
          </View>
        ))}
      </Section>

      <BottomSheet visible={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete your account?" subtitle="Your log, photos and settings are removed from this device now, and from our servers within 30 days. This cannot be undone.">
        <View style={{ paddingHorizontal: 8, paddingVertical: 8, gap: 8 }}>
          <Button label="Download my data first" variant="secondary" size="M" icon="share" onPress={exportData} />
          <Button label="Delete account permanently" variant="danger" size="M" onPress={deleteAccount} />
        </View>
      </BottomSheet>
    </Screen>
  );
}

function Setting({ label, sub, value, onChange, disabled }: { label: string; sub: string; value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <Row gap={14} style={{ paddingVertical: 12, opacity: disabled ? 0.5 : 1 }}>
      <View style={{ flex: 1, gap: 2 }}>
        <Txt variant="labelL">{label}</Txt>
        <Txt variant="bodyS" tone="tertiary">
          {sub}
        </Txt>
      </View>
      <View pointerEvents={disabled ? "none" : "auto"}>
        <Toggle value={value} onChange={onChange} />
      </View>
    </Row>
  );
}
