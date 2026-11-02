/**
 * The measured values in an answer's passage, found rather than authored
 * (round 24): the chat sets them in `--accent` mono, because numbers beat
 * adjectives, and nothing in the content layer marks them up. Imported only by
 * `AskThisSite.tsx`, so it rides in the chat's lazy chunk.
 *
 * A figure is digits with what makes them a measurement: a magnitude or a
 * plus (`3M+`, `30+`), a percentage (`99.9%`, `3.9%`), a time unit, attached
 * or spelled out (`17h`, `3 minutes`, `1 hour`), or plain digits (`654`,
 * `1,529`). Two figures joined by an arrow or "to" are one run (`17 hours →
 * 3 minutes`, `654 to 1,529`, `2 to 25`), so a before and after reads as one
 * measurement.
 *
 * Not figures: a bare year (`December 2018`: a date, not a measurement),
 * ordinals (`2nd`), and digits glued to letters (`v16`, `H2O`). Number
 * words (`three`, `fifteen`) are prose and stay prose.
 */

export interface TextRun {
  readonly text: string;
  readonly figure: boolean;
}

const NUMBER = String.raw`(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?`;
const SUFFIX = String.raw`(?:[KMB]\+?|\+|%|×|ms|h|m|s|x)?`;
const UNIT = String.raw`(?:\s(?:hours?|minutes?|seconds?|days?|weeks?|months?|years?)(?!\p{L}))?`;
/** One figure: never preceded by a letter, digit or decimal point, never
 *  followed by a letter or digit (so `2nd` and `v16` fall out). */
const FIGURE = String.raw`(?<![\p{L}\d.,])${NUMBER}${SUFFIX}(?![\p{L}\d])${UNIT}`;
const JOIN = String.raw`(?:\s*(?:→|->)\s*|\s+to\s+)(?:(?:under|over|about)\s+)?`;
const RUN = new RegExp(`${FIGURE}(?:${JOIN}${FIGURE})?`, "giu");

const BARE_YEAR = /^(?:19|20)\d{2}s?$/;
const DIGITS = /\d\S*/gu;

/** A match is a date, not a measurement, when any number in it is a bare
 *  year or a decade: `2018`, `2021 to 2025`, `1990s`. */
function isDate(match: string): boolean {
  return (match.match(DIGITS) ?? []).some((token) => BARE_YEAR.test(token));
}

/** The passage cut into prose and figure runs, in order; joined, the runs
 *  are the passage exactly. */
export function figureRuns(text: string): readonly TextRun[] {
  const runs: TextRun[] = [];
  let last = 0;
  for (const match of text.matchAll(RUN)) {
    const value = match[0];
    const start = match.index ?? 0;
    if (isDate(value)) continue;
    if (start > last) runs.push({ text: text.slice(last, start), figure: false });
    runs.push({ text: value, figure: true });
    last = start + value.length;
  }
  if (last < text.length) runs.push({ text: text.slice(last), figure: false });
  return runs;
}
