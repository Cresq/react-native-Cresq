import { View } from "react-native";
import { Press } from "./ui/Press";
import { Icon } from "./ui/Icon";
import { Txt } from "./ui/Text";

/**
 * The frame drawn over a camera, and the one control that always sits on it.
 * These are deliberately not themed: a viewfinder is dark with light marks
 * whatever the app's theme is, because the picture behind it is whatever the
 * room is.
 */
export function Viewfinder({ width, height, caption }: { width: number; height: number; caption: string }) {
  return (
    <View pointerEvents="none" style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 18 }}>
      <View style={{ width, height }}>
        {(["tl", "tr", "bl", "br"] as const).map((c) => (
          <View
            key={c}
            style={{
              position: "absolute",
              width: 28,
              height: 28,
              borderColor: "rgba(255,255,255,0.92)",
              top: c.startsWith("t") ? 0 : undefined,
              bottom: c.startsWith("b") ? 0 : undefined,
              left: c.endsWith("l") ? 0 : undefined,
              right: c.endsWith("r") ? 0 : undefined,
              borderTopWidth: c.startsWith("t") ? 3 : 0,
              borderBottomWidth: c.startsWith("b") ? 3 : 0,
              borderLeftWidth: c.endsWith("l") ? 3 : 0,
              borderRightWidth: c.endsWith("r") ? 3 : 0,
              borderTopLeftRadius: c === "tl" ? 14 : 0,
              borderTopRightRadius: c === "tr" ? 14 : 0,
              borderBottomLeftRadius: c === "bl" ? 14 : 0,
              borderBottomRightRadius: c === "br" ? 14 : 0,
            }}
          />
        ))}
      </View>
      <Txt variant="labelM" style={{ color: "rgba(255,255,255,0.85)" }}>
        {caption}
      </Txt>
    </View>
  );
}

export function CameraClose({ onPress, label }: { onPress: () => void; label: string }) {
  return (
    <Press accessibilityRole="button" accessibilityLabel={label} scaleTo={0.92} onPress={onPress} wrapperStyle={{ alignSelf: "flex-start" }} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center" }}>
      <Icon name="close" size={20} color="#fff" strokeWidth={2.2} />
    </Press>
  );
}

/** The one big round button a camera has. */
export function Shutter({ onPress, label, disabled }: { onPress: () => void; label: string; disabled?: boolean }) {
  return (
    <Press accessibilityRole="button" accessibilityLabel={label} scaleTo={0.9} onPress={onPress} disabled={disabled} wrapperStyle={{ alignSelf: "center" }} style={{ width: 76, height: 76, borderRadius: 38, borderWidth: 4, borderColor: "rgba(255,255,255,0.9)", alignItems: "center", justifyContent: "center", opacity: disabled ? 0.4 : 1 }}>
      <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: "#fff" }} />
    </Press>
  );
}
