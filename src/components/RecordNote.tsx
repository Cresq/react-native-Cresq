import { useEffect } from "react";
import { View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSpring, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme/ThemeProvider";
import { useT } from "@/i18n";
import { layouts, springs, timing, useReducedMotion } from "@/motion";
import { fmtSet, loadFigure } from "@/load";
import { Txt } from "./ui/Text";
import { Icon } from "./ui/Icon";

export type RecordMoment = { id: string; name: string; kg: number; reps: number; /** How much heavier than the best before it. */ gain: number; bodyweight: boolean };

/**
 * A new record, said once. The set was just ticked with more weight than this
 * movement has ever seen from this person, and that deserves more than a gold
 * tick: a note drops in under the top of the screen with a trophy that lands
 * with a small bounce and one ring that goes out from it, says what was
 * lifted and how much it beat, and leaves by itself before the next set.
 *
 * One bounce and one ring, because it happens in the middle of a workout: it
 * is a nod, not a show. With Reduce Motion the note simply appears.
 */
export function RecordNote({ moment }: { moment: RecordMoment }) {
  const { colors, layout, radius, shadow } = useTheme();
  const insets = useSafeAreaInsets();
  const t = useT();
  const reduced = useReducedMotion();
  const pop = useSharedValue(reduced ? 1 : 0.4);
  const ring = useSharedValue(0);

  useEffect(() => {
    if (reduced) return;
    // The trophy lands just after the note has arrived, and the ring leaves from where it landed.
    pop.set(withDelay(120, withSpring(1, springs.thrown)));
    ring.set(withDelay(200, withTiming(1, timing(700))));
  }, [moment.id, reduced, pop, ring]);

  const trophy = useAnimatedStyle(() => ({ transform: [{ scale: pop.get() }] }));
  const wave = useAnimatedStyle(() => ({ opacity: reduced ? 0 : 0.55 * (1 - ring.get()), transform: [{ scale: 1 + 1.3 * ring.get() }] }));
  const gain = Math.round(moment.gain * 10) / 10;

  return (
    <Animated.View
      entering={layouts.drop}
      exiting={layouts.lift}
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      style={[{ position: "absolute", left: layout.screenInset, right: layout.screenInset, top: insets.top + 8, flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderRadius: radius.button, backgroundColor: colors.pr.soft, borderWidth: 1, borderColor: colors.pr.gold }, shadow.floating]}
    >
      <View style={{ width: 36, height: 36, alignItems: "center", justifyContent: "center" }}>
        <Animated.View style={[{ position: "absolute", width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: colors.pr.gold }, wave]} />
        <Animated.View style={[{ width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: colors.pr.gold }, trophy]}>
          <Icon name="trophy" size={18} color={colors.accent.on} strokeWidth={2} />
        </Animated.View>
      </View>
      <View style={{ flex: 1, gap: 1 }}>
        <Txt variant="labelL">{t("New record")}</Txt>
        <Txt variant="labelM" tone="secondary" numberOfLines={2}>
          {`${moment.name}, ${fmtSet(moment.kg, moment.reps, moment.bodyweight)}`}
          {gain > 0 ? `, ${t("{kg} kg more than ever before", { kg: loadFigure(gain, false) })}` : ""}
        </Txt>
      </View>
    </Animated.View>
  );
}
