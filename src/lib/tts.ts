/**
 * Natural-sounding speech for the interviewer: Kokoro (82M, Apache-2.0)
 * running in the browser via kokoro-js — the open-source answer to
 * ElevenLabs-style voices. ~86MB one-time download, cached; generation is
 * fully on-device. Falls back to the browser's built-in speechSynthesis
 * if the model can't load.
 */
const KOKORO_MODEL = "onnx-community/Kokoro-82M-v1.0-ONNX";
const VOICE = "af_heart";

interface KokoroLike {
  generate: (
    text: string,
    opts: { voice: string },
  ) => Promise<{
    toBlob?: () => Blob;
    audio: Float32Array;
    sampling_rate: number;
  }>;
}

let ttsPromise: Promise<KokoroLike> | null = null;
let currentAudio: HTMLAudioElement | null = null;
let currentUrl: string | null = null;
let currentOnEnded: (() => void) | null = null;
let speakSeq = 0;

export function loadNaturalVoice(
  onProgress?: (progress: number) => void,
): Promise<KokoroLike> {
  if (!ttsPromise) {
    ttsPromise = (async () => {
      const { KokoroTTS } = await import("kokoro-js");
      const tts = await KokoroTTS.from_pretrained(KOKORO_MODEL, {
        dtype: "q8",
        device: "wasm",
        progress_callback: (info: { status: string; progress?: number }) => {
          if (info.status === "progress" && info.progress != null) {
            onProgress?.(info.progress / 100);
          }
        },
      });
      return tts as unknown as KokoroLike;
    })();
    ttsPromise.catch(() => {
      ttsPromise = null;
    });
  }
  return ttsPromise;
}

function wavBlobFrom(audio: Float32Array, samplingRate: number): Blob {
  // Minimal 16-bit PCM WAV encoder for RawAudio without toBlob().
  const length = audio.length;
  const buffer = new ArrayBuffer(44 + length * 2);
  const view = new DataView(buffer);
  const writeString = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };
  writeString(0, "RIFF");
  view.setUint32(4, 36 + length * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, samplingRate, true);
  view.setUint32(28, samplingRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, length * 2, true);
  for (let i = 0; i < length; i++) {
    const s = Math.max(-1, Math.min(1, audio[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buffer], { type: "audio/wav" });
}

export function stopSpeaking(): void {
  speakSeq++;
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  if (currentUrl) {
    URL.revokeObjectURL(currentUrl);
    currentUrl = null;
  }
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  if (currentOnEnded) {
    const ended = currentOnEnded;
    currentOnEnded = null;
    ended();
  }
}

/**
 * Speak text with the natural voice; falls back to the browser voice if
 * Kokoro is unavailable. A newer speak() call cancels an older one; the
 * superseded call's onEnded fires so its UI can reset.
 */
export async function speak(
  text: string,
  onProgress?: (progress: number) => void,
  onEnded?: () => void,
): Promise<void> {
  stopSpeaking();
  const seq = speakSeq;
  currentOnEnded = onEnded ?? null;
  const finish = () => {
    if (seq !== speakSeq) return;
    currentOnEnded = null;
    onEnded?.();
  };
  try {
    const tts = await loadNaturalVoice(onProgress);
    if (seq !== speakSeq) return; // superseded while loading
    const result = await tts.generate(text, { voice: VOICE });
    if (seq !== speakSeq) return;
    const blob = result.toBlob
      ? result.toBlob()
      : wavBlobFrom(result.audio, result.sampling_rate);
    currentUrl = URL.createObjectURL(blob);
    currentAudio = new Audio(currentUrl);
    currentAudio.onended = finish;
    await currentAudio.play();
  } catch {
    if (seq !== speakSeq) return;
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onend = finish;
      window.speechSynthesis.speak(utterance);
    } else {
      finish();
    }
  }
}
