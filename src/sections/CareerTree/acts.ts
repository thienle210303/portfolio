import { careerEntries, origin } from "@/content/portfolio";
import { ACT_IDS, actForEntry, type ActId } from "@/lib/anchors";
import { arrivedAge } from "@/lib/origin-story";

/**
 * The seven acts the stage scrubs through.
 *
 * `title` and `year` are the only prose in this file, and both are editorial
 * labels for a span of time rather than claims about the owner — the facts
 * each act shows come from the career entries it names, verbatim. Nothing
 * here restates what an entry already says.
 *
 * `entryIds` is derived from `actForEntry` rather than typed twice, so the map
 * in `src/lib/anchors.ts` stays the single place that decides where an entry
 * is drawn.
 */
export interface Act {
  readonly id: ActId;
  /** The label in the stage's corner. Prose, because "2018 — 2021" is not a
   *  number and the scrubber needs something human to stop on. */
  readonly year: string;
  readonly title: string;
  readonly entryIds: readonly string[];
  /** The act during which the nine demoted milestones appear as one line. */
  readonly showsCredentials: boolean;
}

const TITLES: Readonly<Record<ActId, { year: string; title: string }>> = {
  crossing: {
    // `origin.arrived`, not a second typing of the month: the globe, the
    // résumé and this label all read the one authored string.
    year: `${origin.arrived} · age ${arrivedAge()}`,
    title: `${origin.from} to ${origin.to}`,
  },
  "high-school": { year: "2018 — 2021", title: "Eastside High, and the family restaurant" },
  "wrong-major": { year: "August 2021", title: "The wrong major" },
  "the-switch": { year: "2022", title: "Friends talk him into it" },
  research: { year: "2022 — 2025", title: "Three million records, and two classrooms" },
  "two-jobs": { year: "2024 — May 2025", title: "Two jobs, one summer, still in school" },
  "retail-data": { year: "October 2025 — now", title: "Retail data" },
};

export const ACTS: readonly Act[] = ACT_IDS.map((id) => ({
  id,
  year: TITLES[id].year,
  title: TITLES[id].title,
  entryIds: careerEntries
    .filter((entry) => actForEntry(entry.id) === id)
    .toSorted((a, b) => (a.sortKey < b.sortKey ? -1 : 1))
    .map((entry) => entry.id),
  showsCredentials: id === "two-jobs",
}));
