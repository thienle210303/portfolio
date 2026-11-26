import { careerEntries, highlights, projects } from "@/content/portfolio";
import type { CareerEntry, Highlight } from "@/types/portfolio";

/** A tag opens its case study's page when it has one (round 32), else the
 *  entry's page in the Diary. */
type Href = `#journey-entry-${string}` | `/work/${string}`;

export interface ResolvedHighlight extends Highlight {
  readonly year: string;
  readonly organization: string;
  readonly href: Href;
}

/** One tag on the oak: consecutive highlights of one entry, as halves. */
export interface Ticket {
  readonly entryId: string;
  readonly name: string;
  /** The first half's: the ticket's paper opens what its figure is from. */
  readonly href: Href;
  readonly halves: readonly ResolvedHighlight[];
}

export function buildHighlights(
  entries: readonly CareerEntry[] = careerEntries,
): readonly ResolvedHighlight[] {
  return highlights.map((h: Highlight) => {
    const entry = entries.find((e) => e.id === h.entryId);
    if (!entry) throw new Error(`highlight names unknown career entry "${h.entryId}"`);
    // A tag can only open a case study that has a page: a featured one.
    if (h.projectId && !projects.some((p) => p.id === h.projectId && p.careerEntryId === entry.id && p.featured))
      throw new Error(`highlight names case study "${h.projectId}" outside "${entry.id}", or not featured`);
    return {
      ...h,
      year: h.year ?? entry.sortKey.slice(0, 4),
      organization: entry.organization,
      href: h.projectId ? `/work/${h.projectId}` : `#journey-entry-${entry.id}`,
    };
  });
}

export function buildTickets(entries: readonly CareerEntry[] = careerEntries): readonly Ticket[] {
  const tickets: { entryId: string; name: string; href: Ticket["href"]; halves: ResolvedHighlight[] }[] = [];
  for (const h of buildHighlights(entries)) {
    const last = tickets.at(-1);
    if (last?.entryId === h.entryId) last.halves.push(h);
    else tickets.push({ entryId: h.entryId, name: h.name, href: h.href, halves: [h] });
  }
  return tickets;
}
