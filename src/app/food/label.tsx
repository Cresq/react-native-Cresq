import { useRef, useState } from "react";
import { ActivityIndicator, Image, StyleSheet, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { useNav } from "@/nav";
import { useT } from "@/i18n";
import { haptic } from "@/haptics";
import { readLabel, LabelReaderUnavailable } from "@/nutrition/label";
import { setDraft } from "@/nutrition/draft";
import { Screen, Header } from "@/components/ui/Screen";
import { Txt } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { BottomSheet, SheetGroup, SheetOption } from "@/components/ui/BottomSheet";
import { Viewfinder, CameraTop, Shutter } from "@/components/Viewfinder";

/**
 * Photograph the nutrition table. The photo is shrunk to something a phone
 * signal will carry, sent to the reader, and what comes back goes to the
 * review screen for the person to check against the pack. The app never
 * saves a figure it read without somebody having looked at it.
 */
export default function Label() {
  const router = useNav();
  const t = useT();
  const insets = useSafeAreaInsets();
  const { barcode } = useLocalSearchParams<{ barcode?: string }>();
  const [perm, ask] = useCameraPermissions();
  const camera = useRef<CameraView>(null);
  const [still, setStill] = useState<string | null>(null);
  const [trouble, setTrouble] = useState<"unavailable" | "failed" | null>(null);
  const [afterSheet, setAfterSheet] = useState<(() => void) | null>(null);
  /** The camera is taken down a frame before the screen goes: a preview still live under a modal sliding away is what looked skewed. */
  const [gone, setGone] = useState(false);
  const go = (fn: () => void) => {
    setGone(true);
    setTimeout(fn, 16);
  };

  const leave = () => go(() => router.back("/(tabs)/food"));
  // From the trouble sheet the review waits for the sheet to be gone; from the button under the camera it goes straight away.
  const byHand = () => {
    setDraft({ barcode, unit: "g", source: "manual", verified: false, photoUri: still ?? undefined });
    const toReview = () => go(() => router.replace("/food/review?from=manual"));
    if (trouble) {
      setAfterSheet(() => toReview);
      setTrouble(null);
    } else toReview();
  };

  const shoot = async () => {
    if (!camera.current || still) return;
    haptic("tap");
    let uri = "";
    try {
      const shot = await camera.current.takePictureAsync({ quality: 0.9 });
      if (!shot?.uri) return;
      setStill(shot.uri);
      // 1400 px across is plenty to read a table and a fraction of a full-size photo.
      const small = await ImageManipulator.manipulate(shot.uri).resize({ width: 1400 }).renderAsync();
      const saved = await small.saveAsync({ format: SaveFormat.JPEG, compress: 0.82, base64: true });
      uri = saved.uri;
      if (!saved.base64) throw new Error("no base64");
      const read = await readLabel({ base64: saved.base64, mime: "image/jpeg" });
      setDraft({ ...read, barcode, source: "label", verified: false, photoUri: uri || shot.uri });
      haptic("done");
      router.replace("/food/review?from=label");
    } catch (e) {
      haptic("error");
      setTrouble(e instanceof LabelReaderUnavailable ? "unavailable" : "failed");
    }
  };

  const retry = () => {
    setTrouble(null);
    setStill(null);
  };

  if (!perm) return <View style={{ flex: 1, backgroundColor: "#000" }} />;
  if (!perm.granted) {
    return (
      <Screen>
        <Header left={<IconButton name="close" onPress={leave} accessibilityLabel={t("Close")} />} title={t("Read the table")} />
        <Txt variant="displayL">{t("The camera reads the barcode")}</Txt>
        <Txt variant="bodyM" tone="secondary">
          {t("CresQ uses the camera to read barcodes and nutrition tables. Nothing is recorded and no photo leaves your phone unless you ask it to read a table.")}
        </Txt>
        <Button label={t("Allow the camera")} onPress={() => ask()} />
        <Button label={t("Enter by hand instead")} variant="tertiary" size="M" onPress={() => { setDraft({ barcode, unit: "g", source: "manual", verified: false }); router.replace("/food/review?from=manual"); }} />
      </Screen>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      {still ? <Image source={{ uri: still }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : gone ? null : <CameraView ref={camera} style={StyleSheet.absoluteFill} facing="back" />}

      <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
        <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16 }}>
          <CameraTop onClose={leave} closeLabel={t("Close")} title={t("Read the table")} />
        </View>

        {still ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 14, backgroundColor: "rgba(0,0,0,0.45)" }}>
            {trouble ? null : <ActivityIndicator color="#fff" size="large" />}
            <Txt variant="labelL" style={{ color: "#fff" }}>
              {trouble ? t("Could not read it") : t("Reading the table")}
            </Txt>
          </View>
        ) : (
          <Viewfinder width={300} height={230} caption={t("Fill the frame with the nutrition table, flat and in the light")} lift={32} />
        )}

        <View style={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 20, gap: 16 }}>
          {still ? null : <Shutter onPress={shoot} label={t("Take the photo")} />}
          <Button label={t("Enter by hand")} variant="secondary" size="M" onPress={byHand} />
        </View>
      </View>

      <BottomSheet
        visible={!!trouble}
        onClose={retry}
        onClosed={() => { const go = afterSheet; setAfterSheet(null); go?.(); }}
        title={trouble === "unavailable" ? t("Reading is not switched on in this build") : t("The table could not be read")}
        subtitle={trouble === "unavailable" ? t("This copy of CresQ has nowhere to send the photo. The figures can be typed in from the pack in a minute.") : t("Bad light, a curved pack or no signal. Try once more, or type the figures in.")}
      >
        <SheetGroup>
          {trouble === "failed" ? <SheetOption icon="reload" label={t("Try again")} sub={t("Flat, close, in the light")} onPress={retry} /> : null}
          <SheetOption icon="noteEdit" label={t("Type the figures in")} sub={t("From the back of the pack")} onPress={byHand} />
        </SheetGroup>
      </BottomSheet>
    </View>
  );
}
