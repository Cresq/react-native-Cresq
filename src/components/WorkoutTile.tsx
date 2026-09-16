import { Image, View, type ImageSourcePropType } from "react-native";
import { Press } from "./ui/Press";
import { useTheme } from "@/theme/ThemeProvider";
import { Txt } from "./ui/Text";

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
 * the workout's abbreviation, quiet, so thirty of them read as a pattern and not
 * as thirty things shouting. A record is one small gold dot. Nothing else: the
 * tile is a door, the session page holds the detail.
 */
export function WorkoutTile({ name, date, photo, records, size, onPress }: { name: string; date: string; photo?: ImageSourcePropType; records?: number; size: number; onPress?: () => void }) {
  const { colors } = useTheme();
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
      {/* The day, only on a photo where it would otherwise be lost, and one dot for a record. */}
      {photo ? (
        <View style={{ position: "absolute", left: 8, bottom: 8, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 999, backgroundColor: colors.bg.ground }}>
          <Txt variant="labelS">{date}</Txt>
        </View>
      ) : null}
      {records ? <View style={{ position: "absolute", right: 8, top: 8, width: 6, height: 6, borderRadius: 3, backgroundColor: colors.pr.gold }} /> : null}
    </Press>
  );
}
