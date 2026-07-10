export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface StoryDraft {
  title: string;
  story: string;
}

/** One interviewer backend. All engines share the same chat surface. */
export interface InterviewEngine {
  nextQuestion(turns: ChatTurn[]): Promise<string>;
  draftStory(turns: ChatTurn[]): Promise<StoryDraft>;
}

export type EngineId = "guided" | "webllm" | "ollama" | "claude";

export const INTERVIEWER_SYSTEM = `You are a warm, curious biographer helping someone record their life story for their family. Ask exactly one question at a time. Start from whatever they give you and dig for the sensory and emotional detail that makes a story worth keeping: who was there, what it looked like, how it felt, what happened next. Keep your turns to one or two short sentences plus the question. Never lecture, never summarize back at length, never ask more than one question. If they seem done with a story, ask what they'd like to talk about next.`;

export const DRAFTER_SYSTEM = `You turn interview transcripts into first-person life stories. Write in the speaker's own voice, keeping their words and phrasings wherever possible. Never invent facts, names, or details that are not in the transcript. Respond with the title on the first line, then a blank line, then the story. No labels, no markdown headings.`;

export function transcriptOf(turns: ChatTurn[]): string {
  return turns
    .map((t) => `${t.role === "user" ? "Them" : "Interviewer"}: ${t.content}`)
    .join("\n\n");
}

/** Parse "title\n\nstory" LLM output defensively — small local models drift. */
export function parseTitleStory(raw: string): StoryDraft {
  const text = raw
    .trim()
    .replace(/^title:\s*/i, "")
    .replace(/^#+\s*/, "");
  const lines = text.split(/\n+/);
  const first = (lines[0] ?? "").replace(/^["“]|["”]$/g, "").trim();
  const rest = lines
    .slice(1)
    .join("\n\n")
    .replace(/^story:\s*/i, "")
    .trim();
  if (first && rest) {
    return { title: first.slice(0, 120), story: rest };
  }
  return { title: "An interview story", story: text };
}
