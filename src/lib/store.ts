import { createContext, useContext } from "react";
import { Archive } from "./types";
import { parseArchive, serializeArchive } from "./archive";

/**
 * Local-first storage: the whole archive lives in this browser, under one
 * key. No account, no server. Export/import in the Vault is the way data
 * moves between devices for now.
 */
export const STORAGE_KEY = "ai-legacy-os/archive";

export function loadArchive(): Archive {
  try {
    return parseArchive(localStorage.getItem(STORAGE_KEY));
  } catch {
    return parseArchive(null);
  }
}

export function saveArchive(archive: Archive): void {
  localStorage.setItem(STORAGE_KEY, serializeArchive(archive));
}

export function wipeArchive(): void {
  localStorage.removeItem(STORAGE_KEY);
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
