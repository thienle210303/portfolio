import { Disclosure } from "@/components/ui/Disclosure";
import { Tag } from "@/components/ui/Tag";
import { cn } from "@/lib/cn";
import { techSlug, type TreeBranch } from "@/lib/knowledge-tree";
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
 * Round 12 flattens this list to match the drawing's own inversion: through
 * round 11 the outer `<ul>` was five resume lenses, each a `Disclosure`
 * holding the career entries tagged with it; a branch could legitimately
 * repeat under several lenses. Now the outer `<ul>` is the career entries
 * themselves, oldest first — matching `buildCareerTree()`'s own order, the
 * same "up the trunk, oldest lowest" chronology `DrawnTree.tsx` draws — each
 * appearing exactly once, and each its own `Disclosure` rather than a row
 * inside someone else's.
 *
 * Collapsed by default apart from the first (the *oldest* entry now, not an
 * arbitrary first lens), so the section opens as one scannable headline
 * rather than a wall — the same summary-first shape the case studies use.
 */
interface KnowledgeTreeListProps {
  readonly tree: readonly TreeBranch[];
  readonly className?: string;
}

export function KnowledgeTreeList({ tree, className }: KnowledgeTreeListProps) {
  return (
    <ul
      role="list"
      className={cn("flex flex-col gap-3 border-l border-rule pl-5", className)}
    >
      {tree.map((branch, branchIndex) => {
        const technologyLeaves = branch.leaves.filter((leaf) => leaf.kind === "technology");
        const impactLeaves = branch.leaves.filter((leaf) => leaf.kind === "impact");

        return (
          <li
            key={branch.id}
            data-tree-branch={branch.id}
            className="relative border border-rule"
          >
            {/* Horizontal tick joining this branch to the trunk on its left. */}
            <span aria-hidden="true" className="absolute -left-5 top-6 h-px w-4 bg-rule" />
            <Disclosure
              id={`tree-list-branch-${branch.id}`}
              defaultOpen={branchIndex === 0}
              expandLabel={`Show what ${branch.label}${branch.organization ? `, ${branch.organization}` : ""} involved`}
              collapseLabel={`Hide what ${branch.label}${branch.organization ? `, ${branch.organization}` : ""} involved`}
              className="px-4 sm:px-5"
              summary={
                <span className="flex flex-1 flex-col gap-1 py-3 text-left">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="text-[length:var(--step-1)] text-[color:var(--fg)]">
                      {branch.label}
                      {branch.organization ? (
                        <span className="text-[color:var(--fg-muted)]"> · {branch.organization}</span>
                      ) : null}
                    </span>
                    <span aria-hidden="true" className="eyebrow shrink-0">
                      {branch.startYear}
                    </span>
                  </span>
                  <span className="eyebrow mt-1">
                    {KIND_LABEL[branch.kind] ?? branch.kind} · {branch.dateRange}
                  </span>
                </span>
              }
            >
              <div className="mb-5 space-y-3 border-t border-rule pb-4 pt-3">
                {branch.caseStudies.length > 0 ? (
                  <p className="text-[length:var(--step--1)] leading-relaxed text-[color:var(--fg-muted)]">
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

                {technologyLeaves.length > 0 ? (
                  <ul
                    role="list"
                    aria-label={`Technologies used — ${branch.label}`}
                    className="flex flex-wrap gap-2"
                  >
                    {technologyLeaves.map((leaf) => (
                      <li key={leaf.text} data-tree-tech={techSlug(leaf.text)}>
                        <Tag>
                          <span className="wrap-anywhere">{leaf.text}</span>
                          {/* Recurrence is the whole point of a tree view: it
                              is what shows a technology running through more
                              than one branch instead of sitting in one. */}
                          {leaf.alsoUsedIn ? (
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

                {impactLeaves.length > 0 ? (
                  <ul
                    role="list"
                    aria-label={`Impact — ${branch.label}`}
                    className="space-y-1"
                  >
                    {impactLeaves.map((leaf) => (
                      <li
                        key={leaf.text}
                        className="text-[length:var(--step--1)] leading-relaxed text-[color:var(--fg-muted)]"
                      >
                        {leaf.text}
                      </li>
                    ))}
                  </ul>
                ) : null}

                <JourneyEntryCrossLink
                  entryId={branch.id}
                  label={branch.label}
                  organization={branch.organization}
                />
              </div>
            </Disclosure>
          </li>
        );
      })}
    </ul>
  );
}

export default KnowledgeTreeList;
