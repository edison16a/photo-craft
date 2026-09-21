/**
 * App settings persisted in localStorage.
 *
 * Settings are small and rarely change, so the whole object is stored as one
 * JSON string under a single key. Reads always merge with the defaults so a
 * missing or partially written value never breaks the app. Listeners get told
 * about changes made in this tab (through saveSettings) and in other tabs
 * (through the browser's storage event).
 */

/** Everything the user can configure. Keep it flat and JSON friendly. */
export interface AppSettings {
  /** Google Custom Search API key. Empty when not set up. */
  googleApiKey: string;
  /** Google Programmable Search Engine id (the "cx" value). */
  googleSearchEngineId: string;
  /** Save projects automatically while editing. */
  autosave: boolean;
}

/** What a fresh install starts with. */
export const DEFAULT_SETTINGS: AppSettings = {
  googleApiKey: "",
  googleSearchEngineId: "",
  autosave: true,
};

const STORAGE_KEY = "photo-craft:settings";

type Listener = (settings: AppSettings) => void;

const listeners = new Set<Listener>();

/** Returns localStorage when it is usable, otherwise null. Access can throw in locked down browsers. */
function getStorage(): Storage | null {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Picks only the fields we know, with the right types, out of whatever was stored. */
function coerceSettings(raw: unknown): AppSettings {
  const result: AppSettings = { ...DEFAULT_SETTINGS };
  if (typeof raw !== "object" || raw === null) return result;
  const source = raw as Record<string, unknown>;
  if (typeof source.googleApiKey === "string") result.googleApiKey = source.googleApiKey;
  if (typeof source.googleSearchEngineId === "string") {
    result.googleSearchEngineId = source.googleSearchEngineId;
  }
  if (typeof source.autosave === "boolean") result.autosave = source.autosave;
  return result;
}

/**
 * Reads the saved settings and fills any gaps with the defaults.
 * Never throws: bad JSON, a missing key or no localStorage at all simply
 * gives you the defaults.
 */
export function loadSettings(): AppSettings {
  const storage = getStorage();
  if (!storage) return { ...DEFAULT_SETTINGS };
  try {
    const text = storage.getItem(STORAGE_KEY);
    if (!text) return { ...DEFAULT_SETTINGS };
    return coerceSettings(JSON.parse(text));
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

/**
 * Merges a partial update into the saved settings, writes the result back
 * and tells every subscriber in this tab. Returns the full merged object.
 * Fields set to undefined in the patch are left as they were.
 * If localStorage is unavailable the merged value is still returned and
 * subscribers are still notified, it just will not survive a reload.
 */
export function saveSettings(patch: Partial<AppSettings>): AppSettings {
  const merged: Record<string, unknown> = { ...loadSettings() };
  for (const [key, value] of Object.entries(patch)) {
    if (value !== undefined) merged[key] = value;
  }
  const next = coerceSettings(merged);
  const storage = getStorage();
  if (storage) {
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Quota errors and private mode failures are not worth crashing over.
    }
  }
  notify(next);
  return next;
}

function notify(settings: AppSettings): void {
  for (const listener of listeners) listener({ ...settings });
}

/**
 * Calls the listener whenever settings change, either in this tab via
 * saveSettings or in another tab via the storage event. Returns a function
 * that stops the subscription. Safe to call during server rendering, where
 * only the in-memory part is wired up.
 */
export function subscribeToSettings(listener: Listener): () => void {
  listeners.add(listener);

  const onStorage = (event: StorageEvent): void => {
    if (event.key !== null && event.key !== STORAGE_KEY) return;
    listener(loadSettings());
  };
  const hasWindow = typeof window !== "undefined";
  if (hasWindow) window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(listener);
    if (hasWindow) window.removeEventListener("storage", onStorage);
  };
}
