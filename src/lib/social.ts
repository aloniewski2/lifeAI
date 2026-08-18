import { Entry } from "./types";

/**
 * Social-media export parsing. The big platforms all hand you a ZIP of JSON
 * (Instagram, Facebook) or a JS file with one assignment in it (X/Twitter);
 * this turns any of them into dated, reviewable suggestions.
 *
 * Everything here is pure and browser-free so it can be tested directly —
 * the component handles file reading and unzipping.
 */

export type SocialSource = "instagram" | "facebook" | "x";

export interface SocialPost {
  source: SocialSource;
  /** ISO yyyy-mm-dd of when it was posted. */
  date: string;
  text: string;
}

export const SOURCE_LABELS: Record<SocialSource, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  x: "X / Twitter",
};

function isoFromEpochSeconds(value: unknown): string | null {
  const seconds = typeof value === "string" ? Number(value) : value;
  if (typeof seconds !== "number" || !isFinite(seconds) || seconds <= 0) {
    return null;
  }
  const date = new Date(seconds * 1000);
  if (isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function isoFromDateString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const date = new Date(value);
  if (isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

/**
 * Meta exports write UTF-8 bytes as latin-1 escapes, so accented characters
 * and emoji arrive mangled. Re-decode them when that yields valid UTF-8.
 */
export function fixMetaMojibake(text: string): string {
  if (!/[Â-ô][-¿]/.test(text)) return text;
  try {
    const bytes = Uint8Array.from([...text].map((c) => c.charCodeAt(0) & 0xff));
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return text;
  }
}

function clean(text: unknown): string {
  return typeof text === "string" ? fixMetaMojibake(text).trim() : "";
}

/** Instagram: posts_1.json — an array of posts, text on the post or its media. */
export function parseInstagram(data: unknown): SocialPost[] {
  if (!Array.isArray(data)) return [];
  const posts: SocialPost[] = [];
  for (const raw of data) {
    if (!raw || typeof raw !== "object") continue;
    const post = raw as Record<string, unknown>;
    const media = Array.isArray(post.media)
      ? (post.media as Record<string, unknown>[])
      : [];
    const date =
      isoFromEpochSeconds(post.creation_timestamp) ??
      isoFromEpochSeconds(media[0]?.creation_timestamp);
    const text = clean(post.title) || clean(media[0]?.title);
    if (date && text) posts.push({ source: "instagram", date, text });
  }
  return posts;
}

/** Facebook: your_posts_1.json — an array (or {status_updates:[…]}) of posts. */
export function parseFacebook(data: unknown): SocialPost[] {
  const list = Array.isArray(data)
    ? data
    : Array.isArray((data as Record<string, unknown>)?.status_updates)
      ? ((data as Record<string, unknown>).status_updates as unknown[])
      : [];
  const posts: SocialPost[] = [];
  for (const raw of list) {
    if (!raw || typeof raw !== "object") continue;
    const post = raw as Record<string, unknown>;
    const date = isoFromEpochSeconds(post.timestamp);
    const dataEntries = Array.isArray(post.data)
      ? (post.data as Record<string, unknown>[])
      : [];
    const text =
      dataEntries.map((d) => clean(d.post)).find(Boolean) ?? clean(post.title);
    if (date && text) posts.push({ source: "facebook", date, text });
  }
  return posts;
}

/** X/Twitter: tweets.js — `window.YTD.tweets.part0 = [ { tweet: {…} } ]`. */
export function parseX(data: unknown): SocialPost[] {
  if (!Array.isArray(data)) return [];
  const posts: SocialPost[] = [];
  for (const raw of data) {
    if (!raw || typeof raw !== "object") continue;
    const tweet = ((raw as Record<string, unknown>).tweet ?? raw) as Record<
      string,
      unknown
    >;
    const date = isoFromDateString(tweet.created_at);
    const text = clean(tweet.full_text ?? tweet.text);
    // Retweets are someone else's words — not part of this life story.
    if (date && text && !text.startsWith("RT @")) {
      posts.push({ source: "x", date, text });
    }
  }
  return posts;
}

/**
 * Parse one exported file. X ships JS with an assignment prefix; the Meta
 * exports are plain JSON. The shape decides the platform, not the name.
 */
export function parseSocialFile(name: string, contents: string): SocialPost[] {
  const trimmed = contents.trim();
  if (!trimmed) return [];

  // window.YTD.tweets.part0 = [ … ]
  const assignment = trimmed.match(/^window\.YTD\.[\w.]+\s*=\s*/);
  if (assignment) {
    try {
      return parseX(JSON.parse(trimmed.slice(assignment[0].length)));
    } catch {
      return [];
    }
  }

  let data: unknown;
  try {
    data = JSON.parse(trimmed);
  } catch {
    return [];
  }

  if (name.toLowerCase().includes("tweet")) return parseX(data);

  // Meta exports: Instagram posts carry `media`, Facebook posts carry `data`.
  const instagram = parseInstagram(data);
  if (instagram.length > 0) return instagram;
  return parseFacebook(data);
}

/** Newest first — recent posts are the ones people recognise and keep. */
export function sortPosts(posts: SocialPost[]): SocialPost[] {
  return [...posts].sort((a, b) => b.date.localeCompare(a.date));
}

/** Collapse posts that are the same words on the same day (cross-posts). */
export function dedupePosts(posts: SocialPost[]): SocialPost[] {
  const seen = new Set<string>();
  return posts.filter((post) => {
    const key = `${post.date} ${post.text.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** A post already in the archive (same date, same words) is not a suggestion. */
export function excludeExistingPosts(
  posts: SocialPost[],
  entries: Entry[],
): SocialPost[] {
  const existing = new Set(
    entries.map((e) => `${e.date} ${e.content.trim().toLowerCase()}`),
  );
  return posts.filter(
    (post) => !existing.has(`${post.date} ${post.text.toLowerCase()}`),
  );
}

/** First line, trimmed to something that reads as a title on the timeline. */
export function postTitle(post: SocialPost, max = 72): string {
  const firstLine =
    post.text
      .split("\n")
      .map((l) => l.trim())
      .find(Boolean) ?? "";
  if (firstLine.length <= max) return firstLine;
  const cut = firstLine.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  const kept = lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut;
  return `${kept.trimEnd()}…`;
}
