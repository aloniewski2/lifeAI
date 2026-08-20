import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useArchive } from "@/lib/store";
import { allPhotos } from "@/lib/photoStore";
import { allAudio } from "@/lib/audioStore";
import {
  buildMemorialHtml,
  memorialFileName,
  PhotoData,
  VoiceData,
} from "@/lib/memorialExport";

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/**
 * Hands the memorial to the family as one HTML file: photos inlined, no
 * app, no server, no expiry. It's the answer to "what happens when this
 * company goes away" — the keepsake is already in their hands.
 */
export function MemorialExportButton() {
  const { archive } = useArchive();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function exportPage() {
    setBusy(true);
    setDone(false);
    try {
      const wanted = new Set(
        archive.entries.filter((e) => e.kind === "photo").map((e) => e.id),
      );
      const photos: PhotoData = {};
      for (const [id, blob] of await allPhotos()) {
        if (wanted.has(id)) photos[id] = await blobToDataUrl(blob);
      }
      // The voice is the part a family cannot reconstruct from anything
      // else, so it travels with the keepsake rather than staying in the app.
      const storyIds = new Set(
        archive.entries.filter((e) => e.kind === "story").map((e) => e.id),
      );
      const voices: VoiceData = {};
      for (const [id, takes] of await allAudio()) {
        if (!storyIds.has(id) || takes.length === 0) continue;
        voices[id] = [await blobToDataUrl(takes[0])];
      }

      const html = buildMemorialHtml(archive, { photos, voices });
      const url = URL.createObjectURL(
        new Blob([html], { type: "text/html;charset=utf-8" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = memorialFileName(archive);
      a.click();
      URL.revokeObjectURL(url);
      setDone(true);
      window.setTimeout(() => setDone(false), 4000);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-12">
      <button
        type="button"
        onClick={exportPage}
        disabled={busy}
        className="mx-auto block p-1 text-xs uppercase tracking-[0.16em] text-wax-600 transition-colors hover:text-ink-900 disabled:opacity-50"
      >
        {busy ? "Gathering…" : "❖  Give this page to your family"}
      </button>
      <p className="mx-auto mt-3 max-w-[380px] text-[13px] leading-[1.7] text-ink-400">
        {done
          ? "Saved. That file is the whole memorial — email it, print it, keep it on a drive. It needs no app and no internet."
          : "Saves one HTML file with the photos inside it. It opens in any browser, forever, with or without this app."}
      </p>
      {busy && (
        <Loader2 className="mx-auto mt-3 h-4 w-4 animate-spin text-ink-400" />
      )}
    </div>
  );
}
