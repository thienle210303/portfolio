/**
 * Typed contracts for every piece of content on the site.
 *
 * Rules this file exists to enforce:
 *  - Facts live in `src/content/*`, never inline in JSX.
 *  - Overlapping facts (dates, employers, roles) are declared once and
 *    referenced by id, so the resume, the timeline and the case studies
 *    cannot drift apart.
 *  - Anything not yet supplied is an explicit `NeedsInput` marker, never
 *    an invented value. Markers are content-authoring metadata; the
 *    rendered UI omits the field or shows a written "in progress" state.
 */

/** A fact that is genuinely missing. Never render this string verbatim. */
export type NeedsInput = `[NEEDS INPUT: ${string}]`;

export function isNeedsInput(value: unknown): value is NeedsInput {
  return typeof value === "string" && value.startsWith("[NEEDS INPUT:");
}

/**
 * A value that may not be known yet. `resolved()` returns `undefined` for
 * unknown values so callers omit rather than print a placeholder.
 */
export type Maybe<T> = T | NeedsInput | undefined;

/**
 * Unwraps a `Maybe`. The `Exclude` in the return type is load-bearing: when a
 * content field currently holds a literal `[NEEDS INPUT: ...]` string, `T` is
 * inferred as that literal and the return type collapses to `undefined`. That
 * makes it a *type error* to render an unsupplied fact, not just a runtime
 * no-op — the marker cannot reach the DOM by accident.
 */
export function resolved<T>(value: Maybe<T>): Exclude<T, NeedsInput> | undefined {
  if (value === undefined) return undefined;
  if (isNeedsInput(value)) return undefined;
  return value as Exclude<T, NeedsInput>;
}

/* -------------------------------------------------------------------------- */
/* Identity                                                                    */
/* -------------------------------------------------------------------------- */

export interface Profile {
  readonly name: string;
  readonly shortName: string;
  readonly monogram: string;
  /** e.g. "Software Engineer" — the professional title, not a slogan. */
  readonly title: string;
  /** The single positioning sentence the whole site hangs from. */
  readonly positioning: string;
  /** One supporting sentence naming the actual focus areas. */
  readonly focus: string;
  /** The recurring philosophy line. */
  readonly philosophy: string;
  /** Hero headline. */
  readonly headline: string;
  /** Hero supporting paragraph. */
  readonly intro: string;
  /** A short personal introduction used in the About/Philosophy lead. */
  readonly about: readonly string[];
  readonly email: string;
  readonly location: Maybe<string>;
  readonly availability: Maybe<string>;
  /** Path under /public to a real resume PDF, or undefined if none exists. */
  readonly resumePdf: string | undefined;
  readonly resumePdfLabel: string;
}

/** A point on the globe, in degrees. Positive latitude is north, positive
 *  longitude is east — the convention Natural Earth and every web map use, so
 *  a coordinate can be read off a map and typed in unchanged. */
export interface GeoPoint {
  readonly lat: number;
  readonly lon: number;
}

/**
 * The one geographic fact the origin story may draw on. Every other place
 * that touches the story — captions, the player's flight label, the
 * reduced-motion storyboard — computes from career entries or from this
 * block, never from a second, independently-typed place name.
 */
export interface Origin {
  readonly from: string;
  readonly to: string;
  readonly arrived: string;
  readonly arrivedYear: number;

  /**
   * Where the two ends of the crossing are. Authored here rather than in
   * `src/content/worlds.ts` because they are facts about the crossing itself,
   * which this record already owns — and because the globe, the flight arc,
   * the Sea world's derived midpoint and the Sky world's derived apex must
   * every one of them agree, which they only do if there is one pair of
   * numbers on the site.
   *
   * `to` is the United States country centroid, deliberately not a city.
   */
  readonly coordinates: {
    readonly from: GeoPoint;
    readonly to: GeoPoint;
  };
}

export type SocialPlatform = "GitHub" | "LinkedIn" | "Email";

export interface SocialLink {
  readonly id: string;
  readonly platform: SocialPlatform;
  readonly label: string;
  /** Human-readable handle, shown instead of a bare URL. */
  readonly handle: string;
  readonly href: string;
  readonly external: boolean;
}

export interface NavItem {
  readonly id: string;
  /** Matches the `id` attribute of the corresponding <section>. */
  readonly sectionId: string;
  readonly label: string;
}

/* -------------------------------------------------------------------------- */
/* Philosophy                                                                  */
/* -------------------------------------------------------------------------- */

export interface Principle {
  readonly id: string;
  readonly index: number;
  readonly title: string;
  readonly summary: string;
  readonly detail: string;
  /** A real, sourced example. Omitted when no example exists yet. */
  readonly evidence?: {
    readonly context: string;
    readonly body: string;
    /** id of a project in `projects`, for the "see the case study" link. */
    readonly projectId?: string;
  };
}

export interface LoopStep {
  readonly id: string;
  readonly label: string;
  readonly detail: string;
}

/* -------------------------------------------------------------------------- */
/* Work                                                                        */
/* -------------------------------------------------------------------------- */

export type ProjectStatus = "shipped" | "in-progress" | "archived";

export interface MetricComparison {
  readonly label: string;
  readonly before: string;
  readonly after: string;
  /** Where the number comes from, so a reader can weigh it. */
  readonly source: string;
}

export interface WorkflowDiagramStep {
  readonly label: string;
  readonly note?: string;
}

/** A before/after workflow, only populated when real information exists. */
export interface WorkflowDiagram {
  readonly beforeLabel: string;
  readonly afterLabel: string;
  readonly before: readonly WorkflowDiagramStep[];
  readonly after: readonly WorkflowDiagramStep[];
}

export interface ProjectLink {
  readonly label: string;
  readonly href: string;
}

/**
 * A case study. Every narrative field maps onto the site-wide arc:
 * Problem -> Constraint -> Decision -> Build -> Proof -> Lesson.
 */
export interface Project {
  readonly id: string;
  readonly title: string;
  /** Short line used on the recruiter-facing card. */
  readonly tagline: string;
  /** id in `careerEntries` supplying org + dates. Prevents date drift. */
  readonly careerEntryId: string;
  readonly status: ProjectStatus;
  readonly featured: boolean;

  /* Problem */
  readonly problem: string;
  readonly whyItMattered: string;
  readonly assumption: Maybe<string>;

  /* Constraint */
  readonly constraints: readonly string[];
  readonly responsibility: string;

  /* Decision */
  readonly decisions: readonly string[];
  readonly pathsExplored: readonly string[];
  readonly whatFailed?: string;
  readonly failureLesson?: string;

  /* Build */
  readonly built: readonly string[];
  readonly workflow?: WorkflowDiagram;

  /* Proof */
  readonly proof: readonly string[];
  readonly metrics?: readonly MetricComparison[];

  /* Lesson */
  readonly learned: string;
  readonly nextQuestion: string;

  readonly technologies: readonly string[];
  readonly demo?: ProjectLink;
  readonly source?: ProjectLink;
  /** Set when the deep dive is deliberately not yet written out. */
  readonly inProgressNote?: string;
}

/* -------------------------------------------------------------------------- */
/* Career                                                                      */
/* -------------------------------------------------------------------------- */

export type CareerEntryType = "work" | "learning" | "milestone";

export interface CareerEntry {
  readonly id: string;
  readonly type: CareerEntryType;
  /** Human-readable range, e.g. "October 2025 — Present". */
  readonly dateRange: string;
  /** ISO-ish sort key: YYYY-MM. Descending sort is applied at render time. */
  readonly sortKey: string;
  readonly role: string;
  readonly organization: string;
  readonly locationOrMode: Maybe<string>;
  readonly context: string;
  readonly responsibilities: readonly string[];
  readonly built: readonly string[];
  readonly impact: readonly string[];
  readonly learned: Maybe<string>;
  readonly technologies: readonly string[];
  readonly link?: ProjectLink;
  /** Lenses this entry is relevant to, used by the resume explorer. */
  readonly lenses: readonly ResumeLensId[];
}

/* -------------------------------------------------------------------------- */
/* Resume                                                                      */
/* -------------------------------------------------------------------------- */

export type ResumeLensId =
  | "engineering"
  | "automation"
  | "optimization"
  | "ai-workflows"
  | "leadership";

export interface ResumeLens {
  readonly id: ResumeLensId;
  readonly label: string;
  readonly description: string;
}

export type ResumeDepth = "quick-scan" | "deep-dive";

export interface SkillCategory {
  readonly id: string;
  readonly label: string;
  readonly skills: readonly string[];
  /** Where these show up in real work. No proficiency percentages, ever. */
  readonly evidence: string;
  readonly lenses: readonly ResumeLensId[];
}

export interface EducationEntry {
  readonly id: string;
  readonly institution: string;
  readonly credential: string;
  readonly dateRange: string;
  readonly details: readonly string[];
}

export interface Certification {
  readonly id: string;
  readonly name: string;
  readonly issuer: string;
  readonly date: Maybe<string>;
}

export interface Achievement {
  readonly id: string;
  readonly title: string;
  readonly context: string;
  readonly date: Maybe<string>;
  readonly note?: string;
}

/* -------------------------------------------------------------------------- */
/* AI Workflow Lab                                                             */
/* -------------------------------------------------------------------------- */

export type ExperimentStatus = "Exploring" | "Tested" | "Adopted" | "Retired";

export type AiToolId = "claude-code" | "codex" | "cursor" | "playwright";

export interface AiTool {
  readonly id: AiToolId;
  readonly name: string;
  readonly vendor: string;
  readonly what: string;
  /** Official docs. Required for anything time-sensitive. */
  readonly href: string;
}

/**
 * One move of the scraping playbook (AI Workflow Lab). The `body` is the
 * owner's own approved prose; `evidenceHref` points at the in-page case
 * study or timeline entry that already makes the same claim with sources —
 * the playbook asserts nothing the page doesn't prove elsewhere.
 */
export interface ScrapingPlaybookMove {
  readonly id: string;
  readonly title: string;
  readonly body: string;
  readonly evidenceHref: string;
  readonly evidenceLabel: string;
}

/** One stage of the agentic development loop the explorer walks through. */
export interface WorkflowStage {
  readonly id: string;
  readonly label: string;
  readonly question: string;
  /** What the agent is actually asked to do. */
  readonly agentDoes: readonly string[];
  /** What stays a human decision, every time. */
  readonly humanOwns: readonly string[];
  /** The failure mode this stage tends to produce. */
  readonly watchFor: string;
}

export interface ExperimentSource {
  readonly label: string;
  readonly href: string;
}

export interface AiExperiment {
  readonly id: string;
  readonly title: string;
  /**
   * Coarse start period, e.g. "Q4 2025" or "August 2026". Deliberately not a
   * precise ISO date: state the coarsest form that is actually true rather
   * than inventing a day.
   */
  readonly started: string;
  /** YYYY-MM, for deterministic ordering only. Never rendered. */
  readonly sortKey: string;
  readonly status: ExperimentStatus;
  readonly question: string;
  readonly hypothesis: string;
  readonly toolIds: readonly AiToolId[];
  readonly whyThisTool: string;
  readonly contextSupplied: readonly string[];
  /** ids from `workflowStages` this experiment exercised. */
  readonly stageIds: readonly string[];
  readonly humanDecisionPoints: readonly string[];
  readonly safetyBoundaries: readonly string[];
  /** Empty for `Exploring` experiments — nothing verified yet. */
  readonly verification: readonly string[];
  readonly outcome?: string;
  readonly effortComparison?: string;
  readonly limitation?: string;
  readonly humanCorrections?: readonly string[];
  readonly lesson?: string;
  readonly nextExperiment: string;
  readonly sources?: readonly ExperimentSource[];
  /** ISO date (YYYY-MM-DD). */
  readonly lastUpdated: string;
}

/* -------------------------------------------------------------------------- */
/* Learning log                                                                */
/* -------------------------------------------------------------------------- */

export interface LearningLogEntry {
  readonly id: string;
  /** ISO date (YYYY-MM-DD). Only add an entry you can date honestly. */
  readonly date: string;
  readonly title: string;
  readonly body: string;
  readonly tags: readonly string[];
}

export interface LearningLog {
  /** ISO date (YYYY-MM-DD) — drives the "last updated" indicator. */
  readonly lastUpdated: string;
  readonly exploringNow: readonly string[];
  readonly changedMyThinking: readonly { readonly before: string; readonly after: string }[];
  readonly wantToTestNext: readonly string[];
  readonly entries: readonly LearningLogEntry[];
}

/* -------------------------------------------------------------------------- */
/* Contact                                                                     */
/* -------------------------------------------------------------------------- */

export interface ContactIntent {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly subject: string;
  /** Editable starter text, never sent without an explicit action. */
  readonly messageStarter: string;
}

/* -------------------------------------------------------------------------- */
/* Hero code artifact                                                          */
/* -------------------------------------------------------------------------- */

/** Token kinds for the hand-rolled, colour-independent highlighter. */
export type CodeTokenKind =
  | "plain"
  | "keyword"
  | "identifier"
  | "property"
  | "string"
  | "punctuation"
  | "comment";

export interface CodeTab {
  readonly id: string;
  readonly label: string;
  readonly filename: string;
  /** A description of what the snippet says, for assistive technology. */
  readonly summary: string;
  readonly code: string;
}
