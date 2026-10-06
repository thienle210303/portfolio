/**
 * Hero — id="about", the page's single <h1>, and the only section anywhere on
 * the site allowed a viewport-height unit (SECTIONS.md §1). Server Component:
 * HeroCodeArtifact's only interactive piece is the shared Tabs primitive,
 * which supplies its own "use client" boundary, so nothing here needs one.
 *
 * The height floor and vertical centring live on a wrapper inside Section's
 * children slot; Section's bottom padding is overridden through its
 * `className` (as Closing.tsx does) to 0.6x, and the floor subtracts the
 * sticky header and that padding (1x top, 0.6x bottom) from `100svh` rather
 * than ignoring them. It is a floor, not a cap, so a fold whose content is
 * taller simply grows. It is `svh`, not `vh`, per SPEC §3.
 *
 * The top padding stays at 1x on purpose. At 390px the first screen ends in
 * the seam between the last About paragraph and the code artifact, and the
 * cats come to rest there on load; trimming the top padding moved the seam up
 * 22px so that it no longer held a cat, and one stopped with its head on the
 * paragraph (e2e/companion.spec.ts, "neither cat comes to rest on the hero's
 * text").
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
 * Round 18 (Plan B) merged the About band that used to sit below the fold
 * into it, so About is one layout rather than two: there is no second band.
 * "One fold" means that, not one screen tall — the `min-h` above is a floor,
 * and with the About paragraphs in the identity column the fold runs past
 * the first screen. At >=1360px, where identity and code sit side by side,
 * the opening argument lands in the first screen: the <h1>, the positioning
 * line, the Kiên Giang paragraph and the code artifact (checked at 1360×900
 * and 1440×900). Below 1360px the code artifact stacks after the paragraphs,
 * so the first screen holds the <h1>, the positioning line and the Kiên Giang
 * paragraph, and the code starts below it (measured on a production build: at
 * 1280×800 its top is at 896px; at 1024×768, 870px). The band's computed
 * counts and its lens list were dropped rather than moved here — the Journey already draws the career they counted.
 */
import { Section, type RailNote } from "@/components/ui/Section";
import { profile } from "@/content/portfolio";
import { resolved } from "@/types/portfolio";
import HeroIdentity from "./HeroIdentity";
import HeroCodeArtifact from "./HeroCodeArtifact";

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
        The floor subtracts the sticky header and this section's own block
        padding (1 x --section-y above, 0.6 x below, the latter set on <Section>
        above), which a flat `100svh` would not: those stack, and the hero
        would reserve a full viewport plus the chrome and padding, then centre
        inside it.
      */}
      <div className="flex min-h-[calc(100svh-var(--header-h)-var(--section-y)*1.6)] flex-col justify-center">
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
        <div className="flex flex-col gap-y-10 min-[1360px]:grid min-[1360px]:grid-cols-[minmax(0,5.25fr)_1px_minmax(0,6.75fr)] min-[1360px]:items-stretch min-[1360px]:gap-x-10 min-[1360px]:gap-y-0">
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
          className="mt-8 flex items-center gap-3"
        >
          <span aria-hidden="true" className="h-px w-10 bg-[color:var(--rule-color)]" />
          <span className="eyebrow">Scroll</span>
        </div>
      </div>
    </Section>
  );
}
