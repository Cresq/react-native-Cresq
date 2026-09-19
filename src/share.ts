import { Share } from "react-native";

/**
 * Hand a line of text to the phone's share sheet.
 *
 * Closing the sheet without choosing anything is not an error, and a browser
 * without a share sheet rejects outright: neither may turn a tap into an
 * unhandled rejection. Says whether the sheet was opened.
 */
export async function shareText(message: string, title?: string) {
  try {
    await Share.share(title ? { title, message } : { message });
    return true;
  } catch {
    return false;
  }
}
