import { ClaudeEngine } from "./claude";
import { GuidedEngine } from "./guided";
import { OllamaEngine } from "./ollama";
import { WebLlmEngine } from "./webllm";
import { EngineId, InterviewEngine } from "./types";

export * from "./types";
export { webGpuAvailable, WEBLLM_MODEL } from "./webllm";
export { ollamaReachable, OLLAMA_MODEL, OLLAMA_URL } from "./ollama";

const ENGINE_STORAGE = "ai-legacy-os/interviewer-engine";

export function getSavedEngineId(): EngineId {
  try {
    const saved = localStorage.getItem(ENGINE_STORAGE);
    if (saved === "guided" || saved === "webllm" || saved === "ollama" || saved === "claude") {
      return saved;
    }
  } catch {
    // fall through
  }
  return "guided";
}

export function saveEngineId(id: EngineId): void {
  localStorage.setItem(ENGINE_STORAGE, id);
}

export function makeEngine(
  id: EngineId,
  onProgress: (text: string, progress: number) => void,
): InterviewEngine {
  switch (id) {
    case "guided":
      return new GuidedEngine();
    case "webllm":
      return new WebLlmEngine(onProgress);
    case "ollama":
      return new OllamaEngine();
    case "claude":
      return new ClaudeEngine();
  }
}
