import { now } from "@/content/portfolio";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

/** "2026-11" → "Nov 2026": when the new growth was last true. */
export function nowAsOfLabel(asOf: string = now.asOf): string {
  const match = /^(\d{4})-(\d{2})$/.exec(asOf);
  const month = match ? MONTHS[Number(match[2]) - 1] : undefined;
  if (!match || !month) throw new Error(`now.asOf must be YYYY-MM, got "${asOf}"`);
  return `${month} ${match[1]}`;
}

/** The shoot's caption: "New growth · Nov 2026". */
export function nowHeading(): string {
  return `${now.heading} · ${nowAsOfLabel()}`;
}

/** The field tag's link under its status, counted from the list: "4 new shoots". */
export function nowFieldTagLink(): string {
  return now.fieldTagLink.replace("{count}", String(now.items.length));
}

/** The shoot's fragment: the field tag links here, and so does the chat. */
export const NOW_ID = "now";
