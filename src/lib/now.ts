import { now } from "@/content/portfolio";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

/** "2026-11" → "Nov 2026": when the new growth was last true. */
export function nowAsOfLabel(asOf: string = now.asOf): string {
  const match = /^(\d{4})-(\d{2})$/.exec(asOf);
  const month = match ? MONTHS[Number(match[2]) - 1] : undefined;
  if (!match || !month) throw new Error(`now.asOf must be YYYY-MM, got "${asOf}"`);
  return `${month} ${match[1]}`;
}

/** The receipt's fragment, "2025 – now" on the hero's line (round 30). */
export const NOW_ID = "now";
