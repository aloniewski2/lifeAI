import { ChangeEvent, useRef, useState } from "react";
import { Download, Loader2, Trash2, Upload } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { useArchive, wipeArchive } from "@/lib/store";
import { parseArchive } from "@/lib/archive";
import { buildBackupZip, parseBackupZip } from "@/lib/backup";
import { setApiKey } from "@/lib/apiKey";
import { allPhotos, putPhoto, wipePhotos } from "@/lib/photoStore";
import { allAudio, putAudio, wipeAudio } from "@/lib/audioStore";
import { Consent, EMPTY_ARCHIVE } from "@/lib/types";

const SOURCES: { key: keyof Consent; label: string; note: string }[] = [
  {
    key: "journal",
    label: "Journal & stories",
    note: "Entries you type into Capture.",
  },
  {
    key: "photos",
    label: "Photos",
    note: "Imported photos are downscaled and stored only in this browser.",
  },
  {
    key: "voice",
    label: "Voice dictation",
    note: "Recorded and transcribed entirely on this device (Whisper). Audio never leaves it.",
  },
  {
    key: "conversations",
    label: "AI interviewer (Claude)",
    note: "The one off-device feature: interview messages go to Anthropic's API using your own key.",
  },
  {
    key: "calendar",
    label: "Calendar",
    note: "Roadmap — milestones suggested from events, never auto-added.",
  },
  {
    key: "socialMedia",
    label: "Social media",
    note: "Roadmap — one-time imports you review before keeping.",
  },
  {
    key: "email",
    label: "Email",
    note: "Roadmap — optional, and off by default forever.",
  },
];

export default function Vault() {
  const { archive, update } = useArchive();
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  async function exportBackup() {
    setExporting(true);
    try {
      const now = new Date().toISOString();
      const stamped = { ...archive, lastExportedAt: now };
      const [photos, audio] = await Promise.all([allPhotos(), allAudio()]);
      const blob = await buildBackupZip({
        archive: stamped,
        photos: Object.fromEntries(photos),
        audio: Object.fromEntries(audio),
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `legacy-archive-${now.slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      update(() => stamped);
    } finally {
      setExporting(false);
    }
  }

  async function importBackup(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setImporting(true);
    try {
      if (file.name.endsWith(".json")) {
        // Legacy JSON export (no photos/audio).
        const imported = parseArchive(await file.text());
        if (imported.entries.length === 0 && !imported.profile.name) {
          window.alert("That file doesn't look like a legacy archive export.");
          return;
        }
        if (
          window.confirm(
            "Replace everything on this device with the imported archive?",
          )
        ) {
          update(() => imported);
        }
        return;
      }

      const contents = await parseBackupZip(file);
      if (
        !window.confirm(
          `Replace everything on this device with this backup? It contains ${contents.archive.entries.length} entries, ${Object.keys(contents.photos).length} photos, and ${Object.keys(contents.audio).length} recordings.`,
        )
      ) {
        return;
      }
      await Promise.all([wipePhotos(), wipeAudio()]);
      await Promise.all([
        ...Object.entries(contents.photos).map(([id, blob]) =>
          putPhoto(id, blob),
        ),
        ...Object.entries(contents.audio).map(([id, takes]) =>
          putAudio(id, takes),
        ),
      ]);
      update(() => contents.archive);
    } catch {
      window.alert("That file couldn't be read as a legacy archive backup.");
    } finally {
      setImporting(false);
    }
  }

  function wipe() {
    if (
      window.confirm(
        "Permanently delete your entire archive from this device — entries, photos, and recordings? This cannot be undone.",
      )
    ) {
      wipeArchive();
      setApiKey("");
      void wipePhotos();
      void wipeAudio();
      update(() => structuredClone(EMPTY_ARCHIVE));
    }
  }

  return (
    <div>
      <PageHeader
        title="Vault & privacy"
        subtitle="Your archive belongs to you. It is stored only in this browser, it moves only when you export it, and it disappears the moment you say so."
      />

      <section className="card mb-6">
        <h2 className="font-serif text-lg text-ink-50">Sources</h2>
        <p className="mt-1 text-sm text-ink-300">
          Nothing is collected from a source unless you turn it on. Most are
          roadmap items — the switches exist now so consent is designed in from
          day one, not bolted on.
        </p>
        <ul className="mt-4 divide-y divide-ink-800">
          {SOURCES.map(({ key, label, note }) => (
            <li key={key} className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm text-ink-100">{label}</p>
                <p className="text-xs text-ink-400">{note}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={archive.consent[key]}
                aria-label={`Toggle ${label}`}
                onClick={() =>
                  update((a) => ({
                    ...a,
                    consent: { ...a.consent, [key]: !a.consent[key] },
                  }))
                }
                className={
                  archive.consent[key]
                    ? "h-6 w-11 rounded-full bg-ember-500 p-0.5 transition-colors"
                    : "h-6 w-11 rounded-full bg-ink-700 p-0.5 transition-colors"
                }
              >
                <span
                  className={
                    archive.consent[key]
                      ? "block h-5 w-5 translate-x-5 rounded-full bg-ink-950 transition-transform"
                      : "block h-5 w-5 translate-x-0 rounded-full bg-ink-300 transition-transform"
                  }
                />
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="card mb-6">
        <h2 className="font-serif text-lg text-ink-50">Backup</h2>
        <p className="mt-1 text-sm text-ink-300">
          One ZIP with everything — entries, photos, and voice recordings.
          Keep a copy somewhere safe; importing it on any device restores the
          whole archive.
          {archive.lastExportedAt && (
            <>
              {" "}
              Last backup:{" "}
              {new Date(archive.lastExportedAt).toLocaleDateString()}.
            </>
          )}
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={exportBackup}
            disabled={exporting}
            className="btn-primary"
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Export backup (ZIP)
          </button>
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={importing}
            className="btn-ghost"
          >
            {importing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            Import backup
          </button>
          <input
            ref={fileInput}
            type="file"
            accept=".zip,.json,application/zip,application/json"
            className="hidden"
            onChange={importBackup}
          />
        </div>
      </section>

      <section className="card border-red-900/60">
        <h2 className="font-serif text-lg text-red-300">Delete everything</h2>
        <p className="mt-1 text-sm text-ink-300">
          Removes your entire archive from this device immediately and
          permanently. There is no server copy to linger.
        </p>
        <button
          type="button"
          onClick={wipe}
          className="btn-ghost mt-4 border-red-900/60 text-red-300 hover:border-red-500 hover:text-red-200"
        >
          <Trash2 className="h-4 w-4" />
          Wipe archive
        </button>
      </section>
    </div>
  );
}
