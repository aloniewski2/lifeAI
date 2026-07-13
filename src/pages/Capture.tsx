import { ChangeEvent, FormEvent, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import exifr from "exifr";
import { ImagePlus, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { CalendarImport } from "@/components/CalendarImport";
import { DictationButton } from "@/components/DictationButton";
import { useArchive } from "@/lib/store";
import { newId } from "@/lib/archive";
import { makeThumbnail, putPhoto } from "@/lib/photoStore";
import { putAudio } from "@/lib/audioStore";
import { EntryKind, ENTRY_KIND_LABELS } from "@/lib/types";
import clsx from "clsx";

const CAPTURE_KINDS: (EntryKind | "photo" | "calendar")[] = [
  "journal",
  "story",
  "milestone",
  "value",
  "photo",
  "calendar",
];

const PROMPTS: Record<string, string> = {
  journal: "What happened today that you'd want remembered?",
  story: "Tell it the way you'd tell it at the dinner table.",
  milestone: "What changed, and how did it feel at the time?",
  value: "What do you believe, and what taught it to you?",
};

/** State passed from the Dashboard's prompt-of-the-day card. */
export interface CapturePrefill {
  kind?: EntryKind;
  question?: string;
}

function toIsoDate(value: unknown): string | null {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  return null;
}

function TextEntryForm({ kind, question }: { kind: EntryKind; question?: string }) {
  const { update } = useArchive();
  const [saved, setSaved] = useState(false);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const takesRef = useRef<Blob[]>([]);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const title = String(data.get("title") ?? "").trim();
    const content = String(data.get("content") ?? "").trim();
    const date = String(data.get("date") ?? "");
    const tags = String(data.get("tags") ?? "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    if (!title || !content || !date) return;

    const id = newId();
    update((a) => ({
      ...a,
      entries: [
        ...a.entries,
        {
          id,
          kind,
          title,
          content,
          date,
          tags,
          createdAt: new Date().toISOString(),
        },
      ],
    }));
    // Keep the original recordings — the voice itself is a keepsake.
    if (takesRef.current.length > 0) {
      void putAudio(id, takesRef.current);
      takesRef.current = [];
    }
    form.reset();
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2500);
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-4">
      <p className="text-sm italic text-ink-300">
        {question ?? PROMPTS[kind]}
      </p>
      <input
        name="title"
        required
        className="field"
        placeholder="Give it a title"
        defaultValue={question ? question.replace(/\?$/, "") : ""}
      />
      <textarea
        ref={contentRef}
        name="content"
        required
        rows={8}
        className="field resize-y"
        placeholder="Write freely — or dictate below."
      />
      <DictationButton
        onText={(text, audio) => {
          const el = contentRef.current;
          if (!el) return;
          el.value = el.value ? `${el.value.trimEnd()} ${text}` : text;
          takesRef.current.push(audio);
        }}
      />
      <div className="flex flex-wrap gap-4">
        <label className="text-sm text-ink-300">
          When did this happen?
          <input
            name="date"
            type="date"
            required
            defaultValue={new Date().toISOString().slice(0, 10)}
            className="field mt-1"
          />
        </label>
        <label className="flex-1 text-sm text-ink-300">
          Tags (comma-separated)
          <input
            name="tags"
            className="field mt-1"
            placeholder="family, career, travel"
          />
        </label>
      </div>
      <div className="flex items-center gap-4">
        <button type="submit" className="btn-primary">
          Save to archive
        </button>
        {saved && (
          <span className="text-sm text-ember-300">
            Saved — it's on your timeline now.
          </span>
        )}
      </div>
    </form>
  );
}

function PhotoImport() {
  const { archive, update } = useArchive();
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  if (!archive.consent.photos) {
    return (
      <div className="card">
        <h2 className="font-serif text-lg text-ink-50">
          Photos are off by default
        </h2>
        <p className="mt-1 text-sm text-ink-300">
          Turn on photo capture to import pictures. They're downscaled and
          stored only in this browser — nothing is uploaded anywhere.
        </p>
        <button
          type="button"
          className="btn-primary mt-4"
          onClick={() =>
            update((a) => ({
              ...a,
              consent: { ...a.consent, photos: true },
            }))
          }
        >
          Enable photo capture
        </button>
      </div>
    );
  }

  async function handleFiles(e: ChangeEvent<HTMLInputElement>) {
    const files = [...(e.target.files ?? [])];
    e.target.value = "";
    if (files.length === 0) return;
    setBusy(true);
    setReport(null);

    let imported = 0;
    let dated = 0;
    for (const file of files) {
      try {
        // EXIF DateTimeOriginal places the photo on the timeline where the
        // moment happened; fall back to the file's modified date.
        const exif = await exifr
          .parse(file, ["DateTimeOriginal", "CreateDate"])
          .catch(() => null);
        const exifDate =
          toIsoDate(exif?.DateTimeOriginal) ?? toIsoDate(exif?.CreateDate);
        if (exifDate) dated++;
        const date =
          exifDate ?? new Date(file.lastModified).toISOString().slice(0, 10);

        const id = newId();
        await putPhoto(id, await makeThumbnail(file));
        update((a) => ({
          ...a,
          entries: [
            ...a.entries,
            {
              id,
              kind: "photo",
              title: file.name.replace(/\.[^.]+$/, ""),
              content: "",
              date,
              tags: [],
              createdAt: new Date().toISOString(),
            },
          ],
        }));
        imported++;
      } catch {
        // Skip unreadable files; keep importing the rest.
      }
    }
    setBusy(false);
    setReport(
      imported === 0
        ? "No photos could be imported."
        : `Imported ${imported} photo${imported === 1 ? "" : "s"} — ${dated} placed by the date they were taken.`,
    );
  }

  return (
    <div className="card">
      <h2 className="font-serif text-lg text-ink-50">Import photos</h2>
      <p className="mt-1 text-sm leading-relaxed text-ink-300">
        Photos land on your timeline at the moment they were taken (read from
        the photo's own metadata). They're downscaled and stored only on this
        device.
      </p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFiles}
      />
      <div className="mt-4 flex items-center gap-4">
        <button
          type="button"
          className="btn-primary"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ImagePlus className="h-4 w-4" />
          )}
          {busy ? "Importing…" : "Choose photos"}
        </button>
        {report && <span className="text-sm text-ember-300">{report}</span>}
      </div>
    </div>
  );
}

export default function Capture() {
  const location = useLocation();
  const prefill = (location.state ?? {}) as CapturePrefill;
  const [kind, setKind] = useState<EntryKind | "photo" | "calendar">(
    prefill.kind ?? "journal",
  );

  return (
    <div>
      <PageHeader
        title="Capture"
        subtitle="Two minutes is enough. Answer today's question, dictate a memory, or drop in a batch of photos — every entry compounds into your timeline and autobiography."
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {CAPTURE_KINDS.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className={clsx(
              "rounded-md px-3 py-1.5 text-sm transition-colors",
              kind === k
                ? "bg-ember-500 text-ink-950"
                : "border border-ink-700 text-ink-300 hover:text-ink-100",
            )}
          >
            {k === "photo"
              ? "Photos"
              : k === "calendar"
                ? "Calendar"
                : ENTRY_KIND_LABELS[k]}
          </button>
        ))}
      </div>

      {kind === "photo" ? (
        <PhotoImport />
      ) : kind === "calendar" ? (
        <CalendarImport />
      ) : (
        <TextEntryForm
          key={`${kind}-${prefill.question ?? ""}`}
          kind={kind}
          question={kind === prefill.kind ? prefill.question : undefined}
        />
      )}

      <p className="mt-6 text-xs leading-relaxed text-ink-400">
        Want a guided conversation instead? Try the{" "}
        <Link to="/app/interview" className="text-ember-300 underline">
          AI interviewer
        </Link>{" "}
        — it asks follow-up questions and turns your answers into stories.
      </p>
    </div>
  );
}
