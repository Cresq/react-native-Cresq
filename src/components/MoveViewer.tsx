import { useEffect } from "react";
import { Modal, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useVideoPlayer, VideoView } from "expo-video";
import { useTheme } from "@/theme/ThemeProvider";
import type { Exercise } from "@/db/types";
import { move } from "@/data/moves";
import { useT } from "@/i18n";
import { Txt } from "./ui/Text";
import { Icon } from "./ui/Icon";
import { IconButton } from "./ui/IconButton";
import { MEDIA_GROUND } from "./ExerciseMedia";

/**
 * How the movement is done. A short loop, no sound, no controls: it is a
 * diagram that happens to move, not a video somebody watches to the end.
 *
 * The clip is drawn on its own near-white plate in both themes. The artwork was
 * modelled on a white wall, and putting it on a near-black ground would leave a
 * bright rectangle floating in the dark with a hard edge; giving it a plate of
 * its own makes that edge deliberate.
 */
export function MoveViewer({ exercise, onClose }: { exercise: Exercise | null; onClose: () => void }) {
  // The shape every clip in the pack was rendered at, 1936 by 1072.
  const clipRatio = 1936 / 1072;
  const { colors, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const t = useT();
  const art = move(exercise?.move);

  // Play is asked for at creation as well as in the effect below. Mounted fresh
  // with a source already set, the effect can run before the player has loaded
  // anything, and that play request is dropped on the floor.
  const player = useVideoPlayer(art?.clip ?? null, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  // A player survives the sheet closing, so it is told to start over each time.
  useEffect(() => {
    if (!exercise || !art) return;
    player.currentTime = 0;
    player.play();
    return () => {
      player.pause();
    };
  }, [exercise, art, player]);

  return (
    <Modal visible={!!exercise && !!art} transparent={false} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: colors.bg.ground, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 20, paddingHorizontal: 20, gap: 20 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Txt variant="displayM" numberOfLines={2}>
              {exercise?.name}
            </Txt>
            <Txt variant="bodyS" tone="tertiary">
              {exercise ? `${exercise.muscles}, ${exercise.equipment}` : ""}
            </Txt>
          </View>
          <IconButton name="close" onPress={onClose} accessibilityLabel={t("Close")} />
        </View>

        {/* The clip's own ratio, so the plate holds the picture with no bars around it. */}
        <View style={{ width: "100%", aspectRatio: clipRatio, maxWidth: "100%", borderRadius: radius.card, overflow: "hidden", backgroundColor: MEDIA_GROUND, borderWidth: 1, borderColor: colors.border.subtle }}>
          <VideoView player={player} style={{ width: "100%", height: "100%" }} contentFit="cover" nativeControls={false} allowsPictureInPicture={false} />
        </View>

        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
          <Icon name="info" size={14} color={colors.text.tertiary} strokeWidth={1.9} />
          <Txt variant="labelS" tone="tertiary" style={{ flex: 1 }}>
            {t("The muscles the movement works are marked in red. It loops until you close it.")}
          </Txt>
        </View>

        <View style={{ flex: 1 }} />
      </View>
    </Modal>
  );
}
