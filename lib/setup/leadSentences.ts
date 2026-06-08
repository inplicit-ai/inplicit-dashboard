/**
 * Splits the lead off the front of EDDA's streamed message.
 *
 * EDDA always opens with two short sentences: a CONFIRMATION of the user's last
 * input, then a statement of what she's about to DO. We want those visible the
 * instant they've streamed in, while the longer body that follows is masked by a
 * pulsing skeleton until generation completes — so the turn reads as "understood,
 * here's the plan" immediately instead of crawling out word by word.
 *
 * This module finds the boundary after the first `count` complete sentences.
 */

export type Lead = {
  /** The first `count` complete sentences (trimmed), or the whole content so far
   *  if fewer than `count` complete sentences have streamed in yet. */
  lead: string;
  /** True once at least one complete sentence exists BEYOND the lead — i.e. there
   *  is real body text to mask with the skeleton (vs. a short two-line reply). */
  hasBody: boolean;
};

// Short tokens that take a trailing period as an abbreviation, not a sentence end.
// Lower-cased; matched case-insensitively. Keeps "z.B.", "bzw.", "Dr." etc. intact.
const ABBREVIATIONS = new Set([
  "z",
  "b",
  "bzw",
  "ca",
  "etc",
  "usw",
  "dr",
  "nr",
  "vgl",
  "ggf",
  "evtl",
  "inkl",
  "max",
  "min",
  "mr",
  "mrs",
  "ms",
  "no",
  "vs",
  "u",
  "a",
  "d",
  "h",
  "e",
  "g",
  "i",
]);

// A run of sentence terminators that is followed by whitespace (so we know more
// text came after it — the sentence is genuinely closed, not mid-stream).
const TERMINATOR_RE = /[.!?…]+(?=\s)/g;

/** The word immediately preceding `end` (exclusive), lower-cased and stripped. */
function precedingWord(content: string, end: number): string {
  let start = end;
  while (start > 0 && /[^\s.!?…]/.test(content[start - 1])) start -= 1;
  return content.slice(start, end).toLowerCase();
}

/**
 * Returns the first `count` complete sentences of `content`. While fewer than
 * `count` complete sentences have arrived, returns everything so far (the lead is
 * still streaming). `hasBody` reports whether anything meaningful follows the lead.
 */
export function leadSentences(content: string, count: number): Lead {
  const trimmed = content.trimStart();
  let found = 0;
  let boundary = -1;

  TERMINATOR_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = TERMINATOR_RE.exec(trimmed)) !== null) {
    // Skip terminators that close a known abbreviation rather than a sentence.
    if (ABBREVIATIONS.has(precedingWord(trimmed, match.index))) continue;
    found += 1;
    boundary = match.index + match[0].length;
    if (found >= count) break;
  }

  if (found < count) {
    return { lead: trimmed.trim(), hasBody: false };
  }

  const lead = trimmed.slice(0, boundary).trim();
  const hasBody = trimmed.slice(boundary).trim().length > 0;
  return { lead, hasBody };
}
