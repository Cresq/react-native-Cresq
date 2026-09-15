import { Image, Modal, Pressable, View, useWindowDimensions, type ImageSourcePropType } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { useT } from "@/i18n";
import { IconButton } from "./ui/IconButton";

/**
 * The photo on its own: black ground, the whole image in view, nothing else.
 * Tapping anywhere closes it, the way a photo you opened by accident should.
 */
export function PhotoViewer({ source, visible, onClose }: { source?: ImageSourcePropType; visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const t = useT();
  if (!visible || !source) return null;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(140)} style={{ flex: 1, backgroundColor: "#000" }}>
        <Pressable accessibilityRole="button" accessibilityLabel={t("Close")} onPress={onClose} style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Image source={source} style={{ width, height: height - insets.top - insets.bottom }} resizeMode="contain" />
        </Pressable>
        <View style={{ position: "absolute", top: insets.top + 8, left: 12 }}>
          <IconButton name="close" onPress={onClose} accessibilityLabel={t("Close")} />
        </View>
      </Animated.View>
    </Modal>
  );
}
