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
  /** His motto, the stamp on the hero's field tag (upper-cased by CSS only). */
  readonly motto: string;
  /** Hero headline. */
  readonly headline: string;
  /** A short personal introduction. Rendered nowhere since round 20 Phase 3;
   *  each paragraph is indexed by the chat corpus with no section citation. */
  readonly about: readonly string[];
  readonly email: string;
  readonly location: Maybe<string>;
  readonly availability: Maybe<string>;
  /** Path under /public to a real resume PDF, or undefined if none exists. */
  readonly resumePdf: string | undefined;
  readonly resumePdfLabel: string;
}

/**
 * The one geographic fact the origin story may draw on. Every other place
 * that touches the story — captions, the player's flight label — computes from career entries or from this
 * block, never from a second, independently-typed place name.
 */
export interface Origin {
  readonly from: string;
  readonly to: string;
  readonly arrived: string;
  readonly arrivedYear: number;
  /** ISO date. The only birth date on the site. */
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
}

/**
 * One of the two cats who live on this page — real animals, named by their
 * owner on 2026-09-02, which is why `authoredOn` is here: this is the one
 * record on the site whose provenance is "he told me", with no document
 * behind it.
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

/** The hero's authored lines (`hero` in the content layer). */
export interface HeroCopy {
  /** Shown only from 1024, where the line runs between two poles. */
  readonly hintLine: string;
  readonly hint: string;
  /** Follows `profile.positioning` in the hero's body. */
  readonly invitation: string;
  /** The Taylors line is the entry's own `headline`, so it is not here. */
  readonly chapterLines: {
    readonly origin: string;
    readonly "usc-degree": string;
    readonly doordash: string;
  };
  readonly fieldTag: {
    readonly number: string;
    readonly aside: string;
    readonly habitat: string;
    readonly formerly: string;
    readonly companionsLead: string;
    readonly status: string;
    readonly linkLabel: string;
  };
  readonly vignette: { readonly morning: string; readonly evening: string };
  /** The off-duty cat's caption is `${name}, ${offDuty}`. */
  readonly offDuty: string;
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
  /** Media id: `public/media/<id>.mp4` and `<id>.jpg`. Loaded only on request. */
  readonly recording?: string;
  /** One plain sentence of what the recording visibly shows: its text alternative (WCAG 1.2.1). Required when `recording` is set. */
  readonly recordingDescription?: string;
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
  /** One line under the Journey branch label, at most 12 words (`docs/voice.md`
   *  rule 4). Required on every drawn entry, never indexed by the chat, and it
   *  holds a figure only if the same entry's `impact`, `context` or `built`
   *  holds it. */
  readonly headline?: string;
  readonly locationOrMode: Maybe<string>;
  readonly context: string;
  readonly responsibilities: readonly string[];
  readonly built: readonly string[];
  readonly impact: readonly string[];
  readonly learned: Maybe<string>;
  readonly technologies: readonly string[];
  readonly link?: ProjectLink;
  /** Same contract as `Project.recording`: `public/media/<id>.mp4` and `.jpg`, loaded only on request. */
  readonly recording?: string;
  /** Same contract as `Project.recordingDescription`: required when `recording` is set. */
  readonly recordingDescription?: string;
  /** One of the five pressed on the Record's left page. An editorial call,
   *  never computed (spec §5); `tests/lib/record.test.ts` holds it to five. */
  readonly featured?: true;
  /** The award's own image, opened from the entry's Diary page. */
  readonly award?: RecordImage;
  /** What the entry's Diary page adds to the facts above (round 23). Not
   *  indexed by the chat. */
  readonly diary?: DiaryNotes;
}

/**
 * The Diary's own notes on an entry. An entry with `bullets` has a page to
 * itself; one without shares a page with the others in its chapter that have
 * little to say (`diaryPages()` in `src/lib/record.ts`).
 *
 * Every figure in `bullets`, `highlight` and the figure's labels must also be
 * in the entry's own `impact`, `context` or `headline`
 * (`tests/lib/record.test.ts`), the rule `highlights` already follows.
 */
export interface DiaryNotes {
  /** The page's one or two sentences, when the entry's `context` is not them. */
  readonly blurb?: string;
  /** Two to four short lines of what happened. */
  readonly bullets?: readonly string[];
  /** One highlighted figure, for an entry the oak does not hang a tag for
   *  (the oak's own `highlights` entry wins when there is one). */
  readonly highlight?: { readonly value: string; readonly label: string };
  /** A small chart of the work, drawn from this data. */
  readonly figure?: DiaryFigure;
  /** A line for the sticky note. Drafted from facts already in the content
   *  layer; each is marked as a draft until the owner approves it. */
  readonly funFact?: string;
}

/** A drawing under `public/scenery/` that a Diary page can hold. */
export type DiaryDrawingName = "diary-selftaught" | "diary-cap" | "diary-podium";

export type DiaryFigure =
  /** Two bars. `value` is only the bar's relative length; the label is what
   *  the reader reads, and carries the figure. */
  | {
      readonly kind: "before-after";
      readonly caption: string;
      readonly before: { readonly label: string; readonly value: number };
      readonly after: { readonly label: string; readonly value: number };
    }
  /** Marks for a count: dots (`per` set, or twelve or fewer), else tally
   *  gates of five. */
  | { readonly kind: "count"; readonly caption: string; readonly total: number; readonly per?: number }
  | { readonly kind: "drawing"; readonly caption: string; readonly name: DiaryDrawingName };

/** A certificate or award image under `public/media/certificates/`, shown in a
 *  dialog only when asked for. `width`/`height` are the file's own. */
export interface RecordImage {
  readonly src: `/media/certificates/${string}.jpg`;
  readonly width: number;
  readonly height: number;
  /** What the image visibly says. */
  readonly alt: string;
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
  /** The platform it was issued through, when not the issuer itself. */
  readonly via?: string;
  readonly date: Maybe<string>;
  /** A postage stamp on the Diary. Only a certificate with an image has one. */
  readonly stamp?: {
    /** The issuer's short name, set large on the stamp. */
    readonly short: string;
    /** A line drawing of what the certificate was about, from
     *  `public/scenery/` (`stamp-<drawing>.svg`): a bank's columns, a card
     *  with a key, code brackets and a gear, a shopping cart. */
    readonly drawing: "bank" | "card" | "code" | "cart";
    readonly image: RecordImage;
  };
}

export interface Achievement {
  readonly id: string;
  readonly title: string;
  readonly context: string;
  readonly date: Maybe<string>;
  readonly note?: string;
}

/* -------------------------------------------------------------------------- */
/* Code highlighting                                                           */
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

/** One half of a tag on the Journey's oak. `name` is the tag's short name (the
 *  board's); `measure` the mono line under the value; `year` only when the
 *  figure belongs to a later year than the entry's start. Consecutive halves of
 *  one entry hang as one ticket. `projectId` sends the half to that case study
 *  instead of the entry's row (the case study renders inside the row). `value`,
 *  `measure` and `label` may hold a figure only if the entry's `headline` or
 *  `impact` holds it too (`tests/lib/highlights.test.ts`). */
export interface Highlight {
  readonly entryId: string;
  readonly name: string;
  readonly value: string;
  readonly label: string;
  readonly measure?: string;
  readonly year?: string;
  readonly projectId?: string;
}

/** The Diary's authored lines (`record` in the content layer: the section's
 *  id is `record` still). Not indexed. */
export interface RecordCopy {
  /** The section's visible name. */
  readonly name: string;
  readonly pressed: { readonly heading: string; readonly lead: string; readonly slice: string };
  readonly contents: { readonly heading: string; readonly note: string };
  readonly certificates: string;
  /** The sticky note's label. */
  readonly funFactLabel: string;
  /** The book's accessible name, and the index tabs'. */
  readonly bookLabel: string;
  readonly tabsLabel: string;
  readonly vignette: { readonly morning: string; readonly evening: string };
}

/** The Journey's authored lines (`journey` in the content layer). Not indexed. */
export interface JourneyCopy {
  readonly heading: string;
  readonly lead: string;
  readonly watch: string;
  /** The same button while the show plays: it ends the show. */
  readonly skip: string;
  readonly tagsLabel: string;
  readonly vignette: { readonly morning: string; readonly evening: string };
  /** Bé Nhi on the oak's swing; the same drawing walks with mini-Thien. */
  readonly swing: {
    readonly name: string;
    /** What pressing her does, after her name: "Bé Nhi, change her mood". */
    readonly action: string;
    readonly moods: Readonly<Record<NhiMood, { readonly says: string; readonly is: string }>>;
  };
}

/** Bé Nhi's faces (`MiniNhi.tsx`), each from a photo of her. */
export type NhiMood = "pout" | "grin" | "huh" | "sleepy" | "hug";
