import {
  ChatTurn,
  DRAFTER_SYSTEM,
  InterviewEngine,
  INTERVIEWER_SYSTEM,
  parseTitleStory,
  StoryDraft,
  transcriptOf,
} from "./types";

/**
 * Interviewer backed by a locally running Ollama server (free, open
 * source). Requests go to localhost only — nothing leaves the machine.
 * Requires Ollama to allow this origin, e.g.:
 *   OLLAMA_ORIGINS=http://localhost:5173 ollama serve
 */
export const OLLAMA_URL = "http://localhost:11434";
export const OLLAMA_MODEL = "llama3.2";

export async function ollamaReachable(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1500);
    const res = await fetch(`${OLLAMA_URL}/api/tags`, {
      signal: controller.signal,
    });
    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}

async function chat(
  messages: { role: string; content: string }[],
  maxTokens: number,
): Promise<string> {
  const res = await fetch(`${OLLAMA_URL}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages,
      max_tokens: maxTokens,
    }),
  });
  if (!res.ok) throw new Error(`Ollama returned ${res.status}`);
  const data = (await res.json()) as {
    choices: { message: { content: string | null } }[];
  };
  return (data.choices[0]?.message.content ?? "").trim();
}

export class OllamaEngine implements InterviewEngine {
  async nextQuestion(turns: ChatTurn[]): Promise<string> {
    return chat(
      [
        { role: "system", content: INTERVIEWER_SYSTEM },
        ...(turns.length > 0
          ? turns
          : [
              {
                role: "user" as const,
                content: "I'm ready. Ask me your first question.",
              },
            ]),
      ],
      150,
    );
  }

  async draftStory(turns: ChatTurn[]): Promise<StoryDraft> {
    const raw = await chat(
      [
        { role: "system", content: DRAFTER_SYSTEM },
        {
          role: "user",
          content: `Turn this interview into a first-person story:\n\n${transcriptOf(turns)}`,
        },
      ],
      1200,
    );
    return parseTitleStory(raw);
  }
}
