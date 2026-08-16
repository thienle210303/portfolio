/**
 * The nine-step problem-solving loop, rendered as a real <ol> that reads
 * cleanly as a sequence in plain text: a screen reader gets "list, 9 items"
 * plus each step's label and detail, in document order. Sighted users
 * additionally get a hairline "flowing path" threading behind the steps —
 * horizontal on desktop, vertical on mobile.
 *
 * Both rails are `::before` / `::after` generated content on the <ol>
 * itself, not real DOM nodes: the HTML content model only allows <li> (and
 * script-supporting elements) as direct children of <ol>, so a sibling
 * <span> would be invalid markup and a hydration risk. Generated content
 * has no accessible text and is never exposed to assistive technology, so
 * it needs no explicit `aria-hidden` to stay decorative-only.
 *
 * Each rail is positioned with `inset-*` against the <ol>'s own box (never
 * a fixed pixel length or a JS-measured one), so there is nothing to break
 * or overflow at 320px or under 200% zoom — zooming just narrows the
 * effective CSS-pixel viewport, landing the layout in the same vertical
 * mode already true at 320px well before the `lg` breakpoint is reached.
 * Every numeral badge sits at `z-10` above the rail behind it, so the line
 * reads as passing through a sequence of beads, never across text.
 *
 * `bg-charcoal` on the numeral badge is the one deliberate raw-token use
 * here: Philosophy's <Section tone> is permanently "charcoal" (see
 * Philosophy.tsx), never `.on-light`, so the badge only ever has to
 * occlude that one fixed background — the same reasoning globals.css gives
 * for CodeBlock's fixed dark panel.
 */
import { cn } from "@/lib/cn";
import type { LoopStep } from "@/types/portfolio";

interface ProblemSolvingLoopProps {
  readonly steps: readonly LoopStep[];
}

const LABEL_ID = "philosophy-loop-label";

const OL_CLASS = cn(
  "relative mt-6 flex flex-col gap-8",
  "lg:flex-row lg:flex-nowrap lg:gap-x-6 lg:gap-y-0",
  // Vertical rail, below `lg`.
  "before:absolute before:inset-y-0 before:left-4 before:border-l before:border-[color:var(--rule-color)] before:content-['']",
  "lg:before:hidden",
  // Horizontal rail, `lg` and up.
  "lg:after:absolute lg:after:inset-x-0 lg:after:top-4 lg:after:border-t lg:after:border-[color:var(--rule-color)] lg:after:content-['']",
);

const LI_CLASS =
  "relative flex items-start gap-4 lg:min-w-0 lg:flex-1 lg:flex-col lg:items-stretch lg:gap-3";

const NUMERAL_CLASS =
  "relative z-10 flex h-8 w-8 flex-none items-center justify-center border border-[color:var(--rule-color)] bg-charcoal font-mono text-[length:var(--step--1)] text-[color:var(--fg-subtle)]";

export default function ProblemSolvingLoop({ steps }: ProblemSolvingLoopProps) {
  return (
    <div>
      <p id={LABEL_ID} className="eyebrow">
        The loop
      </p>
      <ol role="list" aria-labelledby={LABEL_ID} className={OL_CLASS}>
        {steps.map((step, index) => (
          <li key={step.id} className={LI_CLASS}>
            <span aria-hidden="true" className={NUMERAL_CLASS}>
              {String(index + 1).padStart(2, "0")}
            </span>
            <div className="min-w-0">
              <p className="font-sans text-[length:var(--step-0)] font-medium leading-snug text-[color:var(--fg)]">
                {step.label}
              </p>
              <p className="mt-1.5 text-[length:var(--step--1)] leading-[1.6] text-[color:var(--fg-muted)]">
                {step.detail}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
