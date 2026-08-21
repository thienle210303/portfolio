/**
 * Hero — id="about", the page's single <h1>, and the only section anywhere on
 * the site allowed a viewport-height unit (SECTIONS.md §1). Server Component:
 * HeroCodeArtifact's only interactive piece is the shared Tabs primitive,
 * which supplies its own "use client" boundary, so nothing here needs one.
 *
 * `Section` has a fixed prop surface with no `className` passthrough on the
 * `<section>` it renders, so the height floor and vertical centring live on a
 * wrapper inside its children slot instead. That wrapper subtracts the sticky
 * header and Section's own block padding from `100svh` rather than ignoring
 * them, so the hero occupies one screen instead of a screen plus chrome. It is
 * `svh`, not `vh`, per SPEC §3.
 *
 * Layout, widest to narrowest — all reflow, nothing is ever hidden:
 *
 *   >=1360px  margin rail | identity | hairline | code artifact
 *   >=1024px  margin rail | identity above code artifact
 *    <1024px  identity, code artifact, then the rail as endnotes
 *
 * The two magic numbers in the split are explained at the point of use below;
 * both come from measurement, not from the breakpoint scale.
 *
 * `HeroAbout` — the About paragraphs — renders below all of that, as a
 * sibling of the fold wrapper rather than inside it (FB-2). It used to sit at
 * the bottom of the identity column, where at >=1360px it was a lone narrow
 * stack beside a large empty area once the code artifact ended. Keeping it
 * outside the `min-h-[...svh]` wrapper matters: that wrapper is deliberately
 * budgeted to one screen, and About is meant to grow with its content rather
 * than fight that budget.
 */
import { Section, type RailNote } from "@/components/ui/Section";
import { careerEntries, profile } from "@/content/portfolio";
import HeroIdentity from "./HeroIdentity";
import HeroCodeArtifact from "./HeroCodeArtifact";
import HeroAbout from "./HeroAbout";

const HEADING_ID = "hero-heading";

// The current role is read from careerEntries — the same list the timeline and
// the résumé read — rather than restated here, so the hero cannot be the one
// place on the site still naming a former employer.
const currentRole = [...careerEntries]
  .filter((entry) => entry.type === "work")
  .sort((a, b) => (a.sortKey > b.sortKey ? -1 : 1))[0];

const RAIL: readonly RailNote[] = [
  ...(currentRole
    ? [{ term: "Now", detail: `${currentRole.role}, ${currentRole.organization}` }]
    : []),
  { term: "Holds", detail: profile.philosophy },
  { term: "Reach me", detail: profile.email },
];

export default function Hero() {
  return (
    <Section
      id="about"
      labelledBy={HEADING_ID}
      tone="base"
      rail={RAIL}
      className="blueprint-grid"
      // The hero runs its own `data-motion` load choreography (P2) instead
      // of the generic scroll-triggered ink settle every other section gets
      // — see Section.tsx's own comment on this prop.
      reveal={false}
    >
      {/*
        The floor subtracts the sticky header and this section's own block
        padding, which the old flat `100svh` did not. Those three stack, so the
        hero was reserving a full viewport *plus* ~380px of chrome and padding
        and then centring inside it — which is where the empty band under
        "Scroll" came from.
      */}
      <div className="flex min-h-[calc(100svh-var(--header-h)-var(--section-y)*2)] flex-col justify-center">
        {/*
          Two deliberate numbers here, both driven by measurement rather than
          by the breakpoint scale.

          1360px, not `lg` or `xl`: the margin rail already spends a column, so
          a three-column hero needs roughly 1360px before the two content
          columns are worth having. At 1024 the old `lg` split left the
          identity too narrow to set the headline and squeezed the code panel
          to ~200px, clipping every line; at 1280 it was still five lines and
          ~380px. Below 1360 the rail keeps its margin and identity/code stack
          in the remaining column, which is what already reads well at 1024.

          5.25/6.75 favouring the code, not the old 7/5 favouring the identity:
          the longest line in the artifact is ~48 monospace characters and
          needs ~494px of inner width. The identity column can give that up —
          prose reflows, a code line does not.
        */}
        <div className="flex flex-col gap-y-14 min-[1360px]:grid min-[1360px]:grid-cols-[minmax(0,5.25fr)_1px_minmax(0,6.75fr)] min-[1360px]:items-stretch min-[1360px]:gap-x-10 min-[1360px]:gap-y-0">
          <div className="min-w-0">
            <HeroIdentity headingId={HEADING_ID} />
          </div>

          {/*
            The divider draws itself in as the P2 sequence's "hairline"
            step, then — once at rest — reads as a measuring bar rather than
            a plain rule: `.relative` wraps a full-height 1px fill (the
            original line, now `data-hero-step="hairline"` so the keyframe in
            globals.css can grow it top-down) plus two short perpendicular
            end-ticks (Workstream 3, P5), `position: absolute` so they add
            no width to the 1px grid track and cost the two flanking columns
            nothing.
          */}
          <div aria-hidden="true" className="relative hidden min-[1360px]:block">
            <div
              data-hero-step="hairline"
              className="h-full w-full bg-[color:var(--rule-color)]"
            />
            <span className="absolute left-1/2 top-0 h-px w-[5px] -translate-x-1/2 bg-[color:var(--rule-color)]" />
            <span className="absolute bottom-0 left-1/2 h-px w-[5px] -translate-x-1/2 bg-[color:var(--rule-color)]" />
          </div>

          <div className="min-w-0">
            <HeroCodeArtifact />
          </div>
        </div>

        <div
          data-cat-perch=""
          data-hero-step="scroll"
          className="mt-14 flex items-center gap-3"
        >
          <span aria-hidden="true" className="h-px w-10 bg-[color:var(--rule-color)]" />
          <span className="eyebrow">Scroll</span>
        </div>
      </div>

      <HeroAbout />
    </Section>
  );
}
