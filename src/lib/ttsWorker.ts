/// <reference lib="webworker" />
import { KokoroTTS } from "kokoro-js";
import { splitIntoChunks } from "./textChunks";
import { wavBlobFrom } from "./wav";

/**
 * Kokoro TTS in a dedicated worker so speech generation never blocks the
 * page. Uses WebGPU when the worker has it, WASM otherwise. Speaks a
 * request as sentence chunks, posting each chunk's WAV blob as soon as
 * it's ready.
 *
 * Messages in:  {id, type:"load"} | {id, type:"generate", text, voice}
 *               | {type:"cancel"}
 * Messages out: {type:"progress", progress} | {id, type:"ready"}
 *               | {id, type:"chunk", blob} | {id, type:"done"}
 *               | {id, type:"error", message}
 */

const MODEL_ID = "onnx-community/Kokoro-82M-v1.0-ONNX";

let ttsPromise: Promise<KokoroTTS> | null = null;
let activeId = 0;

function load(): Promise<KokoroTTS> {
  if (!ttsPromise) {
    const hasWebGPU = "gpu" in navigator;
    ttsPromise = KokoroTTS.from_pretrained(MODEL_ID, {
      dtype: hasWebGPU ? "fp32" : "q8",
      device: hasWebGPU ? "webgpu" : "wasm",
      progress_callback: (info: { status: string; progress?: number }) => {
        if (info.status === "progress" && info.progress != null) {
          self.postMessage({ type: "progress", progress: info.progress / 100 });
        }
      },
    });
    ttsPromise.catch(() => {
      ttsPromise = null;
    });
  }
  return ttsPromise;
}

self.onmessage = async (
  e: MessageEvent<{ id?: number; type: string; text?: string; voice?: string }>,
) => {
  const { id, type, text, voice } = e.data;

  if (type === "cancel") {
    activeId = -1;
    return;
  }

  if (type === "load") {
    try {
      await load();
      self.postMessage({ id, type: "ready" });
    } catch (err) {
      self.postMessage({ id, type: "error", message: String(err) });
    }
    return;
  }

  if (type === "generate" && id != null && text) {
    activeId = id;
    try {
      const tts = await load();
      for (const chunk of splitIntoChunks(text)) {
        if (activeId !== id) return; // cancelled or superseded
        const result = (await tts.generate(chunk, {
          voice: (voice ?? "af_heart") as never,
        })) as {
          toBlob?: () => Blob;
          audio: Float32Array;
          sampling_rate: number;
        };
        if (activeId !== id) return;
        const blob = result.toBlob
          ? result.toBlob()
          : wavBlobFrom(result.audio, result.sampling_rate);
        self.postMessage({ id, type: "chunk", blob });
      }
      if (activeId === id) self.postMessage({ id, type: "done" });
    } catch (err) {
      if (activeId === id)
        self.postMessage({ id, type: "error", message: String(err) });
    }
  }
};
