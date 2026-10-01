import { Disclosure } from "@/components/ui/Disclosure";
import { projects } from "@/content/portfolio";
import { cn } from "@/lib/cn";
import { techSlug, type TreeBranch } from "@/lib/knowledge-tree";
import CaseStudy from "./CaseStudy";
import { EntryInk, ListGrowingTip, ListTrunk } from "./list-ink";
import { drawnSiblings, KIND_LABEL, siblingsLabel } from "./tree-labels";

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
 *
 * Round 13 gives this list its own ink: a drawn trunk down the left margin
 * (`ListTrunk`), a curved bough per row (`EntryInk`), and a small "still
 * growing" tip at the newest end (`ListGrowingTip`) — see `list-ink.tsx` for
 * why all three are safe to describe as pure decoration. The list is
 * oldest-first, so the trunk's "ground" end is the top of this list, where
 * `KnowledgeTree.tsx`'s own root plaque sits just above it (see that file's
 * "Trunk stub" note) — the drawing here continues that same line down
 * through every row and past the last one, rather than starting a second,
 * disconnected trunk of its own.
 */
interface KnowledgeTreeListProps {
  readonly tree: readonly TreeBranch[];
  readonly className?: string;
}

export function KnowledgeTreeList({ tree, className }: KnowledgeTreeListProps) {
  return (
    <div className={cn("relative", className)}>
      <ListTrunk />
      <ul role="list" className="flex flex-col gap-3 pl-5">
        {tree.map((branch, branchIndex) => {
          const technologyLeaves = branch.leaves.filter((leaf) => leaf.kind === "technology");
          const impactLeaves = branch.leaves.filter((leaf) => leaf.kind === "impact");
          // A ring ticks the trunk wherever the year changes — including the
          // very first row, which starts the whole list's oldest ring.
          const showRing = branchIndex === 0 || branch.startYear !== tree[branchIndex - 1].startYear;
          const siblings = drawnSiblings(branch, tree);

          return (
            <li
              key={branch.id}
              data-tree-branch={branch.id}
              className="relative border border-rule"
            >
              {/* The bough joining this row to the trunk on its left,
                  replacing the old plain tick — see list-ink.tsx. */}
              <EntryInk seed={branch.id} showRing={showRing} />
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
                  {siblings.length > 0 ? (
                    <p className="text-[length:var(--step--1)] leading-relaxed text-[color:var(--fg-muted)]">
                      Ran alongside {siblingsLabel(siblings)}
                    </p>
                  ) : null}

                  {technologyLeaves.length > 0 ? (
                    <ul
                      role="list"
                      aria-label={`Technologies used — ${branch.label}`}
                      className="token-run"
                    >
                      {technologyLeaves.map((leaf) => (
                        <li key={leaf.text} data-tree-tech={techSlug(leaf.text)}>
                          {/* The text span stays the `<li>`'s first element
                              child: globals.css brightens
                              `[data-tree-tech][data-tree-hit] > span:first-child`
                              on cross-highlight, and that selector reaches one
                              level, not through a wrapper. */}
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

                  {/* The case studies built in this role, in full — the same
                      ones the drawing renders inside its own branch panels.
                      Only one of the two presentations is ever displayed. */}
                  {branch.caseStudies.map((caseStudy) => {
                    const project = projects.find((candidate) => candidate.id === caseStudy.id);
                    if (!project) return null;
                    return (
                      <CaseStudy
                        key={project.id}
                        project={project}
                        index={projects.indexOf(project)}
                        idScope="list"
                      />
                    );
                  })}
                </div>
              </Disclosure>
            </li>
          );
        })}
      </ul>
      {/* `ListGrowingTip` takes no argument and reads `careerYearSpan()`
          itself, so nothing here could crash on an empty `tree` even without
          this guard. It stays because an empty career section has nothing to
          be "still growing" — the tip would be asserting a fact about a list
          that does not exist. */}
      {tree.length > 0 ? <ListGrowingTip /> : null}
    </div>
  );
}

export default KnowledgeTreeList;
