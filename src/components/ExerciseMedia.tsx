import { Image, Pressable, View, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import type { Exercise } from "@/db/types";
import { move } from "@/data/moves";
import { useT } from "@/i18n";
import { Icon } from "./ui/Icon";
import { Txt } from "./ui/Text";

/**
 * The still that shows what an exercise looks like: a round mark beside a row,
 * a square plate above a lift's own page. It is one frame lifted from the middle
 * of the movement, where the worked muscle is lit up, so the picture says which
 * exercise this is before the name is read.
 *
 * The artwork sits on a near-white ground. That ground is painted here rather
 * than taken from the theme, so the plate reads the same in both themes instead
 * of the figure floating on a colour that does not belong to it.
 */
export const MEDIA_GROUND = "#F4F3F1";

export function ExerciseMedia({
  exercise,
  size = 48,
  radius,
  round,
  ratio,
  onPress,
  style,
}: {
  exercise: Exercise | undefined;
  size?: number;
  radius?: number;
  round?: boolean;
  /** Give the plate this shape across the full width instead of a square of `size`. */
  ratio?: number;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors, radius: r } = useTheme();
  const t = useT();
  const art = move(exercise?.move);
  const big = ratio !== undefined || size >= 120;
  const corner = round ? size / 2 : (radius ?? (big ? r.cardM : r.iconBox));

  const inner = (
    <View
      style={[
        ratio !== undefined ? { width: "100%", aspectRatio: ratio } : { width: size, height: size },
        {
          borderRadius: corner,
          overflow: "hidden",
          backgroundColor: art ? MEDIA_GROUND : colors.bg.raised,
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          borderWidth: 1,
          borderColor: colors.border.subtle,
        },
        style,
      ]}
    >
      {art ? (
        // The still fills whatever box it is given, so a round mark and a wide plate
        // both show the figure rather than a square stranded in the middle.
        <Image source={art.poster} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
      ) : (
        <>
          <Icon name="dumbbell" size={big ? 32 : Math.max(16, size * 0.38)} color={colors.text.tertiary} strokeWidth={1.7} />
          {big ? (
            <Txt variant="labelS" tone="tertiary">
              {t("No animation for this one")}
            </Txt>
          ) : null}
        </>
      )}
    </View>
  );

  if (!onPress || !art) return inner;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t("Watch {name}", { name: exercise?.name ?? "" })}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
    >
      {inner}
      {/* A small play mark, so it is clear the picture does something. */}
      <View
        style={{
          position: "absolute",
          right: -1,
          bottom: -1,
          width: Math.max(16, size * 0.38),
          height: Math.max(16, size * 0.38),
          borderRadius: Math.max(8, size * 0.19),
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.accent.ember,
          borderWidth: 1.5,
          borderColor: colors.bg.ground,
        }}
      >
        <Icon name="play" size={Math.max(9, size * 0.2)} color={colors.accent.on} fill={colors.accent.on} strokeWidth={1.4} />
      </View>
    </Pressable>
  );
}
