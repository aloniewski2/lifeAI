import { loadNaturalVoice } from "./tts";
import { loadTranscriber } from "./transcriber";
import { loadWebLlm, webGpuAvailable } from "./interview/webllm";

/**
 * One-tap warm-up: pull every on-device model down now instead of on first
 * use, so capture, narration, and the interviewer all start instantly —
 * and keep working offline. Each loader caches in the browser (Cache API /
 * IndexedDB), so this is a no-op on devices that are already prepared.
 */
export interface PrefetchItem {
  key: "voice" | "dictation" | "interviewer";
  label: string;
  size: string;
  detail: string;
  available: boolean;
}

export function prefetchItems(): PrefetchItem[] {
  return [
    {
      key: "voice",
      label: "Narration voice",
      size: "~86 MB",
      detail: "Kokoro — reads chapters, letters, and interview questions aloud.",
      available: true,
    },
    {
      key: "dictation",
      label: "Dictation",
      size: "~80 MB",
      detail: "Whisper — turns your speech into text, on-device.",
      available: true,
    },
    {
      key: "interviewer",
      label: "AI interviewer",
      size: "~880 MB",
      detail: webGpuAvailable()
        ? "Llama 3.2 — asks follow-up questions, fully in your browser."
        : "Needs WebGPU, which this browser doesn't support. The Guided interviewer works everywhere.",
      available: webGpuAvailable(),
    },
  ];
}

export async function prefetch(
  key: PrefetchItem["key"],
  onProgress: (progress: number) => void,
): Promise<void> {
  if (key === "voice") {
    await loadNaturalVoice(onProgress);
  } else if (key === "dictation") {
    await loadTranscriber(onProgress);
  } else {
    await loadWebLlm((_text, progress) => onProgress(progress));
  }
  onProgress(1);
}
