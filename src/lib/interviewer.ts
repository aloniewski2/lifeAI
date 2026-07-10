import Anthropic from "@anthropic-ai/sdk";
import { getApiKey } from "./apiKey";

/**
 * The AI interviewer runs on Claude Haiku with the user's own API key,
 * called directly from the browser. This is the one opt-in feature where
 * words leave the device — it sits behind the "conversations" consent
 * switch, and the key lives in its own localStorage slot (see apiKey.ts)
 * so it is never part of an archive export.
 */
const MODEL = "claude-haiku-4-5";

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

const INTERVIEWER_SYSTEM = `You are a warm, curious biographer helping someone record their life story for their family. Ask exactly one question at a time. Start from whatever they give you and dig for the sensory and emotional detail that makes a story worth keeping: who was there, what it looked like, how it felt, what happened next. Keep your turns to one or two short sentences plus the question. Never lecture, never summarize back at length, never ask more than one question. If they seem done with a story, ask what they'd like to talk about next.`;

function makeClient(): Anthropic {
  return new Anthropic({
    apiKey: getApiKey(),
    dangerouslyAllowBrowser: true,
  });
}

export async function nextQuestion(turns: ChatTurn[]): Promise<string> {
  const client = makeClient();
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 300,
    system: INTERVIEWER_SYSTEM,
    messages:
      turns.length > 0
        ? turns
        : [{ role: "user", content: "I'm ready. Ask me your first question." }],
  });
  const block = response.content.find((b) => b.type === "text");
  return block && block.type === "text" ? block.text : "";
}

export interface StoryDraft {
  title: string;
  story: string;
}

export async function draftStory(turns: ChatTurn[]): Promise<StoryDraft> {
  const client = makeClient();
  const transcript = turns
    .map((t) => `${t.role === "user" ? "Them" : "Interviewer"}: ${t.content}`)
    .join("\n\n");
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1500,
    system:
      "You turn interview transcripts into first-person life stories. Write in the speaker's own voice, keeping their words and phrasings wherever possible. Never invent facts, names, or details that are not in the transcript. Give the story a short evocative title.",
    messages: [
      {
        role: "user",
        content: `Turn this interview into a first-person story:\n\n${transcript}`,
      },
    ],
    output_config: {
      format: {
        type: "json_schema",
        schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            story: { type: "string" },
          },
          required: ["title", "story"],
          additionalProperties: false,
        },
      },
    },
  });
  const block = response.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") throw new Error("Empty response");
  return JSON.parse(block.text) as StoryDraft;
}
