import { careerEntryById, problemSolvingLoop, projects } from "@/content/portfolio";
import { stationGap, workshopStations } from "@/content/workshop";
import { caseStudyAnchorId } from "@/sections/SelectedWork/anchors";
import {
  isNeedsInput,
  resolved as unwrap,
  type Project,
  type ProjectEvidenceField,
} from "@/types/portfolio";

/**
 * One run of the loop: nine stations, each holding its own authored step and
 * whatever the chosen project authored for it.
 *
 * The interesting behaviour is what happens when a project authored nothing.
 * The station stays, its `evidence` is empty, and `gap` says which field is
 * missing. That is the opposite of what a rendering layer usually does with an
 * empty list, and it is the point: four of the five projects have no
 * `whatFailed`, so a Workshop that hid empty stations would show a nine-step
 * loop completing perfectly every time, which is not true of the record it is
 * drawn from.
 *
 * Everything returned is plain strings and numbers. The Workshop hands runs
 * from a server component to a client one as props, so a function or a class
 * in here would stop the section building. `tests/lib/workshop.test.ts`
 * round-trips every run through `structuredClone` and through JSON to keep
 * that true.
 */

export interface ResolvedStation {
  readonly id: string;
  readonly label: string;
  readonly detail: string;
  readonly field: ProjectEvidenceField;
  /** One entry for a single-string field, many for a list field, none when the
   *  project authored nothing. */
  readonly evidence: readonly string[];
  readonly gap: string | null;
}

export interface ResolvedRun {
  readonly projectId: string;
  readonly title: string;
  /** From the career entry the project hangs off; `undefined` if that entry
   *  no longer resolves. */
  readonly organization: string | undefined;
  /** The case study's own anchor in `#work`, leading `#` included, so the run
   *  can point at the full telling rather than repeating it. */
  readonly href: string;
  readonly stations: readonly ResolvedStation[];
  readonly authoredStations: number;
  /** The project's own `learned` line, or `null` when it holds a marker or
   *  nothing. It is a quote like any other on this page, so it goes through
   *  `evidenceFor` rather than being read straight off the record — see
   *  `LEARNED_FIELD` below. */
  readonly learned: string | null;
}

/** The field `learned` quotes, named once so the resolver and the provenance
 *  line the Workshop prints under it cannot disagree about it. */
export const LEARNED_FIELD = "learned" satisfies ProjectEvidenceField;

/**
 * The lines a project authored for one field, or none.
 *
 * `project[field]` is indexed with its real type rather than cast through
 * `unknown`, on purpose. Every `ProjectEvidenceField` is a single line, a
 * `Maybe` line, or a list of lines, and the two branches below cover exactly
 * those. Widen the union to anything else — `metrics`, say — and `.length` on a
 * before/after pair stops the build here, instead of the station quietly
 * reading as empty and being reported as a gap when the project had authored
 * it. (Naming a field the union does not hold never gets this far: the
 * `satisfies` in `src/content/workshop.ts` rejects it first.)
 */
function evidenceFor(project: Project, field: ProjectEvidenceField): readonly string[] {
  const value = project[field];

  if (typeof value === "string" || value === undefined) {
    // A `Maybe<string>` currently holding a `[NEEDS INPUT: …]` marker unwraps
    // to undefined here, which lands in the same place as an absent field: a
    // gap.
    const line = unwrap(value);
    return line !== undefined && line.length > 0 ? [line] : [];
  }

  // The same rule for a list: `readonly string[]` cannot stop a marker being
  // typed into it, so it is dropped here rather than trusted not to be there.
  return value.filter((line) => line.length > 0 && !isNeedsInput(line));
}

export function runnableProjects(): readonly { readonly id: string; readonly title: string }[] {
  return projects.map((project) => ({ id: project.id, title: project.title }));
}

export function resolveRun(projectId: string): ResolvedRun | null {
  const project = projects.find((candidate) => candidate.id === projectId);
  if (!project) return null;

  const stations: ResolvedStation[] = [];
  for (const station of workshopStations) {
    const step = problemSolvingLoop.find((candidate) => candidate.id === station.step);
    // A station naming a step that no longer exists is a content error, not a
    // gap — it is dropped, and `tests/lib/workshop.test.ts`'s first case fails
    // loudly rather than the page rendering eight stations quietly.
    if (!step) continue;
    const evidence = evidenceFor(project, station.field);
    stations.push({
      id: step.id,
      label: step.label,
      detail: step.detail,
      field: station.field,
      evidence,
      gap: evidence.length > 0 ? null : stationGap(station.field),
    });
  }

  return {
    projectId: project.id,
    title: project.title,
    organization: careerEntryById(project.careerEntryId)?.organization,
    // One spelling of a case study's anchor, computed from the id already in
    // hand — the same helper `SelectedWork` renders its `id` from and
    // `worlds.ts` builds its links from.
    href: `#${caseStudyAnchorId(project.id)}`,
    stations,
    authoredStations: stations.filter((station) => station.evidence.length > 0).length,
    // Through `evidenceFor`, not `project.learned`. This is the one quoted
    // line in the Workshop that is not a station's evidence, and it used to
    // be the one that skipped both of the things every other quote gets: the
    // `[NEEDS INPUT: …]` guard, and a provenance line naming where the words
    // came from. A marker typed into `learned` would have been printed to the
    // page verbatim. `null` rather than `""` so the renderer has to decide
    // what an absent lesson looks like instead of emitting an empty node.
    learned: evidenceFor(project, LEARNED_FIELD)[0] ?? null,
  };
}
