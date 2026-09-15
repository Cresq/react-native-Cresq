import { useEffect, useMemo, useState } from "react";
import { Image, Pressable, View, useWindowDimensions } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTheme } from "@/theme/ThemeProvider";
import { useDb } from "@/db/DbProvider";
import { useSocial } from "@/store/social";
import { finished, liftTrend, newRecords, shortDate } from "@/db/derive";
import { DEFAULT_FAVOURITES } from "@/db/types";
import { photos } from "@/data/mock";
import { useT } from "@/i18n";
import { Screen, Row } from "@/components/ui/Screen";
import { Txt } from "@/components/ui/Text";
import { IconButton } from "@/components/ui/IconButton";
import { Avatar } from "@/components/ui/PhotoSlot";
import { Divider } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { Tabs } from "@/components/ui/Tabs";
import { WorkoutTile } from "@/components/WorkoutTile";

const TABS = ["workouts", "photos", "lifts"];

/**
 * Profile. Who you are, three numbers, then one grid at a time: workouts,
 * photos, or the lifts you follow. Settings live behind the gear, records
 * live on each lift. Nothing else competes for the eye.
 */
export default function Profile() {
  const { colors, layout } = useTheme();
  const router = useRouter();
  const t = useT();
  const { db, update } = useDb();
  const { followers, following } = useSocial();
  const { width } = useWindowDimensions();
  const { tab: wanted } = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState(TABS.includes(wanted ?? "") ? wanted! : "workouts");
  useEffect(() => {
    if (wanted && TABS.includes(wanted)) setTab(wanted);
  }, [wanted]);

  const done = useMemo(() => finished(db.sessions), [db.sessions]);
  const workouts = useMemo(() => [...done].reverse().map((s) => ({ s, prs: newRecords(s, db.sessions.filter((x) => x.startedAt < s.startedAt)).length, photo: s.photo ? { uri: s.photo } : undefined })), [done, db.sessions]);
  const withPhoto = workouts.filter((w) => w.photo);
  const favourites = db.profile.favourites ?? DEFAULT_FAVOURITES;
  const lifts = useMemo(
    () =>
      favourites
        .map((id) => db.exercises.find((e) => e.id === id))
        .filter((e): e is NonNullable<typeof e> => !!e)
        .map((ex) => {
          const points = liftTrend(db.sessions, ex.id);
          return { ex, points, current: points.length ? points[points.length - 1].value : null, delta: points.length > 1 ? Math.round((points[points.length - 1].value - points[0].value) * 2) / 2 : null, last: points.length ? points[points.length - 1].date : null };
        }),
    [favourites, db.exercises, db.sessions],
  );

  const gap = 8;
  const tile = Math.floor((Math.min(width, 520) - layout.screenInset * 2 - gap * 2) / 3);
  const unfavourite = (id: string) => update((d) => ({ ...d, profile: { ...d.profile, favourites: (d.profile.favourites ?? DEFAULT_FAVOURITES).filter((x) => x !== id) } }));

  return (
    <Screen tabs>
      <Row gap={12}>
        <Txt variant="displayXL" style={{ flex: 1 }}>
          {t("Profile")}
        </Txt>
        <IconButton name="settings" onPress={() => router.push("/settings")} accessibilityLabel={t("Settings")} />
      </Row>

      <Row gap={16}>
        <Avatar source={photos.selfie} size={72} />
        <View style={{ flex: 1, gap: 4 }}>
          <Txt variant="displayL">{db.profile.name}</Txt>
          <Txt variant="bodyS" tone="secondary">
            {db.profile.handle}
            {db.profile.showCity === false ? "" : `, ${db.profile.city}`}
          </Txt>
          {db.profile.bio ? (
            <Txt variant="bodyS" tone="secondary">
              {db.profile.bio}
            </Txt>
          ) : null}
        </View>
      </Row>

      <Row gap={0} align="stretch">
        <Count label={t("Sessions")} value={done.length} />
        <Count label={t("Followers")} value={followers.length} onPress={() => router.push("/followers?tab=followers")} />
        <Count label={t("Following")} value={following.length} onPress={() => router.push("/followers?tab=following")} />
      </Row>

      <View style={{ gap: 12 }}>
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { key: "workouts", label: t("Workouts"), count: done.length },
            { key: "photos", label: t("Photos"), count: withPhoto.length },
            { key: "lifts", label: t("Lifts"), count: lifts.length },
          ]}
        />

        {tab === "workouts" ? (
          workouts.length === 0 ? (
            <Txt variant="bodyM" tone="secondary" style={{ paddingTop: 4 }}>
              {t("Your finished sessions will show up here, one square each.")}
            </Txt>
          ) : (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap }}>
              {workouts.map(({ s, prs, photo }) => (
                <WorkoutTile key={s.id} name={s.planName} date={shortDate(s.startedAt)} photo={photo} records={prs} size={tile} onPress={() => router.push(`/workout/${s.id}`)} />
              ))}
            </View>
          )
        ) : null}

        {tab === "photos" ? (
          withPhoto.length === 0 ? (
            <Txt variant="bodyM" tone="secondary" style={{ paddingTop: 4 }}>
              {t("Photos you add to a session show up here.")}
            </Txt>
          ) : (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap }}>
              {withPhoto.map(({ s, photo }) => (
                <Pressable key={s.id} accessibilityRole="button" accessibilityLabel={`${s.planName}, ${shortDate(s.startedAt)}`} onPress={() => router.push(`/workout/${s.id}`)} style={({ pressed }) => ({ width: tile, height: tile, borderRadius: 14, overflow: "hidden", backgroundColor: colors.bg.surface, opacity: pressed ? 0.8 : 1 })}>
                  <Image source={photo} style={{ width: tile, height: tile }} resizeMode="cover" />
                </Pressable>
              ))}
            </View>
          )
        ) : null}

        {tab === "lifts" ? (
          <View style={{ marginTop: -8 }}>
            <Pressable accessibilityRole="button" accessibilityLabel={t("Muscle groups")} onPress={() => router.push("/progress/muscles")} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, opacity: pressed ? 0.7 : 1 })}>
              <View style={{ width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg.raised }}>
                <Icon name="chartLine" size={18} color={colors.icon.strong} strokeWidth={1.9} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Txt variant="labelL">{t("Muscle groups")}</Txt>
                <Txt variant="bodyS" tone="tertiary">
                  {t("Working sets per muscle, this week and last")}
                </Txt>
              </View>
              <Icon name="chevronRight" size={18} color={colors.text.tertiary} />
            </Pressable>
            <Divider />
            {lifts.map((l, i) => (
              <View key={l.ex.id}>
                {i > 0 ? <Divider /> : null}
                <Row gap={12}>
                  <Pressable accessibilityRole="button" onPress={() => router.push(`/progress/${l.ex.id}`)} style={({ pressed }) => ({ flex: 1, flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, opacity: pressed ? 0.7 : 1 })}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Txt variant="labelL">{l.ex.name}</Txt>
                      <Txt variant="bodyS" tone="tertiary">
                        {l.last ? t(l.points.length === 1 ? "{n} session, last {date}" : "{n} sessions, last {date}", { n: l.points.length, date: shortDate(l.last) }) : t("Not logged yet")}
                      </Txt>
                    </View>
                    {l.current !== null ? (
                      <View style={{ alignItems: "flex-end", gap: 1 }}>
                        <Row gap={4} align="baseline">
                          <Txt variant="numberM" tabular>
                            {l.current}
                          </Txt>
                          <Txt variant="labelS" tone="secondary">
                            kg
                          </Txt>
                        </Row>
                        {l.delta !== null ? (
                          <Txt variant="labelS" tone={l.delta >= 0 ? "ember" : "warning"}>
                            {l.delta >= 0 ? "+" : ""}
                            {l.delta} kg
                          </Txt>
                        ) : null}
                      </View>
                    ) : null}
                  </Pressable>
                  <Pressable accessibilityRole="button" accessibilityLabel={t("Remove {name} from your lifts", { name: l.ex.name })} hitSlop={10} onPress={() => unfavourite(l.ex.id)}>
                    <Icon name="star" size={20} color={colors.pr.gold} fill={colors.pr.gold} strokeWidth={1.8} />
                  </Pressable>
                </Row>
              </View>
            ))}
            {lifts.length ? <Divider /> : null}
            <Pressable accessibilityRole="button" onPress={() => router.push("/exercises?favourite=1")} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, opacity: pressed ? 0.7 : 1 })}>
              <Icon name="addPlus" size={18} color={colors.text.secondary} strokeWidth={2} />
              <Txt variant="labelL" tone="secondary" style={{ flex: 1 }}>
                {t("Add a lift")}
              </Txt>
            </Pressable>
          </View>
        ) : null}
      </View>
    </Screen>
  );
}

/** A figure with its label. Tappable when it opens a list. */
export function Count({ label, value, onPress }: { label: string; value: number | string; onPress?: () => void }) {
  return (
    <Pressable accessibilityRole={onPress ? "button" : undefined} disabled={!onPress} onPress={onPress} style={({ pressed }) => ({ flex: 1, gap: 2, opacity: pressed ? 0.7 : 1 })}>
      <Txt variant="numberM" tabular>
        {String(value)}
      </Txt>
      <Txt variant="labelS" tone="tertiary">
        {label}
      </Txt>
    </Pressable>
  );
}

export const goalLabel = (g: string) => ({ strength: "Get stronger", muscle: "Build muscle", health: "Stay healthy" })[g] ?? g;
