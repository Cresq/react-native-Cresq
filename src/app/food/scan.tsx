import { useRef, useState } from "react";
import { ActivityIndicator, Linking, StyleSheet, View } from "react-native";
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNav } from "@/nav";
import { useTheme } from "@/theme/ThemeProvider";
import { useT } from "@/i18n";
import { haptic } from "@/haptics";
import { useFood } from "@/store/food";
import { lookupBarcode, LookupFailed } from "@/nutrition/openfoodfacts";
import { fetchProduct } from "@/nutrition/cloud";
import { setDraft } from "@/nutrition/draft";
import { Screen, Header } from "@/components/ui/Screen";
import { Txt } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { BottomSheet, SheetOption } from "@/components/ui/BottomSheet";
import { Viewfinder, CameraTop } from "@/components/Viewfinder";

type Status = "idle" | "looking" | "notfound" | "offline";

/**
 * Point the camera at a pack. A known barcode goes straight to the product
 * with a portion ready to log; an unknown one offers the two ways to teach the
 * app the product, off the nutrition table or by hand.
 *
 * The screen is a chain of replacements, not a stack: scan becomes the product,
 * or becomes the label camera which becomes the review which becomes the
 * product. Wherever you are, closing lands on the Food tab, never on a camera.
 */
export default function Scan() {
  const { colors } = useTheme();
  const router = useNav();
  const t = useT();
  const insets = useSafeAreaInsets();
  const { remember } = useFood();
  const [perm, ask] = useCameraPermissions();
  const [status, setStatus] = useState<Status>("idle");
  const [code, setCode] = useState("");
  const [afterSheet, setAfterSheet] = useState<(() => void) | null>(null);
  // The scanner reports the same barcode every frame it can see it; one is enough.
  const busy = useRef(false);
  /** The camera is taken down a frame before the screen goes: a preview still live under a modal sliding away is what looked skewed. */
  const [gone, setGone] = useState(false);
  const go = (fn: () => void) => {
    setGone(true);
    setTimeout(fn, 16);
  };

  const leave = () => go(() => router.back("/(tabs)/food"));

  const onScan = async ({ data }: BarcodeScanningResult) => {
    if (busy.current || !data) return;
    busy.current = true;
    haptic("select");
    setCode(data);
    setStatus("looking");
    try {
      // The shelf first: a pack somebody already checked is the better answer. Then the open database.
      const found = (await fetchProduct(data).catch(() => null)) ?? (await lookupBarcode(data));
      if (found) {
        const id = remember(found);
        haptic("done");
        go(() => router.replace(`/food/${id}?log=1`));
        return;
      }
      setStatus("notfound");
    } catch (e) {
      setStatus(e instanceof LookupFailed ? "offline" : "notfound");
    }
  };

  const again = () => {
    setStatus("idle");
    busy.current = false;
  };
  const toLabel = () => {
    setAfterSheet(() => () => go(() => router.replace(`/food/label?barcode=${encodeURIComponent(code)}`)));
    setStatus("idle");
  };
  const byHand = (withCode: boolean) => {
    setDraft({ barcode: withCode ? code : undefined, unit: "g", source: "manual", verified: false });
    setAfterSheet(() => () => go(() => router.replace("/food/review?from=manual")));
    setStatus("idle");
  };

  if (!perm) return <View style={{ flex: 1, backgroundColor: "#000" }} />;
  if (!perm.granted) {
    return (
      <Screen>
        <Header left={<IconButton name="close" onPress={leave} accessibilityLabel={t("Close")} />} title={t("Scan a pack")} />
        <Txt variant="displayL">{t("The camera reads the barcode")}</Txt>
        <Txt variant="bodyM" tone="secondary">
          {t("CresQ uses the camera to read barcodes and nutrition tables. Nothing is recorded and no photo leaves your phone unless you ask it to read a table.")}
        </Txt>
        {perm.canAskAgain ? (
          <Button label={t("Allow the camera")} onPress={() => ask()} />
        ) : (
          <>
            <Txt variant="bodyS" tone="tertiary">
              {t("Camera access is off for CresQ. Turn it on in your phone's settings.")}
            </Txt>
            <Button label={t("Open settings")} variant="secondary" onPress={() => Linking.openSettings()} />
          </>
        )}
        <Button label={t("Enter by hand instead")} variant="tertiary" size="M" onPress={() => { setDraft({ unit: "g", source: "manual", verified: false }); router.replace("/food/review?from=manual"); }} />
      </Screen>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      {gone ? null : <CameraView style={StyleSheet.absoluteFill} facing="back" barcodeScannerSettings={{ barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e"] }} onBarcodeScanned={status === "idle" ? onScan : undefined} />}

      <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
        <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16 }}>
          <CameraTop onClose={leave} closeLabel={t("Close")} title={t("Scan a pack")} />
        </View>

        <Viewfinder width={280} height={170} caption={t("Point at the barcode")} lift={56} />

        <View style={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 20, gap: 12 }}>
          {status === "looking" ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, alignSelf: "center", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, backgroundColor: "rgba(0,0,0,0.55)" }}>
              <ActivityIndicator color="#fff" />
              <Txt variant="labelM" style={{ color: "#fff" }}>
                {t("Looking up {code}", { code })}
              </Txt>
            </View>
          ) : null}
          <Button label={t("Enter by hand")} variant="secondary" size="M" onPress={() => byHand(false)} />
        </View>
      </View>

      <BottomSheet
        visible={status === "notfound" || status === "offline"}
        onClose={again}
        onClosed={() => { const go = afterSheet; setAfterSheet(null); go?.(); }}
        title={status === "offline" ? t("No connection") : t("Not in the database yet")}
        subtitle={status === "offline" ? t("The barcode could not be looked up right now. You can still read the table or type the figures in.") : t("{code} is not known yet. Teach CresQ this product once and every scan after that is instant.", { code })}
      >
        <View style={{ gap: 4 }}>
          {status === "offline" ? <SheetOption icon="reload" label={t("Try again")} sub={t("Scan the barcode once more")} onPress={again} /> : null}
          <SheetOption icon="camera" label={t("Photograph the nutrition table")} sub={t("CresQ reads the figures, you check them")} onPress={toLabel} />
          <SheetOption icon="noteEdit" label={t("Type the figures in")} sub={t("From the back of the pack")} onPress={() => byHand(true)} />
        </View>
      </BottomSheet>
      <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: 0, height: 0, backgroundColor: colors.bg.ground }} />
    </View>
  );
}
