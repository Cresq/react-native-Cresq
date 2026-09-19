import { useEffect } from "react";
import { Pressable, View } from "react-native";
import { useSegments } from "expo-router";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNav } from "@/nav";
import { useTheme } from "@/theme/ThemeProvider";
import { useDb } from "@/db/DbProvider";
import { useNow } from "@/clock";
import { useT, usePlural } from "@/i18n";
import { haptic } from "@/haptics";
import { springs } from "@/motion";
import { inviteFresh, inviteSender, useInvites } from "@/store/invites";
import type { TrainInvite } from "@/db/types";
import { Txt } from "./ui/Text";
import { Icon } from "./ui/Icon";
import { Avatar } from "./ui/PhotoSlot";
import { SwipeAway } from "./ui/SwipeAway";

/** How long the card stays before leaving on its own, and where it waits above the screen. */
const STAY_MS = 8000;
const OFF = -200;

/**
 * An invitation arriving while the app is open: a card comes down from the
 * top with who and what, and leaves on its own if nothing is done with it.
 * Whatever happens to the card, the invitation stays under Notifications.
 * Nothing shows over the splash, sign-in or onboarding, nor over the
 * invitation's own screen.
 */
export function InviteBanner() {
  const { db } = useDb();
  // Segments, not the path: the Home tab and the splash both answer to "/", and only the splash has no segment at all.
  const segments = useSegments();
  const first = segments[0] as string | undefined;
  const now = useNow(30_000);
  const { incoming, markSeen } = useInvites();
  const quiet = !db.auth.signedIn || !db.profile.onboarded || !first || first === "join" || first === "onboarding" || first === "(auth)";
  const next = quiet ? undefined : incoming.find((i) => i.status === "pending" && !i.seenAt && inviteFresh(i, now));
  if (!next) return null;
  return <Banner key={next.id} invite={next} onDone={markSeen} />;
}

function Banner({ invite, onDone }: { invite: TrainInvite; onDone: (id: string) => void }) {
  const { colors, radius, shadow } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useNav();
  const t = useT();
  const plural = usePlural();
  const who = inviteSender(invite);
  const name = who?.name ?? invite.fromName;
  const y = useSharedValue(OFF);

  useEffect(() => {
    y.value = withSpring(0, springs.base);
    haptic("select");
    const timer = setTimeout(() => {
      y.value = withTiming(OFF, { duration: 220 }, (done) => {
        if (done) runOnJS(onDone)(invite.id);
      });
    }, STAY_MS);
    return () => clearTimeout(timer);
  }, [y, onDone, invite.id]);

  const open = () => {
    haptic("tap");
    onDone(invite.id);
    router.push(`/join?invite=${invite.id}`);
  };
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));

  return (
    <Animated.View style={[{ position: "absolute", left: 16, right: 16, top: insets.top + 8 }, style]}>
      <SwipeAway direction="up" onDismiss={() => onDone(invite.id)}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("{name} invited you to {plan}", { name, plan: invite.workout.name })}
          onPress={open}
          style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", gap: 12, padding: 12, paddingLeft: 14, borderRadius: radius.bar, backgroundColor: pressed ? colors.bg.surface : colors.bg.raised }, shadow.floating]}
        >
          <Avatar source={who?.avatar} size={40} initial={name[0]} />
          <View style={{ flex: 1, gap: 2 }}>
            <Txt variant="labelL" numberOfLines={1}>
              {t("{name} invites you", { name })}
            </Txt>
            <Txt variant="bodyS" tone="secondary" numberOfLines={1}>
              {invite.workout.name}, {plural(invite.workout.ex.length, "{n} exercise", "{n} exercises")}
            </Txt>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 2, paddingRight: 2 }}>
            <Txt variant="labelM" tone="ember">
              {t("View")}
            </Txt>
            <Icon name="chevronRight" size={14} color={colors.accent.ember} strokeWidth={2.2} />
          </View>
        </Pressable>
      </SwipeAway>
    </Animated.View>
  );
}
