import { skillCategories } from "@/content/portfolio";
import { cn } from "@/lib/cn";
import { CROSS_LINK_CLASS } from "./cross-link";

/**
 * The major roots, named: one label per authored skill category, each linking
 * to that category's own entry in the Skills inventory.
 *
 * ## Labels only — and why there is deliberately no line drawn from one
 *
 * A root labelled "Languages" says *this is part of what the whole tree
 * stands on*, which is true of every branch above it and is the only claim
 * the content layer supports. A line from that root up to a bough, or to a
 * career entry, would say something else entirely: that this skill category
 * produced that piece of work — and nobody ever authored that edge. The two
 * vocabularies do not even join: of 38 skills only 17 match a technology
 * string exactly, so a fuzzy connector would invent relationships and an
 * exact one would claim real skills were never used (see the header of
 * `src/lib/knowledge-tree.ts`, and `tests/lib/knowledge-tree.test.ts`, which
 * holds that line). Everything drawn above ground comes from a career entry's
 * own `technologies` and `impact`, which are fields a human sets. The roots
 * are the one part of the figure that is argument rather than data, and
 * naming them is as far as that argument is allowed to go.
 *
 * So: no connector, no proximity trick that reaches *above* ground, and no
 * ordering that pairs the nth label with the nth branch.
 *
 * ### Round 12 — the fact line retires along with the lenses
 *
 * Through round 11 each root also carried a "Feeds …" line, built from
 * `skillCategories[].lenses` — a second authored edge set, category → lens,
 * naming which of the five resume-lens branches that skill group showed up
 * in. Round 12 retires the lens branches from the drawing entirely (see the
 * header of `src/lib/knowledge-tree.ts`), which leaves that edge with no
 * target left to name: there is no longer a lens panel for "Languages" to
 * say it feeds. Rather than repoint it at something nobody authored — a
 * career entry, say, which would be exactly the fuzzy skill/technology join
 * this file has refused from the start — the line is simply gone. A root is
 * now a name and a link, nothing more: honest about being one part of the
 * foundation, and silent about which branch above it that foundation
 * actually reaches, because no one ever said.
 *
 * At >=1024px each label sits directly under its own root's tip (see
 * `rootTipX` in `DrawnTree.tsx`) rather than in a caption row below all of
 * them — the owner asked for roots that read as roots, not as a legend. That
 * still is not a connector, and it is worth being precise about why: the
 * position a label sits at is the *root's*, and every root here starts from
 * the one shared taproot every branch ultimately stands on — there is no
 * per-branch root to sit a label near even if the drawing wanted to draw one.
 * Placing "Languages" under the third root from the left says the same thing
 * sitting it in a centred row said: this is one of the things the whole tree
 * grows from. It does not say which bough is above it — the columns of
 * category names and the columns of career-entry boughs are laid out by two
 * completely independent functions (`rootTipX` here, `placements()` in
 * `DrawnTree.tsx`) over two differently-ordered, differently-sized arrays
 * (`skillCategories`, six entries; `tree`, fourteen), and nothing anywhere
 * lines the nth one of each up on purpose. A label two columns from centre
 * under a root is not "attached to" whatever happens to be two columns from
 * centre in the canopy above it.
 *
 * ## Two presentations, matching the rest of the figure
 *
 * The root *drawing* is desktop-only, like the rest of the drawn tree, so
 * below 1024px there is no root to sit a label near — the honest fallback
 * there is the caption row this always used to be, and that is what renders.
 * At >=1024px the columns below replace it, one per category, each centred
 * on the same x its root's tip lands on. Exactly one of the two is ever in
 * the accessibility tree at a time (`lg:hidden` / `hidden lg:grid`), the same
 * rule `KnowledgeTree.tsx` holds the rest of the figure to: neither
 * presentation may hold a fact, or a link, the other does not.
 *
 * Both presentations live in this one component, which stays the last thing
 * in the figure's DOM in both — see `KnowledgeTree.tsx` for why that is what
 * keeps tab order matching reading order regardless of which presentation is
 * showing.
 *
 * `data-tree-root` is still read by the cross-highlight island in
 * `TreeFigure.tsx`: hovering or focusing a root brightens itself and its own
 * lateral root underground (`data-tree-lateral` in `DrawnTree.tsx`'s
 * `RootSystem`) — the one thing about a root the drawing can honestly claim,
 * now that there is nothing above ground left to say it feeds.
 */
export function RootLabels({ className }: { readonly className?: string }) {
  if (skillCategories.length === 0) return null;

  return (
    <div className={cn("border-t border-rule pt-5 lg:border-t-0 lg:pt-3", className)}>
      <p className="eyebrow lg:text-center">Foundations</p>

      {/* Below 1024px: the tree is the disclosure list, not a drawing, so
          there is no root tip to sit a label under. The caption row this
          always was. */}
      <ul
        role="list"
        aria-label="Skill groups this rests on"
        className="mt-2 flex flex-wrap gap-x-7 gap-y-2 lg:hidden"
      >
        {skillCategories.map((category) => (
          <li key={category.id} data-tree-root={category.id}>
            <a href={`#skills-${category.id}`} className={cn(CROSS_LINK_CLASS, "wrap-anywhere")}>
              {category.label}
            </a>
            <span className="mt-0.5 block text-[length:var(--step--1)] leading-snug text-fg-muted">
              {category.skills.length} {category.skills.length === 1 ? "skill" : "skills"}
            </span>
          </li>
        ))}
      </ul>

      {/* >=1024px: one column per category, in `skillCategories`' own order —
          `rootTipX(index, count)` in DrawnTree.tsx centres root `index` of
          `count` on the same fraction an equal-width grid column `index` of
          `count` centres on, so this needs no shared prop or import to land
          under the root it names; it only needs the same count. Column
          gutters keep two long neighbouring names from touching; the leader
          tick is decoration, `aria-hidden`, standing in for "this belongs to
          the root just above it" without becoming a connector. */}
      <ul
        role="list"
        aria-label="Skill groups this rests on"
        className="hidden lg:grid lg:gap-x-3"
        style={{ gridTemplateColumns: `repeat(${skillCategories.length}, minmax(0, 1fr))` }}
      >
        {skillCategories.map((category) => (
          <li
            key={category.id}
            data-tree-root={category.id}
            className="flex flex-col items-center"
          >
            <span aria-hidden="true" className="block h-2 w-px border-l border-rule" />
            <a
              href={`#skills-${category.id}`}
              className={cn(
                CROSS_LINK_CLASS,
                "wrap-anywhere mt-1 min-w-0 text-center leading-tight",
              )}
            >
              {category.label}
            </a>
            <span className="mt-0.5 block max-w-[16ch] text-center text-[length:var(--step--1)] leading-snug text-fg-muted">
              {category.skills.length} {category.skills.length === 1 ? "skill" : "skills"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default RootLabels;
