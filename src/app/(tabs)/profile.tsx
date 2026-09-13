import { useEffect, useMemo, useState } from "react";
import { Pressable, View, useWindowDimensions } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTheme } from "@/theme/ThemeProvider";
import { useDb } from "@/db/DbProvider";
import { finished, liftTrend, newRecords, records, shortDate, streakWeeks } from "@/db/derive";
import { DEFAULT_FAVOURITES } from "@/db/types";
import { photos, social } from "@/data/mock";
import { Screen, Row } from "@/components/ui/Screen";
import { Txt } from "@/components/ui/Text";
import { IconButton } from "@/components/ui/IconButton";
import { Avatar } from "@/components/ui/PhotoSlot";
import { Divider } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { Tabs } from "@/components/ui/Tabs";
import { Stat, StatDivider } from "@/components/StatCard";
import { WorkoutTile } from "@/components/WorkoutTile";

const TABS = ["workouts", "favourites", "records"];
const MOCK_PHOTOS = [photos.gym1, photos.gym2, photos.gym3];

/**
 * Profile. Who you are on top, then a grid of every workout (a photo when
 * there is one, the workout's initials when there is not), your favourite
 * lifts, and your records. Each tile and row is a door, nothing more.
 */
export default function Profile() {
  const { colors, layout } = useTheme();
  const router = useRouter();
  const { db, update } = useDb();
  const { width } = useWindowDimensions();
  const { tab: wanted } = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState(TABS.includes(wanted ?? "") ? wanted! : "workouts");
  useEffect(() => {
    if (wanted && TABS.includes(wanted)) setTab(wanted);
  }, [wanted]);

  const done = useMemo(() => finished(db.sessions), [db.sessions]);
  const streak = useMemo(() => streakWeeks(db.sessions), [db.sessions]);
  const recs = useMemo(() => records(db.sessions, db.exercises), [db.sessions, db.exercises]);
  const favourites = db.profile.favourites ?? DEFAULT_FAVOURITES;
  const favs = useMemo(
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
  const workouts = useMemo(() => {
    let shared = 0;
    return [...done].reverse().map((s) => ({ s, prs: newRecords(s, db.sessions.filter((x) => x.startedAt < s.startedAt)).length, photo: s.shared ? MOCK_PHOTOS[shared++ % MOCK_PHOTOS.length] : undefined }));
  }, [done, db.sessions]);

  const gap = 6;
  const tile = Math.floor((Math.min(width, 520) - layout.screenInset * 2 - gap * 2) / 3);
  const rowStyle = ({ pressed }: { pressed: boolean }) => ({ flexDirection: "row" as const, alignItems: "center" as const, gap: 14, paddingVertical: 12, opacity: pressed ? 0.7 : 1 });
  const unfavourite = (id: string) => update((d) => ({ ...d, profile: { ...d.profile, favourites: (d.profile.favourites ?? DEFAULT_FAVOURITES).filter((x) => x !== id) } }));

  return (
    <Screen tabs>
      <Row gap={10}>
        <Txt variant="displayXL" style={{ flex: 1 }}>
          Profile
        </Txt>
        <IconButton name="share" />
        <IconButton name="settings" onPress={() => router.push("/settings")} accessibilityLabel="Settings" />
      </Row>

      <View style={{ gap: 20 }}>
        <Row gap={16}>
          <Avatar source={photos.selfie} size={84} />
          <View style={{ flex: 1, gap: 4 }}>
            <Txt variant="displayL">{db.profile.name}</Txt>
            <Txt variant="bodyS" tone="secondary">
              {db.profile.handle} · {db.profile.city} · since {db.profile.since}
            </Txt>
            <Row gap={5}>
              <Icon name="trendingUp" size={12} color={streak ? colors.accent.ember : colors.text.tertiary} strokeWidth={2.2} />
              <Txt variant="labelS" tone={streak ? "ember" : "tertiary"}>
                {streak ? `${streak}-week streak` : "Start a streak this week"}
              </Txt>
            </Row>
          </View>
        </Row>
        <Row gap={12} align="stretch">
          <Stat label="Sessions" value={String(done.length)} size="M" />
          <StatDivider />
          <Stat label="Followers" value={social.followers} size="M" />
          <StatDivider />
          <Stat label="Following" value={String(social.following)} size="M" />
        </Row>
      </View>

      <View style={{ gap: 12 }}>
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { key: "workouts", label: "Workouts", count: done.length },
            { key: "favourites", label: "Favourites", count: favs.length },
            { key: "records", label: "Records", count: recs.length },
          ]}
        />

        {tab === "workouts" ? (
          workouts.length === 0 ? (
            <Txt variant="bodyM" tone="secondary" style={{ paddingTop: 4 }}>
              Your finished sessions will show up here, one square each.
            </Txt>
          ) : (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap }}>
              {workouts.map(({ s, prs, photo }) => (
                <WorkoutTile key={s.id} name={s.planName} date={shortDate(s.startedAt)} photo={photo} records={prs} size={tile} onPress={() => router.push(`/workout/${s.id}`)} />
              ))}
            </View>
          )
        ) : null}

        {tab === "favourites" ? (
          <View style={{ marginTop: -8 }}>
            {favs.map((l, i) => (
              <View key={l.ex.id}>
                {i > 0 ? <Divider /> : null}
                <Row gap={14}>
                  <Pressable accessibilityRole="button" onPress={() => router.push(`/progress/${l.ex.id}`)} style={[rowStyle({ pressed: false }), { flex: 1 }]}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Txt variant="labelL">{l.ex.name}</Txt>
                      <Txt variant="bodyS" tone="tertiary">
                        {l.last ? `${l.points.length} session${l.points.length === 1 ? "" : "s"} · last ${shortDate(l.last)}` : "Not logged yet"}
                      </Txt>
                    </View>
                    {l.current !== null ? (
                      <View style={{ alignItems: "flex-end", gap: 1 }}>
                        <Row gap={3} align="baseline">
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
                  <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${l.ex.name} from favourites`} hitSlop={10} onPress={() => unfavourite(l.ex.id)}>
                    <Icon name="star" size={20} color={colors.pr.gold} fill={colors.pr.gold} strokeWidth={1.8} />
                  </Pressable>
                </Row>
              </View>
            ))}
            {favs.length ? <Divider /> : null}
            <Pressable accessibilityRole="button" onPress={() => router.push("/exercises?favourite=1")} style={rowStyle}>
              <Icon name="addPlus" size={18} color={colors.text.secondary} strokeWidth={2} />
              <Txt variant="labelL" tone="secondary" style={{ flex: 1 }}>
                Add a lift
              </Txt>
            </Pressable>
          </View>
        ) : null}

        {tab === "records" ? (
          <View style={{ marginTop: -8 }}>
            {recs.length === 0 ? (
              <Txt variant="bodyM" tone="secondary" style={{ paddingTop: 12 }}>
                Your first weighted set becomes your first record.
              </Txt>
            ) : null}
            {recs.map((r, i) => (
              <View key={r.exerciseId}>
                {i > 0 ? <Divider /> : null}
                <Pressable accessibilityRole="button" onPress={() => router.push(`/progress/${r.exerciseId}`)} style={rowStyle}>
                  <Icon name="trophy" size={20} color={i === 0 ? colors.pr.gold : colors.text.tertiary} strokeWidth={1.9} />
                  <View style={{ flex: 1, gap: 1 }}>
                    <Row gap={6} align="baseline">
                      <Txt variant="numberM" tabular>
                        {r.kg} kg
                      </Txt>
                      <Txt variant="labelS" tone="secondary">
                        × {r.reps} · {r.name}
                      </Txt>
                    </Row>
                    <Txt variant="bodyS" tone="tertiary">
                      {shortDate(r.date)}
                      {r.previous ? ` · up from ${r.previous} kg` : ""}
                    </Txt>
                  </View>
                  <Icon name="chevronRight" size={18} color={colors.text.tertiary} />
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </Screen>
  );
}

export const goalLabel = (g: string) => ({ strength: "Get stronger", muscle: "Build muscle", health: "Stay healthy" })[g] ?? g;
