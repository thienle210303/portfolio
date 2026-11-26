import { careerEntryById, highlights, projects } from "@/content/portfolio";
import type { Highlight, Project, Showcase } from "@/types/portfolio";

/**
 * The case studies the Work section shows (round 32): every `featured`
 * project, in the content file's order. A featured project without a
 * `showcase` is a content error that `tests/lib/showcase.test.ts` catches;
 * here it is simply not shown.
 */
export type ShownProject = Project & { readonly showcase: Showcase };

export const SHOWN: readonly ShownProject[] = (projects as readonly Project[]).filter(
  (p): p is ShownProject => p.featured && p.showcase !== undefined,
);

export function shownProject(id: string): ShownProject | undefined {
  return SHOWN.find((p) => p.id === id);
}

/** The case study's page. */
export function workHref(id: string): `/work/${string}` {
  return `/work/${id}`;
}

/** The oak's tag for this case study, when it has one. */
function tagOf(p: Project): Highlight | undefined {
  return (highlights as readonly Highlight[]).find((h) => h.projectId === p.id);
}

/** "DoorDash · 2026": the oak tag's short name and year, else the entry's
 *  organisation and start year, so the sheet and the tag never disagree. */
export function shownPlace(p: Project): string {
  const tag = tagOf(p);
  const entry = careerEntryById(p.careerEntryId);
  const name = tag?.name ?? entry?.organization ?? "";
  const year = tag?.year ?? entry?.sortKey.slice(0, 4) ?? "";
  return [name, year].filter(Boolean).join(" · ");
}

/** The case studies either side of this one, in a ring. */
export function neighbours(id: string): { readonly previous: ShownProject; readonly next: ShownProject } | undefined {
  const i = SHOWN.findIndex((p) => p.id === id);
  if (i < 0 || SHOWN.length < 2) return undefined;
  return {
    previous: SHOWN[(i - 1 + SHOWN.length) % SHOWN.length]!,
    next: SHOWN[(i + 1) % SHOWN.length]!,
  };
}
