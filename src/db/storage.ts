import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Db } from "./types";

const KEY = "cresq.db.v1";

export async function loadDb(): Promise<Db | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Db) : null;
  } catch {
    return null;
  }
}

let pending: ReturnType<typeof setTimeout> | null = null;
let latest: Db | null = null;

/** Writes are coalesced: many set edits in a row become one write. */
export function saveDb(db: Db) {
  latest = db;
  if (pending) return;
  pending = setTimeout(async () => {
    pending = null;
    if (!latest) return;
    try {
      await AsyncStorage.setItem(KEY, JSON.stringify(latest));
    } catch {
      // Storage failures are not fatal for a log; the next write retries.
    }
  }, 250);
}

export async function clearDb() {
  latest = null;
  if (pending) {
    clearTimeout(pending);
    pending = null;
  }
  await AsyncStorage.removeItem(KEY);
}

export const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
