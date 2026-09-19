import { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useNav, useOnce } from "@/nav";
import { useTheme } from "@/theme/ThemeProvider";
import { useDb } from "@/db/DbProvider";
import { useWorkout } from "@/store/workout";
import { inviteFresh, inviteSender, useInvites } from "@/store/invites";
import { personByName } from "@/data/people";
import { uid } from "@/db/storage";
import { useNow } from "@/clock";
import { fmtTime, relativeTime } from "@/db/derive";
import { decodeInvite, linkInviteId, planFromInvite } from "@/invite";
import { supersetColor, SUPERSET_INK } from "@/superset";
import { useT, usePlural } from "@/i18n";
import { Screen, Row, Header } from "@/components/ui/Screen";
import { Txt } from "@/components/ui/Text";
import { IconButton } from "@/components/ui/IconButton";
import { Icon } from "@/components/ui/Icon";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/PhotoSlot";
import { ExerciseMark } from "@/components/ExerciseMark";

/**
 * The other end of an invitation, whether it came in through a link (?w=) or
 * is one already kept on this phone (?invite=). Everything on this screen came
 * out of the invitation, so it works before the app has ever spoken to a
 * server: the same movements, sets, reps and pairings the sender is doing.
 *
 * The weights shown are theirs. Starting it fills in yours, from your own log,
 * the way any workout does.
 */
export default function Join() {
  const { colors } = useTheme();
  const router = useNav();
  const once = useOnce();
  const t = useT();
  const plural = usePlural();
  const now = useNow(30_000);
  const { update } = useDb();
  const { session, start } = useWorkout();
  const { byId, receive, accept } = useInvites();
  const { w, invite: inviteId } = useLocalSearchParams<{ w?: string; invite?: string }>();
  const [busy, setBusy] = useState(false);

  const stored = byId(inviteId);
  const fromLink = useMemo(() => (stored ? null : decodeInvite(w)), [stored, w]);
  const invite = stored?.workout ?? fromLink;
  const id = stored?.id ?? (fromLink ? linkInviteId(fromLink) : null);
  // A link that arrived is kept, once, so it is still under Notifications when this screen is gone.
  useEffect(() => {
    if (fromLink) receive(fromLink);
  }, [fromLink, receive]);

  const running = !!session && !session.finishedAt;
  const leave = () => (router.canGoBack() ? router.back() : router.replace("/(tabs)"));

  if (!invite) {
    return (
      <Screen>
        <Header left={<IconButton name="chevronLeft" onPress={leave} accessibilityLabel={t("Back")} />} title={t("Invitation")} />
        <Txt variant="bodyM" tone="secondary">
          {t("This invitation is not readable. Ask for a new link.")}
        </Txt>
      </Screen>
    );
  }

  const who = stored ? inviteSender(stored) : personByName(invite.from);
  const name = who?.name ?? invite.from;
  const fresh = stored ? inviteFresh(stored, now) : true;

  /**
   * Take it over: anything the library has never heard of is added under the
   * name the invitation carried, or the workout would arrive with holes in it.
   */
  const takeOver = once(() => {
    setBusy(true);
    const planId = uid();
    update((d) => {
      const known = new Set(d.exercises.map((e) => e.id));
      const missing = invite.ex
        .filter((e) => !known.has(e.i))
        .map((e) => ({ id: e.i, name: e.n, muscles: t("From an invitation"), equipment: t("Unknown") }));
      return {
        ...d,
        exercises: missing.length ? [...d.exercises, ...missing] : d.exercises,
        plans: [...d.plans, planFromInvite(invite, planId)],
      };
    });
    if (id) accept(id);
    // The plan has to be in the document before a session can be built from it.
    setTimeout(() => {
      start(planId);
      router.replace("/workout/active");
    }, 0);
  });

  const sets = invite.ex.reduce((n, e) => n + e.s, 0);

  return (
    <Screen
      bottom={150}
      footer={
        <>
          <Button label={running ? t("Finish your session first") : t("Do this workout")} iconRight="arrowRight" disabled={running || busy} onPress={takeOver} />
          <Button label={t("Not now")} variant="tertiary" size="M" onPress={leave} />
        </>
      }
    >
      <Header left={<IconButton name="chevronLeft" onPress={leave} accessibilityLabel={t("Back")} />} title={t("Invitation")} />

      <View style={{ gap: 12 }}>
        <Row gap={10}>
          <Avatar source={who?.avatar} size={36} initial={name[0]} />
          <View style={{ flex: 1, gap: 1 }}>
            <Txt variant="labelM" tone="ember">
              {t("{name} invited you", { name })}
            </Txt>
            <Txt variant="bodyS" tone="tertiary">
              {relativeTime(invite.at, now)}
            </Txt>
          </View>
        </Row>
        <View style={{ gap: 4 }}>
          <Txt variant="displayXL">{invite.name}</Txt>
          <Txt variant="bodyM" tone="secondary">
            {[plural(invite.ex.length, "{n} exercise", "{n} exercises"), plural(sets, "{n} set", "{n} sets")].join(", ")}
          </Txt>
        </View>
      </View>

      <View style={{ gap: 8 }}>
        {invite.ex.map((e, i) => {
          const hue = supersetColor(e.g);
          return (
            <Card key={`${e.i}-${i}`} padding={12} gap={0}>
              <Row gap={10} align="center">
                <ExerciseMark exerciseId={e.i} name={e.n} size={34} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Txt variant="labelL" numberOfLines={1}>
                    {e.n}
                  </Txt>
                  <Txt variant="bodyS" tone="tertiary">
                    {plural(e.s, "{n} set", "{n} sets")}, {t("{time} rest", { time: fmtTime(e.t) })}
                  </Txt>
                </View>
                {hue ? (
                  <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: hue }}>
                    <Txt variant="labelS" style={{ color: SUPERSET_INK }}>
                      {t("Superset")}
                    </Txt>
                  </View>
                ) : null}
              </Row>
            </Card>
          );
        })}
      </View>

      <Row gap={8} align="flex-start">
        <Icon name="info" size={14} color={colors.text.tertiary} strokeWidth={1.9} />
        <Txt variant="labelS" tone="tertiary" style={{ flex: 1 }}>
          {fresh
            ? t("The movements and sets come from {name}. Your weights are filled in from your own log.", { name })
            : t("That session is probably over by now. The workout is still yours to do, with your own weights.")}
        </Txt>
      </Row>
    </Screen>
  );
}
