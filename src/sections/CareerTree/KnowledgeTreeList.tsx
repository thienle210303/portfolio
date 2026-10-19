import { projects } from "@/content/portfolio";
import { cn } from "@/lib/cn";
import type { TreeBranch } from "@/lib/knowledge-tree";
import { journeyEntryAnchorId } from "./anchors";
import CaseStudy from "./CaseStudy";
import { EntryInk, ListGrowingTip, ListTrunk } from "./list-ink";
import { TimelineAccordion, TimelineRow } from "./TimelineAccordion";
import { drawnSiblings, KIND_LABEL, siblingsLabel } from "./tree-labels";

/**
 * The Journey's timeline: one row per drawn career entry, oldest first, at
 * every width. Through round 19 this was the list shown below 1024px, beside a
 * drawing that held the same details behind its own branch clicks; round 20
 * retired the pinned stage and made this the one place those details live.
 *
 * A `<ul>` with rules drawn on it is a tree to the eye and a list to everything
 * else: it reflows to any width, it is selectable and searchable, and a screen
 * reader gets real nesting rather than a picture. Each row shows its year, role
 * · organisation and headline at rest (the headline is the `Disclosure`
 * `preview`, outside the trigger). Opening it shows "What it changed" (the
 * entry's impact lines, verbatim), the technology chips, the kind and dates,
 * which drawn branches ran alongside it, and every case study built in that
 * role, in full. One row is open at a time (`TimelineAccordion`), and none is
 * open at rest.
 *
 * The row owns the entry's `journey-entry-<id>` fragment, and its case studies
 * own `work-<projectId>`: the drawing above no longer renders either, so each
 * id is written once. `scroll-mt-20` lands a fragment clear of the sticky
 * header, the same offset `Section` uses.
 *
 * The ink — a trunk down the left margin (`ListTrunk`), a bough per row
 * (`EntryInk`) and a "still growing" tip at the newest end
 * (`ListGrowingTip`) — is pure decoration; see `list-ink.tsx`. The list is
 * oldest-first, so the trunk's "ground" end is the top of this list.
 */
interface KnowledgeTreeListProps {
  readonly tree: readonly TreeBranch[];
  readonly className?: string;
}

export function KnowledgeTreeList({ tree, className }: KnowledgeTreeListProps) {
  return (
    // Not `content-visibility: auto` (round 20 phase 5 tried it, at 1275px):
    // its height follows the rows' wrap, 1261px at 1024 to 1275px at 1440, so
    // the placeholder moved everything below it once it rendered. That gives
    // back its paint saving (R20-P5 measured ~85 ms of document paint without
    // the skip, ~50 ms with it, on the band above this one); the tree box's own far-off
    // skip (TreeBox.tsx) is separate and stays.
    <TimelineAccordion className={cn("relative", className)}>
      <ListTrunk />
      <ul role="list" className="flex flex-col gap-3 pl-5">
        {tree.map((branch, branchIndex) => {
          // A ring ticks the trunk wherever the year changes — including the
          // very first row, which starts the whole list's oldest ring.
          const showRing = branchIndex === 0 || branch.startYear !== tree[branchIndex - 1].startYear;
          const siblings = drawnSiblings(branch, tree);

          return (
            <li
              key={branch.id}
              id={journeyEntryAnchorId(branch.id)}
              data-tree-branch={branch.id}
              className="relative scroll-mt-20 border border-rule"
            >
              {/* The bough joining this row to the trunk on its left,
                  replacing the old plain tick — see list-ink.tsx. */}
              <EntryInk seed={branch.id} showRing={showRing} />
              <TimelineRow
                rowId={branch.id}
                id={`tree-list-branch-${branch.id}`}
                expandLabel={`Show what ${branch.label}${branch.organization ? `, ${branch.organization}` : ""} involved`}
                collapseLabel={`Hide what ${branch.label}${branch.organization ? `, ${branch.organization}` : ""} involved`}
                className="px-4 sm:px-5"
                preview={
                  branch.headline ? (
                    <p
                      data-tree-headline=""
                      className="pb-3 text-[length:var(--step--1)] leading-snug text-[color:var(--fg-muted)]"
                    >
                      {branch.headline}
                    </p>
                  ) : undefined
                }
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
                  </span>
                }
              >
                <div className="mb-5 space-y-3 border-t border-rule pb-4 pt-3">
                  {branch.impact.length > 0 ? (
                    <>
                      <p className="eyebrow" id={`tree-list-branch-${branch.id}-changed`}>
                        What it changed
                      </p>
                      <ul
                        role="list"
                        aria-labelledby={`tree-list-branch-${branch.id}-changed`}
                        className="space-y-1"
                      >
                        {branch.impact.map((line, index) => (
                          <li
                            key={index}
                            className="text-[length:var(--step--1)] leading-relaxed text-[color:var(--fg-muted)]"
                          >
                            {line}
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : null}

                  {branch.leaves.length > 0 ? (
                    <ul
                      role="list"
                      aria-label={`Technologies used — ${branch.label}`}
                      className="token-run"
                    >
                      {branch.leaves.map((leaf) => (
                        <li key={leaf.text}>
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

                  <p className="eyebrow">
                    {KIND_LABEL[branch.kind] ?? branch.kind} · {branch.dateRange}
                  </p>

                  {siblings.length > 0 ? (
                    <p className="text-[length:var(--step--1)] leading-relaxed text-[color:var(--fg-muted)]">
                      Ran alongside {siblingsLabel(siblings)}
                    </p>
                  ) : null}

                  {/* The case studies built in this role, in full. */}
                  {branch.caseStudies.map((caseStudy) => {
                    const project = projects.find((candidate) => candidate.id === caseStudy.id);
                    if (!project) return null;
                    return (
                      <CaseStudy
                        key={project.id}
                        project={project}
                        index={projects.indexOf(project)}
                      />
                    );
                  })}
                </div>
              </TimelineRow>
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
    </TimelineAccordion>
  );
}

export default KnowledgeTreeList;
