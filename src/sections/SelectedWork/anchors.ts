/**
 * The two identifiers the case-study row and the in-section index have to
 * agree on. They live here rather than in either component because a jump
 * link that disagrees with its target by one character fails silently — the
 * browser simply does nothing — and because the numeral shown in the index
 * must be the numeral printed on the row it points at.
 *
 * Derived from `project.id`, never authored: a project added to or removed
 * from `projects` renumbers everything without anyone editing a list.
 */

/**
 * Anchor id for a case study's `<article>`.
 *
 * Deliberately not `case-study-${id}`: `Disclosure` already derives
 * `case-study-${id}-trigger` and `case-study-${id}-panel` from that string
 * inside every row, and two id namespaces one suffix apart is how a duplicate
 * id gets shipped.
 */
export function caseStudyAnchorId(projectId: string): string {
  return `work-${projectId}`;
}

/** Two-digit index numeral, e.g. `03`. */
export function caseStudyNumeral(index: number): string {
  return String(index + 1).padStart(2, "0");
}
