import { Archive, Entry } from "./types";
import { sortByDate } from "./archive";

/**
 * The memorial as one self-contained HTML file: photos inlined as data
 * URIs, styles inlined, no scripts and no network requests. It opens in
 * any browser, forever, with no app and no server — which is the point.
 * A family can email it, put it on a USB stick, or print it.
 *
 * Pure and DOM-free so it can be tested directly; the caller supplies the
 * photos already encoded (the component reads them out of IndexedDB).
 */

/** Photo data URIs keyed by entry id. */
export type PhotoData = Record<string, string>;

/** Escape for HTML text and quoted attributes alike. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Escaped, with blank lines becoming paragraph breaks. */
function escapeParagraphs(value: string): string {
  return escapeHtml(value).replace(/\n/g, "<br />");
}

function dropCapMarkup(content: string): string {
  const first = content.charAt(0);
  const rest = content.slice(1);
  if (!first) return "";
  return `<span class="dropcap" aria-hidden="true">${escapeHtml(first)}</span>${escapeParagraphs(rest)}`;
}

function yearOf(entry: Entry): string {
  return entry.date.slice(0, 4);
}

const STYLES = `
:root { color-scheme: light; }
* { box-sizing: border-box; }
body {
  margin: 0;
  background: #ece4d2;
  color: #221e18;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
}
.sheet {
  max-width: 720px;
  margin: 0 auto;
  background: #f6f1e6;
  box-shadow: 0 3px 18px rgba(34,30,24,0.12);
  padding: 90px 32px 120px;
}
@media (min-width: 640px) { .sheet { padding: 110px 84px 140px; } }
.center { text-align: center; }
.eyebrow {
  margin: 0;
  font-size: 12px;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: #a33d2a;
}
h1 {
  margin: 36px 0 0;
  font-family: Charter, Georgia, "Times New Roman", serif;
  font-size: 42px;
  font-weight: 400;
}
@media (min-width: 640px) { h1 { font-size: 52px; } }
.dates {
  margin: 12px 0 0;
  font-family: Charter, Georgia, serif;
  font-size: 17px;
  letter-spacing: 0.1em;
  color: #8c8270;
}
.epitaph {
  margin: 26px auto 0;
  max-width: 360px;
  font-family: Charter, Georgia, serif;
  font-size: 23px;
  font-style: italic;
  line-height: 1.45;
  color: #494235;
}
.rule { width: 80px; margin: 56px auto 0; border-top: 1px solid #c9bfa8; }
.rule::after { content: ""; display: block; border-top: 1px solid #c9bfa8; margin-top: 3px; }
.portrait {
  width: 170px;
  height: 210px;
  margin: 40px auto 0;
  border-radius: 85px 85px 4px 4px;
  border: 1px solid #d9d0bc;
  background: #ece4d2;
  padding: 9px;
  box-shadow: 0 3px 14px rgba(34,30,24,0.1);
}
.portrait img {
  width: 100%; height: 100%;
  object-fit: cover;
  border-radius: 76px 76px 2px 2px;
  display: block;
}
section { margin-top: 68px; }
h2 {
  margin: 0;
  font-size: 12px;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: #a33d2a;
  font-weight: 400;
}
.value { margin-top: 28px; }
.value .quote {
  margin: 0;
  font-family: Charter, Georgia, serif;
  font-size: 22px;
  font-style: italic;
}
.value .why {
  margin: 8px auto 0;
  max-width: 420px;
  font-size: 14px;
  line-height: 1.7;
  color: #6d6353;
}
.moments { margin: 24px auto 0; display: inline-block; text-align: left; }
.moment { display: flex; align-items: baseline; gap: 18px; margin-top: 10px; }
.moment .year {
  width: 52px; flex-shrink: 0; text-align: right;
  font-family: Charter, Georgia, serif; font-size: 15px; color: #a33d2a;
}
.moment .what { font-family: Charter, Georgia, serif; font-size: 16px; color: #2e2921; }
.pictures { margin-top: 26px; display: flex; flex-wrap: wrap; justify-content: center; gap: 18px; }
figure { margin: 0; }
figure .mat {
  width: 150px; height: 150px;
  background: #ece4d2; border: 1px solid #d9d0bc; padding: 7px;
  box-shadow: 0 2px 8px rgba(34,30,24,0.08);
}
figure img { width: 100%; height: 100%; object-fit: cover; display: block; }
figcaption {
  margin-top: 8px; font-family: Charter, Georgia, serif;
  font-size: 12px; font-style: italic; color: #8c8270;
}
.story { margin-top: 36px; text-align: left; }
.voice {
  margin: 14px 0 20px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.voice audio { width: 100%; max-width: 420px; }
.voice span {
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #8a7f72;
}
.story h3 {
  margin: 0 0 10px; text-align: center;
  font-family: Charter, Georgia, serif; font-size: 17px; font-weight: 500; color: #494235;
}
.story p {
  margin: 0; font-family: Charter, Georgia, serif;
  font-size: 16px; line-height: 1.8; color: #2e2921;
}
.dropcap {
  float: left; font-size: 50px; line-height: 0.8;
  padding: 7px 9px 0 0; color: #a33d2a;
  font-family: Charter, Georgia, serif;
}
.colophon {
  margin: 40px auto 0; max-width: 380px;
  font-size: 13px; line-height: 1.7; color: #8c8270;
}
@media print {
  body { background: #fff; }
  .sheet { box-shadow: none; max-width: none; }
}
`;

/**
 * Voice recordings as data URIs, by entry id — the takes an entry carries.
 * Only the first take of each story is embedded: the others are alternate
 * readings, and the family wants the story, not the outtakes.
 */
export type VoiceData = Record<string, string[]>;

export interface MemorialExportOptions {
  /** Photo data URIs by entry id; entries without one are skipped. */
  photos?: PhotoData;
  /** Max photos in "a life in pictures". */
  maxPhotos?: number;
  /** Voice recordings by entry id. */
  voices?: VoiceData;
  /**
   * Ceiling for embedded audio. Self-contained means the bytes live in the
   * file, and a keepsake nobody can open is not a keepsake — so recordings
   * are added shortest-first until this is spent.
   */
  maxVoiceBytes?: number;
}

/** A data URI's decoded size, near enough for budgeting. */
export function dataUriBytes(uri: string): number {
  const comma = uri.indexOf(",");
  if (comma < 0) return 0;
  return Math.floor((uri.length - comma - 1) * 0.75);
}

/**
 * Chooses which recordings fit the budget. Shortest first, so a long
 * rambling take never crowds out five short ones — more of the voice
 * survives that way.
 */
export function pickVoices(
  ids: string[],
  voices: VoiceData,
  budget: number,
): { chosen: Record<string, string>; bytes: number; skipped: number } {
  const takes = ids
    .map((id) => ({ id, uri: voices[id]?.[0] }))
    .filter((t): t is { id: string; uri: string } => Boolean(t.uri))
    .map((t) => ({ ...t, size: dataUriBytes(t.uri) }))
    .sort((a, b) => a.size - b.size);

  const chosen: Record<string, string> = {};
  let bytes = 0;
  let skipped = 0;
  for (const take of takes) {
    if (bytes + take.size > budget) {
      skipped++;
      continue;
    }
    chosen[take.id] = take.uri;
    bytes += take.size;
  }
  return { chosen, bytes, skipped };
}

export function buildMemorialHtml(
  archive: Archive,
  {
    photos = {},
    maxPhotos = 12,
    voices = {},
    maxVoiceBytes = 60 * 1024 * 1024,
  }: MemorialExportOptions = {},
): string {
  const name = archive.profile.name.trim() || "A life worth keeping";
  const firstName = archive.profile.name.trim().split(" ")[0];
  const who = firstName || "its subject";
  const values = archive.entries.filter((e) => e.kind === "value");
  const milestones = sortByDate(
    archive.entries.filter((e) => e.kind === "milestone"),
  );
  const stories = sortByDate(archive.entries.filter((e) => e.kind === "story"));
  const photoEntries = sortByDate(
    archive.entries.filter((e) => e.kind === "photo" && photos[e.id]),
  ).slice(0, maxPhotos);
  const portrait = photoEntries[0];

  const parts: string[] = [];
  parts.push(`<p class="eyebrow">In loving memory</p>`);
  if (portrait) {
    parts.push(
      `<div class="portrait"><img src="${escapeHtml(photos[portrait.id])}" alt="${escapeHtml(portrait.title)}" /></div>`,
    );
  }
  parts.push(`<h1>${escapeHtml(name)}</h1>`);
  if (archive.profile.birthYear) {
    parts.push(`<p class="dates">b. ${archive.profile.birthYear}</p>`);
  }
  if (archive.profile.epitaph.trim()) {
    parts.push(
      `<p class="epitaph">&ldquo;${escapeHtml(archive.profile.epitaph.trim())}&rdquo;</p>`,
    );
  }
  parts.push(`<div class="rule"></div>`);

  if (values.length > 0) {
    const items = values
      .map(
        (v) =>
          `<div class="value"><p class="quote">&ldquo;${escapeHtml(v.title)}&rdquo;</p>` +
          (v.content ? `<p class="why">${escapeParagraphs(v.content)}</p>` : "") +
          `</div>`,
      )
      .join("");
    parts.push(
      `<section><h2>What ${escapeHtml(firstName || "they")} believed</h2>${items}</section>`,
    );
  }

  if (milestones.length > 0) {
    const rows = milestones
      .map(
        (m) =>
          `<div class="moment"><span class="year">${escapeHtml(yearOf(m))}</span><span class="what">${escapeHtml(m.title)}</span></div>`,
      )
      .join("");
    parts.push(
      `<section><h2>A life in moments</h2><div class="moments">${rows}</div></section>`,
    );
  }

  if (photoEntries.length > 0) {
    const figures = photoEntries
      .map(
        (p) =>
          `<figure><div class="mat"><img src="${escapeHtml(photos[p.id])}" alt="${escapeHtml(p.title)}" /></div>` +
          `<figcaption>${escapeHtml(p.title)}</figcaption></figure>`,
      )
      .join("");
    parts.push(
      `<section><h2>A life in pictures</h2><div class="pictures">${figures}</div></section>`,
    );
  }

  const voice = pickVoices(
    stories.map((s) => s.id),
    voices,
    maxVoiceBytes,
  ).chosen;

  if (stories.length > 0) {
    const told = stories
      .map(
        (s) =>
          `<div class="story"><h3>${escapeHtml(s.title)}</h3>` +
          (voice[s.id]
            ? `<div class="voice"><audio controls preload="none" src="${escapeHtml(voice[s.id])}"></audio>` +
              `<span>In ${escapeHtml(firstName || "their")}${firstName ? "&rsquo;s" : ""} own voice</span></div>`
            : "") +
          `<p>${dropCapMarkup(s.content)}</p></div>`,
      )
      .join("");
    parts.push(
      `<section><h2>Stories ${escapeHtml(firstName ? `${firstName} told` : "they told")}</h2>${told}</section>`,
    );
  }

  parts.push(`<div class="rule" style="margin-top:72px"></div>`);
  parts.push(
    `<p class="colophon">Every word on this page was written or spoken by ${escapeHtml(who)} and chosen for this purpose. Nothing was generated.</p>`,
  );

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(name)}</title>
<style>${STYLES}</style>
</head>
<body>
<main class="sheet center">
${parts.join("\n")}
</main>
</body>
</html>
`;
}

/** Filename for the downloaded keepsake. */
export function memorialFileName(archive: Archive): string {
  const slug = archive.profile.name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return slug ? `${slug}-memorial.html` : "memorial.html";
}
