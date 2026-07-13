/// <reference lib="webworker" />
import { env, pipeline } from "@huggingface/transformers";
import { installLocalModelFetch } from "./localModels";

installLocalModelFetch();
// Model files are same-origin (public/models/); the Cache API layer would
// bypass the fetch interceptor above, so rely on the plain HTTP cache.
env.useBrowserCache = false;

/**
 * Whisper speech-to-text in a dedicated worker so transcription never
 * blocks the page. Audio is decoded to 16kHz mono on the main thread
 * (workers have no AudioContext) and transferred here for inference.
 */

type Transcriber = (
  audio: Float32Array,
  opts: object,
) => Promise<{ text: string }>;

let pipelinePromise: Promise<Transcriber> | null = null;

function load(): Promise<Transcriber> {
  if (!pipelinePromise) {
    pipelinePromise = pipeline(
      "automatic-speech-recognition",
      "onnx-community/whisper-base",
      {
        dtype: "q8",
        progress_callback: (info: { status: string; progress?: number }) => {
          if (info.status === "progress" && info.progress != null) {
            self.postMessage({
              type: "progress",
              progress: info.progress / 100,
            });
          }
        },
      },
    ) as unknown as Promise<Transcriber>;
    pipelinePromise.catch(() => {
      pipelinePromise = null;
    });
  }
  return pipelinePromise;
}

self.onmessage = async (
  e: MessageEvent<{ id: number; type: string; audio?: Float32Array }>,
) => {
  const { id, type, audio } = e.data;
  try {
    if (type === "load") {
      await load();
      self.postMessage({ id, type: "ready" });
    } else if (type === "transcribe" && audio) {
      const pipe = await load();
      const result = await pipe(audio, { chunk_length_s: 30 });
      self.postMessage({ id, type: "text", text: result.text.trim() });
    }
  } catch (err) {
    self.postMessage({ id, type: "error", message: String(err) });
  }
};
