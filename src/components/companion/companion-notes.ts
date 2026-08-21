"use client";

import type { CompanionFacts } from "@/lib/companion-facts";

/**
 * Field notes: the ambient half of D5.
 *
 * A note is a short, `aria-hidden` aside that appears near the settled pair
 * once in a while, and it only ever says a fact the page already states
 * somewhere — the margin rail beside it, most of the time. It is decoration
 * exactly the way a scene is decoration: nothing here is announced to a
 * screen reader, nothing here is the only way to learn the fact it names, and
 * a note that cannot resolve one just does not appear. The tour (see
 * companion-tour.ts) is the accessible half of the same idea — one narrates
 * out loud on request, the other murmurs in passing.
 *
 * Kept to a pool of one line per section, because a companion with something
 * to say about every section *and* something new to say every time it says
 * it is a companion performing rather than living somewhere. One line, said
 * rarely, said the same way each time, reads as a note pinned to the margin.
 * Ten different ones would read as a script.
 */

/** How long a note stays on screen once it appears. */
export const NOTE_SHOW_MS = 7000;

/** The first note of a visit arrives sooner than the ones after it — a
 *  companion that waits a minute and a half to say its first word reads as
 *  having nothing to say, not as being restrained. */
export const NOTE_FIRST_DELAY_MS = 8000;

/** The gap between notes after the first, and the spread on top of it. Long
 *  enough that a note is a rare aside rather than a caption that follows the
 *  cats around. */
export const NOTE_GAP_MS = 75_000;
export const NOTE_GAP_SPREAD_MS = 60_000;

/** Even once the gap is up, a note only actually appears this often — the
 *  same shape the idle flourishes and the scenes use: a clock that makes
 *  something *possible*, and a roll that decides whether this is the time. */
export const NOTE_ODDS = 0.45;

/** Every note is short enough to read in the time it is on screen, and short
 *  enough that it can sit beside a cat without reading as a caption under it. */
export const NOTE_MAX_CHARS = 48;

/**
 * One line per section this module has an answer for. `null` for every other
 * section — including ones with no companion mood at all, and contact, whose
 * only fact worth murmuring (the email address) is already what the visitor
 * is looking at.
 *
 * Every string here is a template around a number `fieldNote` fills in from
 * `CompanionFacts`, never a number typed into the pool itself — the whole
 * point of D1 is that this file cannot drift from the rail beside it.
 */
function lineFor(section: string, facts: CompanionFacts): string | null {
  switch (section) {
    case "about":
      return facts.about.role && facts.about.organization
        ? `Now: ${facts.about.role}, ${facts.about.organization}`
        : null;
    case "philosophy":
      return `${facts.philosophy.principles} principles, one loop`;
    case "work":
      return `${facts.work.caseStudies} case studies · ${facts.work.sourcedMetrics} sourced figures`;
    case "journey":
      return `${facts.journey.entries} entries · ${facts.journey.work} work`;
    case "skills":
      return `${facts.skills.categories} categories · ${facts.skills.distinctSkills} skills`;
    case "tree":
      return `${facts.tree.branches} branches · ${facts.tree.leaves} leaves`;
    case "lab":
      return `${facts.lab.experiments} experiments · ${facts.lab.verified} verified`;
    default:
      return null;
  }
}

/**
 * A note for this section, or null for "say nothing" — which is also the
 * answer for a section with no line, and the caller cannot tell the
 * difference, which is deliberate: both are "nothing to show right now".
 *
 * `roll` is passed in rather than rolled here so the odds can be tested
 * without a random source in the module — the same shape `wanderCandidates`
 * and the scene weights use elsewhere in the companion.
 */
export function fieldNote(
  section: string | null,
  facts: CompanionFacts,
  roll: number,
): string | null {
  if (!section) return null;
  if (roll >= NOTE_ODDS) return null;
  const line = lineFor(section, facts);
  if (!line) return null;
  // A note that cannot fit its own budget is a bug in the pool above, not
  // something to truncate silently at runtime — but the runtime is the safer
  // place to catch it than a broken deploy, so it is dropped rather than cut.
  return line.length <= NOTE_MAX_CHARS ? line : null;
}

/** When the next note may appear, given when this one did (or, for the first
 *  one of the visit, given the moment the pair settled). */
export function nextNoteAt(now: number, first: boolean): number {
  if (first) return now + NOTE_FIRST_DELAY_MS;
  return now + NOTE_GAP_MS + Math.random() * NOTE_GAP_SPREAD_MS;
}
