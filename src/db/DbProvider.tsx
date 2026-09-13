import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from "react";
import { DB_VERSION, type Db } from "./types";
import { clearDb, loadDb, saveDb } from "./storage";
import { createSeedDb } from "./seed";

type DbState = {
  db: Db;
  ready: boolean;
  /** Apply a pure update; the result is persisted after a short debounce. */
  update: (fn: (db: Db) => Db) => void;
  /** Wipe everything and reseed. Used by Settings › Reset. */
  reset: () => Promise<void>;
};

const DbContext = createContext<DbState | null>(null);

/** Fill keys that were added after a document was first stored, without touching what the user already has. */
function migrate(stored: Db): Db {
  const fresh = createSeedDb();
  return { ...fresh, ...stored, profile: { ...fresh.profile, ...stored.profile }, consent: { ...fresh.consent, ...(stored.consent ?? {}) }, following: stored.following ?? fresh.following, blocked: stored.blocked ?? [] };
}

export function DbProvider({ children }: PropsWithChildren) {
  const [db, setDb] = useState<Db>(() => createSeedDb());
  const [ready, setReady] = useState(false);
  const loaded = useRef(false);

  useEffect(() => {
    let alive = true;
    loadDb().then((stored) => {
      if (!alive) return;
      if (stored && stored.version === DB_VERSION) setDb(migrate(stored));
      else saveDb(db);
      loaded.current = true;
      setReady(true);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const value = useMemo(() => ({ db, ready, update, reset }), [db, ready, update, reset]);
  return <DbContext.Provider value={value}>{children}</DbContext.Provider>;
}

export function useDb() {
  const ctx = useContext(DbContext);
  if (!ctx) throw new Error("useDb must be used inside DbProvider");
  return ctx;
}
