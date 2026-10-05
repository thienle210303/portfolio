/**
 * Typed contracts for every piece of content on the site.
 *
 * Rules this file exists to enforce:
 *  - Facts live in `src/content/*`, never inline in JSX.
 *  - Overlapping facts (dates, employers, roles) are declared once and
 *    referenced by id, so the résumé, the Journey and the case studies
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
  /** The single positioning sentence the whole site hangs from. Rendered as
   *  the lead of About in the hero's identity column (`HeroIdentity.tsx`),
   *  and used as the page's meta description and on the social card. */
  readonly positioning: string;
  /** One supporting sentence naming the actual focus areas. */
  readonly focus: string;
  /** The recurring philosophy line. */
  readonly philosophy: string;
  /** Hero headline. */
  readonly headline: string;
  /** A short personal introduction — About's paragraphs, in the hero's
   *  identity column (`HeroIdentity.tsx`), each also indexed by the chat
   *  corpus. */
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
  /** ISO date. The only birth date on the site; `arrivedAge()` subtracts it
   *  from `arrivedOn` so no age is ever typed twice. */
  readonly born: string;
  /** `YYYY-MM` — the machine-readable twin of `arrived`. `arrived` is prose a
   *  visitor reads; this is what arithmetic uses. `arrivedOnAgreesWithArrived()`
   *  asserts they never drift apart. */
  readonly arrivedOn: string;
  /** He did not arrive alone. One boolean, because the alternative is a
   *  sentence this file would be inventing. */
  readonly withFamily: boolean;
  /** His own description of the English he landed with, condensed from his
   *  words and nobody else's. */
  readonly english: string;

  /**
   * Where the two ends of the crossing are. Authored here rather than in
   * `src/content/worlds.ts` because they are facts about the crossing itself,
   * which this record already owns — and because the globe, the flight arc,
   * the Sea world's derived midpoint and the Sky world's derived apex must
   * every one of them agree, which they only do if there is one pair of
   * numbers on the site.
   *
   * `to` is Taylors, South Carolina, the town he arrived in — a city since
   * round 18; before that it was the United States country centroid.
   */
  readonly coordinates: {
    readonly from: GeoPoint;
    readonly to: GeoPoint;
  };
}

/**
 * One of the two cats who live on this page — real animals, named by their
 * owner on 2026-09-02, which is why `authoredOn` is here: this is the one
 * record on the site whose provenance is "he told me", with no document
 * behind it, and the globe's Animals world says so on the plaque.
 */
export interface Companion {
  readonly id: string;
  readonly name: string;
  /** What she looks like, in the drawing's own terms. */
  readonly coat: string;
  /** What she does, which is also which of the two drawn cats she is. */
  readonly habit: string;
  /** ISO date the owner authored this. */
  readonly authoredOn: string;
  /** Whose cat this is. The site implied they were his through round 17;
   *  they are his girlfriend's. One field, because the alternative is the
   *  resolver composing a sentence about a relationship nobody authored. */
  readonly belongsTo: string;
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
  /** `YYYY-MM`, or `undefined` for an entry that is still running. The
   *  machine-readable end of `dateRange`, added in round 18 so overlap can be
   *  computed rather than eyeballed — the owner held three roles and a degree
   *  at once in 2024, and a tree that draws that as a sequence is telling the
   *  wrong story about the most impressive year in the record. */
  readonly endSortKey?: string;
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
}

/* -------------------------------------------------------------------------- */
/* Resume                                                                      */
/* -------------------------------------------------------------------------- */

export type ResumeDepth = "quick-scan" | "deep-dive";

export interface SkillCategory {
  readonly id: string;
  readonly label: string;
  readonly skills: readonly string[];
  /** Where these show up in real work. No proficiency percentages, ever. */
  readonly evidence: string;
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

export type AiToolId = "claude-code" | "codex" | "cursor" | "playwright";

export interface AiTool {
  readonly id: AiToolId;
  readonly name: string;
  readonly vendor: string;
  readonly what: string;
  /** Official docs. Required for anything time-sensitive. */
  readonly href: string;
}

/* -------------------------------------------------------------------------- */
/* Contact                                                                     */
/* -------------------------------------------------------------------------- */

export interface ContactIntent {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly subject: string;
  /** A complete message the visitor can send without editing a word; "Add a
   *  line of my own" opens it in a textarea for anyone who wants to.
   *  Paragraphs are separated by a blank line, and the form renders each as
   *  its own paragraph. It ends on a bare "Best," because the sender's name
   *  is the form's own field. A draft may say what the sender
   *  wants; it may not claim feelings they have not expressed, and it holds no
   *  figure or fact about Thien. Never sent without an explicit action. */
  readonly messageDraft: string;
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
  /** Where this excerpt comes from. `filename` is the repo-relative path of a
   *  real file and `code` is a verbatim slice of it (tests/lib/content.test.ts
   *  checks that); this line is the human-readable provenance shown under the
   *  panel. */
  readonly source: string;
  readonly code: string;
}

/* -------------------------------------------------------------------------- */
/* Playground Earth                                                            */
/*                                                                             */
/* The globe's schema is deliberately a schema of *references*. A world does    */
/* not hold the sentence a plaque renders; it holds the address of the field    */
/* that sentence already lives in, and `src/lib/worlds.ts` fetches it. That is  */
/* the difference between a globe that is culturally rich and a globe that      */
/* invents things about its subject, and `tests/lib/worlds.test.ts` enforces    */
/* it string-for-string.                                                        */
/*                                                                             */
/* `where` and `disclosure` are the one exception, and they are not an           */
/* exception to the rule so much as outside its scope: they are prose about the  */
/* *drawing* ("the arrival pin, the first place he lived here"), never           */
/* a claim about him. A test asserts no plaque ever renders one of them.         */
/* -------------------------------------------------------------------------- */

export type GlyphId =
  | "comtam"
  | "cap"
  | "trophy"
  | "ribbon"
  | "chalk"
  | "net"
  | "buoy"
  | "jelly"
  | "bird"
  | "plane"
  | "sprout"
  | "cat"
  | "sat"
  | "chip"
  | "star"
  | "book"
  | "magnifier";

export type WorldAnchor =
  | { readonly at: "origin-from" }
  | { readonly at: "origin-to" }
  | { readonly at: "arc-midpoint" }
  | { readonly at: "arc-apex" }
  | { readonly at: "plinth" }
  | { readonly at: "orbit" };

export type ComputedFactId =
  | "tree-shape"
  | "tree-still-growing"
  | "crossing"
  | "seasons"
  | "play-scenes"
  | "ai-tools";

export type PlaqueRef =
  | { readonly of: "careerEntry"; readonly id: string; readonly field: "role" | "context" | "learned" }
  | {
      readonly of: "careerEntryLine";
      readonly id: string;
      readonly field: "impact" | "built";
      readonly index: number;
    }
  | {
      readonly of: "project";
      readonly id: string;
      readonly field: "tagline" | "learned" | "nextQuestion";
      readonly link?: string;
    }
  | { readonly of: "companion"; readonly id: string }
  | { readonly of: "computed"; readonly id: ComputedFactId };

export interface WorldPlaque {
  readonly glyph: GlyphId;
  readonly ref: PlaqueRef;
}

export interface WorldDecoration {
  readonly glyph: GlyphId;
  readonly draws: string;
}

export interface World {
  readonly id: string;
  readonly name: string;
  readonly glyph: GlyphId;
  readonly anchor: WorldAnchor;
  readonly where: string;
  readonly plaques: readonly WorldPlaque[];
  readonly decorations: readonly WorldDecoration[];
  readonly disclosure?: string;
}
