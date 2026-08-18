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
 * lens, or to a career entry would say something else entirely: that this
 * skill category produced that piece of work — and nobody ever authored that
 * edge. The two vocabularies do not even join: of 38 skills only 17 match a
 * technology string exactly, so a fuzzy connector would invent relationships
 * and an exact one would claim real skills were never used (see the header of
 * `src/lib/knowledge-tree.ts`, and `tests/lib/knowledge-tree.test.ts`, which
 * holds that line). Everything drawn above ground comes from `lenses` and
 * `technologies`, which are fields a human sets. The roots are the one part
 * of the figure that is argument rather than data, and naming them is as far
 * as that argument is allowed to go.
 *
 * So: no connector, no proximity trick, no ordering that pairs the nth label
 * with the nth branch. Six labels, one link each, pointing at the inventory
 * that does hold the detail.
 *
 * ## Why it renders at every width
 *
 * The root *drawing* is desktop-only, like the rest of the drawn tree. These
 * labels are not part of that drawing — they are content, and the two
 * presentations of this figure are held to the rule that neither may hold a
 * fact the other does not (see KnowledgeTree.tsx). So this block renders once,
 * in one place in the DOM, at every width: under the drawn roots at >=1024px,
 * and after the disclosure list below it.
 *
 * It is also the last thing in the figure's DOM, which is what lets the flex
 * `order` reshuffle above it stay honest — every focusable thing in this
 * figure is reached in the order it is seen, in both presentations.
 */
export function RootLabels({ className }: { readonly className?: string }) {
  if (skillCategories.length === 0) return null;

  return (
    <div className={cn("border-t border-rule pt-5 lg:border-t-0 lg:pt-3", className)}>
      <p className="eyebrow lg:text-center">Foundations</p>
      <ul
        role="list"
        aria-label="Skill groups this rests on"
        className="flex flex-wrap gap-x-7 lg:justify-center"
      >
        {skillCategories.map((category) => (
          <li key={category.id}>
            <a href={`#skills-${category.id}`} className={cn(CROSS_LINK_CLASS, "wrap-anywhere")}>
              {category.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default RootLabels;
