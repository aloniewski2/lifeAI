import { describe, expect, it } from "vitest";
import {
  chaptersByYear,
  dueMessages,
  parseArchive,
  pendingMessages,
  serializeArchive,
  sortByDate,
} from "./archive";
import { Archive, Entry, FutureMessage } from "./types";

function entry(overrides: Partial<Entry>): Entry {
  return {
    id: "id",
    kind: "journal",
    title: "t",
    content: "c",
    date: "2020-01-01",
    tags: [],
    createdAt: "2020-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function message(overrides: Partial<FutureMessage>): FutureMessage {
  return {
    id: "id",
    recipient: "r",
    subject: "s",
    body: "b",
    deliverOn: "2030-01-01",
    createdAt: "2020-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("parseArchive", () => {
  it("returns an empty archive for null", () => {
    const archive = parseArchive(null);
    expect(archive.entries).toEqual([]);
    expect(archive.messages).toEqual([]);
    expect(archive.consent.journal).toBe(true);
    expect(archive.consent.email).toBe(false);
  });

  it("returns an empty archive for corrupt JSON", () => {
    expect(parseArchive("{not json").entries).toEqual([]);
  });

  it("returns an empty archive for unknown versions", () => {
    expect(parseArchive('{"version":99,"entries":[{}]}').entries).toEqual([]);
  });

  it("round-trips through serializeArchive", () => {
    const archive: Archive = {
      ...parseArchive(null),
      entries: [entry({ id: "a" })],
      messages: [message({ id: "m" })],
    };
    expect(parseArchive(serializeArchive(archive))).toEqual(archive);
  });

  it("fills in missing consent keys with defaults", () => {
    const archive = parseArchive(
      '{"version":1,"consent":{"photos":true}}',
    );
    expect(archive.consent.photos).toBe(true);
    expect(archive.consent.voice).toBe(false);
  });
});

describe("sortByDate", () => {
  it("sorts oldest first without mutating input", () => {
    const input = [
      entry({ id: "b", date: "2021-05-01" }),
      entry({ id: "a", date: "1999-12-31" }),
    ];
    const sorted = sortByDate(input);
    expect(sorted.map((e) => e.id)).toEqual(["a", "b"]);
    expect(input[0].id).toBe("b");
  });
});

describe("chaptersByYear", () => {
  it("groups entries into chronological chapters", () => {
    const chapters = chaptersByYear([
      entry({ id: "c", date: "2020-06-01" }),
      entry({ id: "a", date: "1999-01-01" }),
      entry({ id: "b", date: "2020-01-15" }),
    ]);
    expect(chapters.map((c) => c.year)).toEqual([1999, 2020]);
    expect(chapters[1].entries.map((e) => e.id)).toEqual(["b", "c"]);
  });

  it("returns no chapters for no entries", () => {
    expect(chaptersByYear([])).toEqual([]);
  });
});

describe("future messages", () => {
  const today = "2026-07-10";
  const messages = [
    message({ id: "past", deliverOn: "2025-01-01" }),
    message({ id: "today", deliverOn: "2026-07-10" }),
    message({ id: "future", deliverOn: "2040-01-01" }),
  ];

  it("pendingMessages returns only messages after today", () => {
    expect(pendingMessages(messages, today).map((m) => m.id)).toEqual([
      "future",
    ]);
  });

  it("dueMessages includes today and earlier, oldest first", () => {
    expect(dueMessages(messages, today).map((m) => m.id)).toEqual([
      "past",
      "today",
    ]);
  });
});
