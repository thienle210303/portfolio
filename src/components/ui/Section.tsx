import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * `base` and `deep` are the two quiet grounds — `deep` is a half-step down,
 * used to separate adjacent sections without a rule. `contrast` inverts
 * against whichever theme is active: a dark chapter in day, a light one in
 * night. It is deliberately expensive to reach for; two per page is plenty.
 */
type SectionTone = "base" | "deep" | "contrast";

/** One `<dt>/<dd>` pair in the margin rail. */
export interface RailNote {
  readonly term: string;
  readonly detail: string;
}

interface SectionProps {
  readonly id: string;
  /** id of this section's <h2> (rendered by the caller, typically via
   * SectionHeading), wired up as this <section>'s aria-labelledby. */
  readonly labelledBy: string;
  readonly eyebrow?: string;
  readonly tone?: SectionTone;
  /**
   * Annotations for the margin rail. Every entry should be a fact that is
   * already true elsewhere in the content layer — a count, a date, a source —
   * never a restatement of the prose beside it. Omit to render no rail.
   */
  readonly rail?: readonly RailNote[];
  /** Merged onto the <section>. Used for print opt-outs (`no-print`). */
  readonly className?: string;
  /**
   * Opts this section into the shared ink-settle (Workstream 3, P1):
   * default `true` marks the `<section>` a `[data-ink-root]`, and this
   * component stamps `[data-ink]` + a staggered `--ink-delay` on its own
   * eyebrow and rail — `SectionHeading` does the same for the h2 and lead it
   * renders inside `children`, on the same 0/60/120/240ms schedule (eyebrow
   * first, rail last). Only those four ever settle; the body content a
   * section's own children render is deliberately untouched, which is what
   * keeps `restingTop`/connector-gap geometry the rest of the e2e suite
   * measures unaffected by this pass.
   *
   * `Hero` is the one caller that passes `false`: it runs its own
   * `data-motion` load choreography (P2) instead, unconditionally on every
   * load rather than on first scroll into view, because it is the one
   * section guaranteed to already be on screen at first paint.
   */
  readonly reveal?: boolean;
  readonly children: ReactNode;
}

const TONE_CLASS: Record<SectionTone, string> = {
  base: "tone-base",
  deep: "tone-deep",
  contrast: "tone-contrast",
};

/**
 * The one structural wrapper every section on the page uses: a hairline top
 * border, fluid `--section-y` block padding, the `.shell` max-width container,
 * the mono eyebrow, and — when `rail` is supplied — the margin rail that gives
 * this design its name.
 *
 * The tone class does not paint anything by itself; it repoints the semantic
 * colour aliases (`--fg`, `--rule-color`, `--accent`, …) and lets `bg-ground`
 * pick the ground up from there. That indirection is what makes one component
 * render correctly across two themes and three tones with no per-tone branches
 * anywhere in the tree.
 *
 * The rail is a `<dl>`, not a list of divs: each note genuinely is a term and
 * its value, so a screen reader announces "Section, About" rather than two
 * unrelated strings. It is rendered *after* the main content in the DOM and
 * pulled left visually at >=1024px, so keyboard and reading order both reach
 * the section's actual substance first.
 */
export function Section({
  id,
  labelledBy,
  eyebrow,
  tone = "base",
  rail,
  className,
  reveal = true,
  children,
}: SectionProps) {
  const hasRail = rail !== undefined && rail.length > 0;

  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      {...(reveal ? { "data-ink-root": "" } : {})}
      className={cn(
        // No ruled grid here by default — see the note on `.blueprint-grid` in
        // globals.css. Only the hero opts in, by passing the class through
        // `className`.
        "hairline-t scroll-mt-20 bg-ground py-[var(--section-y)]",
        TONE_CLASS[tone],
        className,
      )}
    >
      <div className="shell">
        {eyebrow ? (
          <p
            className="eyebrow eyebrow-lead mb-8"
            {...(reveal ? { "data-ink": "" } : {})}
            style={reveal ? ({ "--ink-delay": "0ms" } as CSSProperties) : undefined}
          >
            {eyebrow}
          </p>
        ) : null}

        {hasRail ? (
          <div className="rail-layout">
            <div className="min-w-0 lg:order-2">{children}</div>
            <dl
              className="rail no-print lg:order-1"
              // `reveal={false}` currently means exactly one thing: this is
              // the hero, which still wants its rail to fade in — just on
              // its own `data-motion` schedule (P2) rather than the generic
              // scroll-triggered one every other section's rail uses.
              {...(reveal ? { "data-ink": "" } : { "data-hero-step": "rail" })}
              style={reveal ? ({ "--ink-delay": "240ms" } as CSSProperties) : undefined}
            >
              {rail.map((note) => (
                <div key={note.term}>
                  <dt>{note.term}</dt>
                  {/* `wrap-anywhere` because a rail detail can be an email
                      address or a URL — an unbreakable token whose min-content
                      width otherwise stretches the whole endnote column below
                      1024px. At 320px under 200% zoom that stretched column is
                      what decides whether the page scrolls sideways
                      (e2e/responsive.spec.ts). */}
                  <dd className="wrap-anywhere">{note.detail}</dd>
                </div>
              ))}
            </dl>
          </div>
        ) : (
          children
        )}
      </div>
    </section>
  );
}

export default Section;
