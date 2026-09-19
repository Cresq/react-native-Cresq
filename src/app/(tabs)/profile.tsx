import { useEffect, useMemo, useState } from "react";
import { Image, Pressable, View, useWindowDimensions } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useNav } from "@/nav";
import { useTheme } from "@/theme/ThemeProvider";
import { useDb } from "@/db/DbProvider";
import { useSocial } from "@/store/social";
import { finished, locale, newRecords, shortDate } from "@/db/derive";
import { useMe } from "@/store/me";
import { pickPhoto } from "@/photo";
import { useT } from "@/i18n";
import { Screen, Row } from "@/components/ui/Screen";
import { Txt } from "@/components/ui/Text";
import { IconButton } from "@/components/ui/IconButton";
import { Avatar } from "@/components/ui/PhotoSlot";
import { Icon } from "@/components/ui/Icon";
import { Tabs } from "@/components/ui/Tabs";
import { WorkoutTile } from "@/components/WorkoutTile";
import { BottomSheet, SheetGroup, SheetOption } from "@/components/ui/BottomSheet";
import { PhotoViewer } from "@/components/PhotoViewer";

const TABS = ["workouts", "photos"];

/**
 * Profile. Who you are, three numbers, then one grid at a time: workouts,
 * photos. The lifts and their numbers are under Data. Settings behind the gear, records
 * live on each lift. Nothing else competes for the eye.
 */
export default function Profile() {
  const { colors, layout } = useTheme();
  const router = useNav();
  const t = useT();
  const { db, update } = useDb();
  const me = useMe();
  const { followers, following } = useSocial();
  const [changingPhoto, setChangingPhoto] = useState(false);
  const [zoomAvatar, setZoomAvatar] = useState(false);
  const { width } = useWindowDimensions();
  const { tab: wanted } = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState(TABS.includes(wanted ?? "") ? wanted! : "workouts");
  useEffect(() => {
    if (wanted && TABS.includes(wanted)) setTab(wanted);
  }, [wanted]);

  const setAvatar = (uri?: string) => update((d) => ({ ...d, profile: { ...d.profile, avatar: uri } }));
  const [afterSheet, setAfterSheet] = useState<(() => void) | null>(null);
  const takePhoto = async (from: "library" | "camera") => {
    const uri = await pickPhoto(from);
    if (uri) setAvatar(uri);
  };
  // The picker waits for the sheet to be gone: iOS refuses to present one over a modal still on its way out.
  const choosePhoto = (from: "library" | "camera") => {
    setAfterSheet(() => () => void takePhoto(from));
    setChangingPhoto(false);
  };

  const done = useMemo(() => finished(db.sessions), [db.sessions]);
  const workouts = useMemo(() => [...done].reverse().map((s) => ({ s, prs: newRecords(s, db.sessions.filter((x) => x.startedAt < s.startedAt)).length, photo: s.photo ? { uri: s.photo } : undefined })), [done, db.sessions]);
  const withPhoto = workouts.filter((w) => w.photo);
  const gap = 8;
  // Thirty-five squares in one run is a wall; a month at a time is a page.
  const byMonth = useMemo(() => {
    const out: { key: string; label: string; items: typeof workouts }[] = [];
    for (const item of workouts) {
      const d = new Date(item.s.startedAt);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const label = d.toLocaleDateString(locale, { month: "long", year: d.getFullYear() === new Date().getFullYear() ? undefined : "numeric" });
      const last = out[out.length - 1];
      if (last && last.key === key) last.items.push(item);
      else out.push({ key, label: label.charAt(0).toUpperCase() + label.slice(1), items: [item] });
    }
    return out;
  }, [workouts]);
  const tile = Math.floor((Math.min(width, 520) - layout.screenInset * 2 - gap * 2) / 3);

  return (
    <Screen tabs>
      <Row gap={12}>
        <Txt variant="displayXL" style={{ flex: 1 }}>
          {t("Profile")}
        </Txt>
        <IconButton name="settings" onPress={() => router.push("/settings")} accessibilityLabel={t("Settings")} />
      </Row>

      <Row gap={16}>
        <View>
          <Pressable accessibilityRole="button" accessibilityLabel={me.photo ? t("See your photo") : t("Change your photo")} onPress={() => (me.photo ? setZoomAvatar(true) : setChangingPhoto(true))} style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}>
            <Avatar source={me.photo} size={72} initial={me.initial} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={t("Change your photo")} hitSlop={8} onPress={() => setChangingPhoto(true)} style={({ pressed }) => ({ position: "absolute", right: -2, bottom: -2, width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg.raised, borderWidth: 2, borderColor: colors.bg.ground, opacity: pressed ? 0.7 : 1 })}>
            <Icon name="camera" size={13} color={colors.text.secondary} strokeWidth={1.9} />
          </Pressable>
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Txt variant="displayL">{db.profile.name}</Txt>
          <Txt variant="bodyS" tone="secondary">
            {[db.profile.handle, db.profile.showCity === false ? "" : db.profile.city].filter(Boolean).join(", ")}
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
          ]}
        />

        {tab === "workouts" ? (
          workouts.length === 0 ? (
            <Txt variant="bodyM" tone="secondary" style={{ paddingTop: 4 }}>
              {t("Your finished sessions will show up here, one square each.")}
            </Txt>
          ) : (
            <View style={{ gap: 20 }}>
              {byMonth.map((group) => (
                <View key={group.key} style={{ gap: 12 }}>
                  <Txt variant="labelS" tone="tertiary">
                    {group.label}
                  </Txt>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap }}>
                    {group.items.map(({ s, prs, photo }) => (
                      <WorkoutTile key={s.id} name={s.planName} date={String(new Date(s.startedAt).getDate())} photo={photo} records={prs} size={tile} onPress={() => router.push(`/workout/${s.id}?of=me`)} />
                    ))}
                  </View>
                </View>
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
                <Pressable key={s.id} accessibilityRole="button" accessibilityLabel={`${s.planName}, ${shortDate(s.startedAt)}`} onPress={() => router.push(`/workout/${s.id}?of=me`)} style={({ pressed }) => ({ width: tile, height: tile, borderRadius: 14, overflow: "hidden", backgroundColor: colors.bg.surface, opacity: pressed ? 0.8 : 1 })}>
                  <Image source={photo} style={{ width: tile, height: tile }} resizeMode="cover" />
                </Pressable>
              ))}
            </View>
          )
        ) : null}

      </View>

      <PhotoViewer source={me.photo} visible={zoomAvatar} onClose={() => setZoomAvatar(false)} />

      <BottomSheet visible={changingPhoto} onClose={() => setChangingPhoto(false)} onClosed={() => { const go = afterSheet; setAfterSheet(null); go?.(); }} title={t("Your photo")} subtitle={t("It stays on this phone, like everything else in CresQ.")}>
        <SheetGroup>
          <SheetOption icon="camera" label={t("Take a photo")} onPress={() => choosePhoto("camera")} />
          <SheetOption icon="rows" label={t("Choose from your library")} onPress={() => choosePhoto("library")} />
        </SheetGroup>
        {db.profile.avatar ? (
          <SheetGroup>
            <SheetOption icon="trash" label={t("Remove photo")} sub={t("Your initial takes its place")} danger onPress={() => { setAvatar(undefined); setChangingPhoto(false); }} />
          </SheetGroup>
        ) : null}
      </BottomSheet>
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
