import Anthropic from "@anthropic-ai/sdk";
import { getApiKey } from "../apiKey";
import {
  ChatTurn,
  InterviewEngine,
  INTERVIEWER_SYSTEM,
  StoryDraft,
  transcriptOf,
} from "./types";

/**
 * The optional cloud tier: Claude Haiku with the user's own API key,
 * called directly from the browser. The only engine where words leave
 * the device — gated behind the "conversations" consent switch. The key
 * lives in its own localStorage slot (apiKey.ts) so it is never part of
 * an archive export.
 */
const MODEL = "claude-haiku-4-5";

function makeClient(): Anthropic {
  return new Anthropic({
    apiKey: getApiKey(),
    dangerouslyAllowBrowser: true,
  });
}

export class ClaudeEngine implements InterviewEngine {
  constructor(private system: string = INTERVIEWER_SYSTEM) {}

  async nextQuestion(turns: ChatTurn[]): Promise<string> {
    const client = makeClient();
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 300,
      system: this.system,
      messages:
        turns.length > 0
          ? turns
          : [
              {
                role: "user",
                content: "I'm ready. Ask me your first question.",
              },
            ],
    });
    const block = response.content.find((b) => b.type === "text");
    return block && block.type === "text" ? block.text : "";
  }

  async draftStory(turns: ChatTurn[]): Promise<StoryDraft> {
    const client = makeClient();
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1500,
      system:
        "You turn interview transcripts into first-person life stories. Write in the speaker's own voice, keeping their words and phrasings wherever possible. Never invent facts, names, or details that are not in the transcript. Give the story a short evocative title.",
      messages: [
        {
          role: "user",
          content: `Turn this interview into a first-person story:\n\n${transcriptOf(turns)}`,
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
}
