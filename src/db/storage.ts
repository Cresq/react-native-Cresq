import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Db } from "./types";

const KEY = "cresq.db.v1";
/** A copy of the last document we could not read or understand, kept so nothing is ever lost silently. */
const RESCUE = "cresq.db.rescue";

export async function loadDb(): Promise<Db | null> {
  let raw: string | null = null;
  try {
    raw = await AsyncStorage.getItem(KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Db;
    if (!parsed || typeof parsed !== "object") throw new Error("not an object");
    return parsed;
  } catch {
    // Unreadable. Put it aside rather than overwrite it: a person's whole log may be in there.
    try {
      await AsyncStorage.setItem(RESCUE, raw);
    } catch {
      /* nothing more we can do */
    }
    return null;
  }
}

/** The raw document set aside by a failed read, if there is one. Offered in Settings as a last resort. */
export async function rescueDb(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(RESCUE);
  } catch {
    return null;
  }
}

let pending: ReturnType<typeof setTimeout> | null = null;
let latest: Db | null = null;
let writing = false;
let failures = 0;
const listeners = new Set<(failed: boolean) => void>();

/** Told when a write fails, so the app can say so instead of pretending it saved. */
export function onSaveTrouble(fn: (failed: boolean) => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
const announce = (failed: boolean) => listeners.forEach((fn) => fn(failed));

async function writeNow() {
  if (writing || !latest) return;
  writing = true;
  const doc = latest;
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(doc));
    if (failures) announce(false);
    failures = 0;
  } catch {
    failures++;
    announce(true);
    // Back off and try again; the document in memory is still the truth.
    if (failures < 6) pending = setTimeout(() => { pending = null; void writeNow(); }, Math.min(8000, 400 * 2 ** failures));
  } finally {
    writing = false;
    // A newer document arrived while we were writing.
    if (latest !== doc && !pending) pending = setTimeout(() => { pending = null; void writeNow(); }, 0);
  }
}

/** Writes are coalesced: many set edits in a row become one write. */
export function saveDb(db: Db) {
  latest = db;
  if (pending) return;
  pending = setTimeout(() => {
    pending = null;
    void writeNow();
  }, 250);
}

/** Write immediately, without waiting for the debounce. Used when the app is leaving the foreground. */
export function flushDb() {
  if (pending) {
    clearTimeout(pending);
    pending = null;
  }
  void writeNow();
}

export async function clearDb() {
  latest = null;
  failures = 0;
  if (pending) {
    clearTimeout(pending);
    pending = null;
  }
  await AsyncStorage.removeItem(KEY);
}

export const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
