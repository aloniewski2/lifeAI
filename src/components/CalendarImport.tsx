import { ChangeEvent, useMemo, useRef, useState } from "react";
import { CalendarPlus, Loader2 } from "lucide-react";
import { useArchive } from "@/lib/store";
import { newId } from "@/lib/archive";
import {
  CalendarEvent,
  collapseRecurring,
  excludeExisting,
  parseIcs,
} from "@/lib/ics";

/**
 * Calendar import is suggest-only: parsed events appear as an unchecked
 * review list, and nothing touches the archive until the owner picks the
 * moments that actually mattered.
 */
export function CalendarImport() {
  const { archive, update } = useArchive();
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<CalendarEvent[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return suggestions;
    return suggestions.filter((s) => s.summary.toLowerCase().includes(q));
  }, [suggestions, query]);

  if (!archive.consent.calendar) {
    return (
      <div className="card">
        <h2 className="font-serif text-lg text-ink-50">
          Calendar import is off by default
        </h2>
        <p className="mt-1 text-sm text-ink-300">
          Turn it on to import a calendar export (.ics). Events become
          suggestions you review — nothing is added to your archive without
          your say-so, and the file never leaves this device.
        </p>
        <button
          type="button"
          className="btn-primary mt-4"
          onClick={() =>
            update((a) => ({
              ...a,
              consent: { ...a.consent, calendar: true },
            }))
          }
        >
          Enable calendar import
        </button>
      </div>
    );
  }

  function keyOf(event: CalendarEvent): string {
    return `${event.date} ${event.summary.toLowerCase()}`;
  }

  async function handleFiles(e: ChangeEvent<HTMLInputElement>) {
    const files = [...(e.target.files ?? [])];
    e.target.value = "";
    if (files.length === 0) return;
    setBusy(true);
    setReport(null);

    const events: CalendarEvent[] = [];
    for (const file of files) {
      try {
        events.push(...parseIcs(await file.text()));
      } catch {
        // Unreadable file; keep going with the others.
      }
    }
    const collapsed = excludeExisting(
      collapseRecurring(events),
      archive.entries,
    );
    setSuggestions(collapsed);
    setSelected(new Set());
    setQuery("");
    setBusy(false);
    setReport(
      collapsed.length === 0
        ? "No new events found in that calendar."
        : `Found ${collapsed.length} event${collapsed.length === 1 ? "" : "s"} — check the ones worth keeping.`,
    );
  }

  function toggle(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleAllVisible() {
    const keys = visible.map(keyOf);
    const allSelected = keys.every((k) => selected.has(k));
    setSelected((prev) => {
      const next = new Set(prev);
      for (const k of keys) {
        if (allSelected) next.delete(k);
        else next.add(k);
      }
      return next;
    });
  }

  function addSelected() {
    const chosen = suggestions.filter((s) => selected.has(keyOf(s)));
    if (chosen.length === 0) return;
    const now = new Date().toISOString();
    update((a) => ({
      ...a,
      entries: [
        ...a.entries,
        ...chosen.map((event) => ({
          id: newId(),
          kind: "milestone" as const,
          title: event.summary,
          content: [event.description, event.location]
            .filter(Boolean)
            .join("\n"),
          date: event.date,
          tags: ["calendar"],
          createdAt: now,
        })),
      ],
    }));
    setSuggestions((prev) => prev.filter((s) => !selected.has(keyOf(s))));
    setSelected(new Set());
    setReport(
      `Added ${chosen.length} milestone${chosen.length === 1 ? "" : "s"} to your timeline.`,
    );
  }

  return (
    <div className="card">
      <h2 className="font-serif text-lg text-ink-50">Import a calendar</h2>
      <p className="mt-1 text-sm leading-relaxed text-ink-300">
        Export your calendar as an .ics file (Google Calendar, Apple Calendar,
        and Outlook all offer this), drop it here, and pick the events that
        belong on your timeline. Recurring events collapse to one suggestion.
        The file is read on this device and never uploaded.
      </p>
      <input
        ref={inputRef}
        type="file"
        accept=".ics,text/calendar"
        multiple
        className="hidden"
        onChange={handleFiles}
      />
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <button
          type="button"
          className="btn-primary"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CalendarPlus className="h-4 w-4" />
          )}
          {busy ? "Reading…" : "Choose .ics file"}
        </button>
        {report && <span className="text-sm text-ember-300">{report}</span>}
      </div>

      {suggestions.length > 0 && (
        <div className="mt-6">
          <div className="flex flex-wrap items-center gap-3">
            <input
              className="field max-w-xs"
              placeholder="Filter events…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button
              type="button"
              className="btn-ghost"
              onClick={toggleAllVisible}
            >
              {visible.length > 0 && visible.every((s) => selected.has(keyOf(s)))
                ? "Clear shown"
                : "Select shown"}
            </button>
            <button
              type="button"
              className="btn-primary"
              disabled={selected.size === 0}
              onClick={addSelected}
            >
              Add {selected.size > 0 ? selected.size : ""} selected as
              milestones
            </button>
          </div>
          <ul className="mt-4 max-h-96 space-y-1 overflow-y-auto pr-2">
            {visible.map((event) => {
              const key = keyOf(event);
              return (
                <li key={key}>
                  <label className="flex cursor-pointer items-baseline gap-3 rounded-md px-2 py-1.5 hover:bg-ink-800">
                    <input
                      type="checkbox"
                      checked={selected.has(key)}
                      onChange={() => toggle(key)}
                      className="translate-y-0.5 accent-ember-500"
                    />
                    <span className="shrink-0 text-xs tabular-nums text-ink-400">
                      {event.date}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm text-ink-100">
                      {event.summary}
                    </span>
                    {event.occurrences > 1 && (
                      <span className="shrink-0 rounded-full border border-ink-700 px-2 text-xs text-ink-400">
                        ×{event.occurrences}
                      </span>
                    )}
                  </label>
                </li>
              );
            })}
            {visible.length === 0 && (
              <li className="px-2 py-1.5 text-sm text-ink-400">
                Nothing matches that filter.
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
