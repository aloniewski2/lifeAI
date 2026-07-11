/**
 * The app's IndexedDB: one database, three object stores. Everything is
 * on-device.
 *
 *  - "archive": the serialized archive JSON under a single key
 *  - "photos":  downscaled photo blobs keyed by entry id
 *  - "audio":   original dictation recordings keyed by entry id
 */
const DB_NAME = "ai-legacy-os";
const DB_VERSION = 2;
const STORES = ["photos", "archive", "audio"] as const;
export type StoreName = (typeof STORES)[number];

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        for (const store of STORES) {
          if (!req.result.objectStoreNames.contains(store)) {
            req.result.createObjectStore(store);
          }
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    dbPromise.catch(() => {
      dbPromise = null;
    });
  }
  return dbPromise;
}

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function store(
  name: StoreName,
  mode: IDBTransactionMode,
): Promise<IDBObjectStore> {
  const db = await openDb();
  return db.transaction(name, mode).objectStore(name);
}

export async function idbGet<T>(name: StoreName, key: string): Promise<T | null> {
  return ((await request((await store(name, "readonly")).get(key))) as T) ?? null;
}

export async function idbPut(
  name: StoreName,
  key: string,
  value: unknown,
): Promise<void> {
  await request((await store(name, "readwrite")).put(value, key));
}

export async function idbDelete(name: StoreName, key: string): Promise<void> {
  await request((await store(name, "readwrite")).delete(key));
}

export async function idbClear(name: StoreName): Promise<void> {
  await request((await store(name, "readwrite")).clear());
}

export async function idbEntries<T>(
  name: StoreName,
): Promise<[string, T][]> {
  const s = await store(name, "readonly");
  const [keys, values] = await Promise.all([
    request(s.getAllKeys()),
    request(s.getAll()),
  ]);
  return keys.map((k, i) => [String(k), values[i] as T]);
}

/**
 * Ask the browser to protect this origin's storage from automatic
 * eviction. Best-effort: some browsers grant silently, some prompt,
 * some refuse — the app works either way.
 */
export async function requestPersistence(): Promise<boolean> {
  try {
    if (navigator.storage?.persist) {
      return await navigator.storage.persist();
    }
  } catch {
    // best-effort
  }
  return false;
}
