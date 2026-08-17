/**
 * The About band: profile.about's three paragraphs, promoted out of the
 * identity column and given a composition that holds at full page width
 * (FB-2). It used to render at the bottom of `HeroIdentity`, where at
 * >=1360px that column is the narrower half of the hero's two-column grid —
 * the paragraphs sat alone with a large empty area beside them once the code
 * artifact ended.
 *
 * `Hero` renders this as a sibling *after* its viewport-height fold wrapper,
 * not inside it: the fold is the one place on the site allowed a `svh` unit
 * and is deliberately budgeted to one screen (see Hero.tsx), so a full-width
 * band that grows with content belongs after it, at natural height, still
 * inside the same `<Section id="about">` — the nav's "About" link still
 * targets the right id, and nothing about the section's heading contract
 * changes.
 *
 * Everything beside the paragraphs is a fact already true in the content
 * layer, computed here rather than retyped:
 *  - the five knowledge-tree lenses, via the same `buildKnowledgeTree` the
 *    Journey section's tree renders, each with the count of career entries
 *    tagged under it — proof the work spans more than one kind of problem,
 *    and a number that cannot drift from the tree because it's the same
 *    computation.
 *  - `profile.focus`, which names the actual areas of focus and isn't
 *    rendered anywhere else on the page. `profile.philosophy` is
 *    deliberately left out here — this section's own rail already carries
 *    it under "Holds", and the rail rule against restating a fact applies
 *    just as much to this band as to the rail itself.
 *  - role/organization/year counts, read directly off the `work` career
 *    entries the same way CareerJourney.tsx counts its own rail notes.
 *
 * No heading element. Hero owns the page's only <h1> and has nothing at <h2>
 * ahead of this band (every other section's <h2> comes from `SectionHeading`,
 * which the hero deliberately does not use), so an <h3> here would skip a
 * level and fail the document-wide heading-order check in
 * e2e/accessibility.spec.ts. The eyebrow below is a plain <p>, matching the
 * pattern this content already used inside HeroIdentity.
 */
import { careerEntries, profile } from "@/content/portfolio";
import { buildKnowledgeTree } from "@/lib/knowledge-tree";

const PROSE_CLASS =
  "prose-measure text-[length:var(--step-0)] leading-[1.6] text-[color:var(--fg-muted)]";

const LENSES = buildKnowledgeTree();

const workEntries = careerEntries.filter((entry) => entry.type === "work");

// Distinct employers among `work` entries only. Milestones and coursework
// often share an organisation with a role above them (USC appears under
// both), so counting every entry would inflate this past what "roles across
// organizations" is meant to claim.
const organizationCount = new Set(workEntries.map((entry) => entry.organization)).size;

// `sortKey` is `YYYY-MM[-x]` and sorts reverse-lexicographically — the same
// computation CareerJourney.tsx uses for its "From" rail note. Scoped to
// `work` entries so it stays paired with the role/organization counts above
// rather than reaching back to the 2021 start of the degree.
const earliestRoleYear = [...workEntries]
  .sort((a, b) => (a.sortKey > b.sortKey ? 1 : -1))[0]
  ?.sortKey.slice(0, 4);

export default function HeroAbout() {
  if (profile.about.length === 0) return null;

  return (
    <div className="mt-20 border-t border-[color:var(--rule-color)] pt-12 md:mt-24 md:pt-16">
      <p className="eyebrow">About</p>

      {/*
        2:1 fr ratio rather than a fixed sidebar width. This band sits beside
        the section's own margin rail (10rem + gap, from >=1024px), so a fixed
        facts column stacked on top of that squeezed the paragraph column hard
        right at 1024px. A proportional split scales with whatever room the
        rail actually leaves, and `prose-measure` below still caps the
        paragraphs long before the wide end of this range matters.
      */}
      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        {/* Primary reading column. Kept first in the DOM regardless of
            viewport, so keyboard and reading order both reach the actual
            substance before the supporting facts beside it. */}
        <div className="min-w-0 space-y-4">
          {profile.about.map((paragraph) => (
            <p key={paragraph} className={PROSE_CLASS}>
              {paragraph}
            </p>
          ))}
        </div>

        {/* Supporting column. Single column and second in source order below
            1024px, matching `.rail-layout`'s own breakpoint. */}
        <div className="min-w-0 space-y-8 border-t border-[color:var(--rule-color)] pt-8 lg:border-t-0 lg:border-l lg:pl-8 lg:pt-0">
          <div>
            <p className="eyebrow">Focus</p>
            <p className="mt-2 text-[length:var(--step--1)] leading-[1.6] text-[color:var(--fg-muted)]">
              {profile.focus}
            </p>
          </div>

          {workEntries.length > 0 ? (
            <div>
              <p className="eyebrow">By the numbers</p>
              <p className="mt-2 text-[length:var(--step--1)] leading-[1.6] text-[color:var(--fg-muted)]">
                {workEntries.length} {workEntries.length === 1 ? "role" : "roles"} ·{" "}
                {organizationCount} {organizationCount === 1 ? "organization" : "organizations"}
                {earliestRoleYear ? ` · since ${earliestRoleYear}` : ""}
              </p>
            </div>
          ) : null}

          {LENSES.length > 0 ? (
            <div>
              <p className="eyebrow">Where it shows up</p>
              <ul role="list" className="mt-3 flex flex-col gap-3">
                {LENSES.map((lens) => (
                  <li key={lens.id} className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block text-[length:var(--step--1)] text-[color:var(--fg)]">
                        {lens.label}
                      </span>
                      <span className="block text-[length:var(--step--1)] leading-[1.5] text-[color:var(--fg-muted)]">
                        {lens.description}
                      </span>
                    </span>
                    {/* Visible digit plus an sr-only expansion, matching the
                        "+N other places" pattern KnowledgeTree.tsx uses for
                        the same underlying count — `aria-label` on a bare,
                        roleless <span> is not reliably exposed by ATs. */}
                    <span className="shrink-0 font-mono text-[length:var(--step--1)] text-[color:var(--fg-subtle)]">
                      {lens.branches.length}
                      <span className="sr-only">
                        {" "}
                        {lens.branches.length === 1 ? "place" : "places"}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
