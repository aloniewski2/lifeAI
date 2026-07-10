import { useState } from "react";
import { format } from "date-fns";
import { PageHeader } from "@/components/PageHeader";
import { useArchive } from "@/lib/store";
import { sortByDate } from "@/lib/archive";
import { EntryKind, ENTRY_KIND_LABELS } from "@/lib/types";
import { Trash2 } from "lucide-react";
import clsx from "clsx";

export default function Timeline() {
  const { archive, update } = useArchive();
  const [filter, setFilter] = useState<EntryKind | "all">("all");

  const entries = sortByDate(archive.entries).filter(
    (e) => filter === "all" || e.kind === filter,
  );
  const kindsPresent = [...new Set(archive.entries.map((e) => e.kind))];

  function removeEntry(id: string) {
    if (!window.confirm("Remove this moment from your archive?")) return;
    update((a) => ({ ...a, entries: a.entries.filter((e) => e.id !== id) }));
  }

  return (
    <div>
      <PageHeader
        title="Timeline"
        subtitle="Your life in order. This is the raw material the autobiography and memorial are built from."
      />

      {kindsPresent.length > 1 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {(["all", ...kindsPresent] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setFilter(k)}
              className={clsx(
                "rounded-md px-3 py-1.5 text-sm transition-colors",
                filter === k
                  ? "bg-ember-500 text-ink-950"
                  : "border border-ink-700 text-ink-300 hover:text-ink-100",
              )}
            >
              {k === "all" ? "Everything" : ENTRY_KIND_LABELS[k]}
            </button>
          ))}
        </div>
      )}

      {entries.length === 0 ? (
        <p className="text-sm text-ink-400">
          The timeline is empty. Capture a moment and it will appear here.
        </p>
      ) : (
        <ol className="relative ml-3 space-y-6 border-l border-ink-700 pl-6">
          {entries.map((entry) => (
            <li key={entry.id} className="relative">
              <span className="absolute -left-[31px] top-1.5 h-2.5 w-2.5 rounded-full bg-ember-500" />
              <div className="card">
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
                  <button
                    type="button"
                    onClick={() => removeEntry(entry.id)}
                    className="text-ink-400 transition-colors hover:text-red-400"
                    aria-label={`Delete ${entry.title}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink-200">
                  {entry.content}
                </p>
                {entry.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {entry.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-ink-700 px-2 py-0.5 text-xs text-ink-300"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
