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
import { useT } from "@/i18n";
import { longDate } from "@/db/derive";

/**
 * Account and privacy. Everything the law says a user must be able to do
 * without asking us: see and change their data, choose what is collected,
 * download it, and delete the account. Every switch here is off until the
 * user turns it on.
 */
export default function Account() {
  const { colors } = useTheme();
  const router = useRouter();
  const t = useT();
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
      await Share.share({ title: t("My CresQ data"), message: json });
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
      <Header left={<IconButton name="chevronLeft" onPress={() => router.back()} accessibilityLabel={t("Back")} />} title={t("Account and privacy")} />

      <Section title={t("Account")}>
        <Field label={t("Name")} value={p.name} onChangeText={(v) => setProfile({ name: v, first: v.split(" ")[0] || v })} />
        <Field label={t("Handle")} value={p.handle} onChangeText={(v) => setProfile({ handle: v.startsWith("@") ? v : `@${v}` })} autoCapitalize="none" />
        <Field label={t("City")} value={p.city} onChangeText={(v) => setProfile({ city: v })} />
        <Field label={t("Bio")} value={p.bio ?? ""} onChangeText={(v) => setProfile({ bio: v })} placeholder={t("A line about your training")} />
        <Field label={t("Year of birth")} value={p.birthYear ? String(p.birthYear) : ""} onChangeText={(v) => setProfile({ birthYear: /^\d{4}$/.test(v) ? Number(v) : undefined })} keyboardType="number-pad" maxLength={4} placeholder="1998" />
        <Txt variant="bodyS" tone={birthOk ? "tertiary" : "warning"}>
          {birthOk ? t("Used only to check you are {n} or over. We never ask for the full date.", { n: MIN_AGE }) : t("CresQ is for people aged {n} and over.", { n: MIN_AGE })}
        </Txt>
      </Section>

      <Section title={t("Privacy")} gap={0}>
        <Setting label={t("Private account")} sub={t("Only people you accept see your workouts and photos")} value={!!p.privateAccount} onChange={(v) => setProfile({ privateAccount: v })} />
        <Divider />
        <Setting label={t("Show my city")} sub={t("On your profile and next to your posts")} value={p.showCity !== false} onChange={(v) => setProfile({ showCity: v })} />
        <Divider />
        <Setting label={t("Share live workouts")} sub={t("People who follow you can watch a session while it runs. Off means nobody sees anything until you share it.")} value={!!p.shareLive} onChange={(v) => setProfile({ shareLive: v })} />
      </Section>

      <Section title={t("What we may collect")} gap={0}>
        <Txt variant="bodyS" tone="tertiary" style={{ paddingBottom: 8 }}>
          {t("Everything below is off until you turn it on. Your training log itself never leaves your device without your account sync being on.")}
        </Txt>
        <Setting label={t("Anonymous usage statistics")} sub={t("Which screens are used and how often. No names, no log data.")} value={c.analytics} onChange={(v) => setConsent({ analytics: v })} />
        <Divider />
        <Setting label={t("Age statistics")} sub={t("Your age as a band, such as 25 to 34, to see who CresQ serves. Needs your year of birth.")} value={c.ageStats} onChange={(v) => setConsent({ ageStats: v })} disabled={!p.birthYear} />
        <Divider />
        <Setting label={t("Product emails")} sub={t("News about CresQ, at most twice a month. No partner offers.")} value={c.marketing} onChange={(v) => setConsent({ marketing: v })} />
        {c.termsAcceptedAt ? (
          <Txt variant="labelS" tone="tertiary" style={{ paddingTop: 12 }}>
            {t("Terms and Privacy Policy accepted on {date}.", { date: longDate(c.termsAcceptedAt) })}
          </Txt>
        ) : null}
      </Section>

      <Section title={t("Your data")} gap={0}>
        <Row style={{ paddingVertical: 12 }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Txt variant="labelL">{t("Download my data")}</Txt>
            <Txt variant="bodyS" tone="tertiary">
              {exported ? t("Exported. A readable JSON file with everything CresQ holds.") : t("A readable JSON file with everything CresQ holds about you.")}
            </Txt>
          </View>
          <Button label={t("Download")} variant="secondary" size="S" full={false} icon="share" onPress={exportData} />
        </Row>
        <Divider />
        <Row style={{ paddingVertical: 12 }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Txt variant="labelL">{t("Delete my account")}</Txt>
            <Txt variant="bodyS" tone="tertiary">
              {t("Removes your account, log, photos and settings. Cannot be undone.")}
            </Txt>
          </View>
          <Button label={t("Delete")} variant="secondary" size="S" full={false} onPress={() => setConfirmDelete(true)} />
        </Row>
      </Section>

      <Section title={t("Legal")} gap={0}>
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
                {t(label)}
              </Txt>
              <Icon name="chevronRight" size={18} color={colors.text.tertiary} />
            </Pressable>
          </View>
        ))}
      </Section>

      <BottomSheet visible={confirmDelete} onClose={() => setConfirmDelete(false)} title={t("Delete your account?")} subtitle={t("Your log, photos and settings are removed from this device now, and from our servers within 30 days. This cannot be undone.")}>
        <View style={{ paddingHorizontal: 8, paddingVertical: 8, gap: 8 }}>
          <Button label={t("Download my data first")} variant="secondary" size="M" icon="share" onPress={exportData} />
          <Button label={t("Delete account permanently")} variant="danger" size="M" onPress={deleteAccount} />
        </View>
      </BottomSheet>
    </Screen>
  );
}

function Setting({ label, sub, value, onChange, disabled }: { label: string; sub: string; value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <Row gap={12} style={{ paddingVertical: 12, opacity: disabled ? 0.5 : 1 }}>
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
