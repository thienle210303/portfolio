/**
 * The cross-references between this section and the three it synthesises.
 *
 * The rule they follow: **one quiet link per direction, and no restated
 * facts.** Work, Journey and Skills each keep their own job — the case
 * studies, the chronology, the inventory — and the tree is the one place
 * they are shown as a single shape. So each of those three ends with one
 * pointer here (`TreeCrossLink`, below), the tree points back at Journey
 * once, its leaves already link to the case studies in `#work`, and its
 * roots link to the skill groups in `#skills`. Nothing anywhere explains the
 * relationship in prose; the link is the explanation.
 *
 * Rendered from one component in all three inbound places rather than typed
 * out three times: identical text pointing at an identical href is also the
 * correct accessibility answer — a screen-reader user listing the page's
 * links hears one repeated destination, not three differently-worded ones
 * that turn out to be the same place.
 *
 * `min-h-11` is not decoration either. These sit on their own line rather
 * than inside a sentence, so WCAG 2.2's target-size minimum (2.5.8) applies
 * to them in full; the site already sets 44px as its floor in the header,
 * the footer and every Disclosure trigger.
 */
export const CROSS_LINK_CLASS =
  "eyebrow inline-flex min-h-11 items-center text-accent underline-offset-4 hover:underline";

/** The pointer into the tree, rendered at the end of Work, Journey and
 *  Skills. Deliberately says nothing about *what* connects — the section it
 *  points at is where that is shown. */
export function TreeCrossLink() {
  return (
    <p className="mt-8">
      <a href="#tree" className={CROSS_LINK_CLASS}>
        See how this connects — the career tree
      </a>
    </p>
  );
}

export default TreeCrossLink;
