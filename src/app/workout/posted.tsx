import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "@/theme/ThemeProvider";
import { fmtKg, sessionStats, useWorkout } from "@/store/workout";
import { photos, user } from "@/data/mock";
import { Screen, Row, Header } from "@/components/ui/Screen";
import { Txt } from "@/components/ui/Text";
import { IconButton } from "@/components/ui/IconButton";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { PostCard } from "@/components/PostCard";
import { findRecord } from "./summary";

export default function Posted() {
  const { colors } = useTheme();
  const router = useRouter();
  const { session, discard } = useWorkout();
  const [left, setLeft] = useState(60);
  const stats = sessionStats(session);
  const record = session ? findRecord(session.exercises) : null;

  useEffect(() => {
    const t = setInterval(() => setLeft((n) => Math.max(0, n - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  const done = () => {
    discard();
    router.replace("/(tabs)/feed");
  };

  const footer = (
    <>
      <Button
        label="Undo post"
        variant="secondary"
        size="M"
        icon="reload"
        disabled={left === 0}
        onPress={() => router.replace("/workout/summary")}
        trailing={
          <Txt variant="labelS" tone="tertiary" tabular>
            {`0:${String(left).padStart(2, "0")}`}
          </Txt>
        }
      />
      <Button label="Done" onPress={done} />
    </>
  );

  return (
    <Screen bottom={130} footer={footer}>
      <Header left={<IconButton name="close" onPress={done} accessibilityLabel="Close" />} />
      <View style={{ alignItems: "center", gap: 10, paddingVertical: 8 }}>
        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.accent.soft, alignItems: "center", justifyContent: "center" }}>
          <Icon name="check" size={30} color={colors.accent.ember} strokeWidth={2.4} />
        </View>
        <Txt variant="displayL">Posted to your feed</Txt>
        <Txt variant="bodyM" tone="secondary">
          Visible to {user.followers} followers
        </Txt>
      </View>

      <PostCard
        preview
        post={{
          id: "new",
          name: user.name,
          meta: `${session?.planName ?? "Session"} · just now · ${user.city}`,
          avatar: photos.selfie,
          photo: photos.gym1,
          photoHeight: 210,
          record: record ? `New record · ${record.name} ${record.kg} kg` : undefined,
          caption: record ? "Two weeks ahead of the forecast. 100 on the bar." : `${session?.planName ?? "Session"} done. Every set counted.`,
          stats: [
            { value: String(stats.minutes), unit: "min" },
            { value: fmtKg(stats.volume), unit: "kg" },
            { value: String(stats.setsDone), unit: "sets" },
          ],
          likes: 0,
          comments: 0,
        }}
      />
      <Pressable accessibilityRole="button" hitSlop={8} style={{ alignSelf: "center" }}>
        <Row gap={6}>
          <Icon name="noteEdit" size={14} color={colors.text.secondary} strokeWidth={1.7} />
          <Txt variant="labelM" tone="secondary">
            Edit caption or photo
          </Txt>
        </Row>
      </Pressable>
    </Screen>
  );
}
