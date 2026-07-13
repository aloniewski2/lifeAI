import { describe, expect, it } from "vitest";
import { opener, pickFollowUp, stitchStory } from "./guided";
import { ChatTurn, parseTitleStory } from "./types";

const answer = (content: string): ChatTurn => ({ role: "user", content });
const question = (content: string): ChatTurn => ({
  role: "assistant",
  content,
});

const LONG =
  "We drove the old wagon up the coast to Maine with the windows down and dad singing badly the whole way.";

describe("guided engine", () => {
  it("opens with the prompt of the day", () => {
    expect(opener("2026-07-10")).toMatch(/^Let's start here: .+\?$/);
    expect(opener("2026-07-10")).toBe(opener("2026-07-10"));
  });

  it("nudges on very short answers instead of moving on", () => {
    const turns = [question("Q1"), answer("It was fun.")];
    expect(pickFollowUp(turns)).toMatch(/Say a little more/);
  });

  it("walks through follow-ups in order for substantive answers", () => {
    const turns: ChatTurn[] = [question("Q1"), answer(LONG)];
    const first = pickFollowUp(turns);
    expect(first).toMatch(/Who else was there/);

    turns.push(question(first), answer(LONG + " Also my sister came."));
    expect(pickFollowUp(turns)).toMatch(/Set the scene/);
  });

  it("wraps up after the follow-up bank is exhausted", () => {
    const turns: ChatTurn[] = [];
    for (let i = 0; i < 7; i++) {
      turns.push(question(`Q${i}`), answer(`${LONG} (${i})`));
    }
    expect(pickFollowUp(turns)).toMatch(/Turn this into a story/);
  });

  it("stitches the story from the speaker's exact words", () => {
    const turns: ChatTurn[] = [
      question("Let's start here: Describe the best trip you ever took?"),
      answer("We drove to Maine in 2003."),
      question("Who else was there?"),
      answer("Dad, my sister, and the dog."),
    ];
    const draft = stitchStory(turns, "2026-07-10");
    expect(draft.title).toBe("Describe the best trip you ever took");
    expect(draft.story).toBe(
      "We drove to Maine in 2003.\n\nDad, my sister, and the dog.",
    );
  });
});

describe("parseTitleStory", () => {
  it("parses title-blank-story output", () => {
    const draft = parseTitleStory(
      "The Summer We Drove to Maine\n\nWe packed the wagon and went north.",
    );
    expect(draft.title).toBe("The Summer We Drove to Maine");
    expect(draft.story).toBe("We packed the wagon and went north.");
  });

  it("strips labels, quotes, and markdown the small models emit", () => {
    const draft = parseTitleStory(
      'TITLE: "Maine, 2003"\n\nSTORY: We packed the wagon.',
    );
    expect(draft.title).toBe("Maine, 2003");
    expect(draft.story).toBe("We packed the wagon.");
  });

  it("falls back gracefully when there is no title line", () => {
    const draft = parseTitleStory("Just one paragraph of story text.");
    expect(draft.title).toBe("An interview story");
    expect(draft.story).toBe("Just one paragraph of story text.");
  });
});
