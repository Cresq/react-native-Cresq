import { useState } from "react";
import { View } from "react-native";
import { useNav } from "@/nav";
import { useTheme } from "@/theme/ThemeProvider";
import { devices } from "@/data/mock";
import { useHealth } from "@/store/health";
import { haptic } from "@/haptics";
import { Screen, Row, Section, Header } from "@/components/ui/Screen";
import { Txt } from "@/components/ui/Text";
import { IconButton } from "@/components/ui/IconButton";
import { Divider } from "@/components/ui/Card";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { useT } from "@/i18n";

export default function Devices() {
  const { colors } = useTheme();
  const router = useNav();
  const t = useT();
  const [sheet, setSheet] = useState(false);
  const [coming, setComing] = useState<string | null>(null);
  const [viaHealth, setViaHealth] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const store = useHealth();
  const connect = async () => {
    setBusy(true);
    const ok = await store.connect();
    setBusy(false);
    if (ok) haptic("done");
  };

  return (
    <Screen>
      <Header left={<IconButton name="chevronLeft" onPress={() => router.back()} accessibilityLabel={t("Back")} />} title={t("Connected devices")} />
      <Txt variant="bodyM" tone="secondary">
        {store.connected ? t("{name} is connected. The workouts in it count towards what you may eat today; nothing leaves your phone.", { name: t(store.name) }) : t("CresQ will read heart rate, energy and recovery from the devices you connect, and write your sessions back. Nothing is connected yet.")}
      </Txt>

      <Section title={t("Available")} gap={0}>
        {devices.available.map((d, i) => (
          <View key={d.key}>
            {i > 0 ? <Divider /> : null}
            <DeviceRow icon={d.icon} iconColor={d.icon === "heart" ? colors.status.danger : colors.icon.strong} letter={d.letter} name={d.name} sub={t(d.sub)}>
              {d.key === "health" && !store.unavailable ? (
                store.connected ? (
                  <Button label={t("Disconnect")} variant="secondary" size="S" full={false} onPress={store.disconnect} />
                ) : (
                  <Button label={t("Connect")} variant="inverse" size="S" full={false} loading={busy} onPress={connect} />
                )
              ) : d.key === "garmin" ? (
                <Button label={t("How")} variant="secondary" size="S" full={false} onPress={() => setViaHealth(d.name)} />
              ) : (
                <Button label={t("Connect")} variant="inverse" size="S" full={false} onPress={() => setComing(d.name)} />
              )}
            </DeviceRow>
          </View>
        ))}
      </Section>

      <View style={{ gap: 8 }}>
        <Button label={t("See what Health access will ask for")} variant="tertiary" size="M" onPress={() => setSheet(true)} />
        <Txt variant="labelS" tone="tertiary" align="center">
          {t("Google Health Connect appears here on Android. Brand marks are placeholders until logo licences are confirmed.")}
        </Txt>
      </View>

      <BottomSheet visible={!!coming} onClose={() => setComing(null)} title={t("Connect {name}", { name: coming ?? "" })} subtitle={t("Connecting other apps needs the CresQ build for iPhone and Android, which is on its way. Expo Go cannot talk to other apps yet.")}>
        <View style={{ paddingHorizontal: 8, paddingVertical: 8 }}>
          <Button label={t("Got it")} variant="secondary" size="M" onPress={() => setComing(null)} />
        </View>
      </BottomSheet>
      <BottomSheet visible={!!viaHealth} onClose={() => setViaHealth(null)} title={t("{name}, through Apple Health", { name: viaHealth ?? "" })} subtitle={t("In the Garmin Connect app, connect Apple Health and allow workouts and active energy. Then connect Apple Health here. From then on a workout recorded on your Garmin counts in CresQ by itself.")}>
        <View style={{ paddingHorizontal: 8, paddingVertical: 8 }}>
          <Button label={t("Got it")} variant="secondary" size="M" onPress={() => setViaHealth(null)} />
        </View>
      </BottomSheet>
      <BottomSheet visible={sheet} onClose={() => setSheet(false)} title={t("What Health access asks for")} subtitle={t("Today CresQ asks for two things: your workouts and the active energy in them. The rest of this list comes with the features that need it, and stays off until then.")}>
        {devices.permissions.map((p, i) => (
          <View key={p.key}>
            {i > 0 ? <Divider inset={50} /> : null}
            <Row gap={12} style={{ paddingVertical: 12, paddingHorizontal: 8 }}>
              <Icon name={p.icon} size={20} color={colors.text.secondary} strokeWidth={1.8} />
              <View style={{ flex: 1, gap: 1 }}>
                <Txt variant="labelL">{t(p.name)}</Txt>
                <Txt variant="bodyS" tone="tertiary">
                  {t(p.sub)}
                </Txt>
              </View>
            </Row>
          </View>
        ))}
        <Button label={t("Close")} variant="secondary" onPress={() => setSheet(false)} style={{ marginTop: 12 }} />
      </BottomSheet>
    </Screen>
  );
}

function DeviceRow({ icon, iconColor, letter, name, sub, children }: { icon?: IconName; iconColor?: string; letter?: string; name: string; sub: string; children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <Row gap={12} style={{ paddingVertical: 12 }}>
      <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: colors.bg.raised, alignItems: "center", justifyContent: "center" }}>
        {icon ? <Icon name={icon} size={18} color={iconColor} strokeWidth={2} /> : <Txt variant="labelL">{letter}</Txt>}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Txt variant="labelL">{name}</Txt>
        <Txt variant="bodyS" tone="tertiary">
          {sub}
        </Txt>
      </View>
      {children}
    </Row>
  );
}
