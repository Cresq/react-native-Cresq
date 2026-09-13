import { useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "@/theme/ThemeProvider";
import { devices } from "@/data/mock";
import { Screen, Row, Section, Header } from "@/components/ui/Screen";
import { Txt } from "@/components/ui/Text";
import { IconButton } from "@/components/ui/IconButton";
import { Card, Divider } from "@/components/ui/Card";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Chip } from "@/components/ui/Chip";
import { Toggle } from "@/components/ui/Toggle";
import { Button } from "@/components/ui/Button";
import { BottomSheet } from "@/components/ui/BottomSheet";

export default function Devices() {
  const { colors } = useTheme();
  const router = useRouter();
  const [healthOn, setHealthOn] = useState(true);
  const [sheet, setSheet] = useState(false);
  const [coming, setComing] = useState<string | null>(null);
  const [perms, setPerms] = useState<Record<string, boolean>>(Object.fromEntries(devices.permissions.map((p) => [p.key, p.on])));

  return (
    <Screen>
      <Header left={<IconButton name="chevronLeft" onPress={() => router.back()} accessibilityLabel="Back" />} title="Connected devices" />
      <Txt variant="bodyM" tone="secondary">
        CresQ reads heart rate, energy and recovery from the devices you connect, and writes your sessions back. Everything here is a switch you can turn off.
      </Txt>

      <Card padding={16} gap={0} style={{ paddingVertical: 4 }}>
        {devices.connected.map((d, i) => (
          <View key={d.key}>
            {i > 0 ? <Divider /> : null}
            <DeviceRow icon={d.icon} iconColor={d.icon === "heart" ? colors.status.danger : colors.icon.strong} name={d.name} sub={d.sub}>
              {d.synced ? (
                <Chip label="Synced" icon="circleCheck" tone="success" size="S" />
              ) : (
                <Toggle
                  value={healthOn}
                  onChange={(v) => {
                    setHealthOn(v);
                    if (v) setSheet(true);
                  }}
                />
              )}
            </DeviceRow>
          </View>
        ))}
      </Card>

      <Section title="Available" gap={0}>
        {devices.available.map((d, i) => (
          <View key={d.key}>
            {i > 0 ? <Divider /> : null}
            <DeviceRow letter={d.letter} name={d.name} sub={d.sub}>
              <Button label="Connect" variant="inverse" size="S" full={false} onPress={() => setComing(d.name)} />
            </DeviceRow>
          </View>
        ))}
      </Section>

      <View style={{ gap: 8 }}>
        <Button label="Review Health permissions" variant="tertiary" size="M" onPress={() => setSheet(true)} />
        <Txt variant="labelS" tone="tertiary" align="center">
          Google Health Connect appears here on Android. Brand marks are placeholders until logo licences are confirmed.
        </Txt>
      </View>

      <BottomSheet visible={!!coming} onClose={() => setComing(null)} title={`Connect ${coming ?? ""}`} subtitle="Connecting other apps needs the CresQ build for iPhone and Android, which is on its way. Expo Go cannot talk to other apps yet.">
        <View style={{ paddingHorizontal: 8, paddingVertical: 8 }}>
          <Button label="Got it" variant="secondary" size="M" onPress={() => setComing(null)} />
        </View>
      </BottomSheet>
      <BottomSheet visible={sheet} onClose={() => setSheet(false)} title="Connect Apple Health" subtitle="Pick what CresQ may read. Each one powers a feature; the rest stays off.">
        {devices.permissions.map((p, i) => (
          <View key={p.key}>
            {i > 0 ? <Divider inset={50} /> : null}
            <Row gap={14} style={{ paddingVertical: 12, paddingHorizontal: 8 }}>
              <Icon name={p.icon} size={20} color={colors.text.secondary} strokeWidth={1.8} />
              <View style={{ flex: 1, gap: 1 }}>
                <Txt variant="labelL">{p.name}</Txt>
                <Txt variant="bodyS" tone="tertiary">
                  {p.sub}
                </Txt>
              </View>
              <Toggle value={!!perms[p.key]} onChange={(v) => setPerms((s) => ({ ...s, [p.key]: v }))} />
            </Row>
          </View>
        ))}
        <Button label="Allow selected" onPress={() => setSheet(false)} style={{ marginTop: 12 }} />
      </BottomSheet>
    </Screen>
  );
}

function DeviceRow({ icon, iconColor, letter, name, sub, children }: { icon?: IconName; iconColor?: string; letter?: string; name: string; sub: string; children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <Row gap={14} style={{ paddingVertical: 12 }}>
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
