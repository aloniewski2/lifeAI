import { idbClear, idbDelete, idbEntries, idbGet, idbPut } from "./db";

/**
 * Photo blobs live in IndexedDB (localStorage is too small for images),
 * keyed by the entry id of the photo entry that references them. Still
 * on-device only.
 */
export async function putPhoto(entryId: string, blob: Blob): Promise<void> {
  await idbPut("photos", entryId, blob);
}

export async function getPhoto(entryId: string): Promise<Blob | null> {
  return idbGet<Blob>("photos", entryId);
}

export async function deletePhoto(entryId: string): Promise<void> {
  await idbDelete("photos", entryId);
}

export async function wipePhotos(): Promise<void> {
  await idbClear("photos");
}

export async function allPhotos(): Promise<[string, Blob][]> {
  return idbEntries<Blob>("photos");
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
