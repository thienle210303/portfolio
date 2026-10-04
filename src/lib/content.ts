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

/** Days in each month, index-aligned with MONTHS. February is handled below. */
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Formats an ISO `YYYY-MM-DD` string as e.g. "16 August 2026".
 * Returns the input unchanged if it is not a real calendar date — never throws.
 *
 * The day is validated against the actual month length, not just the string
 * shape: "2026-08-00" and "2026-02-30" are not dates, and printing them as
 * "0 August 2026" would be worse than printing the raw input, because it
 * looks plausible enough to go unnoticed.
 */
export function formatIsoDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return iso;

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);

  const month = MONTHS[monthIndex];
  if (month === undefined) return iso;

  const maxDay =
    monthIndex === 1 && isLeapYear(year) ? 29 : DAYS_IN_MONTH[monthIndex];
  if (maxDay === undefined || day < 1 || day > maxDay) return iso;

  return `${day} ${month} ${match[1]}`;
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

const DRAFT_SIGN_OFF = "\n\nBest,";

/**
 * Folds a case-study referral into a contact draft as its own paragraph,
 * before the sign-off so the message still ends on it. It only names the
 * project the visitor was just reading and invents no claim. A draft without
 * a trailing sign-off gets the paragraph appended.
 */
export function withCaseStudyReferral(draft: string, projectTitle: string | null): string {
  if (!projectTitle) return draft;
  const referral = `Specifically, I wanted to mention your case study, "${projectTitle}."`;
  const trimmed = draft.trimEnd();
  if (trimmed.endsWith(DRAFT_SIGN_OFF)) {
    return `${trimmed.slice(0, -DRAFT_SIGN_OFF.length)}\n\n${referral}${DRAFT_SIGN_OFF}`;
  }
  return `${trimmed}\n\n${referral}`;
}
