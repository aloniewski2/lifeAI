/**
 * On-device speech-to-text: records with MediaRecorder, transcribes with
 * Whisper via transformers.js. The model (~80MB, whisper-base) downloads on
 * first use and is cached by the browser; after that everything runs
 * offline. Audio never leaves the device.
 */
export type TranscriberStatus =
  | "idle"
  | "recording"
  | "loading-model"
  | "transcribing";

let pipelinePromise: Promise<
  (audio: Float32Array, opts: object) => Promise<{ text: string }>
> | null = null;

function loadPipeline() {
  if (!pipelinePromise) {
    pipelinePromise = (async () => {
      // Dynamic import keeps transformers.js (and its WASM/WebGPU runtime)
      // out of the main bundle until someone actually records.
      const { pipeline } = await import("@huggingface/transformers");
      const transcribe = await pipeline(
        "automatic-speech-recognition",
        "onnx-community/whisper-base",
        { dtype: "q8" },
      );
      return transcribe as unknown as (
        audio: Float32Array,
        opts: object,
      ) => Promise<{ text: string }>;
    })();
    pipelinePromise.catch(() => {
      pipelinePromise = null;
    });
  }
  return pipelinePromise;
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
  const [pipe, audio] = await Promise.all([loadPipeline(), decodeTo16kMono(blob)]);
  const result = await pipe(audio, { chunk_length_s: 30 });
  return result.text.trim();
}
