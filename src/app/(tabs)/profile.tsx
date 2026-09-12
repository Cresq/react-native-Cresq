import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "@/theme/ThemeProvider";
import { useAuth } from "@/store/auth";
import { photos, recentWorkouts, user } from "@/data/mock";
import { Screen, Row, Section } from "@/components/ui/Screen";
import { Txt } from "@/components/ui/Text";
import { IconButton } from "@/components/ui/IconButton";
import { Avatar, PhotoSlot } from "@/components/ui/PhotoSlot";
import { Chip } from "@/components/ui/Chip";
import { Card, Divider } from "@/components/ui/Card";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { Stat, StatDivider } from "@/components/StatCard";

/** Profile. Identity and figures on the ground, one surface for the shortcuts, then plain lists. */
export default function Profile() {
  const { colors } = useTheme();
  const router = useRouter();
  const { signOut } = useAuth();

  const shortcuts: { icon: IconName; label: string; sub: string; onPress?: () => void }[] = [
    { icon: "trendingUp", label: "Progress", sub: "Bench 97.5 kg · +7.5", onPress: () => router.push("/progress/bench-press") },
    { icon: "trophy", label: "Records", sub: "38 personal records", onPress: () => router.push("/progress/bench-press") },
    { icon: "flag", label: "Goals and limitations", sub: "Feeds your AI plans" },
    { icon: "sliders", label: "Settings", sub: "Devices, units, language", onPress: () => router.push("/settings/devices") },
  ];

  return (
    <Screen tabs>
      <Row gap={10}>
        <Txt variant="displayXL" style={{ flex: 1 }}>
          Profile
        </Txt>
        <IconButton name="share" />
      </Row>

      <View style={{ gap: 20 }}>
        <Row gap={16}>
          <Avatar source={photos.selfie} size={84} />
          <View style={{ flex: 1, gap: 4 }}>
            <Txt variant="displayL">{user.name}</Txt>
            <Txt variant="bodyS" tone="secondary">
              {user.handle} · {user.city} · since {user.since}
            </Txt>
            <Row gap={5}>
              <Icon name="trendingUp" size={12} color={colors.accent.ember} strokeWidth={2.2} />
              <Txt variant="labelS" tone="ember">
                {user.streakWeeks}-week streak
              </Txt>
            </Row>
          </View>
        </Row>
        <Row gap={12} align="stretch">
          <Stat label="Sessions" value={String(user.sessions)} size="M" />
          <StatDivider />
          <Stat label="Followers" value={user.followers} size="M" />
          <StatDivider />
          <Stat label="Following" value={String(user.following)} size="M" />
        </Row>
      </View>

      <Card padding={6} gap={0}>
        {shortcuts.map((s, i) => (
          <View key={s.label}>
            {i > 0 ? <Divider inset={52} /> : null}
            <Pressable accessibilityRole="button" onPress={s.onPress} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 12, paddingHorizontal: 10, borderRadius: 16, backgroundColor: pressed ? colors.bg.raised : "transparent" })}>
              <Icon name={s.icon} size={20} color={colors.text.secondary} strokeWidth={1.8} />
              <View style={{ flex: 1, gap: 1 }}>
                <Txt variant="labelL">{s.label}</Txt>
                <Txt variant="bodyS" tone="tertiary">
                  {s.sub}
                </Txt>
              </View>
              <Icon name="chevronRight" size={18} color={colors.text.tertiary} />
            </Pressable>
          </View>
        ))}
      </Card>

      <Section title="Recent workouts" action={`See all ${user.sessions}`} onAction={() => {}} gap={0}>
        {recentWorkouts.map((w, i) => (
          <View key={w.day + w.name}>
            {i > 0 ? <Divider /> : null}
            <Pressable accessibilityRole="button" onPress={() => {}} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 12, opacity: pressed ? 0.7 : 1 })}>
              <View style={{ width: 40, alignItems: "center" }}>
                <Txt variant="numberM" tabular>
                  {w.day}
                </Txt>
                <Txt variant="labelS" tone="tertiary">
                  {w.month}
                </Txt>
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Row gap={8}>
                  <Txt variant="labelL">{w.name}</Txt>
                  {w.pr ? <Chip label="PR" icon="trophy" tone="gold" size="S" /> : null}
                </Row>
                <Txt variant="bodyS" tone="tertiary">
                  {w.meta}
                </Txt>
              </View>
              <Icon name="chevronRight" size={18} color={colors.text.tertiary} />
            </Pressable>
          </View>
        ))}
      </Section>

      <Section title="Photos" action="See all" onAction={() => {}}>
        <Row gap={8}>
          {[photos.gym1, photos.gym2, photos.gym3].map((p, i) => (
            <PhotoSlot key={i} source={p} height={118} radius={14} style={{ flex: 1 }} />
          ))}
        </Row>
      </Section>

      <Button
        label="Sign out"
        variant="tertiary"
        size="M"
        onPress={() => {
          signOut();
          router.replace("/(auth)/sign-in");
        }}
      />
    </Screen>
  );
}
