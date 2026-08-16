/**
 * Hero — id="about", tone ink, the page's single <h1>, and the only section
 * in the whole site allowed a viewport-height unit (SECTIONS.md §1). Server
 * Component: HeroCodeArtifact's only interactive piece is the shared Tabs
 * primitive, which already supplies its own "use client" boundary, so
 * nothing here needs one.
 *
 * `Section` (src/components/ui/Section.tsx) has a fixed prop surface with no
 * `className` passthrough on the `<section>` it renders, so the
 * `min-height: 100svh` floor and vertical centring live on a wrapper
 * rendered inside its `.shell` children slot instead. Section's own
 * `py-[var(--section-y)]` block padding stacks on top of that floor, so the
 * section's real rendered height is always >= 100svh, never less — this is
 * the only viewport-height unit anywhere on the site, and it is `svh`, not
 * `vh`, per SPEC §3.
 *
 * Desktop (>=1024px): an asymmetrical 7/5 split — identity left, a 1px
 * hairline rule, code artifact right — via an explicit 3-column grid so the
 * ratio is exact rather than approximated with flex-basis percentages.
 * Below 1024px the grid utilities never apply, so the three children
 * (identity, the hidden divider, the code artifact) simply stack as a
 * single flex column in source order: nothing is hidden, only reflowed.
 */
import { Section } from "@/components/ui/Section";
import HeroIdentity from "./HeroIdentity";
import HeroCodeArtifact from "./HeroCodeArtifact";

const HEADING_ID = "hero-heading";

export default function Hero() {
  return (
    <Section id="about" labelledBy={HEADING_ID} tone="ink">
      <div className="flex min-h-[100svh] flex-col justify-center">
        <div className="flex flex-col gap-y-16 lg:grid lg:grid-cols-[minmax(0,7fr)_1px_minmax(0,5fr)] lg:items-stretch lg:gap-x-10 lg:gap-y-0">
          <div className="min-w-0">
            <HeroIdentity headingId={HEADING_ID} />
          </div>

          <div aria-hidden="true" className="hidden bg-[color:var(--rule-color)] lg:block" />

          <div className="min-w-0">
            <HeroCodeArtifact />
          </div>
        </div>

        <div className="mt-16 flex items-center gap-3 lg:mt-24">
          <span aria-hidden="true" className="h-px w-10 bg-[color:var(--rule-color)]" />
          <span className="eyebrow">Scroll</span>
        </div>
      </div>
    </Section>
  );
}
