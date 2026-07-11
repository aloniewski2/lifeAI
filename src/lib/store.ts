import { createContext, useContext } from "react";
import { Archive } from "./types";
import { parseArchive, serializeArchive } from "./archive";
import { idbDelete, idbGet, idbPut } from "./db";

/**
 * Local-first storage: the whole archive lives in this browser's
 * IndexedDB, alongside photos and voice recordings. No account, no
 * server. The ZIP export in the Vault is how data moves between devices.
 *
 * Earlier versions kept the archive in localStorage; loadArchive migrates
 * that automatically on first run.
 */
const IDB_KEY = "archive";
const LEGACY_STORAGE_KEY = "ai-legacy-os/archive";

export async function loadArchive(): Promise<Archive> {
  const stored = await idbGet<string>("archive", IDB_KEY).catch(() => null);
  if (stored) return parseArchive(stored);

  // One-time migration from the old localStorage home.
  let legacy: string | null = null;
  try {
    legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
  } catch {
    legacy = null;
  }
  const archive = parseArchive(legacy);
  if (legacy) {
    await idbPut("archive", IDB_KEY, serializeArchive(archive));
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  }
  return archive;
}

export function saveArchive(archive: Archive): void {
  void idbPut("archive", IDB_KEY, serializeArchive(archive)).catch((err) => {
    console.error("Failed to persist archive", err);
  });
}

export function wipeArchive(): void {
  void idbDelete("archive", IDB_KEY);
  try {
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // best-effort
  }
}

export interface ArchiveStore {
  archive: Archive;
  update: (mutate: (draft: Archive) => Archive) => void;
}

export const ArchiveContext = createContext<ArchiveStore | null>(null);

export function useArchive(): ArchiveStore {
  const store = useContext(ArchiveContext);
  if (!store) throw new Error("useArchive must be used inside ArchiveProvider");
  return store;
}
