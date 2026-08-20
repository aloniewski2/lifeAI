import { describe, expect, it } from "vitest";
import {
  buildMemorialHtml,
  pickVoices,
  escapeHtml,
  memorialFileName,
} from "./memorialExport";
import { EMPTY_ARCHIVE, Archive, Entry } from "./types";

function entry(overrides: Partial<Entry>): Entry {
  return {
    id: "id",
    kind: "story",
    title: "t",
    content: "c",
    date: "2020-01-01",
    tags: [],
    createdAt: "2020-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function archiveWith(overrides: Partial<Archive> = {}): Archive {
  return {
    ...structuredClone(EMPTY_ARCHIVE),
    profile: { name: "Ruth Delgado", birthYear: 1951, epitaph: "" },
    ...overrides,
  };
}

describe("escapeHtml", () => {
  it("escapes every character that could break out of markup", () => {
    expect(escapeHtml(`<img src=x onerror="alert('x')">&`)).toBe(
      "&lt;img src=x onerror=&quot;alert(&#39;x&#39;)&quot;&gt;&amp;",
    );
  });
});

describe("buildMemorialHtml", () => {
  it("is a complete standalone document with no scripts", () => {
    const html = buildMemorialHtml(archiveWith());
    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect(html).toContain("<style>");
    expect(html).not.toContain("<script");
    expect(html).toContain("<title>Ruth Delgado</title>");
    expect(html).toContain("In loving memory");
  });

  it("never emits raw user text into the markup", () => {
    const html = buildMemorialHtml(
      archiveWith({
        profile: {
          name: "<script>bad()</script>",
          birthYear: null,
          epitaph: `"quoted" & <b>bold</b>`,
        },
        entries: [entry({ title: "<i>title</i>", content: "<p>body</p>" })],
      }),
    );
    expect(html).not.toContain("<script>bad()");
    expect(html).not.toContain("<i>title</i>");
    expect(html).not.toContain("<p>body</p>");
    expect(html).toContain("&lt;script&gt;bad()&lt;/script&gt;");
    expect(html).toContain("&quot;quoted&quot; &amp; &lt;b&gt;bold&lt;/b&gt;");
  });

  it("omits sections the archive has nothing for", () => {
    const html = buildMemorialHtml(archiveWith());
    expect(html).not.toContain("A life in moments");
    expect(html).not.toContain("A life in pictures");
    expect(html).not.toContain("believed");
    expect(html).toContain("Nothing was generated.");
  });

  it("includes values, milestones, and stories when present", () => {
    const html = buildMemorialHtml(
      archiveWith({
        entries: [
          entry({ id: "v", kind: "value", title: "Show up", content: "Why." }),
          entry({
            id: "m",
            kind: "milestone",
            title: "Married Hector",
            date: "1974-06-08",
          }),
          entry({
            id: "s",
            kind: "story",
            title: "The record shop",
            content: "He was holding the last copy.",
          }),
        ],
      }),
    );
    expect(html).toContain("What Ruth believed");
    expect(html).toContain("&ldquo;Show up&rdquo;");
    expect(html).toContain("A life in moments");
    expect(html).toContain("1974");
    expect(html).toContain("Stories Ruth told");
    // Drop cap splits the first character out of the prose.
    expect(html).toContain('<span class="dropcap" aria-hidden="true">H</span>');
    expect(html).toContain("e was holding the last copy.");
  });

  it("inlines photos as data URIs and uses the first as the portrait", () => {
    const html = buildMemorialHtml(
      archiveWith({
        entries: [
          entry({ id: "p1", kind: "photo", title: "Lake", date: "1963-08-02" }),
          entry({ id: "p2", kind: "photo", title: "Porch", date: "2013-10-05" }),
        ],
      }),
      { photos: { p1: "data:image/jpeg;base64,AAA", p2: "data:image/jpeg;base64,BBB" } },
    );
    expect(html).toContain('class="portrait"');
    expect(html).toContain("data:image/jpeg;base64,AAA");
    expect(html).toContain("data:image/jpeg;base64,BBB");
    expect(html).toContain("A life in pictures");
  });

  it("skips photo entries with no image data", () => {
    const html = buildMemorialHtml(
      archiveWith({
        entries: [entry({ id: "p1", kind: "photo", title: "Missing" })],
      }),
    );
    expect(html).not.toContain("A life in pictures");
    expect(html).not.toContain('class="portrait"');
  });

  it("honours the photo cap", () => {
    const entries = Array.from({ length: 5 }, (_, i) =>
      entry({ id: `p${i}`, kind: "photo", title: `Photo ${i}` }),
    );
    const photos = Object.fromEntries(
      entries.map((e) => [e.id, `data:image/jpeg;base64,${e.id}`]),
    );
    const html = buildMemorialHtml(archiveWith({ entries }), {
      photos,
      maxPhotos: 2,
    });
    expect(html).toContain("Photo 0");
    expect(html).not.toContain("Photo 4");
  });

  it("falls back gracefully when the archive has no name", () => {
    const html = buildMemorialHtml(
      archiveWith({ profile: { name: "", birthYear: null, epitaph: "" } }),
    );
    expect(html).toContain("A life worth keeping");
    expect(html).toContain("written or spoken by its subject");
  });
});

describe("memorialFileName", () => {
  it("slugifies the name", () => {
    expect(memorialFileName(archiveWith())).toBe("ruth-delgado-memorial.html");
  });

  it("falls back when there is no name", () => {
    expect(
      memorialFileName(
        archiveWith({ profile: { name: "  ", birthYear: null, epitaph: "" } }),
      ),
    ).toBe("memorial.html");
  });
});

describe("voice in the memorial", () => {
  const withStory = (id: string, title: string) =>
    archiveWith({
      entries: [
        {
          id,
          kind: "story",
          title,
          content: "We drove all night to get there.",
          date: "1974-06-02",
          tags: [],
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    });

  const uri = (bytes: number) => `data:audio/webm;base64,${"A".repeat(Math.ceil(bytes / 0.75))}`;

  it("embeds a player for a story that has a recording", () => {
    const html = buildMemorialHtml(withStory("s1", "The drive"), {
      voices: { s1: [uri(1000)] },
    });
    expect(html).toContain("<audio controls");
    expect(html).toContain("own voice");
  });

  it("leaves stories without a recording untouched", () => {
    const html = buildMemorialHtml(withStory("s1", "The drive"));
    expect(html).not.toContain("<audio");
  });

  it("embeds only the first take, not the outtakes", () => {
    const html = buildMemorialHtml(withStory("s1", "The drive"), {
      voices: { s1: [uri(500), uri(600)] },
    });
    expect(html.match(/<audio/g)).toHaveLength(1);
  });

  it("keeps the file openable by refusing to blow the byte budget", () => {
    const { chosen, skipped, bytes } = pickVoices(
      ["a", "b"],
      { a: [uri(10_000)], b: [uri(10_000)] },
      12_000,
    );
    expect(Object.keys(chosen)).toHaveLength(1);
    expect(skipped).toBe(1);
    expect(bytes).toBeLessThanOrEqual(12_000);
  });

  it("takes the shortest recordings first so more voices survive", () => {
    const { chosen } = pickVoices(
      ["long", "short"],
      { long: [uri(9_000)], short: [uri(1_000)] },
      5_000,
    );
    expect(Object.keys(chosen)).toEqual(["short"]);
  });
});
