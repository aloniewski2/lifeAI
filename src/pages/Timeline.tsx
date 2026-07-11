import { FormEvent, useState } from "react";
import { format } from "date-fns";
import { PageHeader } from "@/components/PageHeader";
import { useArchive } from "@/lib/store";
import { searchEntries, sortByDate } from "@/lib/archive";
import { deletePhoto } from "@/lib/photoStore";
import { deleteAudio } from "@/lib/audioStore";
import { usePhoto } from "@/lib/usePhoto";
import { useAudio } from "@/lib/useAudio";
import { Entry, EntryKind, ENTRY_KIND_LABELS } from "@/lib/types";
import { Pencil, Search, Trash2, X } from "lucide-react";
import clsx from "clsx";

function EntryPhoto({ entryId, title }: { entryId: string; title: string }) {
  const url = usePhoto(entryId);
  if (!url) return null;
  return (
    <img
      src={url}
      alt={title}
      className="mt-3 max-h-72 rounded-md border border-ink-800 object-contain"
    />
  );
}

function EntryAudio({ entryId }: { entryId: string }) {
  const urls = useAudio(entryId);
  if (urls.length === 0) return null;
  return (
    <div className="mt-3 space-y-2">
      <p className="text-xs uppercase tracking-wide text-ink-400">
        In their own voice
      </p>
      {urls.map((url, i) => (
        <audio key={i} controls src={url} className="h-9 w-full max-w-md" />
      ))}
    </div>
  );
}

function EditForm({
  entry,
  onSave,
  onCancel,
}: {
  entry: Entry;
  onSave: (changes: Pick<Entry, "title" | "content" | "date" | "tags">) => void;
  onCancel: () => void;
}) {
  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const title = String(data.get("title") ?? "").trim();
    const date = String(data.get("date") ?? "");
    if (!title || !date) return;
    onSave({
      title,
      content: String(data.get("content") ?? "").trim(),
      date,
      tags: String(data.get("tags") ?? "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input name="title" defaultValue={entry.title} required className="field" />
      <textarea
        name="content"
        defaultValue={entry.content}
        rows={5}
        className="field resize-y"
      />
      <div className="flex flex-wrap gap-3">
        <input
          name="date"
          type="date"
          defaultValue={entry.date}
          required
          className="field w-auto"
        />
        <input
          name="tags"
          defaultValue={entry.tags.join(", ")}
          placeholder="tags, comma-separated"
          className="field flex-1"
        />
      </div>
      <div className="flex gap-3">
        <button type="submit" className="btn-primary">
          Save changes
        </button>
        <button type="button" onClick={onCancel} className="btn-ghost">
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function Timeline() {
  const { archive, update } = useArchive();
  const [kindFilter, setKindFilter] = useState<EntryKind | "all">("all");
  const [query, setQuery] = useState("");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  let entries = sortByDate(archive.entries);
  if (kindFilter !== "all") entries = entries.filter((e) => e.kind === kindFilter);
  if (tagFilter) entries = entries.filter((e) => e.tags.includes(tagFilter));
  entries = searchEntries(entries, query);

  const kindsPresent = [...new Set(archive.entries.map((e) => e.kind))];

  function removeEntry(id: string) {
    if (!window.confirm("Remove this moment from your archive?")) return;
    update((a) => ({ ...a, entries: a.entries.filter((e) => e.id !== id) }));
    void deletePhoto(id);
    void deleteAudio(id);
  }

  function saveEdit(
    id: string,
    changes: Pick<Entry, "title" | "content" | "date" | "tags">,
  ) {
    update((a) => ({
      ...a,
      entries: a.entries.map((e) => (e.id === id ? { ...e, ...changes } : e)),
    }));
    setEditingId(null);
  }

  return (
    <div>
      <PageHeader
        title="Timeline"
        subtitle="Your life in order. This is the raw material the autobiography and memorial are built from."
      />

      <div className="mb-4 flex items-center gap-2 rounded-md border border-ink-700 bg-ink-900 px-3">
        <Search className="h-4 w-4 shrink-0 text-ink-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search titles, words, tags…"
          className="w-full bg-transparent py-2 text-sm text-ink-100 placeholder:text-ink-400 focus:outline-none"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Clear search"
            className="text-ink-400 hover:text-ink-100"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        {kindsPresent.length > 1 &&
          (["all", ...kindsPresent] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKindFilter(k)}
              className={clsx(
                "rounded-md px-3 py-1.5 text-sm transition-colors",
                kindFilter === k
                  ? "bg-ember-500 text-ink-950"
                  : "border border-ink-700 text-ink-300 hover:text-ink-100",
              )}
            >
              {k === "all" ? "Everything" : ENTRY_KIND_LABELS[k]}
            </button>
          ))}
        {tagFilter && (
          <button
            type="button"
            onClick={() => setTagFilter(null)}
            className="inline-flex items-center gap-1.5 rounded-full bg-ember-500/20 px-3 py-1 text-sm text-ember-300"
          >
            #{tagFilter}
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-ink-400">
          {archive.entries.length === 0
            ? "The timeline is empty. Capture a moment and it will appear here."
            : "Nothing matches — clear the search or filters to see everything."}
        </p>
      ) : (
        <ol className="relative ml-3 space-y-6 border-l border-ink-700 pl-6">
          {entries.map((entry) => (
            <li key={entry.id} className="relative">
              <span className="absolute -left-[31px] top-1.5 h-2.5 w-2.5 rounded-full bg-ember-500" />
              <div className="card">
                {editingId === entry.id ? (
                  <EditForm
                    entry={entry}
                    onSave={(changes) => saveEdit(entry.id, changes)}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-ink-400">
                          {format(
                            new Date(entry.date + "T00:00:00"),
                            "MMMM d, yyyy",
                          )}{" "}
                          · {ENTRY_KIND_LABELS[entry.kind]}
                        </p>
                        <h3 className="mt-1 font-serif text-lg text-ink-50">
                          {entry.title}
                        </h3>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingId(entry.id)}
                          className="text-ink-400 transition-colors hover:text-ink-100"
                          aria-label={`Edit ${entry.title}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeEntry(entry.id)}
                          className="text-ink-400 transition-colors hover:text-red-400"
                          aria-label={`Delete ${entry.title}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    {entry.content && (
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink-200">
                        {entry.content}
                      </p>
                    )}
                    {entry.kind === "photo" && (
                      <EntryPhoto entryId={entry.id} title={entry.title} />
                    )}
                    <EntryAudio entryId={entry.id} />
                    {entry.tags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {entry.tags.map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => setTagFilter(tag)}
                            className="rounded-full border border-ink-700 px-2 py-0.5 text-xs text-ink-300 transition-colors hover:border-ember-500 hover:text-ember-300"
                          >
                            #{tag}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
