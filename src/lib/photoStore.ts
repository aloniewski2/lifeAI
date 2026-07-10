/**
 * Photo blobs live in IndexedDB (localStorage is too small for images),
 * keyed by the entry id of the photo entry that references them. Still
 * on-device only.
 */
const DB_NAME = "ai-legacy-os";
const STORE = "photos";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx(db: IDBDatabase, mode: IDBTransactionMode): IDBObjectStore {
  return db.transaction(STORE, mode).objectStore(STORE);
}

export async function putPhoto(entryId: string, blob: Blob): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const req = tx(db, "readwrite").put(blob, entryId);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getPhoto(entryId: string): Promise<Blob | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = tx(db, "readonly").get(entryId);
    req.onsuccess = () => resolve((req.result as Blob) ?? null);
    req.onerror = () => reject(req.error);
  });
}

export async function deletePhoto(entryId: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const req = tx(db, "readwrite").delete(entryId);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function wipePhotos(): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const req = tx(db, "readwrite").clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Downscale an image file to a thumbnail JPEG so a lifetime of photos fits
 * on-device. ~1200px long edge keeps enough detail for the timeline and
 * memorial views.
 */
export async function makeThumbnail(file: File, maxEdge = 1200): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))),
      "image/jpeg",
      0.82,
    );
  });
}
