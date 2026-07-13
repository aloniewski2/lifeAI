import { strFromU8, strToU8, unzip, zip } from "fflate";
import { parseArchive, serializeArchive } from "./archive";
import { Archive } from "./types";

/**
 * The full-fidelity backup: one ZIP holding the archive JSON, every photo,
 * and every voice recording. This file IS the family keepsake — importing
 * it on any device restores everything.
 *
 *   archive.json
 *   photos/<entryId>.jpg
 *   audio/<entryId>/<take>.webm
 */
export interface BackupContents {
  archive: Archive;
  photos: Record<string, Blob>;
  audio: Record<string, Blob[]>;
}

export async function buildBackupZip(
  contents: BackupContents,
): Promise<Blob> {
  const files: Record<string, Uint8Array> = {
    "archive.json": strToU8(serializeArchive(contents.archive)),
  };
  for (const [id, blob] of Object.entries(contents.photos)) {
    files[`photos/${id}.jpg`] = new Uint8Array(await blob.arrayBuffer());
  }
  for (const [id, takes] of Object.entries(contents.audio)) {
    for (let i = 0; i < takes.length; i++) {
      files[`audio/${id}/${i}.webm`] = new Uint8Array(
        await takes[i].arrayBuffer(),
      );
    }
  }
  const zipped = await new Promise<Uint8Array>((resolve, reject) => {
    zip(files, { level: 6 }, (err, data) =>
      err ? reject(err) : resolve(data),
    );
  });
  // Copy into a fresh ArrayBuffer so the Blob constructor accepts it
  // regardless of the underlying buffer type.
  return new Blob([zipped.slice()], { type: "application/zip" });
}

export async function parseBackupZip(file: Blob): Promise<BackupContents> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const entries = await new Promise<Record<string, Uint8Array>>(
    (resolve, reject) => {
      unzip(bytes, (err, data) => (err ? reject(err) : resolve(data)));
    },
  );

  const archiveRaw = entries["archive.json"];
  if (!archiveRaw) throw new Error("Not a legacy archive backup");
  const archive = parseArchive(strFromU8(archiveRaw));

  const photos: Record<string, Blob> = {};
  const audio: Record<string, Blob[]> = {};
  for (const [path, data] of Object.entries(entries)) {
    const photoMatch = path.match(/^photos\/(.+)\.jpg$/);
    if (photoMatch) {
      photos[photoMatch[1]] = new Blob([data.slice()], {
        type: "image/jpeg",
      });
      continue;
    }
    const audioMatch = path.match(/^audio\/(.+)\/(\d+)\.webm$/);
    if (audioMatch) {
      const id = audioMatch[1];
      const take = Number(audioMatch[2]);
      audio[id] = audio[id] ?? [];
      audio[id][take] = new Blob([data.slice()], { type: "audio/webm" });
    }
  }
  // Compact any sparse take arrays.
  for (const id of Object.keys(audio)) {
    audio[id] = audio[id].filter(Boolean);
  }
  return { archive, photos, audio };
}
