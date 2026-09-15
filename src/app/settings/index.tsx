import { useState } from "react";
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "@/theme/ThemeProvider";
import { useDb } from "@/db/DbProvider";
import { useAuth } from "@/store/auth";
import { useT } from "@/i18n";
import { Screen, Row, Section, Header } from "@/components/ui/Screen";
import { Txt } from "@/components/ui/Text";
import { IconButton } from "@/components/ui/IconButton";
import { Card, Divider } from "@/components/ui/Card";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Segmented } from "@/components/ui/Segmented";
import { Button } from "@/components/ui/Button";
import { BottomSheet } from "@/components/ui/BottomSheet";

/** Settings. Small on purpose: what the app needs today, nothing speculative. */
export default function Settings() {
  const { colors } = useTheme();
  const router = useRouter();
  const t = useT();
  const { db, update, reset } = useDb();
  const { signOut } = useAuth();
  const [confirm, setConfirm] = useState<null | "samples" | "reset">(null);
  const samples = db.sessions.filter((s) => s.sample).length;

  const rows: { icon: IconName; label: string; sub: string; onPress: () => void }[] = [
    { icon: "user", label: t("Account and privacy"), sub: t("Profile, what we may collect, your data"), onPress: () => router.push("/settings/account") },
    { icon: "watch", label: t("Connected devices"), sub: t("Apple Health, Apple Watch, Garmin"), onPress: () => router.push("/settings/devices") },
    { icon: "flag", label: t("Goals and limitations"), sub: t("Answers from onboarding"), onPress: () => router.push("/onboarding?edit=1") },
    { icon: "bell", label: t("Notifications"), sub: t("Reminders, records, reactions"), onPress: () => router.push("/notifications") },
  ];

  return (
    <Screen>
      <Header left={<IconButton name="chevronLeft" onPress={() => router.back()} accessibilityLabel={t("Back")} />} title={t("Settings")} />

      <Card padding={8} gap={0}>
        {rows.map((r, i) => (
          <View key={r.label}>
            {i > 0 ? <Divider inset={52} /> : null}
            <Pressable accessibilityRole="button" onPress={r.onPress} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, paddingHorizontal: 12, borderRadius: 16, backgroundColor: pressed ? colors.bg.raised : "transparent" })}>
              <Icon name={r.icon} size={20} color={colors.text.secondary} strokeWidth={1.8} />
              <View style={{ flex: 1, gap: 1 }}>
                <Txt variant="labelL">{r.label}</Txt>
                <Txt variant="bodyS" tone="tertiary">
                  {r.sub}
                </Txt>
              </View>
              <Icon name="chevronRight" size={18} color={colors.text.tertiary} />
            </Pressable>
          </View>
        ))}
      </Card>

      <Section title={t("Language")}>
        <Segmented size="M" value={db.profile.language ?? "nl"} onChange={(l) => update((d) => ({ ...d, profile: { ...d.profile, language: l as "nl" | "en" } }))} segments={[{ key: "nl", label: "Nederlands" }, { key: "en", label: "English" }]} />
      </Section>

      <Section title={t("Units")}>
        <Segmented size="M" value={db.profile.units} onChange={(u) => update((d) => ({ ...d, profile: { ...d.profile, units: u as "kg" | "lb" } }))} segments={[{ key: "kg", label: t("Kilograms") }, { key: "lb", label: t("Pounds") }]} />
        <Txt variant="bodyS" tone="tertiary">
          {t("Pounds are shown converted; the log stays in kilograms underneath.")}
        </Txt>
      </Section>

      <Section title={t("Data")} gap={0}>
        <Row style={{ paddingVertical: 12 }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Txt variant="labelL">{t("Sample sessions")}</Txt>
            <Txt variant="bodyS" tone="tertiary">
              {samples ? t("{n} generated sessions fill the charts until you have your own.", { n: samples }) : t("Removed. Everything you see is yours.")}
            </Txt>
          </View>
          <Button label={t("Remove")} variant="secondary" size="S" full={false} disabled={!samples} onPress={() => setConfirm("samples")} />
        </Row>
        <Divider />
        <Row style={{ paddingVertical: 12 }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Txt variant="labelL">{t("Reset app")}</Txt>
            <Txt variant="bodyS" tone="tertiary">
              {t("Deletes all sessions, plans and settings on this device.")}
            </Txt>
          </View>
          <Button label={t("Reset")} variant="secondary" size="S" full={false} onPress={() => setConfirm("reset")} />
        </Row>
      </Section>

      <Button
        label={t("Sign out")}
        variant="tertiary"
        size="M"
        onPress={() => {
          signOut();
          router.replace("/(auth)/sign-in");
        }}
      />
      <Row gap={12} justify="center">
        {[["privacy", t("Privacy")], ["terms", t("Terms")], ["licences", t("Licences")]].map(([k, l]) => (
          <Pressable key={k} accessibilityRole="link" onPress={() => router.push(`/legal/${k}`)} hitSlop={8}>
            <Txt variant="labelS" tone="secondary">
              {l}
            </Txt>
          </Pressable>
        ))}
      </Row>
      <Txt variant="labelS" tone="tertiary" align="center">
        CresQ 1.0, Icons by coolicons, CC BY 4.0
      </Txt>

      <BottomSheet visible={confirm === "samples"} onClose={() => setConfirm(null)} title={t("Remove sample sessions?")} subtitle={t("Your own logged sessions stay. Charts will be empty until you train.")}>
        <View style={{ paddingHorizontal: 8, paddingVertical: 8 }}>
          <Button label={t("Remove {n} sessions", { n: samples })} variant="danger" size="M" onPress={() => { update((d) => ({ ...d, sessions: d.sessions.filter((s) => !s.sample) })); setConfirm(null); }} />
        </View>
      </BottomSheet>
      <BottomSheet visible={confirm === "reset"} onClose={() => setConfirm(null)} title={t("Reset everything?")} subtitle={t("This cannot be undone. You will be signed out.")}>
        <View style={{ paddingHorizontal: 8, paddingVertical: 8 }}>
          <Button label={t("Reset app")} variant="danger" size="M" onPress={async () => { setConfirm(null); await reset(); router.replace("/"); }} />
        </View>
      </BottomSheet>
    </Screen>
  );
}
