import { Image, View, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import type { Exercise } from "@/db/types";
import { useT } from "@/i18n";
import { Icon } from "./ui/Icon";
import { Txt } from "./ui/Text";

/**
 * The picture or the loop that shows how an exercise is done. The artwork is
 * bought per exercise and dropped into `Exercise.image` and `Exercise.animation`
 * as it arrives, so the space it will take is already here: until then the slot
 * holds a quiet mark, and nothing on the screen moves when the art lands.
 *
 * `animation` wins when both are set and the slot is large enough to read.
 */
export function ExerciseMedia({ exercise, size = 48, radius, style }: { exercise: Exercise | undefined; size?: number; radius?: number; style?: StyleProp<ViewStyle> }) {
  const { colors, radius: r } = useTheme();
  const t = useT();
  const source = exercise?.animation ?? exercise?.image;
  const big = size >= 120;
  return (
    <View style={[{ width: size, height: size, borderRadius: radius ?? (big ? r.cardM : r.iconBox), overflow: "hidden", backgroundColor: colors.bg.raised, alignItems: "center", justifyContent: "center", gap: 6 }, style]}>
      {source ? (
        <Image source={{ uri: source }} style={{ width: size, height: size }} resizeMode="cover" />
      ) : (
        <>
          <Icon name="dumbbell" size={big ? 32 : Math.max(16, size * 0.38)} color={colors.text.tertiary} strokeWidth={1.7} />
          {big ? (
            <Txt variant="labelS" tone="tertiary">
              {t("Animation coming")}
            </Txt>
          ) : null}
        </>
      )}
    </View>
  );
}
