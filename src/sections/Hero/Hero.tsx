/**
 * Hero — id="about", the page's single <h1>. Server Component:
 * HeroTerminal's only client pieces, the shared Tabs primitive and its
 * TypeOnce wrapper, supply their own "use client" boundaries, so nothing
 * here needs one.
 *
 * Round 20 (spec §3), Hero A: identity beside the terminal at >=1024px,
 * identity above it below that — all reflow, nothing hidden. No margin rail.
 * Of what it held, `focus` is now the terminal's `whoami`, and the email and
 * `profile.philosophy` are on Contact's business card; `profile.availability`
 * is rendered nowhere on the page.
 *
 * Section's bottom padding is overridden through its `className` to 0.6x.
 * There is no height floor: round 20 (spec §2) dropped the `100svh` one, so
 * the hero is exactly as tall as its content. The top padding stays at 1x;
 * e2e/companion.spec.ts ("neither cat comes to rest on the hero's text")
 * holds that the cats' load rest does not land on the copy.
 */
import { Section } from "@/components/ui/Section";
import HeroIdentity from "./HeroIdentity";
import HeroTerminal from "./HeroTerminal";

const HEADING_ID = "hero-heading";

export default function Hero({ bookingUrl }: { readonly bookingUrl: string | null }) {
  return (
    <Section
      id="about"
      labelledBy={HEADING_ID}
      tone="base"
      className="blueprint-grid pb-[calc(var(--section-y)*0.6)]"
      // The hero runs its own `data-motion` load choreography (P2) instead
      // of the generic scroll-triggered ink settle every other section gets
      // — see Section.tsx's own comment on this prop.
      reveal={false}
    >
      {/* An even split inside the 1120px content cap. */}
      <div className="flex flex-col gap-y-10 lg:grid lg:grid-cols-2 lg:items-center lg:gap-x-(--gutter)">
        <div className="min-w-0">
          <HeroIdentity headingId={HEADING_ID} bookingUrl={bookingUrl} />
        </div>
        <div className="min-w-0">
          <HeroTerminal />
        </div>
      </div>

      <div
        data-cat-perch=""
        data-hero-step="scroll"
        className="mt-8 flex items-center gap-3"
      >
        <span aria-hidden="true" className="h-px w-10 bg-[color:var(--rule-color)]" />
        <span className="eyebrow">Scroll</span>
      </div>
    </Section>
  );
}
