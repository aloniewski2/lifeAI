import { Entry } from "../types";

/**
 * Tiny on-device retrieval: rank archive entries against a question by
 * token overlap. No embeddings, no network — good enough to hand an LLM
 * the handful of memories that matter, and fully testable.
 */

const STOPWORDS = new Set(
  "a an and are as at be but by did do does for from had has have how i in is it its me my of on or our she he that the their them they this to was we what when where which who why will with you your".split(
    " ",
  ),
);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((word) => word.length > 1 && !STOPWORDS.has(word));
}

export interface ScoredEntry {
  entry: Entry;
  score: number;
}

/** Title and tag hits count double — they name what an entry is about. */
export function scoreEntry(questionTokens: Set<string>, entry: Entry): number {
  let score = 0;
  for (const token of tokenize(entry.title)) {
    if (questionTokens.has(token)) score += 2;
  }
  for (const tag of entry.tags) {
    for (const token of tokenize(tag)) {
      if (questionTokens.has(token)) score += 2;
    }
  }
  const seen = new Set<string>();
  for (const token of tokenize(entry.content)) {
    if (questionTokens.has(token) && !seen.has(token)) {
      score += 1;
      seen.add(token);
    }
  }
  return score;
}

export function retrieve(
  entries: Entry[],
  question: string,
  limit = 8,
): ScoredEntry[] {
  const questionTokens = new Set(tokenize(question));
  if (questionTokens.size === 0) return [];
  return entries
    .map((entry) => ({ entry, score: scoreEntry(questionTokens, entry) }))
    .filter((scored) => scored.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
