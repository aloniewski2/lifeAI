import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Mic, Square } from "lucide-react";
import {
  Recording,
  startRecording,
  transcribe,
  TranscriberStatus,
} from "@/lib/transcriber";
import { useArchive } from "@/lib/store";

/**
 * Tap to talk, tap to stop; the transcript goes to onText. Everything —
 * recording and Whisper transcription — happens on-device.
 *
 * `inlineConsent` renders an enable-voice button right here instead of
 * linking to the Vault, for flows (like the interview) where leaving the
 * page would break the moment. `label` overrides the idle button text.
 */
export function DictationButton({
  onText,
  inlineConsent = false,
  label = "Dictate",
  stopLabel = "Stop & transcribe",
  disabled = false,
}: {
  onText: (text: string) => void;
  inlineConsent?: boolean;
  label?: string;
  stopLabel?: string;
  disabled?: boolean;
}) {
  const { archive, update } = useArchive();
  const [status, setStatus] = useState<TranscriberStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const recordingRef = useRef<Recording | null>(null);

  if (!archive.consent.voice) {
    if (inlineConsent) {
      return (
        <button
          type="button"
          className="btn-ghost px-3 py-1.5"
          onClick={() =>
            update((a) => ({ ...a, consent: { ...a.consent, voice: true } }))
          }
        >
          <Mic className="h-4 w-4" />
          Enable voice — stays on this device
        </button>
      );
    }
    return (
      <p className="text-xs text-ink-400">
        Prefer talking to typing?{" "}
        <Link to="/app/vault" className="text-ember-300 underline">
          Turn on voice notes in the Vault
        </Link>{" "}
        to dictate entries — transcription happens entirely on this device.
      </p>
    );
  }

  async function toggle() {
    setError(null);
    if (status === "idle") {
      try {
        recordingRef.current = await startRecording();
        setStatus("recording");
      } catch {
        setError("Microphone access was denied.");
      }
      return;
    }
    if (status === "recording" && recordingRef.current) {
      const blob = await recordingRef.current.stop();
      recordingRef.current = null;
      setStatus("loading-model");
      try {
        setStatus("transcribing");
        const text = await transcribe(blob);
        if (text) onText(text);
        setStatus("idle");
      } catch {
        setError(
          "Transcription failed — the speech model may still be downloading. Try again.",
        );
        setStatus("idle");
      }
    }
  }

  const busy = status === "loading-model" || status === "transcribing";

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={toggle}
        disabled={busy || disabled}
        className={
          status === "recording"
            ? "inline-flex items-center gap-2 rounded-md bg-red-500/90 px-3 py-1.5 text-sm text-white"
            : "btn-ghost px-3 py-1.5"
        }
        aria-label={status === "recording" ? "Stop dictation" : "Dictate"}
      >
        {status === "recording" ? (
          <Square className="h-4 w-4" />
        ) : busy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Mic className="h-4 w-4" />
        )}
        {status === "recording"
          ? stopLabel
          : busy
            ? "Transcribing on-device…"
            : label}
      </button>
      {status === "recording" && (
        <span className="flex items-center gap-1.5 text-xs text-red-300">
          <span className="h-2 w-2 animate-pulse rounded-full bg-red-400" />
          Recording — audio stays on this device
        </span>
      )}
      {error && <span className="text-xs text-red-300">{error}</span>}
    </div>
  );
}
