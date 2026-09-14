import * as ImagePicker from "expo-image-picker";

/**
 * Picking a photo for a session. Library or camera, one image, lightly
 * compressed. Returns a local uri or null when the user cancels or denies.
 * Nothing is uploaded; the uri stays in the session document on the device.
 */
export async function pickPhoto(source: "library" | "camera"): Promise<string | null> {
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], allowsEditing: true, aspect: [4, 5], quality: 0.8 };
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
}
