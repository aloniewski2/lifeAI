import { describe, expect, it } from "vitest";
import { buildBackupZip, parseBackupZip } from "./backup";
import { searchEntries } from "./archive";
import { Archive, EMPTY_ARCHIVE, Entry } from "./types";

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

describe("backup round-trip", () => {
  it("preserves the archive, photos, and audio takes", async () => {
    const archive: Archive = {
      ...structuredClone(EMPTY_ARCHIVE),
      profile: { name: "Andrew", birthYear: 1990, epitaph: "Show up anyway" },
      entries: [entry({ id: "p1", kind: "photo" }), entry({ id: "s1" })],
      lastExportedAt: "2026-07-10T00:00:00.000Z",
    };
    const photoBytes = new Uint8Array([255, 216, 255, 224, 1, 2, 3]);
    const takeA = new Uint8Array([10, 20, 30]);
    const takeB = new Uint8Array([40, 50]);

    const zip = await buildBackupZip({
      archive,
      photos: { p1: new Blob([photoBytes], { type: "image/jpeg" }) },
      audio: { s1: [new Blob([takeA]), new Blob([takeB])] },
    });

    const restored = await parseBackupZip(zip);
    expect(restored.archive).toEqual(archive);
    expect(Object.keys(restored.photos)).toEqual(["p1"]);
    expect(new Uint8Array(await restored.photos.p1.arrayBuffer())).toEqual(
      photoBytes,
    );
    expect(restored.audio.s1).toHaveLength(2);
    expect(new Uint8Array(await restored.audio.s1[0].arrayBuffer())).toEqual(
      takeA,
    );
    expect(new Uint8Array(await restored.audio.s1[1].arrayBuffer())).toEqual(
      takeB,
    );
  });

  it("rejects files that aren't backups", async () => {
    await expect(
      parseBackupZip(new Blob([new Uint8Array([1, 2, 3])])),
    ).rejects.toThrow();
  });
});

describe("searchEntries", () => {
  const entries = [
    entry({ id: "a", title: "Trip to Maine", content: "The wagon barely made it", tags: ["travel"] }),
    entry({ id: "b", title: "First job", content: "Dish pit summers", tags: ["work"] }),
  ];

  it("matches title, content, and tags case-insensitively", () => {
    expect(searchEntries(entries, "maine").map((e) => e.id)).toEqual(["a"]);
    expect(searchEntries(entries, "DISH").map((e) => e.id)).toEqual(["b"]);
    expect(searchEntries(entries, "travel").map((e) => e.id)).toEqual(["a"]);
  });

  it("returns everything for an empty query", () => {
    expect(searchEntries(entries, "  ")).toHaveLength(2);
  });

  it("returns nothing when nothing matches", () => {
    expect(searchEntries(entries, "zeppelin")).toHaveLength(0);
  });
});
