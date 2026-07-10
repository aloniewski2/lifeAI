import { describe, expect, it } from "vitest";
import {
  anotherPrompt,
  promptIndexForDate,
  promptOfTheDay,
  PROMPTS,
} from "./prompts";

describe("prompt bank", () => {
  it("has a healthy number of unique questions", () => {
    expect(PROMPTS.length).toBeGreaterThanOrEqual(50);
    expect(new Set(PROMPTS.map((p) => p.question)).size).toBe(PROMPTS.length);
  });
});

describe("promptIndexForDate", () => {
  it("is deterministic for the same date", () => {
    expect(promptIndexForDate("2026-07-10", PROMPTS.length)).toBe(
      promptIndexForDate("2026-07-10", PROMPTS.length),
    );
  });

  it("stays within the bank bounds across a year of dates", () => {
    for (let day = 1; day <= 365; day++) {
      const date = new Date(2026, 0, day).toISOString().slice(0, 10);
      const index = promptIndexForDate(date, PROMPTS.length);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(PROMPTS.length);
    }
  });

  it("varies across dates", () => {
    const indices = new Set<number>();
    for (let day = 1; day <= 30; day++) {
      const date = new Date(2026, 0, day).toISOString().slice(0, 10);
      indices.add(promptIndexForDate(date, PROMPTS.length));
    }
    expect(indices.size).toBeGreaterThan(10);
  });
});

describe("promptOfTheDay / anotherPrompt", () => {
  it("returns a prompt from the bank", () => {
    expect(PROMPTS).toContainEqual(promptOfTheDay("2026-07-10"));
  });

  it("anotherPrompt never repeats the current question", () => {
    const current = promptOfTheDay("2026-07-10");
    for (let i = 0; i < 25; i++) {
      expect(anotherPrompt(current).question).not.toBe(current.question);
    }
  });
});
