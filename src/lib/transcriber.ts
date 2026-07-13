/**
 * On-device speech-to-text: records with MediaRecorder, transcribes with
 * Whisper via transformers.js running in a Web Worker — the page stays
 * responsive during model download and inference. The model (~80MB,
 * whisper-base) downloads on first use and is cached by the browser;
 * after that everything runs offline. Audio never leaves the device.
 */
export type TranscriberStatus =
  | "idle"
  | "recording"
  | "loading-model"
  | "transcribing";

type WorkerMessage =
  | { type: "progress"; progress: number }
  | { id: number; type: "ready" }
  | { id: number; type: "text"; text: string }
  | { id: number; type: "error"; message: string };

let worker: Worker | null = null;
let requestSeq = 0;
let progressListener: ((progress: number) => void) | null = null;

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL("./transcriberWorker.ts", import.meta.url), {
      type: "module",
    });
    worker.addEventListener("message", (e: MessageEvent<WorkerMessage>) => {
      if (e.data.type === "progress") progressListener?.(e.data.progress);
    });
  }
  return worker;
}

function request<T>(
  message: { type: string; audio?: Float32Array },
  transfer: Transferable[],
  extract: (msg: WorkerMessage) => T | undefined,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const id = ++requestSeq;
    const w = getWorker();
    const onMessage = (e: MessageEvent<WorkerMessage>) => {
      const msg = e.data;
      if (!("id" in msg) || msg.id !== id) return;
      if (msg.type === "error") {
        w.removeEventListener("message", onMessage);
        reject(new Error(msg.message));
        return;
      }
      const value = extract(msg);
      if (value !== undefined) {
        w.removeEventListener("message", onMessage);
        resolve(value);
      }
    };
    w.addEventListener("message", onMessage);
    w.postMessage({ id, ...message }, transfer);
  });
}

/**
 * Load (and cache) the Whisper pipeline ahead of first use; used by the
 * Vault's "prepare this device" flow. Progress is reported in [0, 1].
 */
export function loadTranscriber(
  onProgress?: (progress: number) => void,
): Promise<void> {
  if (onProgress) progressListener = onProgress;
  return request({ type: "load" }, [], (msg) =>
    msg.type === "ready" ? true : undefined,
  ).then(() => undefined);
}

/** Decode a recorded blob to the 16kHz mono Float32Array Whisper expects. */
async function decodeTo16kMono(blob: Blob): Promise<Float32Array> {
  const arrayBuffer = await blob.arrayBuffer();
  const probe = new AudioContext();
  const decoded = await probe.decodeAudioData(arrayBuffer);
  await probe.close();

  const offline = new OfflineAudioContext(
    1,
    Math.ceil(decoded.duration * 16000),
    16000,
  );
  const source = offline.createBufferSource();
  source.buffer = decoded;
  source.connect(offline.destination);
  source.start();
  const resampled = await offline.startRendering();
  return resampled.getChannelData(0);
}

export interface Recording {
  stop: () => Promise<Blob>;
}

export async function startRecording(): Promise<Recording> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const recorder = new MediaRecorder(stream);
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };
  recorder.start();

  return {
    stop: () =>
      new Promise<Blob>((resolve) => {
        recorder.onstop = () => {
          stream.getTracks().forEach((t) => t.stop());
          resolve(new Blob(chunks, { type: recorder.mimeType }));
        };
        recorder.stop();
      }),
  };
}

export async function transcribe(blob: Blob): Promise<string> {
  const audio = await decodeTo16kMono(blob);
  return request({ type: "transcribe", audio }, [audio.buffer], (msg) =>
    msg.type === "text" ? msg.text : undefined,
  );
}
