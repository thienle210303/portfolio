/**
 * Shared types for the site guide — the margin creature and its panel.
 *
 * Design rule that shapes every type here: the guide never generates prose.
 * A `GuideEntry.quote` is a verbatim string lifted from `src/content/**`, and
 * the UI renders it as a quotation. There is deliberately no field for
 * "answer" or "summary", because there is no code path that would produce
 * one. That is what makes the feature safe to point at a résumé.
 */

/**
 * Something the guide can actually do. Every variant maps onto a control a
 * visitor could already operate by hand, which is the whole safety argument:
 * the guide is a search-and-navigate front end for existing UI, never a
 * privileged actor. Adding a variant here means adding a real affordance.
 */
export type GuideAction =
  | { readonly kind: "goto"; readonly sectionId: string }
  /** Applies one of the résumé explorer's existing lens filters, then goes there. */
  | { readonly kind: "resume-lens"; readonly lensId: string }
  | { readonly kind: "copy-email" }
  | { readonly kind: "print-resume" }
  | { readonly kind: "download-resume" };

/**
 * `content` entries are prose to be quoted and navigated to. `command`
 * entries are the toolkit — they *do* something on activation. The
 * distinction drives ranking (see match.ts) and the panel's labelling.
 */
export type GuideEntryKind = "content" | "command";

export interface GuideEntry {
  readonly id: string;
  readonly kind: GuideEntryKind;
  /** Provenance shown above the quote, e.g. "Selected work". Never invented. */
  readonly source: string;
  readonly title: string;
  /**
   * Verbatim prose from the content layer. For `command` entries this is a
   * plain description of what activating it does — still authored, never
   * generated at runtime.
   */
  readonly quote: string;
  /**
   * Extra search terms that are true of the entry but absent from its prose
   * — technology names, section synonyms. Kept separate from `quote` so the
   * displayed text is never padded with keywords.
   */
  readonly keywords: readonly string[];
  /**
   * Score multiplier, defaulting to 1 when absent.
   *
   * Some passages are simply better answers than others about the same
   * subject: a project's tagline summarises it, while "— a decision" is one
   * fragment of its detail. Both match the query "scrapers" identically on
   * word overlap, so without this the tiebreak is alphabetical and the
   * headline loses to its own footnotes. Set above 1 for the entry that best
   * *introduces* a subject, and leave it unset everywhere else.
   */
  readonly weight?: number;
  readonly action: GuideAction;
}

export interface GuideIndex {
  /**
   * Content fingerprint — a cheap way for a consumer to tell whether the index
   * it holds is still the current one. Nothing in the shipped guide depends on
   * it today (it was the cache key for a since-removed embedding model), but it
   * costs eight characters and it is the natural hook for any future artifact
   * that must be invalidated alongside the content.
   */
  readonly revision: string;
  readonly entries: readonly GuideEntry[];
}

/** One scored search hit. `score` is only meaningful relative to its siblings. */
export interface GuideHit {
  readonly entry: GuideEntry;
  readonly score: number;
}

/** Which retrieval path produced the current results. Surfaced in the UI so a
 *  visitor always knows whether a model is running. */
export type GuideMode = "lexical" | "semantic";
