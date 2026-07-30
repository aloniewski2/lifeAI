import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import clsx from "clsx";
import { useArchive } from "@/lib/store";
import {
  decadeAges,
  groupByDecade,
  searchEntries,
  sortByDate,
} from "@/lib/archive";
import { promptOfTheDay } from "@/lib/prompts";
import { deletePhoto } from "@/lib/photoStore";
import { deleteAudio } from "@/lib/audioStore";
import { useAudio } from "@/lib/useAudio";
import { Entry, EntryKind, ENTRY_KIND_LABELS } from "@/lib/types";
import { Eyebrow, MattedPhoto } from "@/components/Letterpress";

const FILTER_LABELS: Record<EntryKind | "all", string> = {
  all: "Everything",
  journal: "Journals",
  story: "Stories",
  milestone: "Milestones",
  value: "Values",
  photo: "Photos",
  voice: "Voice notes",
};

function fmtDate(iso: string): string {
  return format(new Date(iso + "T00:00:00"), "MMMM d, yyyy");
}

function EntryAudio({ entryId }: { entryId: string }) {
  const urls = useAudio(entryId);
  if (urls.length === 0) return null;
  return (
    <div className="mt-3 space-y-2">
      <p className="text-[11px] uppercase tracking-[0.18em] text-stone-400">
        In their own voice
      </p>
      {urls.map((url, i) => (
        <audio key={i} controls src={url} className="h-9 w-full max-w-md" />
      ))}
    </div>
  );
}

function QuietActions({
  entry,
  onEdit,
  onDelete,
}: {
  entry: Entry;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <span className="text-xs text-stone-400 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
      <button
        type="button"
        onClick={onEdit}
        className="hover:text-ink-900"
        aria-label={`Edit ${entry.title}`}
      >
        edit
      </button>
      <span className="mx-1.5">·</span>
      <button
        type="button"
        onClick={onDelete}
        className="hover:text-wax-600"
        aria-label={`Delete ${entry.title}`}
      >
        remove
      </button>
    </span>
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

  const field =
    "field-paper border-b border-paper-200 pb-1 focus:border-wax-600";
  return (
    <form onSubmit={handleSubmit} className="max-w-[540px] space-y-3">
      <input
        name="title"
        defaultValue={entry.title}
        required
        className={clsx(field, "text-[23px]")}
      />
      <textarea
        name="content"
        defaultValue={entry.content}
        rows={5}
        className={clsx(field, "resize-y text-[15px] leading-[1.75]")}
      />
      <div className="flex flex-wrap gap-4">
        <input
          name="date"
          type="date"
          defaultValue={entry.date}
          required
          className={clsx(field, "w-auto text-sm")}
        />
        <input
          name="tags"
          defaultValue={entry.tags.join(", ")}
          placeholder="tags, comma-separated"
          className={clsx(field, "flex-1 text-sm")}
        />
      </div>
      <div className="flex items-center gap-5 pt-1">
        <button type="submit" className="btn-ink px-5 py-2.5 text-sm">
          Save changes
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="border-b border-paper-200 pb-0.5 text-sm text-ink-400 hover:text-ink-900"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function TimelineEntry({
  entry,
  editing,
  onEdit,
  onCancelEdit,
  onSave,
  onDelete,
  onTag,
}: {
  entry: Entry;
  editing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSave: (changes: Pick<Entry, "title" | "content" | "date" | "tags">) => void;
  onDelete: () => void;
  onTag: (tag: string) => void;
}) {
  if (editing) {
    return <EditForm entry={entry} onSave={onSave} onCancel={onCancelEdit} />;
  }

  const tags = entry.tags.length > 0 && (
    <span className="inline-flex flex-wrap gap-2 align-middle">
      {entry.tags.map((tag) => (
        <button
          key={tag}
          type="button"
          onClick={() => onTag(tag)}
          className="text-[11px] uppercase tracking-[0.12em] text-stone-400 hover:text-wax-600"
        >
          #{tag}
        </button>
      ))}
    </span>
  );

  if (entry.kind === "milestone") {
    return (
      <div className="group py-2 text-center">
        <p className="eyebrow tracking-[0.22em] text-wax-600">
          ✦&nbsp;&nbsp;{entry.date.slice(0, 4)}&nbsp;&nbsp;✦
        </p>
        <h3 className="mt-2 font-serif text-[24px] font-normal text-ink-900">
          {entry.title}
        </h3>
        {entry.content && (
          <p className="mx-auto mt-2 max-w-[420px] text-sm italic leading-[1.7] text-ink-500">
            {entry.content}
          </p>
        )}
        <p className="mt-2 space-x-3">
          {tags}
          <QuietActions entry={entry} onEdit={onEdit} onDelete={onDelete} />
        </p>
      </div>
    );
  }

  if (entry.kind === "photo") {
    return (
      <figure className="group max-w-[400px]">
        <MattedPhoto
          entryId={entry.id}
          alt={entry.title}
          className="h-[250px] p-[10px]"
        />
        <figcaption className="mt-2.5 text-center font-serif text-sm italic text-ink-500">
          {entry.title} · {fmtDate(entry.date)}
          <span className="ml-2">
            <QuietActions entry={entry} onEdit={onEdit} onDelete={onDelete} />
          </span>
        </figcaption>
      </figure>
    );
  }

  return (
    <article className="group">
      <p className="text-[11px] uppercase tracking-[0.18em] text-stone-400">
        {fmtDate(entry.date)} · {ENTRY_KIND_LABELS[entry.kind]}
        <span className="ml-3">
          <QuietActions entry={entry} onEdit={onEdit} onDelete={onDelete} />
        </span>
      </p>
      <h3 className="mt-1.5 font-serif text-[23px] font-medium text-ink-900">
        {entry.title}
      </h3>
      {entry.content && (
        <p className="mt-2.5 max-w-[540px] whitespace-pre-wrap text-[15px] leading-[1.75] text-ink-600">
          {entry.content}
        </p>
      )}
      <EntryAudio entryId={entry.id} />
      {entry.tags.length > 0 && <p className="mt-2">{tags}</p>}
    </article>
  );
}

function EmptyTimeline() {
  const navigate = useNavigate();
  const today = new Date().toISOString().slice(0, 10);
  const prompt = promptOfTheDay(today);

  return (
    <div className="mx-auto max-w-[640px] px-6 pb-40 pt-24 text-center sm:pt-36">
      <Eyebrow>Your timeline</Eyebrow>
      <h1 className="mt-6 font-serif text-3xl font-normal leading-[1.2] text-ink-900 sm:text-[40px]">
        This hallway is empty —<br />
        for now.
      </h1>
      <p className="mx-auto mt-5 max-w-[400px] text-base leading-[1.7] text-ink-500">
        Every archive begins with a single page. Answer one question and it
        will hang here, dated, in your own words.
      </p>
      <div className="mx-auto mt-11 max-w-[460px] border-y border-paper-200 px-3 py-7">
        <p className="font-serif text-[22px] italic leading-[1.45] text-ink-900">
          “{prompt.question}”
        </p>
      </div>
      <button
        type="button"
        className="btn-ink mt-8"
        onClick={() =>
          navigate("/app/capture", {
            state: { kind: prompt.kind, question: prompt.question },
          })
        }
      >
        Answer it — two minutes
      </button>
    </div>
  );
}

export default function Timeline() {
  const { archive, update } = useArchive();
  const navigate = useNavigate();
  const [kindFilter, setKindFilter] = useState<EntryKind | "all">("all");
  const [query, setQuery] = useState("");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  if (archive.entries.length === 0) {
    return (
      <div className="min-h-screen bg-paper-50">
        <EmptyTimeline />
      </div>
    );
  }

  let entries = sortByDate(archive.entries);
  if (kindFilter !== "all")
    entries = entries.filter((e) => e.kind === kindFilter);
  if (tagFilter) entries = entries.filter((e) => e.tags.includes(tagFilter));
  entries = searchEntries(entries, query);

  const decades = groupByDecade(entries);
  const kindsPresent = [...new Set(archive.entries.map((e) => e.kind))];
  const name = archive.profile.name || "Your life";
  const birthYear = archive.profile.birthYear;
  const count = archive.entries.length;
  const today = new Date().toISOString().slice(0, 10);
  const prompt = promptOfTheDay(today);

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
    <div className="min-h-screen bg-paper-50 pb-24 sm:pb-0">
      <header className="mx-auto max-w-[900px] px-6 pt-11 text-center sm:px-8 sm:pt-[60px]">
        <Eyebrow>The life of</Eyebrow>
        <h1 className="mt-3.5 font-serif text-3xl font-normal text-ink-900 sm:text-[46px]">
          {name}
        </h1>
        <p className="mt-2.5 font-serif text-base italic text-ink-500">
          {birthYear ? `b. ${birthYear} · ` : ""}
          {count} {count === 1 ? "moment" : "moments"} and counting
        </p>

        <div className="mt-7 flex flex-wrap justify-center gap-x-5 gap-y-1.5">
          {(["all", ...kindsPresent] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKindFilter(k)}
              className={clsx(
                "pb-0.5 text-xs uppercase tracking-[0.12em] transition-colors",
                kindFilter === k
                  ? "border-b border-wax-600 text-wax-600"
                  : "border-b border-transparent text-ink-400 hover:text-ink-600",
              )}
            >
              {FILTER_LABELS[k]}
            </button>
          ))}
        </div>

        <div className="mx-auto mt-5 flex max-w-[360px] items-center gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search the archive…"
            className="field-paper border-b border-paper-200 pb-1 text-center text-sm italic focus:border-wax-600"
          />
          {(query || tagFilter) && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setTagFilter(null);
              }}
              className="shrink-0 text-xs uppercase tracking-[0.12em] text-stone-400 hover:text-wax-600"
            >
              clear{tagFilter ? ` #${tagFilter}` : ""}
            </button>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-[900px] px-6 pb-24 pt-5 sm:px-8 sm:pb-[140px]">
        {decades.length === 0 ? (
          <p className="pt-14 text-center font-serif text-base italic text-ink-500">
            Nothing matches — clear the search or filters to see everything.
          </p>
        ) : (
          decades.map(({ decade, label, entries: decEntries }) => (
            <section key={decade} className="pt-10 sm:flex sm:gap-10 sm:pt-14">
              <div className="sm:w-[150px] sm:shrink-0 sm:text-right">
                <div className="sm:sticky sm:top-10">
                  <p className="font-serif text-[34px] leading-none text-paper-200 sm:text-[52px]">
                    {label}
                  </p>
                  {decadeAges(decade, birthYear) && (
                    <p className="mt-2 text-xs uppercase tracking-[0.12em] text-stone-400">
                      {decadeAges(decade, birthYear)}
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-3 flex min-w-0 flex-1 flex-col gap-7 border-l border-paper-200 pl-5 sm:mt-0 sm:gap-10 sm:pl-10">
                {decEntries.map((entry) => (
                  <TimelineEntry
                    key={entry.id}
                    entry={entry}
                    editing={editingId === entry.id}
                    onEdit={() => setEditingId(entry.id)}
                    onCancelEdit={() => setEditingId(null)}
                    onSave={(changes) => saveEdit(entry.id, changes)}
                    onDelete={() => removeEntry(entry.id)}
                    onTag={(tag) => setTagFilter(tag)}
                  />
                ))}
              </div>
            </section>
          ))
        )}
        <p className="mt-14 text-center font-serif text-[15px] italic text-ink-400 sm:mt-[72px]">
          — the story continues —
        </p>
      </div>

      {/* Mobile: persistent capture bar */}
      <div className="fixed inset-x-4 bottom-4 z-40 sm:hidden">
        <button
          type="button"
          onClick={() =>
            navigate("/app/capture", {
              state: { kind: prompt.kind, question: prompt.question },
            })
          }
          className="flex w-full items-center gap-3 rounded-full bg-ink-900 py-2 pl-[22px] pr-2 shadow-sheet-dark"
        >
          <span className="min-w-0 flex-1 truncate text-left font-serif text-[15px] italic text-parch-300">
            {prompt.question}
          </span>
          <span className="shrink-0 rounded-full bg-wax-600 px-5 py-3 text-sm font-medium text-paper-50">
            Answer
          </span>
        </button>
      </div>
    </div>
  );
}
