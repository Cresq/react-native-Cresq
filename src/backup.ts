import { Platform } from "react-native";
import { File } from "expo-file-system";
import { DB_VERSION, type Db } from "@/db/types";

/**
 * A backup is the export file read back in. With no server, this is the only
 * way somebody moves their training to a new phone, so the export is only half
 * a backup until it can be restored.
 */
export async function pickBackupText(): Promise<string | null> {
  if (Platform.OS === "web") {
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "application/json,.json";
      input.oncancel = () => resolve(null);
      input.onchange = () => {
        const picked = input.files?.[0];
        if (!picked) return resolve(null);
        const reader = new FileReader();
        reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
        reader.onerror = () => resolve(null);
        reader.readAsText(picked);
      };
      input.click();
    });
  }
  const res = await File.pickFileAsync({ mimeTypes: ["application/json"] });
  if (res.canceled || !res.result) return null;
  return await res.result.text();
}

export type Backup = { profile: Db["profile"]; sessions: Db["sessions"]; plans: Db["plans"] };

/**
 * What a CresQ export looks like, checked before anything is replaced. The
 * shape is deliberately loose: an export from an older version must still come
 * back, because that is exactly when a person needs it.
 */
export function readBackup(text: string): { ok: true; data: Partial<Db>; sessions: number } | { ok: false; why: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, why: "not-json" };
  }
  if (!parsed || typeof parsed !== "object") return { ok: false, why: "not-json" };
  const d = parsed as Partial<Db> & { app?: string };
  if (!Array.isArray(d.sessions) || !d.profile || typeof d.profile !== "object") return { ok: false, why: "not-cresq" };
  return { ok: true, data: { ...d, version: d.version ?? DB_VERSION }, sessions: d.sessions.length };
}
