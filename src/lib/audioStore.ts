import { idbClear, idbDelete, idbEntries, idbGet, idbPut } from "./db";

/**
 * Original dictation recordings — the speaker's actual voice, which is
 * itself a legacy artifact. One entry can carry several takes. Stored
 * on-device only, keyed by entry id.
 */
export async function putAudio(entryId: string, takes: Blob[]): Promise<void> {
  if (takes.length === 0) return;
  await idbPut("audio", entryId, takes);
}

export async function getAudio(entryId: string): Promise<Blob[]> {
  return (await idbGet<Blob[]>("audio", entryId)) ?? [];
}

export async function deleteAudio(entryId: string): Promise<void> {
  await idbDelete("audio", entryId);
}

export async function wipeAudio(): Promise<void> {
  await idbClear("audio");
}

export async function allAudio(): Promise<[string, Blob[]][]> {
  return idbEntries<Blob[]>("audio");
}
