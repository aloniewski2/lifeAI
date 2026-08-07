import { ChangeEvent, useMemo, useRef, useState } from "react";
import { Loader2, Share2 } from "lucide-react";
import { strFromU8, unzip } from "fflate";
import { useArchive } from "@/lib/store";
import { newId } from "@/lib/archive";
import {
  dedupePosts,
  excludeExistingPosts,
  parseSocialFile,
  postTitle,
  SocialPost,
  SOURCE_LABELS,
  sortPosts,
} from "@/lib/social";

/** Files inside a platform export that are worth opening. */
function isCandidate(path: string): boolean {
  const name = path.split("/").pop() ?? "";
  if (name.startsWith(".") || path.includes("__MACOSX")) return false;
  if (!/\.(json|js)$/i.test(name)) return false;
  return /post|tweet|status|note/i.test(name);
}

async function readZip(file: File): Promise<SocialPost[]> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const entries = await new Promise<Record<string, Uint8Array>>(
    (resolve, reject) => {
      unzip(bytes, (err, data) => (err ? reject(err) : resolve(data)));
    },
  );
  const posts: SocialPost[] = [];
  for (const [path, data] of Object.entries(entries)) {
    if (!isCandidate(path) || data.length === 0) continue;
    try {
      posts.push(...parseSocialFile(path, strFromU8(data)));
    } catch {
      // A file we can't read shouldn't stop the rest of the export.
    }
  }
  return posts;
}

/**
 * Social imports are suggest-only: parsed posts appear as an unchecked
 * review list, and nothing enters the archive until the owner picks the
 * ones that were actually part of their life.
 */
export function SocialImport() {
  const { archive, update } = useArchive();
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<SocialPost[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return suggestions;
    return suggestions.filter((p) => p.text.toLowerCase().includes(q));
  }, [suggestions, query]);

  if (!archive.consent.socialMedia) {
    return (
      <div className="card">
        <h2 className="font-serif text-lg text-ink-50">
          Social imports are off by default
        </h2>
        <p className="mt-1 text-sm text-ink-300">
          Turn this on to read an export you downloaded from Instagram,
          Facebook, or X. Posts become suggestions you review — nothing is
          added without your say-so, and the file never leaves this device.
        </p>
        <button
          type="button"
          className="btn-primary mt-4"
          onClick={() =>
            update((a) => ({
              ...a,
              consent: { ...a.consent, socialMedia: true },
            }))
          }
        >
          Enable social imports
        </button>
      </div>
    );
  }

  function keyOf(post: SocialPost): string {
    return `${post.date} ${post.text.toLowerCase()}`;
  }

  async function handleFiles(e: ChangeEvent<HTMLInputElement>) {
    const files = [...(e.target.files ?? [])];
    e.target.value = "";
    if (files.length === 0) return;
    setBusy(true);
    setReport(null);

    const posts: SocialPost[] = [];
    for (const file of files) {
      try {
        if (/\.zip$/i.test(file.name)) {
          posts.push(...(await readZip(file)));
        } else {
          posts.push(...parseSocialFile(file.name, await file.text()));
        }
      } catch {
        // Unreadable file; keep going with the others.
      }
    }

    const found = excludeExistingPosts(
      sortPosts(dedupePosts(posts)),
      archive.entries,
    );
    setSuggestions(found);
    setSelected(new Set());
    setQuery("");
    setBusy(false);
    setReport(
      found.length === 0
        ? "No new posts found in that export."
        : `Found ${found.length} post${found.length === 1 ? "" : "s"} — check the ones worth keeping.`,
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
    const chosen = suggestions.filter((p) => selected.has(keyOf(p)));
    if (chosen.length === 0) return;
    const now = new Date().toISOString();
    update((a) => ({
      ...a,
      entries: [
        ...a.entries,
        ...chosen.map((post) => ({
          id: newId(),
          kind: "journal" as const,
          title: postTitle(post),
          content: post.text,
          date: post.date,
          tags: [post.source],
          createdAt: now,
        })),
      ],
    }));
    setSuggestions((prev) => prev.filter((p) => !selected.has(keyOf(p))));
    setSelected(new Set());
    setReport(
      `Added ${chosen.length} post${chosen.length === 1 ? "" : "s"} to your timeline.`,
    );
  }

  return (
    <div className="card">
      <h2 className="font-serif text-lg text-ink-50">Import a social export</h2>
      <p className="mt-1 text-sm leading-relaxed text-ink-300">
        Request your data from Instagram, Facebook, or X (all three offer a
        download), then drop the ZIP here — or the individual{" "}
        <code className="text-ink-200">posts_1.json</code>,{" "}
        <code className="text-ink-200">your_posts_1.json</code>, or{" "}
        <code className="text-ink-200">tweets.js</code> file. Retweets and
        duplicates are dropped; everything is read on this device.
      </p>
      <input
        ref={inputRef}
        type="file"
        accept=".zip,.json,.js,application/zip,application/json"
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
            <Share2 className="h-4 w-4" />
          )}
          {busy ? "Reading…" : "Choose export"}
        </button>
        {report && <span className="text-sm text-ember-300">{report}</span>}
      </div>

      {suggestions.length > 0 && (
        <div className="mt-6">
          <div className="flex flex-wrap items-center gap-3">
            <input
              className="field max-w-xs"
              placeholder="Filter posts…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button
              type="button"
              className="btn-ghost"
              onClick={toggleAllVisible}
            >
              {visible.length > 0 && visible.every((p) => selected.has(keyOf(p)))
                ? "Clear shown"
                : "Select shown"}
            </button>
            <button
              type="button"
              className="btn-primary"
              disabled={selected.size === 0}
              onClick={addSelected}
            >
              Add {selected.size > 0 ? selected.size : ""} selected to timeline
            </button>
          </div>
          <ul className="mt-4 max-h-96 space-y-1 overflow-y-auto pr-2">
            {visible.map((post) => {
              const key = keyOf(post);
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
                      {post.date}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm text-ink-100">
                      {postTitle(post)}
                    </span>
                    <span className="shrink-0 rounded-full border border-ink-700 px-2 text-xs text-ink-400">
                      {SOURCE_LABELS[post.source]}
                    </span>
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
