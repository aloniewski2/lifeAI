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
 * Fully local AI interviewer: Llama 3.2 running in the browser on WebGPU
 * via WebLLM (Apache-2.0). ~880MB one-time download, cached by the
 * browser; afterwards it works offline and nothing ever leaves the device.
 */
export const WEBLLM_MODEL = "Llama-3.2-1B-Instruct-q4f16_1-MLC";

type MLCEngine = {
  chat: {
    completions: {
      create: (opts: {
        messages: { role: string; content: string }[];
        max_tokens?: number;
        temperature?: number;
      }) => Promise<{ choices: { message: { content: string | null } }[] }>;
    };
  };
};

let enginePromise: Promise<MLCEngine> | null = null;

export function webGpuAvailable(): boolean {
  return typeof navigator !== "undefined" && "gpu" in navigator;
}

export function loadWebLlm(
  onProgress: (text: string, progress: number) => void,
): Promise<MLCEngine> {
  if (!enginePromise) {
    enginePromise = (async () => {
      // The engine runs in a dedicated worker (webllmWorker.ts) so model
      // compilation and token generation never freeze the page.
      const { CreateWebWorkerMLCEngine } = await import("@mlc-ai/web-llm");
      const engine = await CreateWebWorkerMLCEngine(
        new Worker(new URL("./webllmWorker.ts", import.meta.url), {
          type: "module",
        }),
        WEBLLM_MODEL,
        {
          initProgressCallback: (report) =>
            onProgress(report.text, report.progress),
        },
      );
      return engine as unknown as MLCEngine;
    })();
    enginePromise.catch(() => {
      enginePromise = null;
    });
  }
  return enginePromise;
}

export class WebLlmEngine implements InterviewEngine {
  constructor(
    private onProgress: (text: string, progress: number) => void,
    private system: string = INTERVIEWER_SYSTEM,
  ) {}

  async nextQuestion(turns: ChatTurn[]): Promise<string> {
    const engine = await loadWebLlm(this.onProgress);
    const response = await engine.chat.completions.create({
      messages: [
        { role: "system", content: this.system },
        ...(turns.length > 0
          ? turns
          : [
              {
                role: "user" as const,
                content: "I'm ready. Ask me your first question.",
              },
            ]),
      ],
      max_tokens: 150,
      temperature: 0.8,
    });
    return (response.choices[0]?.message.content ?? "").trim();
  }

  async draftStory(turns: ChatTurn[]): Promise<StoryDraft> {
    const engine = await loadWebLlm(this.onProgress);
    const response = await engine.chat.completions.create({
      messages: [
        { role: "system", content: DRAFTER_SYSTEM },
        {
          role: "user",
          content: `Turn this interview into a first-person story:\n\n${transcriptOf(turns)}`,
        },
      ],
      max_tokens: 1200,
      temperature: 0.5,
    });
    return parseTitleStory(response.choices[0]?.message.content ?? "");
  }
}
