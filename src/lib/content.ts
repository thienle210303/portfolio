/**
 * Pure content helpers shared across sections.
 *
 * Everything here must be deterministic: these run during server rendering and
 * again during hydration, so any locale- or clock-dependent output would be a
 * hydration bug. That is why dates are formatted from a hardcoded month table
 * rather than `Intl` or `toLocaleDateString`.
 */

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

/**
 * Formats an ISO `YYYY-MM-DD` string as e.g. "16 August 2026".
 * Returns the input unchanged if it is not in that shape — never throws.
 */
export function formatIsoDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return iso;

  const year = match[1];
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);

  const month = MONTHS[monthIndex];
  if (month === undefined || Number.isNaN(day)) return iso;

  return `${day} ${month} ${year}`;
}

/**
 * Removes any `[NEEDS INPUT: ...]` marker embedded in prose, then tidies the
 * whitespace and punctuation it leaves behind.
 *
 * Content authors write these markers inline so the gap is visible in the
 * source; visitors must never see one. Markers do not nest and never contain a
 * closing bracket, so a non-greedy match is sufficient.
 */
export function stripNeedsInput(text: string): string {
  return text
    .replace(/\[NEEDS INPUT:[^\]]*\]/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\s+([.,;:!?])/g, "$1")
    .trim();
}

/**
 * True when a string is *entirely* a marker, i.e. the field is unsupplied
 * rather than merely annotated. Such fields should render nothing at all.
 */
export function isEntirelyNeedsInput(text: string): boolean {
  return stripNeedsInput(text).length === 0;
}
