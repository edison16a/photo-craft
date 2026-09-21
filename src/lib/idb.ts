/**
 * Tiny IndexedDB key value wrapper.
 *
 * Photo Craft keeps everything in one database called "photo-craft" with two
 * object stores: "projects" holds full project documents and "summaries"
 * holds the light entries shown on the home screen. Both stores use plain
 * string keys and plain JSON values.
 *
 * The connection is opened the first time anyone asks for it and is shared
 * by every store handle after that. Every failure surfaces as a normal Error
 * with a message a person can read, never a bare DOMException or an event.
 */

/** Names of the object stores inside the Photo Craft database. */
export type StoreName = "projects" | "summaries";

/**
 * Promise based view of one object store. Values are structured cloned on
 * the way in and out, so what you get back is a copy, not the object you
 * stored.
 */
export interface KeyValueStore<T> {
  /** Resolves with the stored value, or undefined when the key is unknown. */
  get(key: string): Promise<T | undefined>;
  /** Writes the value under the key, replacing anything already there. */
  set(key: string, value: T): Promise<void>;
  /** Deletes the key. Resolves fine when the key was never there. */
  remove(key: string): Promise<void>;
  /** Lists every key in the store, in IndexedDB key order. */
  keys(): Promise<string[]>;
  /** Loads every value in the store, in key order. */
  getAll(): Promise<T[]>;
  /** Removes every entry in the store. */
  clear(): Promise<void>;
}

const DATABASE_NAME = "photo-craft";
const DATABASE_VERSION = 1;
const STORE_NAMES: readonly StoreName[] = ["projects", "summaries"];

/** The shared connection, or null until someone opens it. */
let databasePromise: Promise<IDBDatabase> | null = null;

/**
 * Tells you whether this environment has IndexedDB at all. Server rendering,
 * some private browsing modes and very old browsers do not. Never throws.
 */
export function isIndexedDbAvailable(): boolean {
  try {
    return typeof indexedDB !== "undefined" && indexedDB !== null;
  } catch {
    return false;
  }
}

/** Pulls a readable message out of whatever IndexedDB handed us. */
function messageOf(cause: unknown): string {
  if (
    cause !== null &&
    typeof cause === "object" &&
    "message" in cause &&
    typeof cause.message === "string"
  ) {
    return cause.message;
  }
  return typeof cause === "string" ? cause : "";
}

/**
 * Builds the Error that callers see. It says what we were trying to do,
 * which store it happened in, and the reason IndexedDB gave, if any.
 */
function describeFailure(action: string, store: StoreName | null, cause: unknown): Error {
  const where = store ? ` in the "${store}" store` : "";
  const reason = messageOf(cause) || "IndexedDB did not say why.";
  return new Error(`Could not ${action}${where}. ${reason}`);
}

/** Drops the cached connection promise, but only if it is still the current one. */
function forget(promise: Promise<IDBDatabase>): void {
  if (databasePromise === promise) databasePromise = null;
}

/**
 * Opens the shared connection, creating both object stores on first use.
 * Later calls reuse the same promise. If opening fails, or the browser closes
 * the connection on us, the cache is dropped so the next call tries again.
 */
function openDatabase(): Promise<IDBDatabase> {
  if (databasePromise) return databasePromise;
  const promise = new Promise<IDBDatabase>((resolve, reject) => {
    if (!isIndexedDbAvailable()) {
      reject(new Error("IndexedDB is not available here, so nothing can be saved or loaded."));
      return;
    }
    let request: IDBOpenDBRequest;
    try {
      request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    } catch (cause) {
      reject(describeFailure("open the database", null, cause));
      return;
    }
    request.onupgradeneeded = () => {
      const db = request.result;
      for (const name of STORE_NAMES) {
        if (!db.objectStoreNames.contains(name)) db.createObjectStore(name);
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      if (databasePromise !== promise) {
        // A blocked open already rejected this promise and nobody is waiting
        // for the connection any more, so close it instead of leaking it.
        db.close();
        return;
      }
      db.onversionchange = () => {
        db.close();
        forget(promise);
      };
      db.onclose = () => forget(promise);
      resolve(db);
    };
    request.onerror = () => reject(describeFailure("open the database", null, request.error));
    request.onblocked = () =>
      reject(new Error("Another tab is still using the Photo Craft database. Close it and try again."));
  });
  databasePromise = promise;
  promise.catch(() => forget(promise));
  return promise;
}

/**
 * Runs one request inside its own short transaction and settles when the
 * transaction finishes, so a write is durable before its promise resolves.
 * Synchronous throws (for example a value that cannot be cloned) and
 * asynchronous request errors both end up as the same readable rejection.
 */
function runInStore<R>(
  store: StoreName,
  mode: IDBTransactionMode,
  action: string,
  request: (objectStore: IDBObjectStore) => IDBRequest<R>,
): Promise<R> {
  return openDatabase().then(
    (db) =>
      new Promise<R>((resolve, reject) => {
        let transaction: IDBTransaction;
        let pending: IDBRequest<R>;
        try {
          transaction = db.transaction(store, mode);
          pending = request(transaction.objectStore(store));
        } catch (cause) {
          reject(describeFailure(action, store, cause));
          return;
        }
        const fail = () => reject(describeFailure(action, store, transaction.error ?? pending.error));
        transaction.onabort = fail;
        transaction.onerror = fail;
        transaction.oncomplete = () => resolve(pending.result);
      }),
  );
}

/** Turns any resolved value into nothing, for the methods that return void. */
function toVoid(): void {
  return undefined;
}

/** Keeps only string keys. We never write anything else, so this is a type guard, not a filter. */
function onlyStrings(keys: IDBValidKey[]): string[] {
  return keys.filter((key): key is string => typeof key === "string");
}

/**
 * Gives you a promise based handle on one store. It is cheap to call and
 * holds no state of its own: every method opens its own short transaction on
 * the shared connection, so keep one around or make a new one whenever.
 */
export function openKeyValueStore<T>(store: StoreName): KeyValueStore<T> {
  return {
    get: (key) => runInStore<T | undefined>(store, "readonly", `load "${key}"`, (s) => s.get(key)),
    set: (key, value) =>
      runInStore(store, "readwrite", `save "${key}"`, (s) => s.put(value, key)).then(toVoid),
    remove: (key) =>
      runInStore(store, "readwrite", `delete "${key}"`, (s) => s.delete(key)).then(toVoid),
    keys: () =>
      runInStore<IDBValidKey[]>(store, "readonly", "list keys", (s) => s.getAllKeys()).then(onlyStrings),
    getAll: () => runInStore<T[]>(store, "readonly", "load everything", (s) => s.getAll()),
    clear: () => runInStore(store, "readwrite", "clear the store", (s) => s.clear()).then(toVoid),
  };
}
