import { describe, expect, it } from "vitest";
import { splitIntoChunks } from "./textChunks";

describe("splitIntoChunks", () => {
  it("keeps short text as one chunk", () => {
    expect(splitIntoChunks("Hello there. How are you?")).toEqual([
      "Hello there. How are you?",
    ]);
  });

  it("splits long text at sentence boundaries", () => {
    const sentence = "This sentence is about forty characters.";
    const text = Array(10).fill(sentence).join(" ");
    const chunks = splitIntoChunks(text, 100);
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.endsWith(".")).toBe(true);
      expect(chunk.length).toBeLessThanOrEqual(100);
    }
    expect(chunks.join(" ")).toBe(text);
  });

  it("keeps an oversized single sentence intact", () => {
    const long = "word ".repeat(100).trim() + ".";
    expect(splitIntoChunks(long, 50)).toEqual([long]);
  });

  it("collapses whitespace and handles empty text", () => {
    expect(splitIntoChunks("  a.   b.  ", 300)).toEqual(["a. b."]);
    expect(splitIntoChunks("")).toEqual([]);
  });
});
