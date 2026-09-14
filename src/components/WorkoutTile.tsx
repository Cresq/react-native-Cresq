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
 * the workout's abbreviation on a surface, so the grid still reads at a glance.
 * A record shows as a small trophy in the corner. Nothing else: the tile is a door.
 */
export function WorkoutTile({ name, date, photo, records, size, onPress }: { name: string; date: string; photo?: ImageSourcePropType; records?: number; size: number; onPress?: () => void }) {
  const { colors } = useTheme();
  return (
    <Press accessibilityRole={onPress ? "button" : undefined} disabled={!onPress} accessibilityLabel={`${name}, ${date}`} onPress={onPress} scaleTo={0.96} style={{ width: size, height: size, borderRadius: 14, overflow: "hidden", backgroundColor: colors.bg.surface }}>
      {photo ? <Image source={photo} style={{ width: size, height: size }} resizeMode="cover" /> : null}
      {!photo ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Txt variant="displayL" tone="secondary">
            {abbreviate(name)}
          </Txt>
        </View>
      ) : null}
      <View style={{ position: "absolute", left: 8, bottom: 8, paddingVertical: 3, paddingHorizontal: 7, borderRadius: 999, backgroundColor: photo ? colors.bg.ground : "transparent", opacity: photo ? 0.9 : 1 }}>
        <Txt variant="labelS" tone={photo ? "primary" : "tertiary"}>
          {date}
        </Txt>
      </View>
      {records ? (
        <View style={{ position: "absolute", right: 8, top: 8, width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: photo ? colors.bg.ground : "transparent" }}>
          <Icon name="trophy" size={14} color={colors.pr.gold} strokeWidth={2} />
        </View>
      ) : null}
    </Press>
  );
}
