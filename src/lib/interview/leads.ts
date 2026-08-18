import { Archive, Entry } from "../types";
import { promptOfTheDay } from "../prompts";

/**
 * Archive-aware interview leads: what a good biographer who had read the
 * whole archive would ask about next. Pure functions — every engine
 * (including the no-AI Guided one) draws from the same analysis, which is
 * what turns the interview from a side room into the app's capture engine.
 */
export interface Lead {
  kind: "gap" | "value" | "expand" | "daily";
  /** The question, phrased ready to ask. */
  question: string;
  /** Short label for UI chips. */
  label: string;
}

const MIN_GAP_YEARS = 4;
const THIN_ENTRY_CHARS = 180;

function yearOf(entry: Entry): number {
  return Number(entry.date.slice(0, 4));
}

function words(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3),
  );
}

/** Quiet stretches of the timeline between recorded years. */
export function gapLeads(archive: Archive, currentYear: number): Lead[] {
  const years = [...new Set(archive.entries.map(yearOf))].sort(
    (a, b) => a - b,
  );
  if (years.length === 0) return [];
  const start = archive.profile.birthYear ?? years[0];
  const bounds = [start, ...years.filter((y) => y >= start), currentYear];

  const gaps: { from: number; to: number }[] = [];
  for (let i = 1; i < bounds.length; i++) {
    const from = bounds[i - 1];
    const to = bounds[i];
    if (to - from > MIN_GAP_YEARS) gaps.push({ from, to });
  }
  return gaps
    .sort((a, b) => b.to - b.from - (a.to - a.from))
    .slice(0, 2)
    .map(({ from, to }) => ({
      kind: "gap" as const,
      label: `The ${from}–${to} years`,
      question: `Nothing is recorded between ${from} and ${to}. What was your life like around ${Math.round((from + to) / 2)}?`,
    }));
}

/** Values the person stated but never told the story behind. */
export function valueLeads(archive: Archive): Lead[] {
  const stories = archive.entries.filter(
    (e) => e.kind === "story" || e.kind === "journal",
  );
  return archive.entries
    .filter((e) => e.kind === "value")
    .filter((value) => {
      const valueWords = words(`${value.title} ${value.content}`);
      return !stories.some((story) => {
        const storyWords = words(`${story.title} ${story.content}`);
        let overlap = 0;
        for (const w of valueWords) if (storyWords.has(w)) overlap++;
        return overlap >= 2;
      });
    })
    .slice(0, 2)
    .map((value) => ({
      kind: "value" as const,
      label: `Behind “${value.title}”`,
      question: `You recorded the value “${value.title}”. What's a moment in your life that taught it to you?`,
    }));
}

/** Entries that are barely more than a caption — worth the full telling. */
export function expandLeads(archive: Archive): Lead[] {
  return archive.entries
    .filter(
      (e) =>
        (e.kind === "story" || e.kind === "milestone") &&
        e.content.trim().length > 0 &&
        e.content.trim().length < THIN_ENTRY_CHARS,
    )
    .sort((a, b) => a.content.length - b.content.length)
    .slice(0, 2)
    .map((entry) => ({
      kind: "expand" as const,
      label: `More on “${entry.title}”`,
      question: `You wrote just a few lines about “${entry.title}” (${yearOf(entry)}). Tell me that story properly — start at the beginning.`,
    }));
}

export function interviewLeads(
  archive: Archive,
  isoDate: string,
  limit = 5,
): Lead[] {
  const daily: Lead = {
    kind: "daily",
    label: "Today's question",
    question: promptOfTheDay(isoDate).question,
  };
  const currentYear = Number(isoDate.slice(0, 4));
  return [
    ...gapLeads(archive, currentYear),
    ...valueLeads(archive),
    ...expandLeads(archive),
    daily,
  ].slice(0, limit);
}

/**
 * Context block appended to the LLM engines' system prompt so their
 * questions build on the archive instead of starting cold.
 */
export function interviewContext(archive: Archive, leads: Lead[]): string {
  const name = archive.profile.name || "the subject";
  const recent = [...archive.entries]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 8)
    .map((e) => `- "${e.title}" (${yearOf(e)}, ${e.kind})`)
    .join("\n");
  const pursuits = leads
    .filter((l) => l.kind !== "daily")
    .map((l) => `- ${l.question}`)
    .join("\n");

  return `You have read ${name}'s existing archive (${archive.entries.length} entries).${
    recent ? `\nMost recently recorded:\n${recent}` : ""
  }${
    pursuits
      ? `\nWorth pursuing when the current thread is exhausted — these are the biggest holes in their story:\n${pursuits}`
      : ""
  }
Never mention "the archive", "entries", or "data" — you're simply a biographer who has read their notes. Don't re-ask what they've already told; go where their story is thinnest.`;
}
