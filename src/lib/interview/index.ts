import { Archive } from "../types";
import { ClaudeEngine } from "./claude";
import { GuidedEngine } from "./guided";
import { interviewContext, interviewLeads } from "./leads";
import { OllamaEngine } from "./ollama";
import { WebLlmEngine } from "./webllm";
import { EngineId, InterviewEngine, INTERVIEWER_SYSTEM } from "./types";

export * from "./types";
export * from "./leads";
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
  archive?: Archive,
): InterviewEngine {
  const leads = archive
    ? interviewLeads(archive, new Date().toISOString().slice(0, 10))
    : [];
  const system = archive
    ? `${INTERVIEWER_SYSTEM}\n\n${interviewContext(archive, leads)}`
    : INTERVIEWER_SYSTEM;
  switch (id) {
    case "guided":
      return new GuidedEngine(leads);
    case "webllm":
      return new WebLlmEngine(onProgress, system);
    case "ollama":
      return new OllamaEngine(system);
    case "claude":
      return new ClaudeEngine(system);
  }
}
