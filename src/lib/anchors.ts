import { careerEntries, projects } from "@/content/portfolio";

/**
 * The Journey's seven acts, and the one place that knows which career entry
 * belongs to which.
 *
 * This file exists in `lib/` rather than in the section that renders it for a
 * structural reason, not a stylistic one. Through round 17, `src/lib/worlds.ts`
 * imported `caseStudyAnchorId` from `src/sections/SelectedWork/anchors.ts` —
 * the library reaching outward into a section it should know nothing about.
 * Round 18 deletes that section, which broke the library at compile time.
 * Nothing under `lib/` imports from `sections/` once this lands, and nothing
 * should again.
 *
 * Order is story order, not date order, and it is what the stage scrubs
 * through. `crossing` has no career entry of its own: it is the arrival
 * itself, authored on `origin` rather than on an entry.
 */
export const ACT_IDS = [
  "crossing",
  "high-school",
  "wrong-major",
  "the-switch",
  "research",
  "two-jobs",
  "retail-data",
] as const;

export type ActId = (typeof ACT_IDS)[number];

/**
 * Which act each career entry is drawn in. Authored, not computed from dates:
 * some roles overlap several acts, and the act a role *belongs* to is an
 * editorial judgement about the story, not a fact about its calendar.
 *
 * Milestones are the exception in spirit: they go where the calendar puts
 * them, with the boundary at `schaeffler`'s sortKey `2024-05-a`. `code-to-give`
 * (2023-04), `acm-webmaster` (2024-01) and `cockyhacks` (2024-04) fall before
 * it, so they sit in `research` (and `cs-switch`, 2022-01, in `the-switch`);
 * `magellan` (2024-09) and the May 2025 milestones fall after it, so they sit
 * in `two-jobs`. A Research Award in `two-jobs` beside two hackathons in
 * `research` is therefore correct, not inverted — leave it alone. The one
 * milestone that does not follow its start date is `deans-list`: it spans
 * 2021 — 2025, so it is filed in `two-jobs`, where the credentials strip
 * appears.
 *
 * `usc-degree` is the one entry placed by what hangs off it rather than by
 * where it sits in the story. Four projects (`chess-minmax`, `conscea`,
 * `degreeworks-rebuild`, `toy-storefront`) resolve their act through it, and
 * they were built between July 2023 and April 2024 — `research` (2022–2025)
 * is temporally right for all four, where `two-jobs` (2024 — May 2025) would
 * place three of them a year late. The degree is demoted and never drawn as a
 * branch, so this only decides where its projects surface. The credentials
 * strip is driven by the act's `showsCredentials`, not by this entry.
 */
const ENTRY_ACTS: Readonly<Record<string, ActId>> = {
  "eastside-high": "high-school",
  "fu-of-kyoto": "high-school",
  "self-taught-gap": "high-school",
  "usc-cheme": "wrong-major",
  "cs-switch": "the-switch",
  "usc-scraping": "research",
  "usc-ta": "research",
  "usc-honors-ta": "research",
  "usc-degree": "research",
  schaeffler: "two-jobs",
  wordification: "two-jobs",
  capstone: "two-jobs",
  "llm-classifier": "two-jobs",
  graduation: "two-jobs",
  cockyhacks: "research",
  "code-to-give": "research",
  magellan: "two-jobs",
  "acm-webmaster": "research",
  "deans-list": "two-jobs",
  doordash: "retail-data",
};

/** The DOM id for an act. Prefixed, so an act id can never collide with a
 *  section id like `about` or `worlds`. */
export function actAnchorId(id: ActId): string {
  return `act-${id}`;
}

export function actForEntry(entryId: string): ActId | undefined {
  if (!careerEntries.some((entry) => entry.id === entryId)) return undefined;
  return ENTRY_ACTS[entryId];
}

export function actForProject(projectId: string): ActId | undefined {
  const project = projects.find((candidate) => candidate.id === projectId);
  if (!project) return undefined;
  return actForEntry(project.careerEntryId);
}
