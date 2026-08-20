import { profile } from "@/content/portfolio";
import { cn } from "@/lib/cn";
import { totalTechnologies, type TreeRoot } from "@/lib/knowledge-tree";
import { DrawnTree, GroundHatch, RootSystem } from "./DrawnTree";
import { KnowledgeTreeList } from "./KnowledgeTreeList";
import { RootLabels } from "./RootLabels";

/**
 * The career tree figure: how the skills connect to the places they were used.
 *
 * `CareerTree.tsx` is the section — the id, the eyebrow, the `<h2>`, the rail.
 * This is the figure inside it. It takes the built tree as a prop rather than
 * building its own, so the numbers in the rail and the numbers on the drawing
 * are the same call.
 *
 * Four levels, each an authored fact rather than an inference:
 *
 *   root    Thien himself — the name and philosophy already carried by
 *           `profile` elsewhere on the page, not retyped here
 *   branch  the five lenses — the kinds of work he claims (`TreeRoot` in
 *           src/lib/knowledge-tree.ts; called `lens` in this file, because
 *           here "root" means the actual root of the tree)
 *   leaf    the role or project tagged with that lens
 *   detail  what that entry listed: its dates, its technologies, its case
 *           studies — revealed by opening the leaf
 *
 * Under the plinth, `RootLabels` names the major roots with the authored skill
 * categories. Labels only: see that file for why no line is drawn from one of
 * them to anything above ground.
 *
 * See `src/lib/knowledge-tree.ts` for why every edge comes from `lenses` and
 * `technologies` rather than from matching skill names against technology
 * strings. Nothing in this file infers an edge; it only lays out the ones
 * `buildKnowledgeTree()` was given.
 *
 * ## One component, two presentations
 *
 * Below 1024px the tree is `KnowledgeTreeList` — the indented disclosure list
 * that has always been here. At 1024px and up it is `DrawnTree` — a genuinely
 * drawn tree with a tapering trunk, boughs carrying foliage, meandering twigs
 * and leaves, a ground line and a root system.
 *
 * The drawing is assembled from three exports of DrawnTree.tsx rather than
 * one, because the tree grows *through* the root panel: the canopy is above
 * it, the ground line is the panel's own top border, and the roots are below
 * it. `<DrawnTree>` renders everything above ground; `<GroundHatch>` hatches
 * the underside of that border from inside the panel; `<RootSystem>` follows
 * the panel. All three are `hidden lg:block`, so below 1024px the list
 * presentation is on its own with no fragment of a drawing left behind.
 *
 * They are two presentations of one dataset, and exactly one of them is ever
 * displayed. That matters more than it looks: `display: none` removes a
 * subtree from the accessibility tree and from the tab order together, so a
 * visitor at any width gets one complete tree rather than one tree and one
 * ghost of a tree. Neither presentation is `aria-hidden`, neither is a
 * "visual only" copy of the other, and neither holds a fact the other does
 * not — which is also why `RootLabels` sits outside both of them.
 *
 * The alternative — one markup structure reflowed by CSS alone — was tried
 * against the shape of the data and does not survive it. The list collapses
 * per lens; the drawing opens per leaf. Those are different controls with
 * different accessible names and different `aria-controls` targets, and a
 * media query cannot rewrite either.
 *
 * ## Why the root is shared rather than duplicated
 *
 * The root panel is rendered once, first in the DOM after the drawing, and
 * moved to the bottom of the drawing at >=1024px with flex `order`. It is the
 * one element here with no interactive content, which is what makes that
 * safe: `order` changes paint order, never tab order, so the reordering
 * cannot desynchronise focus from the page. Reading order is unchanged too —
 * the root introduces the tree in both presentations, it just also happens to
 * sit under it once there is a trunk to sit under.
 *
 * The same rule is what fixes the DOM order of everything else here. The two
 * blocks that *do* hold links — the list and the root labels — are last in the
 * DOM, in the order they are read on screen, in both presentations. Nothing
 * focusable is ever painted somewhere other than where it is tabbed to.
 *
 * `data-cat-nap` therefore stays on exactly one element, the same one it has
 * always been on: the root plinth below. It is a cross-component contract
 * (docs/feedback-tracker.md, FB-8): the companion cats watch for it and come
 * sleep beneath whatever carries it. This file only declares the attribute;
 * the listener lives in src/components/companion. The root stays a plain,
 * non-focusable block on purpose — it is context, not a control, so it gets
 * no tabindex and no role to fake one.
 */

const TECHNOLOGY_TOTAL = totalTechnologies();

interface KnowledgeTreeProps {
  readonly tree: readonly TreeRoot[];
  readonly className?: string;
}

export default function KnowledgeTree({ tree, className }: KnowledgeTreeProps) {
  if (tree.length === 0) return null;

  return (
    <div className={cn("relative flex flex-col", className)}>
      {/* The drawing. Hidden below 1024px, where its two half-width columns
          would be too narrow to set a role and an organisation in. */}
      <DrawnTree tree={tree} className="hidden lg:order-1 lg:block" />

      {/* The root: Thien himself, the foundation the branches grow out of.
          `profile.name` / `profile.philosophy` and the tree's own computed
          totals — never retyped here. Centred at >=1024px, where it becomes
          the plinth the trunk stands on — and its own top border becomes the
          ground line the trunk grows from, which is why `GroundHatch` only
          has to say which side of that line is earth. */}
      <div
        data-cat-nap
        className="relative order-1 border border-rule bg-surface px-5 py-6 sm:px-6 lg:order-2 lg:px-8 lg:py-8 lg:text-center"
      >
        <GroundHatch className="hidden lg:block" />
        <p className="eyebrow">Root</p>
        <p className="mt-2 font-display text-[length:var(--step-2)] tracking-[-0.01em] text-fg">
          {profile.name}
        </p>
        <p className="prose-measure mt-2 text-[length:var(--step-0)] italic leading-[1.5] text-fg-muted lg:mx-auto">
          {profile.philosophy}
        </p>
        <p className="eyebrow mt-4">
          {tree.length} kinds · {TECHNOLOGY_TOTAL} technologies
        </p>

        {/* Trunk stub: continues the spine from the root's own left edge
            down to where the list's `border-l` trunk picks it up below.
            Only in the list presentation — in the drawing the trunk arrives
            from above, into the top edge of this panel, and a stub below it
            would dangle into nothing. */}
        <span
          aria-hidden="true"
          className="absolute -bottom-6 left-0 h-6 w-px bg-rule lg:hidden"
        />
      </div>

      {/* The roots, below the plinth — the drawing's answer to the trunk
          and boughs above it, and the only part of the tree that is
          argument rather than data. Drawing-only, so it is hidden wherever
          the list presentation is showing. */}
      <RootSystem className="hidden lg:order-3 lg:block" />

      <KnowledgeTreeList tree={tree} className="order-2 mt-6 lg:hidden" />

      {/* Last in the DOM and last on screen in both presentations — see the
          note on focus order above. */}
      <RootLabels className="order-3 mt-8 lg:order-4 lg:mt-2" />
    </div>
  );
}
