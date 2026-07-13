/**
 * Natural-sounding speech: Kokoro (82M, Apache-2.0) running in a Web
 * Worker via kokoro-js — the open-source answer to ElevenLabs-style
 * voices. ~86MB one-time download, cached; generation is fully on-device
 * and, since it lives in a worker, never freezes the page. Falls back to
 * the browser's built-in speechSynthesis if the model can't load.
 *
 * Long text is generated and played sentence-chunk by sentence-chunk, so
 * playback starts quickly even for a whole chapter.
 */
const VOICE = "af_heart";

type WorkerMessage =
  | { type: "progress"; progress: number }
  | { id: number; type: "ready" }
  | { id: number; type: "chunk"; blob: Blob }
  | { id: number; type: "done" }
  | { id: number; type: "error"; message: string };

let worker: Worker | null = null;
let requestSeq = 0;
let progressListener: ((progress: number) => void) | null = null;

interface ActivePlayback {
  id: number;
  queue: Blob[];
  playing: boolean;
  generationDone: boolean;
  audio: HTMLAudioElement | null;
  url: string | null;
  onEnded: (() => void) | null;
  onError: (() => void) | null;
  /** Resolves the speak() promise once audio is actually audible. */
  onStarted: (() => void) | null;
}
let active: ActivePlayback | null = null;

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL("./ttsWorker.ts", import.meta.url), {
      type: "module",
    });
    worker.onmessage = (e: MessageEvent<WorkerMessage>) => {
      const msg = e.data;
      if (msg.type === "progress") {
        progressListener?.(msg.progress);
        return;
      }
      if (!active || msg.id !== active.id) return;
      if (msg.type === "chunk") {
        active.queue.push(msg.blob);
        if (!active.playing) void playNext();
      } else if (msg.type === "done") {
        active.generationDone = true;
        if (!active.playing && active.queue.length === 0) finishActive();
      } else if (msg.type === "error") {
        active.onError?.();
      }
    };
  }
  return worker;
}

function cleanupAudio() {
  if (active?.audio) {
    active.audio.pause();
    active.audio = null;
  }
  if (active?.url) {
    URL.revokeObjectURL(active.url);
    active.url = null;
  }
}

function finishActive() {
  const ended = active?.onEnded;
  cleanupAudio();
  active = null;
  ended?.();
}

async function playNext(): Promise<void> {
  if (!active) return;
  const blob = active.queue.shift();
  if (!blob) {
    active.playing = false;
    if (active.generationDone) finishActive();
    return;
  }
  active.playing = true;
  cleanupAudio();
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  active.url = url;
  active.audio = audio;
  audio.onended = () => void playNext();
  try {
    await audio.play();
    const started = active?.onStarted;
    if (active) active.onStarted = null;
    started?.();
  } catch {
    active.onError?.();
  }
}

/** Load the voice model ahead of time (used by "Prepare this device"). */
export function loadNaturalVoice(
  onProgress?: (progress: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const id = ++requestSeq;
    const w = getWorker();
    if (onProgress) progressListener = onProgress;
    const onMessage = (e: MessageEvent<WorkerMessage>) => {
      const msg = e.data;
      if (!("id" in msg) || msg.id !== id) return;
      w.removeEventListener("message", onMessage);
      if (msg.type === "ready") resolve();
      else if (msg.type === "error") reject(new Error(msg.message));
    };
    w.addEventListener("message", onMessage);
    w.postMessage({ id, type: "load" });
  });
}

export function stopSpeaking(): void {
  worker?.postMessage({ type: "cancel" });
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  if (active) {
    const ended = active.onEnded;
    cleanupAudio();
    active = null;
    ended?.();
  }
}

/**
 * Speak text with the natural voice; falls back to the browser voice if
 * Kokoro is unavailable. A newer speak() call cancels an older one; the
 * superseded call's onEnded fires so its UI can reset.
 */
export function speak(
  text: string,
  onProgress?: (progress: number) => void,
  onEnded?: () => void,
): Promise<void> {
  stopSpeaking();
  const id = ++requestSeq;
  progressListener = onProgress ?? null;

  return new Promise<void>((resolveStarted) => {
    const fallback = () => {
      if (!active || active.id !== id) return;
      const ended = active.onEnded;
      cleanupAudio();
      active = null;
      resolveStarted();
      if ("speechSynthesis" in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.onend = () => ended?.();
        window.speechSynthesis.speak(utterance);
      } else {
        ended?.();
      }
    };

    active = {
      id,
      queue: [],
      playing: false,
      generationDone: false,
      audio: null,
      url: null,
      onEnded: () => {
        resolveStarted(); // no-op if already resolved
        onEnded?.();
      },
      onError: fallback,
      onStarted: resolveStarted,
    };
    getWorker().postMessage({ id, type: "generate", text, voice: VOICE });
  });
}
