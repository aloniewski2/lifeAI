import Anthropic from "@anthropic-ai/sdk";
import { getApiKey } from "../apiKey";
import { ChatTurn, EngineId } from "../interview/types";
import { loadWebLlm } from "../interview/webllm";
import { ollamaChat } from "../interview/ollama";
import { Archive, Entry } from "../types";
import { retrieve } from "./retrieve";

export { retrieve, tokenize } from "./retrieve";

/**
 * "Ask them a question": answers drawn only from the archive, spoken as a
 * clearly-labeled reconstruction. Every engine gets the same retrieved
 * memories and the same rules; the guided (no-AI) mode skips the LLM and
 * answers with the memories themselves, verbatim.
 */

export interface AskAnswer {
  answer: string;
  /** The entries the answer was drawn from, for citation in the UI. */
  sources: Entry[];
}

export function askSystemPrompt(archive: Archive): string {
  const name = archive.profile.name || "this person";
  return `You are a memory reconstruction of ${name}, built only from journal entries, stories, milestones, and values they recorded themselves. You are not ${name} and never claim to be — if asked what you are, say you are a reconstruction of what they chose to record.

Rules:
- Answer in the first person, in their voice, reusing their own words and phrasings wherever possible.
- Use ONLY the memories provided in the user's message. Never invent people, events, dates, opinions, or details.
- If the memories don't answer the question, say plainly that they never recorded anything about that, and (if any memory is at least nearby) offer the closest thing they did record.
- Keep answers short and warm — a few sentences, the way a person actually talks.${archive.profile.epitaph ? `\n- A line they wanted remembered: "${archive.profile.epitaph}"` : ""}`;
}

export function formatMemories(sources: Entry[]): string {
  return sources
    .map(
      (entry, i) =>
        `[Memory ${i + 1} — ${entry.date.slice(0, 4)}, ${entry.kind}: "${entry.title}"]\n${entry.content}`,
    )
    .join("\n\n");
}

export function buildQuestionTurn(question: string, sources: Entry[]): string {
  if (sources.length === 0) {
    return `Recorded memories relevant to this question: none found.\n\nQuestion: ${question}`;
  }
  return `Recorded memories relevant to this question:\n\n${formatMemories(sources)}\n\nQuestion: ${question}`;
}

/** No-AI mode: answer with the matching memories themselves, verbatim. */
function quotesAnswer(sources: Entry[]): string {
  if (sources.length === 0) {
    return "Nothing in the archive speaks to that — they never recorded anything about it. Try asking about something on the timeline.";
  }
  return sources
    .slice(0, 3)
    .map((e) => `From "${e.title}" (${e.date.slice(0, 4)}):\n“${e.content}”`)
    .join("\n\n");
}

async function llmAnswer(
  engineId: Exclude<EngineId, "guided">,
  archive: Archive,
  history: ChatTurn[],
  questionTurn: string,
  onProgress: (text: string, progress: number) => void,
): Promise<string> {
  const system = askSystemPrompt(archive);
  const messages = [...history, { role: "user" as const, content: questionTurn }];

  if (engineId === "webllm") {
    const engine = await loadWebLlm(onProgress);
    const response = await engine.chat.completions.create({
      messages: [{ role: "system", content: system }, ...messages],
      max_tokens: 300,
      temperature: 0.6,
    });
    return (response.choices[0]?.message.content ?? "").trim();
  }

  if (engineId === "ollama") {
    return ollamaChat([{ role: "system", content: system }, ...messages], 300);
  }

  const client = new Anthropic({
    apiKey: getApiKey(),
    dangerouslyAllowBrowser: true,
  });
  const response = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 400,
    system,
    messages,
  });
  const block = response.content.find((b) => b.type === "text");
  return block && block.type === "text" ? block.text.trim() : "";
}

/**
 * Answer a question from the archive. `history` carries prior Q&A turns so
 * follow-ups ("what happened after that?") stay coherent; each question is
 * re-retrieved so context stays relevant.
 */
export async function ask(
  engineId: EngineId,
  archive: Archive,
  history: ChatTurn[],
  question: string,
  onProgress: (text: string, progress: number) => void,
): Promise<AskAnswer> {
  const sources = retrieve(archive.entries, question).map((s) => s.entry);
  if (engineId === "guided") {
    return { answer: quotesAnswer(sources), sources };
  }
  const answer = await llmAnswer(
    engineId,
    archive,
    history,
    buildQuestionTurn(question, sources),
    onProgress,
  );
  return { answer, sources };
}
