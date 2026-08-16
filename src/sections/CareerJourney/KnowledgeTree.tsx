import { Disclosure } from "@/components/ui/Disclosure";
import { Tag } from "@/components/ui/Tag";
import { buildKnowledgeTree, totalTechnologies } from "@/lib/knowledge-tree";

/**
 * How the skills connect to the places they were used.
 *
 * The timeline above answers "when"; this answers "what does any of it add up
 * to". Four levels, each an authored fact rather than an inference:
 *
 *   root    the five lenses — the kinds of work he claims
 *   branch  the role or project tagged with that lens
 *   leaf    the technologies that role actually listed
 *
 * Drawn as a real nested list with connector lines in CSS rather than as an
 * SVG diagram. A hand-drawn diagram would look more like a "tree" and be
 * worse at every job that matters here: it would not reflow on a phone, it
 * would not be readable by a screen reader, and it could not be selected or
 * searched. A `<ul>` with rules drawn on it is a tree to the eye and a list to
 * everything else.
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
        How it maps together
      </h3>

      <p className="prose-measure mt-4 text-[length:var(--step-0)] leading-relaxed text-[color:var(--fg-muted)]">
        The same history, grouped by the kind of work rather than by date.{" "}
        {TREE.length} kinds, {TECHNOLOGY_TOTAL} distinct technologies, every branch tagged by hand
        rather than guessed — open one to see where it was actually used.
      </p>

      <ul className="mt-8 flex flex-col gap-3">
        {TREE.map((root, rootIndex) => (
          <li key={root.id} className="border border-[color:var(--rule-color)]">
            <Disclosure
              id={`tree-${root.id}`}
              defaultOpen={rootIndex === 0}
              expandLabel={`Show what sits under ${root.label}`}
              collapseLabel={`Hide what sits under ${root.label}`}
              className="px-4 sm:px-5"
              summary={
                <span className="flex flex-1 flex-col gap-1 py-3 text-left">
                  <span className="text-[length:var(--step-1)] text-[color:var(--fg)]">
                    {root.label}
                  </span>
                  <span className="text-[length:var(--step--1)] text-[color:var(--fg-muted)]">
                    {root.description}
                  </span>
                  <span className="eyebrow mt-1">
                    {root.branches.length} {root.branches.length === 1 ? "place" : "places"} ·{" "}
                    {root.technologyCount} technologies
                  </span>
                </span>
              }
            >
              {/* The tree proper. `border-l` on the list draws the trunk; each
                  item draws its own branch with a ::before rule, so the
                  connectors survive any amount of text reflow. */}
              <ul className="mb-5 ml-1 flex flex-col gap-5 border-l border-[color:var(--rule-color)] pl-5">
                {root.branches.map((branch) => (
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
    </section>
  );
}
