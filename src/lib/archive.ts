import {
  Archive,
  DEFAULT_CONSENT,
  EMPTY_ARCHIVE,
  Entry,
  FutureMessage,
} from "./types";

/**
 * Pure helpers over the Archive. Storage (localStorage today, encrypted sync
 * later) lives in store.ts; everything here is testable without a browser.
 */

export function parseArchive(raw: string | null): Archive {
  if (!raw) return structuredClone(EMPTY_ARCHIVE);
  try {
    const data = JSON.parse(raw) as Partial<Archive>;
    if (data.version !== 1) return structuredClone(EMPTY_ARCHIVE);
    return {
      version: 1,
      profile: {
        name: data.profile?.name ?? "",
        birthYear: data.profile?.birthYear ?? null,
        epitaph: data.profile?.epitaph ?? "",
      },
      consent: { ...DEFAULT_CONSENT, ...data.consent },
      settings: {
        sealCeremony:
          data.settings?.sealCeremony === "quiet" ? "quiet" : "ritual",
      },
      entries: Array.isArray(data.entries) ? data.entries : [],
      messages: Array.isArray(data.messages) ? data.messages : [],
      lastExportedAt: data.lastExportedAt ?? null,
    };
  } catch {
    return structuredClone(EMPTY_ARCHIVE);
  }
}

export function serializeArchive(archive: Archive): string {
  return JSON.stringify(archive, null, 2);
}

/** Entries sorted by when they happened, oldest first. */
export function sortByDate(entries: Entry[]): Entry[] {
  return [...entries].sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Group entries into autobiography chapters by year. Returns chapters in
 * chronological order; entries within a chapter are chronological too.
 */
export function chaptersByYear(
  entries: Entry[],
): { year: number; entries: Entry[] }[] {
  const byYear = new Map<number, Entry[]>();
  for (const entry of sortByDate(entries)) {
    const year = new Date(entry.date + "T00:00:00").getFullYear();
    if (!byYear.has(year)) byYear.set(year, []);
    byYear.get(year)!.push(entry);
  }
  return [...byYear.entries()]
    .sort(([a], [b]) => a - b)
    .map(([year, yearEntries]) => ({ year, entries: yearEntries }));
}

/** Messages not yet due, soonest first. */
export function pendingMessages(
  messages: FutureMessage[],
  today: string,
): FutureMessage[] {
  return messages
    .filter((m) => m.deliverOn > today)
    .sort((a, b) => a.deliverOn.localeCompare(b.deliverOn));
}

/** Messages whose delivery date has arrived. */
export function dueMessages(
  messages: FutureMessage[],
  today: string,
): FutureMessage[] {
  return messages
    .filter((m) => m.deliverOn <= today)
    .sort((a, b) => a.deliverOn.localeCompare(b.deliverOn));
}

export interface DecadeGroup {
  /** First year of the decade, e.g. 1970. */
  decade: number;
  /** "1970s" */
  label: string;
  entries: Entry[];
}

/** Group entries into chronological decades for the timeline hallway. */
export function groupByDecade(entries: Entry[]): DecadeGroup[] {
  const byDecade = new Map<number, Entry[]>();
  for (const entry of sortByDate(entries)) {
    const decade = Math.floor(Number(entry.date.slice(0, 4)) / 10) * 10;
    if (!byDecade.has(decade)) byDecade.set(decade, []);
    byDecade.get(decade)!.push(entry);
  }
  return [...byDecade.entries()]
    .sort(([a], [b]) => a - b)
    .map(([decade, decEntries]) => ({
      decade,
      label: `${decade}s`,
      entries: decEntries,
    }));
}

/** "childhood" / "age 20–29" label for a decade, given a birth year. */
export function decadeAges(decade: number, birthYear: number | null): string {
  if (birthYear === null) return "";
  const start = decade - birthYear;
  if (start + 9 < 0) return "";
  if (start < 10) return "childhood";
  return `age ${start}–${start + 9}`;
}

/** Case-insensitive match over title, content, and tags. */
export function searchEntries(entries: Entry[], query: string): Entry[] {
  const q = query.trim().toLowerCase();
  if (!q) return entries;
  return entries.filter(
    (e) =>
      e.title.toLowerCase().includes(q) ||
      e.content.toLowerCase().includes(q) ||
      e.tags.some((t) => t.toLowerCase().includes(q)),
  );
}

export function newId(): string {
  return crypto.randomUUID();
}
