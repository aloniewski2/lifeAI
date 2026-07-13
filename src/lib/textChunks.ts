/**
 * Split narration text into sentence-boundary chunks. Generating (and
 * playing) chunk by chunk keeps time-to-first-audio short and keeps any
 * single TTS generation small.
 */
export function splitIntoChunks(text: string, maxChars = 300): string[] {
  const sentences = text
    .replace(/\s+/g, " ")
    .trim()
    .split(/(?<=[.!?…])\s+/)
    .filter(Boolean);

  const chunks: string[] = [];
  let current = "";
  for (const sentence of sentences) {
    if (current && current.length + sentence.length + 1 > maxChars) {
      chunks.push(current);
      current = sentence;
    } else {
      current = current ? `${current} ${sentence}` : sentence;
    }
    // A single run-on sentence longer than the cap still becomes its own
    // chunk — better one big generation than none.
  }
  if (current) chunks.push(current);
  return chunks;
}
