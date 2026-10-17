/**
 * Hero — id="about", the page's single <h1>. Server Component:
 * HeroTerminal's only client pieces, the shared Tabs primitive and its
 * TypeOnce wrapper, supply their own "use client" boundaries, so nothing
 * here needs one.
 *
 * Section's bottom padding is overridden through its `className` to 0.6x.
 * There is no height floor: round 20 (spec §2) dropped the `100svh` one, so
 * the hero is exactly as tall as its content.
 *
 * The top padding stays at 1x on purpose. Before round 20's rescale, at
 * 390px the first screen ended in the seam between the last About paragraph
 * and the code artifact, and the cats came to rest there on load; trimming
 * the top padding moved the seam up 22px so that it no longer held a cat, and
 * one stopped with its head on the paragraph (e2e/companion.spec.ts, "neither
 * cat comes to rest on the hero's text").
 *
 * Layout, widest to narrowest — all reflow, nothing is ever hidden:
 *
 *   >=1360px  margin rail | identity | hairline | terminal
 *   >=1024px  margin rail | identity above terminal
 *    <1024px  identity, terminal, then the rail as endnotes
 *
 * The split's breakpoint and column ratio are explained at the point of use
 * below. The 1360px breakpoint is a holdover from before round 20's 1120px
 * content cap; Phase 3 should revisit it.
 *
 * Round 18 (Plan B) merged the About band that used to sit below the fold
 * into it, so About is one layout rather than two: there is no second band.
 * "One fold" means one layout, not one screen tall. The band's computed
 * counts and its lens list were dropped rather than moved here — the Journey already draws the career they counted.
 */
import { Section, type RailNote } from "@/components/ui/Section";
import { profile } from "@/content/portfolio";
import { resolved } from "@/types/portfolio";
import HeroIdentity from "./HeroIdentity";
import HeroTerminal from "./HeroTerminal";

const HEADING_ID = "hero-heading";

// `availability` is `Maybe<string>`: `resolved()` collapses an unset field or a
// `[NEEDS INPUT: ...]` marker to `undefined`, so it going back to unset drops
// its row here rather than printing a marker. The rail holds only facts the
// identity column does not say: the current role and location are already in
// the positioning line and the first About paragraph.
const availability = resolved(profile.availability);

// `focus` sits in the rail because the chat cites #about for it
// (answer-corpus.ts), so About has to print it, and the identity column is
// kept to the headline, the positioning line and the three About paragraphs.
const RAIL: readonly RailNote[] = [
  ...(availability ? [{ term: "Open to", detail: availability }] : []),
  { term: "Focus", detail: profile.focus },
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
      className="blueprint-grid pb-[calc(var(--section-y)*0.6)]"
      // The hero runs its own `data-motion` load choreography (P2) instead
      // of the generic scroll-triggered ink settle every other section gets
      // — see Section.tsx's own comment on this prop.
      reveal={false}
    >
      {/*
        1360px is a holdover. It was measured before round 20, when the
        content grew with the viewport: the margin rail spends a column, and
        the two content columns only got wide enough to be worth having at
        about 1360px. Since the 1120px content cap, the columns are the same
        ~416px at every width >=1360, so the breakpoint no longer buys
        width. Phase 3 should revisit it. Below 1360 the identity and the
        terminal stack in the remaining column.

        An even split. 5.25/6.75 once favoured the old code excerpts so their
        ~48-character lines would not wrap, but the panel wraps (`pre-wrap`) and round
        20's 1120px content cap leaves ~830px for both columns at every
        width >=1360: at 5.25/6.75 the identity column was 364px and the
        hero ran 864px tall at 1440×900; even, it is ~416px and ~813px (~821px
        once the headings went to Plex Sans 600).
      */}
      <div className="flex flex-col gap-y-10 min-[1360px]:grid min-[1360px]:grid-cols-[minmax(0,1fr)_1px_minmax(0,1fr)] min-[1360px]:items-stretch min-[1360px]:gap-x-10 min-[1360px]:gap-y-0">
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
