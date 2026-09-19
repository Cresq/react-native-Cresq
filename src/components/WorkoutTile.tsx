import { Image, View, type ImageSourcePropType } from "react-native";
import { Press } from "./ui/Press";
import { useTheme } from "@/theme/ThemeProvider";
import { Txt } from "./ui/Text";
import { Icon } from "./ui/Icon";

/** "Push" → "PU", "Chest & Back" → "C&B", "Arms & Shoulders" → "A&S", "Upper body" → "UB". */
export function abbreviate(name: string) {
  const words = name.split(/\s+/).filter((w) => w && w !== "&" && w.toLowerCase() !== "and");
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  const joiner = /&|\band\b/i.test(name) ? "&" : "";
  return words.map((w) => w[0].toUpperCase()).join(joiner);
}

/**
 * One square in the workouts grid. A photo when the session has one; otherwise
 * the workout's abbreviation, quiet, so thirty of them read as a pattern and
 * not as thirty things shouting. Three small things sit at its edges and no
 * more: the day at the top left, a trophy at the top right when a record fell,
 * how long it took at the bottom. On a photo they stand on small grounds of
 * their own so they can be read whatever the picture is. The tile is a door;
 * the session page holds the detail.
 */
export function WorkoutTile({ name, date, minutes, photo, records, size, onPress }: { name: string; /** The day, short: "za 19". */ date: string; minutes?: number; photo?: ImageSourcePropType; records?: number; size: number; onPress?: () => void }) {
  const { colors } = useTheme();
  // On a photo each mark gets a ground to stand on; on the plain tile the tile is the ground.
  const ground = photo ? { backgroundColor: colors.bg.ground, borderRadius: 8, paddingVertical: 3, paddingHorizontal: 6 } : null;
  return (
    <Press accessibilityRole={onPress ? "button" : undefined} disabled={!onPress} accessibilityLabel={`${name}, ${date}`} onPress={onPress} scaleTo={0.96} style={{ width: size, height: size, borderRadius: 14, overflow: "hidden", backgroundColor: colors.bg.surface }}>
      {photo ? <Image source={photo} style={{ width: size, height: size }} resizeMode="cover" /> : null}
      {!photo ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Txt variant="displayM" tone="tertiary">
            {abbreviate(name)}
          </Txt>
        </View>
      ) : null}
      <View style={[{ position: "absolute", left: photo ? 6 : 10, top: photo ? 6 : 9 }, ground]}>
        <Txt variant="labelS" tone="secondary">
          {date}
        </Txt>
      </View>
      {records ? (
        <View style={[{ position: "absolute", right: photo ? 6 : 10, top: photo ? 6 : 9 }, ground]}>
          <Icon name="trophy" size={13} color={colors.pr.gold} strokeWidth={2} />
        </View>
      ) : null}
      {minutes ? (
        <View style={[{ position: "absolute", left: photo ? 6 : 10, bottom: photo ? 6 : 9, flexDirection: "row", alignItems: "center", gap: 4 }, ground]}>
          <Icon name="timer" size={11} color={colors.text.tertiary} strokeWidth={2} />
          <Txt variant="labelS" tone="tertiary" tabular>
            {minutes} min
          </Txt>
        </View>
      ) : null}
    </Press>
  );
}
