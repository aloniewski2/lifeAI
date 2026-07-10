import { promptOfTheDay } from "../prompts";
import { ChatTurn, InterviewEngine, StoryDraft } from "./types";

/**
 * The built-in interviewer: no model, no download, works everywhere.
 * A StoryWorth-style opener followed by the follow-up questions a good
 * interviewer always asks. The drafted story is the speaker's own words,
 * stitched together verbatim — nothing generated, nothing invented.
 */
const FOLLOW_UPS = [
  "Who else was there? Tell me about them.",
  "Set the scene for me — what did it look like? Sounds, smells, weather?",
  "How did you feel while it was happening — and did that change later?",
  "What happened next?",
  "Looking back, why do you think this memory stayed with you?",
];

const WRAP_UP =
  "That's a story worth keeping — press “Turn this into a story” to save it. Or start another: what's a memory that always makes you smile?";

const SAY_MORE =
  "Say a little more — pretend I'm hearing this for the very first time.";

export function opener(isoDate: string): string {
  return `Let's start here: ${promptOfTheDay(isoDate).question}`;
}

export function pickFollowUp(turns: ChatTurn[]): string {
  const answers = turns.filter((t) => t.role === "user");
  const last = answers[answers.length - 1]?.content ?? "";
  // A very short answer means they're warming up — nudge before moving on.
  if (last.trim().length > 0 && last.trim().length < 50) {
    return SAY_MORE;
  }
  // Index by substantive answers only, so a nudge doesn't skip a question.
  const substantive = answers.filter((a) => a.content.trim().length >= 50);
  const index = substantive.length - 1;
  return index < FOLLOW_UPS.length ? FOLLOW_UPS[index] : WRAP_UP;
}

/** Verbatim stitch: their answers become the story, one per paragraph. */
export function stitchStory(turns: ChatTurn[], isoDate: string): StoryDraft {
  const answers = turns
    .filter((t) => t.role === "user")
    .map((t) => t.content.trim())
    .filter(Boolean);
  const firstQuestion =
    turns.find((t) => t.role === "assistant")?.content ?? "";
  const title =
    firstQuestion
      .replace(/^Let's start here:\s*/, "")
      .replace(/\?.*$/, "")
      .trim()
      .slice(0, 120) || `Interview from ${isoDate}`;
  return { title, story: answers.join("\n\n") };
}

export class GuidedEngine implements InterviewEngine {
  async nextQuestion(turns: ChatTurn[]): Promise<string> {
    const today = new Date().toISOString().slice(0, 10);
    if (turns.filter((t) => t.role === "user").length === 0) {
      return opener(today);
    }
    return pickFollowUp(turns);
  }

  async draftStory(turns: ChatTurn[]): Promise<StoryDraft> {
    return stitchStory(turns, new Date().toISOString().slice(0, 10));
  }
}
