import { careerEntries, highlights } from "@/content/portfolio";
import type { CareerEntry } from "@/types/portfolio";

export interface ResolvedHighlight {
  readonly entryId: string;
  readonly value: string;
  readonly label: string;
  readonly year: string;
  readonly organization: string;
  readonly href: `#journey-entry-${string}`;
}

export function buildHighlights(
  entries: readonly CareerEntry[] = careerEntries,
): readonly ResolvedHighlight[] {
  return highlights.map((h) => {
    const entry = entries.find((e) => e.id === h.entryId);
    if (!entry) throw new Error(`highlight names unknown career entry "${h.entryId}"`);
    return {
      ...h,
      year: entry.sortKey.slice(0, 4),
      organization: entry.organization,
      href: `#journey-entry-${entry.id}`,
    };
  });
}
