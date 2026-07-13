import { describe, expect, it } from "vitest";
import { retrieve, scoreEntry, tokenize } from "./retrieve";
import { askSystemPrompt, buildQuestionTurn } from "./index";
import { Archive, Entry } from "../types";
import { EMPTY_ARCHIVE } from "../types";

function entry(overrides: Partial<Entry>): Entry {
  return {
    id: "id",
    kind: "story",
    title: "t",
    content: "c",
    date: "2003-07-15",
    tags: [],
    createdAt: "2020-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("tokenize", () => {
  it("lowercases, strips punctuation, and drops stopwords", () => {
    expect(tokenize("What was Dad's first JOB?")).toEqual([
      "dad",
      "first",
      "job",
    ]);
  });

  it("keeps unicode words", () => {
    expect(tokenize("café in São Paulo")).toEqual(["café", "são", "paulo"]);
  });
});

describe("scoreEntry", () => {
  const tokens = new Set(tokenize("the summer lake house"));

  it("weights title and tag hits double", () => {
    const titled = entry({ title: "The lake house", content: "" });
    const tagged = entry({ title: "x", tags: ["lake"], content: "" });
    const body = entry({ title: "x", content: "the lake was cold" });
    expect(scoreEntry(tokens, titled)).toBe(4);
    expect(scoreEntry(tokens, tagged)).toBe(2);
    expect(scoreEntry(tokens, body)).toBe(1);
  });

  it("counts repeated content tokens once", () => {
    const spam = entry({ title: "x", content: "lake lake lake lake" });
    expect(scoreEntry(tokens, spam)).toBe(1);
  });
});

describe("retrieve", () => {
  const entries = [
    entry({ id: "lake", title: "The lake house", content: "We drove north every August." }),
    entry({ id: "job", title: "First job", content: "Bagging groceries at fourteen." }),
    entry({ id: "value", kind: "value", title: "Show up anyway", content: "You rarely regret showing up." }),
  ];

  it("returns the best matches first and drops non-matches", () => {
    const results = retrieve(entries, "Tell me about the lake house");
    expect(results[0].entry.id).toBe("lake");
    expect(results.map((r) => r.entry.id)).not.toContain("value");
  });

  it("returns nothing for an all-stopword question", () => {
    expect(retrieve(entries, "what is it?")).toEqual([]);
  });

  it("respects the limit", () => {
    const many = Array.from({ length: 20 }, (_, i) =>
      entry({ id: String(i), title: `lake ${i}` }),
    );
    expect(retrieve(many, "lake", 5)).toHaveLength(5);
  });
});

describe("prompt building", () => {
  const archive: Archive = {
    ...structuredClone(EMPTY_ARCHIVE),
    profile: { name: "Andrew", birthYear: null, epitaph: "Show up anyway." },
  };

  it("names the person and forbids invention", () => {
    const prompt = askSystemPrompt(archive);
    expect(prompt).toContain("Andrew");
    expect(prompt).toContain("Never invent");
    expect(prompt).toContain("Show up anyway.");
  });

  it("labels the reconstruction as not the person", () => {
    expect(askSystemPrompt(archive)).toContain("You are not Andrew");
  });

  it("includes memories and question in the user turn", () => {
    const turn = buildQuestionTurn("What was the lake like?", [
      entry({ title: "The lake house", content: "Cold water, warm evenings." }),
    ]);
    expect(turn).toContain("The lake house");
    expect(turn).toContain("Cold water, warm evenings.");
    expect(turn).toContain("Question: What was the lake like?");
  });

  it("says when nothing was found", () => {
    expect(buildQuestionTurn("q", [])).toContain("none found");
  });
});
