import { Disclosure } from "@/components/ui/Disclosure";
import { Tag } from "@/components/ui/Tag";
import { cn } from "@/lib/cn";
import type { TreeBranch, TreeRoot } from "@/lib/knowledge-tree";
import { KIND_LABEL } from "./tree-labels";

/**
 * The career tree, actually drawn — the presentation used at >=1024px, where
 * there is finally enough width to draw in. Same data, same authored edges,
 * same component boundary as the list in KnowledgeTreeList.tsx.
 *
 * ## What is drawn, and what draws it
 *
 *   trunk    one vertical hairline down the centre, rising out of the root
 *            panel below it (a CSS span, so it takes whatever height the
 *            content ends up needing — no measuring, no script)
 *   bough    one SVG curve per lens, alternating left and right off the
 *            trunk. A fixed 48x128px box with a viewBox to match, so the
 *            stroke is a true hairline and never distorts — its two ends are
 *            the trunk and the lens node's inner edge, both of which sit at
 *            fixed offsets either side of the grid's column gap, so the
 *            curve cannot drift away from what it joins at any width
 *   twig     the leaf list's own border, mirrored to the trunk-facing edge
 *   leaf     one career entry, a bordered node joined to its twig by a rule
 *
 * Nothing here measures the DOM or animates, so the drawing is complete in
 * the server-rendered HTML and stays correct through any amount of text
 * reflow, at any zoom, in either theme.
 *
 * ## Why the leaves alone are interactive
 *
 * A leaf is a `Disclosure` — the same component the case studies and the
 * timeline use, which is what buys correct `aria-expanded`/`aria-controls`
 * wiring, the collapsed subtree genuinely leaving the tab order, print
 * expansion and the reduced-motion path, without a second implementation of
 * any of it. The panel is an inline expansion directly after its trigger
 * rather than a floating popover: the detail is then reachable by pressing
 * Tab once, needs no focus trap and no Escape handler, and cannot be
 * positioned off the edge of a narrow column. The tree simply grows.
 *
 * Leaves open independently rather than as an accordion. One-at-a-time would
 * mean opening any leaf silently collapsed another somewhere else on the
 * drawing — a layout shift under the pointer, and a tree that can never be
 * read as a whole.
 *
 * Every connector is `aria-hidden`: to assistive technology this is a list of
 * five branches, each holding a list of the places tagged with it, which is
 * exactly what it is.
 */

interface DrawnTreeProps {
  readonly tree: readonly TreeRoot[];
  readonly className?: string;
}

/**
 * Half the column gap (`gap-x-24` = 6rem = 96px), which is exactly the
 * distance from the trunk — the centre line of that gap — to the near edge of
 * either column. The bough box is that wide, so its two ends land on the two
 * things it joins without either one being measured at runtime. Change the
 * gap and this must change with it.
 */
const BOUGH_W = 48;
const BOUGH_H = 128;

/** A single bough: leaves the trunk low, bends outward, and arrives level
 *  with the top of the lens node it feeds. Mirrored for left-hand branches. */
function Bough({ side }: { readonly side: "left" | "right" }) {
  const path =
    side === "right"
      ? `M0.5 ${BOUGH_H} C0.5 66, 8 8.5, ${BOUGH_W} 8.5`
      : `M${BOUGH_W - 0.5} ${BOUGH_H} C${BOUGH_W - 0.5} 66, ${BOUGH_W - 8} 8.5, 0 8.5`;

  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width={BOUGH_W}
      height={BOUGH_H}
      viewBox={`0 0 ${BOUGH_W} ${BOUGH_H}`}
      fill="none"
      className={cn(
        "pointer-events-none absolute top-0 text-rule",
        side === "right" ? "-left-12" : "-right-12",
      )}
    >
      <path d={path} stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

interface LeafProps {
  readonly branch: TreeBranch;
  readonly lens: TreeRoot;
  readonly side: "left" | "right";
}

/** One career entry hanging off its branch. Collapsed it carries the role and
 *  the organisation; opened it adds the dates, the technologies that entry
 *  actually listed and any case study built in it. */
function Leaf({ branch, lens, side }: LeafProps) {
  return (
    <li className="relative">
      {/* The stem joining this leaf to the twig. Same rule, mirrored, so a
          left-hand branch reads as a branch rather than as an outdented list. */}
      <span
        aria-hidden="true"
        className={cn("absolute top-7 h-px w-6 bg-rule", side === "right" ? "-left-6" : "-right-6")}
      />
      <Disclosure
        id={`tree-leaf-${lens.id}-${branch.id}`}
        className="border border-rule bg-surface px-3"
        // The lens is part of the hidden label, not decoration: the same entry
        // legitimately hangs off several branches, and without it five leaves
        // would announce under one identical name and open five regions that
        // are also identically named.
        expandLabel={`Show detail — ${lens.label}`}
        collapseLabel={`Hide detail — ${lens.label}`}
        // One line, not two: a leaf is the smallest node on the drawing, and
        // at twenty-five of them a second line costs the tree a screen of
        // height for information the panel is about to give anyway.
        summary={
          <span className="wrap-anywhere block text-left text-[length:var(--step-0)] leading-snug text-fg">
            {branch.label}
            {branch.organization ? (
              <span className="text-fg-muted"> · {branch.organization}</span>
            ) : null}
          </span>
        }
      >
        <div className="space-y-3 border-t border-rule pb-4 pt-3">
          <p className="eyebrow">
            {KIND_LABEL[branch.kind] ?? branch.kind} · {branch.dateRange}
          </p>

          {branch.caseStudies.length > 0 ? (
            <p className="text-[length:var(--step--1)] leading-relaxed text-fg-muted">
              Case {branch.caseStudies.length === 1 ? "study" : "studies"}:{" "}
              <a href="#work" className="text-accent underline-offset-4 hover:underline">
                {branch.caseStudies.join(", ")}
              </a>
            </p>
          ) : null}

          {branch.leaves.length > 0 ? (
            <ul
              role="list"
              aria-label={`Technologies used — ${branch.label}`}
              className="flex flex-wrap gap-2"
            >
              {branch.leaves.map((leaf) => (
                <li key={leaf.name}>
                  <Tag>
                    <span className="wrap-anywhere">{leaf.name}</span>
                    {leaf.alsoUsedIn > 0 ? (
                      <span className="text-accent">
                        +{leaf.alsoUsedIn}
                        <span className="sr-only">
                          {" "}
                          other {leaf.alsoUsedIn === 1 ? "place" : "places"} on this page
                        </span>
                      </span>
                    ) : null}
                  </Tag>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </Disclosure>
    </li>
  );
}

export function DrawnTree({ tree, className }: DrawnTreeProps) {
  return (
    <div className={cn("relative min-w-0 pb-20 pt-6", className)}>
      {/* The trunk. `inset-y-0` on a container whose bottom edge is the root
          panel's top edge, so the two meet without either one knowing the
          other's height. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-rule"
      />
      {/* The growing tip: a draughtsman's cap, so the trunk ends deliberately
          rather than looking cropped by the top of the box. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 h-px w-3 -translate-x-1/2 bg-rule"
      />

      {/*
        Two columns either side of the trunk, packed in explicit pairs.
        Alternating sides is what makes this a tree rather than an org-chart —
        every bough leaves the same trunk and none is subordinate to the one
        above it — but alternating down a single stack leaves the opposite
        half of every row empty, which cost this drawing an entire screen of
        blank paper per branch.

        So the pairs are placed outright: branch n takes row floor(n/2)+1, and
        the left column when n is even. Two boughs then leave the trunk at the
        same height as a fork, and a short branch beside a long one costs
        nothing. `items-start` keeps the short one at its fork rather than
        stretched down its neighbour's row.

        Left on even is not arbitrary — it is what keeps the drawing's reading
        order and its DOM order the same sequence. Laid out this way, going
        left to right and then down lands on the branches in exactly the order
        they are written, so a keyboard visitor's focus never jumps somewhere
        the eye has already been.

        Placed with `style` rather than utilities on purpose: the row index is
        computed, and Tailwind can only generate classes it can see written
        out in the source.
      */}
      <ul role="list" className="relative grid grid-cols-2 items-start gap-x-24 gap-y-16">
        {tree.map((lens, index) => {
          const side = index % 2 === 0 ? "left" : "right";

          return (
            <li
              key={lens.id}
              className="relative"
              style={{
                gridColumn: side === "left" ? 1 : 2,
                gridRow: Math.floor(index / 2) + 1,
              }}
            >
              <Bough side={side} />

              <div className="border border-rule bg-surface px-4 py-3">
                <p className="eyebrow">Branch</p>
                <h4 className="mt-1 font-display text-[length:var(--step-1)] font-normal leading-tight tracking-[-0.01em] text-fg">
                  {lens.label}
                </h4>
                <p className="mt-1.5 text-[length:var(--step--1)] leading-relaxed text-fg-muted">
                  {lens.description}
                </p>
                <p className="eyebrow mt-2">
                  {lens.branches.length} {lens.branches.length === 1 ? "place" : "places"} ·{" "}
                  {lens.technologyCount} technologies
                </p>
              </div>

              {/* The twig: the leaf list's own border, on whichever edge faces
                  the trunk, picking up exactly where the lens node's matching
                  edge stops. */}
              <ul
                role="list"
                aria-label={`Where ${lens.label} was used`}
                className={cn(
                  "flex flex-col gap-2 pt-6",
                  side === "right" ? "border-l border-rule pl-6" : "border-r border-rule pr-6",
                )}
              >
                {lens.branches.map((branch) => (
                  <Leaf key={branch.id} branch={branch} lens={lens} side={side} />
                ))}
              </ul>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default DrawnTree;
