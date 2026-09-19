import * as ImagePicker from "expo-image-picker";

/**
 * Picking a photo. Library or camera, one image, lightly compressed. Returns a
 * local uri, or null when the user cancels or denies, or when the phone could
 * not show the picker at all. Nothing is uploaded; the uri stays on the device.
 *
 * Call it only once any sheet that offered it has closed: iOS will not present
 * a picker over a modal that is still on its way out, and says so by crashing.
 */
export async function pickPhoto(source: "library" | "camera"): Promise<string | null> {
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], allowsEditing: true, aspect: [4, 5], quality: 0.8 };
  try {
    if (source === "camera") {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return null;
      const res = await ImagePicker.launchCameraAsync(options);
      return res.canceled ? null : (res.assets[0]?.uri ?? null);
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return null;
    const res = await ImagePicker.launchImageLibraryAsync(options);
    return res.canceled ? null : (res.assets[0]?.uri ?? null);
  } catch {
    return null;
  }
}
