import { Disclosure } from "@/components/ui/Disclosure";
import { Tag } from "@/components/ui/Tag";
import { cn } from "@/lib/cn";
import { techSlug, type TreeRoot } from "@/lib/knowledge-tree";
import { caseStudyAnchorId } from "@/sections/SelectedWork/anchors";
import { JourneyEntryCrossLink } from "./cross-link";
import { KIND_LABEL } from "./tree-labels";

/**
 * The career tree as an indented disclosure list — the presentation used
 * below 1024px, and the one that has always been here.
 *
 * It is not a fallback in the "degraded" sense. A `<ul>` with rules drawn on
 * it is a tree to the eye and a list to everything else: it reflows to any
 * width, it is selectable and searchable, and a screen reader gets real
 * nesting rather than a picture. The drawn presentation in DrawnTree.tsx is
 * the same data with the same authored edges, laid out as an actual drawing
 * once there is width to draw in — see KnowledgeTree.tsx for why both exist
 * and how only one is ever exposed at a time.
 *
 * Collapsed by default apart from the first, so the section opens as five
 * scannable headlines rather than a wall — the same summary-first shape the
 * case studies use.
 */
interface KnowledgeTreeListProps {
  readonly tree: readonly TreeRoot[];
  readonly className?: string;
}

export function KnowledgeTreeList({ tree, className }: KnowledgeTreeListProps) {
  return (
    <ul
      role="list"
      className={cn("flex flex-col gap-3 border-l border-rule pl-5", className)}
    >
      {tree.map((lens, lensIndex) => (
        <li key={lens.id} data-tree-lens={lens.id} className="relative border border-rule">
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
                item draws its own branch with a rule span, so the connectors
                survive any amount of text reflow. */}
            <ul
              role="list"
              className="mb-5 ml-1 flex flex-col gap-5 border-l border-rule pl-5"
            >
              {lens.branches.map((branch) => (
                <li
                  key={branch.id}
                  className="relative"
                  data-tree-entry={branch.id}
                  data-tree-techs={branch.leaves.map((leaf) => techSlug(leaf.name)).join(" ")}
                >
                  <span aria-hidden="true" className="absolute -left-5 top-3 h-px w-4 bg-rule" />

                  <p className="text-[length:var(--step-0)] text-[color:var(--fg)]">
                    {branch.label}
                    {branch.organization ? (
                      <span className="text-[color:var(--fg-muted)]"> · {branch.organization}</span>
                    ) : null}
                  </p>
                  <p className="eyebrow mt-1">
                    {KIND_LABEL[branch.kind] ?? branch.kind} · {branch.dateRange}
                  </p>

                  {branch.caseStudies.length > 0 ? (
                    <p className="mt-2 text-[length:var(--step--1)] text-[color:var(--fg-muted)]">
                      Case {branch.caseStudies.length === 1 ? "study" : "studies"}:{" "}
                      {branch.caseStudies.map((caseStudy, index) => (
                        <span key={caseStudy.id}>
                          {index > 0 ? ", " : ""}
                          <a
                            href={`#${caseStudyAnchorId(caseStudy.id)}`}
                            className="text-accent underline-offset-4 hover:underline"
                          >
                            {caseStudy.title}
                          </a>
                        </span>
                      ))}
                    </p>
                  ) : null}

                  {branch.leaves.length > 0 ? (
                    <ul
                      role="list"
                      aria-label={`Technologies used — ${branch.label}`}
                      className="mt-2.5 flex flex-wrap gap-2"
                    >
                      {branch.leaves.map((leaf) => (
                        <li key={leaf.name} data-tree-tech={techSlug(leaf.name)}>
                          <Tag>
                            <span className="wrap-anywhere">{leaf.name}</span>
                            {/* Recurrence is the whole point of a tree view:
                                it is what shows a skill running through more
                                than one branch instead of sitting in one. */}
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

                  {/* Same pointer the drawn presentation's leaves carry, so
                      neither presentation holds a route the other does not.
                      There is no per-leaf disclosure in this presentation —
                      the lens's own panel is what is open or closed — so this
                      sits in the branch row, which is already inside that
                      panel and already out of the tab order while the lens is
                      collapsed. */}
                  <JourneyEntryCrossLink
                    entryId={branch.id}
                    label={branch.label}
                    organization={branch.organization}
                    className="mt-1"
                  />
                </li>
              ))}
            </ul>
          </Disclosure>
        </li>
      ))}
    </ul>
  );
}

export default KnowledgeTreeList;
