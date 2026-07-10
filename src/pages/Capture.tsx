import { FormEvent, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useArchive } from "@/lib/store";
import { newId } from "@/lib/archive";
import { EntryKind, ENTRY_KIND_LABELS } from "@/lib/types";
import clsx from "clsx";

const CAPTURE_KINDS: EntryKind[] = ["journal", "story", "milestone", "value"];

const PROMPTS: Record<EntryKind, string> = {
  journal: "What happened today that you'd want remembered?",
  story: "Tell it the way you'd tell it at the dinner table.",
  milestone: "What changed, and how did it feel at the time?",
  value: "What do you believe, and what taught it to you?",
  photo: "",
  voice: "",
};

export default function Capture() {
  const { update } = useArchive();
  const [kind, setKind] = useState<EntryKind>("journal");
  const [saved, setSaved] = useState(false);

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

    update((a) => ({
      ...a,
      entries: [
        ...a.entries,
        {
          id: newId(),
          kind,
          title,
          content,
          date,
          tags,
          createdAt: new Date().toISOString(),
        },
      ],
    }));
    form.reset();
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div>
      <PageHeader
        title="Capture"
        subtitle="Small, honest entries beat perfect ones. Each becomes part of your timeline, your autobiography, and eventually the voice your family can ask questions of."
      />

      <div className="mb-6 flex gap-2">
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
            {ENTRY_KIND_LABELS[k]}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="card space-y-4">
        <p className="text-sm italic text-ink-300">{PROMPTS[kind]}</p>
        <input
          name="title"
          required
          className="field"
          placeholder="Give it a title"
        />
        <textarea
          name="content"
          required
          rows={8}
          className="field resize-y"
          placeholder="Write freely — you can edit later."
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

      <p className="mt-6 text-xs leading-relaxed text-ink-400">
        Photos, voice notes, and imported sources (calendar, social media,
        email) are on the roadmap — each will require explicit consent in the
        Vault before anything is collected.
      </p>
    </div>
  );
}
