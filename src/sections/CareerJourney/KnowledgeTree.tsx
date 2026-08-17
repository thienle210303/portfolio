import { Disclosure } from "@/components/ui/Disclosure";
import { Tag } from "@/components/ui/Tag";
import { profile } from "@/content/portfolio";
import { buildKnowledgeTree, totalTechnologies } from "@/lib/knowledge-tree";

/**
 * The career tree: how the skills connect to the places they were used.
 *
 * The timeline above answers "when"; this answers "what does any of it add up
 * to". Four levels, each an authored fact rather than an inference:
 *
 *   root    Thien himself — the name and philosophy already carried by
 *           `profile` elsewhere on the page, not retyped here
 *   lens    the five lenses — the kinds of work he claims (`TreeRoot` in
 *           src/lib/knowledge-tree.ts; renamed to `lens` in this file now
 *           that "root" means the actual root of the tree)
 *   branch  the role or project tagged with that lens
 *   leaf    the technologies that role actually listed
 *
 * Drawn as a real nested list with connector lines in CSS rather than as an
 * SVG diagram. A hand-drawn diagram would look more like a "tree" and be
 * worse at every job that matters here: it would not reflow on a phone, it
 * would not be readable by a screen reader, and it could not be selected or
 * searched. A `<ul>` with rules drawn on it is a tree to the eye and a list to
 * everything else. The root panel below follows the same rule — a bordered
 * block with a CSS-drawn trunk, not an image or an SVG node.
 *
 * Collapsed by default apart from the first, so the section opens as five
 * scannable headlines rather than a wall — the same summary-first shape the
 * case studies use.
 *
 * See `src/lib/knowledge-tree.ts` for why the edges come from `lenses` and
 * `technologies` rather than from matching skill names.
 */

const TREE = buildKnowledgeTree();
const TECHNOLOGY_TOTAL = totalTechnologies();

/** `work` reads as the spine of the tree; the rest are context. */
const KIND_LABEL: Record<string, string> = {
  work: "Role",
  learning: "Study",
  milestone: "Milestone",
};

export default function KnowledgeTree() {
  if (TREE.length === 0) return null;

  return (
    <section aria-labelledby="knowledge-tree-heading" className="mt-20 sm:mt-24">
      <h3
        id="knowledge-tree-heading"
        className="font-display text-[length:var(--step-3)] leading-tight tracking-[-0.01em] text-[color:var(--fg)]"
      >
        The career tree
      </h3>

      <p className="prose-measure mt-4 text-[length:var(--step-0)] leading-relaxed text-[color:var(--fg-muted)]">
        One root, grouped into the kind of work rather than by date — every branch tagged by hand
        rather than guessed. Open a lens to see where it was actually used.
      </p>

      <div className="relative mt-8">
        {/* The root: Thien himself, the foundation the five lenses grow out
            of. `profile.name` / `profile.philosophy` and the tree's own
            computed totals — never retyped here. `data-cat-nap` is a
            cross-component contract (see docs/feedback-tracker.md FB-8): the
            companion cats watch for it and come sleep beneath whatever
            element carries it. This file only declares the attribute; the
            listener lives in src/components/companion. Left a plain, non-
            focusable block on purpose — the root is decorative context, not
            an interactive control, so it gets no tabindex or role to fake one. */}
        <div data-cat-nap className="relative border border-rule bg-surface px-5 py-6 sm:px-6">
          <p className="eyebrow">Root</p>
          <p className="mt-2 font-display text-[length:var(--step-2)] tracking-[-0.01em] text-fg">
            {profile.name}
          </p>
          <p className="prose-measure mt-2 text-[length:var(--step-0)] italic leading-[1.5] text-fg-muted">
            {profile.philosophy}
          </p>
          <p className="eyebrow mt-4">
            {TREE.length} kinds · {TECHNOLOGY_TOTAL} technologies
          </p>

          {/* Trunk stub: continues the spine from the root's own left edge
              down to where the lens list's `border-l` trunk picks it up
              below — the exact border-drawn technique the branches already
              use, just one level up. No SVG. */}
          <span aria-hidden="true" className="absolute -bottom-6 left-0 h-6 w-px bg-rule" />
        </div>

        <ul className="mt-6 flex flex-col gap-3 border-l border-rule pl-5">
          {TREE.map((lens, lensIndex) => (
            <li key={lens.id} className="relative border border-rule">
              {/* Horizontal tick joining this lens to the trunk on its left,
                  same span-based rule the branches below use for theirs. */}
              <span aria-hidden="true" className="absolute -left-5 top-6 h-px w-4 bg-rule" />
              <Disclosure
                id={`tree-${lens.id}`}
                defaultOpen={lensIndex === 0}
                expandLabel={`Show what sits under ${lens.label}`}
                collapseLabel={`Hide what sits under ${lens.label}`}
                className="px-4 sm:px-5"
                summary={
                  <span className="flex flex-1 flex-col gap-1 py-3 text-left">
                    <span className="text-[length:var(--step-1)] text-[color:var(--fg)]">
                      {lens.label}
                    </span>
                    <span className="text-[length:var(--step--1)] text-[color:var(--fg-muted)]">
                      {lens.description}
                    </span>
                    <span className="eyebrow mt-1">
                      {lens.branches.length} {lens.branches.length === 1 ? "place" : "places"} ·{" "}
                      {lens.technologyCount} technologies
                    </span>
                  </span>
                }
              >
                {/* The tree proper. `border-l` on the list draws the trunk; each
                    item draws its own branch with a ::before rule, so the
                    connectors survive any amount of text reflow. */}
                <ul className="mb-5 ml-1 flex flex-col gap-5 border-l border-[color:var(--rule-color)] pl-5">
                  {lens.branches.map((branch) => (
                    <li key={branch.id} className="relative">
                      <span
                        aria-hidden="true"
                        className="absolute -left-5 top-3 h-px w-4 bg-[color:var(--rule-color)]"
                      />

                      <p className="text-[length:var(--step-0)] text-[color:var(--fg)]">
                        {branch.label}
                        {branch.organization ? (
                          <span className="text-[color:var(--fg-muted)]">
                            {" "}
                            · {branch.organization}
                          </span>
                        ) : null}
                      </p>
                      <p className="eyebrow mt-1">
                        {KIND_LABEL[branch.kind] ?? branch.kind} · {branch.dateRange}
                      </p>

                      {branch.caseStudies.length > 0 ? (
                        <p className="mt-2 text-[length:var(--step--1)] text-[color:var(--fg-muted)]">
                          Case {branch.caseStudies.length === 1 ? "study" : "studies"}:{" "}
                          <a
                            href="#work"
                            className="text-[color:var(--accent)] underline-offset-4 hover:underline"
                          >
                            {branch.caseStudies.join(", ")}
                          </a>
                        </p>
                      ) : null}

                      {branch.leaves.length > 0 ? (
                        <ul
                          aria-label={`Technologies used — ${branch.label}`}
                          className="mt-2.5 flex flex-wrap gap-2"
                        >
                          {branch.leaves.map((leaf) => (
                            <li key={leaf.name}>
                              <Tag>
                                <span className="wrap-anywhere">{leaf.name}</span>
                                {/* Recurrence is the whole point of a tree view:
                                    it is what shows a skill running through more
                                    than one branch instead of sitting in one. */}
                                {leaf.alsoUsedIn > 0 ? (
                                  <span className="text-[color:var(--accent)]">
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
                    </li>
                  ))}
                </ul>
              </Disclosure>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
