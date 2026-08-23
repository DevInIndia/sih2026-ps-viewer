"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const STORAGE_KEY = "sih2026.shortlist";
/** A shortlist larger than the dataset is nonsense; refuse to grow past it. */
const MAX_ENTRIES = 1000;

type ShortlistApi = {
  /** PS numbers currently shortlisted. */
  items: Set<string>;
  /** False until localStorage has been read, so the UI can avoid a flash. */
  ready: boolean;
  has: (ps: string) => boolean;
  toggle: (ps: string) => void;
  clear: () => void;
};

const ShortlistContext = createContext<ShortlistApi | null>(null);

/**
 * Read the persisted shortlist defensively.
 *
 * localStorage is shared with anything else running on the origin and survives
 * across deploys, so its contents are treated as untrusted: the value must be a
 * JSON array of strings, every entry must be a PS number this build actually
 * knows about, and the list is capped. A corrupt or hostile value degrades to
 * "no shortlist" instead of propagating into rendering or into a URL.
 */
function readStored(known: ReadonlySet<string>): Set<string> {
  const out = new Set<string>();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw || raw.length > 64_000) return out;

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return out;

    for (const entry of parsed) {
      if (typeof entry !== "string") continue;
      if (!known.has(entry)) continue;
      out.add(entry);
      if (out.size >= MAX_ENTRIES) break;
    }
  } catch {
    // Storage disabled, quota exceeded or malformed JSON — carry on without it.
  }
  return out;
}

export function ShortlistProvider({
  knownIds,
  children,
}: {
  knownIds: readonly string[];
  children: React.ReactNode;
}) {
  const known = useMemo(() => new Set(knownIds), [knownIds]);
  const [items, setItems] = useState<Set<string>>(() => new Set());
  const [ready, setReady] = useState(false);

  // Deliberately after mount: the server render has no access to localStorage,
  // so reading it during render would produce a hydration mismatch.
  useEffect(() => {
    setItems(readStored(known));
    setReady(true);
  }, [known]);

  // Keep two tabs of the same shortlist in agreement.
  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key !== null && event.key !== STORAGE_KEY) return;
      setItems(readStored(known));
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [known]);

  const persist = useCallback((next: Set<string>) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
    } catch {
      // Private mode or a full quota: the shortlist still works this session.
    }
  }, []);

  const toggle = useCallback(
    (ps: string) => {
      if (!known.has(ps)) return;
      setItems((prev) => {
        const next = new Set(prev);
        if (next.has(ps)) next.delete(ps);
        else if (next.size < MAX_ENTRIES) next.add(ps);
        persist(next);
        return next;
      });
    },
    [known, persist],
  );

  const clear = useCallback(() => {
    setItems(() => {
      const next = new Set<string>();
      persist(next);
      return next;
    });
  }, [persist]);

  const value = useMemo<ShortlistApi>(
    () => ({
      items,
      ready,
      has: (ps: string) => items.has(ps),
      toggle,
      clear,
    }),
    [items, ready, toggle, clear],
  );

  return (
    <ShortlistContext.Provider value={value}>
      {children}
    </ShortlistContext.Provider>
  );
}

export function useShortlist(): ShortlistApi {
  const ctx = useContext(ShortlistContext);
  if (!ctx) {
    throw new Error("useShortlist must be used inside <ShortlistProvider>");
  }
  return ctx;
}
