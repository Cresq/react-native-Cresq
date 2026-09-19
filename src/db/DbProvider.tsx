import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from "react";
import { AppState } from "react-native";
import { DB_VERSION, type Db } from "./types";
import { clearDb, flushDb, loadDb, onSaveTrouble, saveDb, uid } from "./storage";
import { createSeedDb, seedSampleInvite } from "./seed";

type DbState = {
  db: Db;
  ready: boolean;
  /** True when the last write to the device failed. The app says so rather than pretending it saved. */
  saveFailed: boolean;
  /** Apply a pure update; the result is persisted after a short debounce. */
  update: (fn: (db: Db) => Db) => void;
  /** Wipe everything and reseed. Used by Settings › Reset. */
  reset: () => Promise<void>;
  /** Replace everything with a document from a backup file. */
  restore: (data: Partial<Db>) => void;
  /** Write out what is pending and recompute every screen from the document. What pull-to-refresh does until there is a server to ask. */
  refresh: () => void;
};

const DbContext = createContext<DbState | null>(null);

/**
 * Carry a stored document forward to the current shape. Every version is
 * migrated, never discarded: what is in there is somebody's training history.
 * Keys added since their first launch get the seed's default; everything the
 * person has themselves is left exactly as it was.
 */
function migrate(stored: Db): Db {
  const fresh = createSeedDb();
  // The library is ours, so a catalogue entry is refreshed from the seed: that is
  // how a name correction or newly bought artwork reaches somebody who installed
  // last month. Anything the person added themselves is not in the catalogue and
  // is left exactly as it is. Order is theirs; new movements are appended.
  const catalogue = new Map(fresh.exercises.map((e) => [e.id, e]));
  const had = new Set((stored.exercises ?? []).map((e) => e.id));
  const exercises = [
    ...(stored.exercises ?? []).map((e) => catalogue.get(e.id) ?? e),
    ...fresh.exercises.filter((e) => !had.has(e.id)),
  ];
  const auth = stored.auth ?? fresh.auth;
  return {
    ...fresh,
    ...stored,
    version: DB_VERSION,
    exercises,
    // An account minted before accounts existed: give it its id now, once.
    auth: { ...auth, account: auth.account ?? (auth.signedIn ? { id: uid(), email: "", createdAt: stored.createdAt ?? Date.now() } : undefined) },
    profile: { ...fresh.profile, ...stored.profile },
    consent: { ...fresh.consent, ...(stored.consent ?? {}) },
    plans: stored.plans ?? fresh.plans,
    sessions: stored.sessions ?? [],
    split: stored.split ?? fresh.split,
    following: stored.following ?? fresh.following,
    blocked: stored.blocked ?? [],
    foods: stored.foods ?? [],
    foodLog: stored.foodLog ?? [],
    // Invitations arrived after this log began: the sample one comes along only where the sample sessions still are.
    invites: stored.invites ?? ((stored.sessions ?? []).some((s) => s.sample) ? [seedSampleInvite()] : []),
    burns: stored.burns ?? [],
    weights: stored.weights ?? [],
  };
}

export function DbProvider({ children }: PropsWithChildren) {
  const [db, setDb] = useState<Db>(() => createSeedDb());
  const [ready, setReady] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const loaded = useRef(false);

  useEffect(() => {
    let alive = true;
    loadDb().then((stored) => {
      if (!alive) return;
      // Any stored document is carried forward. A newer one than this build knows
      // about is left alone too: dropping back a version must not cost a log.
      if (stored) setDb(migrate(stored));
      else saveDb(db);
      loaded.current = true;
      setReady(true);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const off = onSaveTrouble(setSaveFailed);
    return () => {
      off();
    };
  }, []);

  // Leaving the foreground is the moment a write is most likely to be lost, so the debounce is cut short.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active") flushDb();
    });
    return () => sub.remove();
  }, []);

  const update = useCallback((fn: (d: Db) => Db) => {
    setDb((cur) => {
      const next = fn(cur);
      if (next !== cur && loaded.current) saveDb(next);
      return next;
    });
  }, []);

  const reset = useCallback(async () => {
    await clearDb();
    const fresh = createSeedDb();
    setDb(fresh);
    saveDb(fresh);
  }, []);

  /**
   * A backup replaces the document rather than merging into it: half of one log
   * and half of another is nobody's training history. It still goes through
   * `migrate`, so an export from an older version comes back whole.
   */
  const restore = useCallback((data: Partial<Db>) => {
    setDb((cur) => {
      // Restoring your own log must not sign you out. An older export carries no
      // account, so the one this device already holds stays.
      const auth = data.auth?.account ? data.auth : cur.auth;
      const next = migrate({ ...createSeedDb(), ...data, auth } as Db);
      saveDb(next);
      return next;
    });
  }, []);

  const refresh = useCallback(() => {
    flushDb();
    setDb((d) => ({ ...d }));
  }, []);

  const value = useMemo(() => ({ db, ready, saveFailed, update, reset, restore, refresh }), [db, ready, saveFailed, update, reset, restore, refresh]);
  return <DbContext.Provider value={value}>{children}</DbContext.Provider>;
}

export function useDb() {
  const ctx = useContext(DbContext);
  if (!ctx) throw new Error("useDb must be used inside DbProvider");
  return ctx;
}
