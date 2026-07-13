import { useEffect, useRef, useState } from "react";
import { Loader2, Volume2, VolumeX } from "lucide-react";
import { speak, stopSpeaking } from "@/lib/tts";

type Playback = "idle" | "loading" | "playing";

/**
 * Reads the given text aloud with the same on-device natural voice the
 * interviewer uses. One reading at a time app-wide: starting a new one
 * cancels the old one (whose button resets via onEnded).
 */
export function ListenButton({ text }: { text: string }) {
  const [playback, setPlayback] = useState<Playback>("idle");
  const [progress, setProgress] = useState(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  async function play() {
    setPlayback("loading");
    setProgress(0);
    await speak(
      text,
      (p) => {
        if (mounted.current) setProgress(p);
      },
      () => {
        if (mounted.current) setPlayback("idle");
      },
    );
    if (mounted.current) {
      // speak() resolves once playback (or the fallback voice) has started.
      setPlayback((current) => (current === "loading" ? "playing" : current));
    }
  }

  if (playback === "playing") {
    return (
      <button type="button" onClick={stopSpeaking} className="btn-ghost text-xs">
        <VolumeX className="h-3.5 w-3.5" />
        Stop
      </button>
    );
  }

  if (playback === "loading") {
    return (
      <button type="button" disabled className="btn-ghost text-xs">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        {progress > 0 && progress < 1
          ? `Downloading voice ${Math.round(progress * 100)}%`
          : "Preparing…"}
      </button>
    );
  }

  return (
    <button type="button" onClick={play} className="btn-ghost text-xs">
      <Volume2 className="h-3.5 w-3.5" />
      Listen
    </button>
  );
}
