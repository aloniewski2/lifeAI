import { ChangeEvent, useRef } from "react";
import { Download, Trash2, Upload } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { useArchive, wipeArchive } from "@/lib/store";
import { parseArchive, serializeArchive } from "@/lib/archive";
import { setApiKey } from "@/lib/apiKey";
import { wipePhotos } from "@/lib/photoStore";
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
    label: "AI interviewer",
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
  const fileInput = useRef<HTMLInputElement>(null);

  function exportArchive() {
    const blob = new Blob([serializeArchive(archive)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "legacy-archive.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function importArchive(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    file.text().then((text) => {
      const imported = parseArchive(text);
      if (
        imported.entries.length === 0 &&
        imported.messages.length === 0 &&
        !imported.profile.name
      ) {
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
    });
    e.target.value = "";
  }

  function wipe() {
    if (
      window.confirm(
        "Permanently delete your entire archive from this device? This cannot be undone.",
      )
    ) {
      wipeArchive();
      setApiKey("");
      void wipePhotos();
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
        <h2 className="font-serif text-lg text-ink-50">Your data</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" onClick={exportArchive} className="btn-ghost">
            <Download className="h-4 w-4" />
            Export archive (JSON)
          </button>
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="btn-ghost"
          >
            <Upload className="h-4 w-4" />
            Import archive
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={importArchive}
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
