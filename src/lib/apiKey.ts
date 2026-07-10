/**
 * The user's Anthropic API key for the interviewer. Deliberately kept in
 * its own localStorage slot, outside the archive, so it is never part of
 * an archive export.
 */
const KEY_STORAGE = "ai-legacy-os/anthropic-key";

export function getApiKey(): string {
  try {
    return localStorage.getItem(KEY_STORAGE) ?? "";
  } catch {
    return "";
  }
}

export function setApiKey(key: string): void {
  if (key) localStorage.setItem(KEY_STORAGE, key);
  else localStorage.removeItem(KEY_STORAGE);
}
