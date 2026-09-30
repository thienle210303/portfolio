/**
 * One entry on the career timeline: the always-visible summary (date, type,
 * role, organisation, location/mode when resolved, context and the
 * headline impact line) plus, only when the entry actually has more to
 * say, a Disclosure revealing responsibilities, what was built, the
 * remaining impact bullets, what was learned, technologies and a link.
 *
 * Also draws its own segment of the timeline's vertical connector line (see
 * the `isLast` prop) — see Timeline.tsx's file header for the full
 * anchoring rationale for why this is done per-entry rather than once for
 * the whole list.
 *
 * Every list here is guarded by `.length > 0`: several milestone entries
 * have genuinely empty responsibilities/built/impact/technologies arrays,
 * and this renders no heading and no container for those, not an empty one.
 *
 * The `<li>` is also this entry's jump target — id, `tabindex="-1"` and the
 * `scroll-mt-*` landing offset — for the career tree's leaves. See
 * ./anchors.ts for why the target is the whole entry rather than its heading,
 * and Timeline.tsx for what makes a link land on an entry the filter is
 * currently hiding.
 */
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { resolved, type CareerEntry } from "@/types/portfolio";
import { Disclosure } from "@/components/ui/Disclosure";
import { Tag } from "@/components/ui/Tag";
import { ExternalLink } from "@/components/ui/ExternalLink";
import { VisuallyHidden } from "@/components/ui/VisuallyHidden";
import { journeyEntryAnchorId } from "./anchors";

const TYPE_LABEL: Record<CareerEntry["type"], string> = {
  work: "Work",
  learning: "Learning",
  milestone: "Milestone",
};

const PROSE_CLASS = "text-[length:var(--step-0)] leading-[1.6] text-[color:var(--fg-muted)]";
const MICRO_LABEL_CLASS = "eyebrow";
const BULLET_ITEM_CLASS =
  "wrap-anywhere relative pl-5 before:absolute before:left-0 before:top-[0.7em] before:h-[5px] before:w-[5px] before:rounded-full before:bg-[color:var(--fg-subtle)] before:content-['']";

interface LabeledListProps {
  readonly label: string;
  readonly items: readonly string[];
}

/** A bulleted list under a small mono label — renders nothing at all (no
 * label, no empty <ul>) when `items` is empty, which is the common case for
 * several milestone entries. */
function LabeledList({ label, items }: LabeledListProps) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className={MICRO_LABEL_CLASS}>{label}</p>
      <ul role="list" aria-label={label} className="mt-2 space-y-2">
        {items.map((item) => (
          <li key={item} className={cn(BULLET_ITEM_CLASS, PROSE_CLASS)}>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

interface LeadInProps {
  readonly label: string;
  readonly children: ReactNode;
}

/** A single sentence introduced by a small mono label, e.g. "Impact" or
 * "What I learned" — prose, not a new heading. */
function LeadIn({ label, children }: LeadInProps) {
  return (
    <p className={cn(PROSE_CLASS, "prose-measure")}>
      <span className={cn(MICRO_LABEL_CLASS, "mr-2")}>{label}</span>
      {children}
    </p>
  );
}

interface TimelineEntryProps {
  readonly entry: CareerEntry;
  /** True for the first entry in the *currently filtered* list. The segment
   * then starts at this entry's own marker rather than at the top of its
   * box, so no stub hangs above the first dot. */
  readonly isFirst: boolean;
  /** True for the last entry in the *currently filtered* list. The segment
   * stops at this entry's marker instead of running to the bottom of its
   * box, so nothing dangles past the final dot. */
  readonly isLast: boolean;
}

export function TimelineEntry({ entry, isFirst, isLast }: TimelineEntryProps) {
  const locationOrMode = resolved(entry.locationOrMode);
  const learned = resolved(entry.learned);
  const [headlineImpact, ...restImpact] = entry.impact;

  const hasMore =
    entry.responsibilities.length > 0 ||
    entry.built.length > 0 ||
    restImpact.length > 0 ||
    learned !== undefined ||
    entry.technologies.length > 0 ||
    entry.link !== undefined;

  const headingId = `journey-${entry.id}-role`;

  return (
    <li
      // The jump target for anything linking at this entry — the career tree's
      // leaves, today. The `<li>` and not the `<h3>`: this box is the whole
      // entry, including the date range and the type tag, which sit *above*
      // the heading below the `md` breakpoint and in a column beside it above
      // one. See ./anchors.ts for the rest of that argument.
      id={journeyEntryAnchorId(entry.id)}
      // Landing point, not a control: a negative tabindex keeps the entry out
      // of the tab order while letting Timeline move focus here after it has
      // made sure the entry is unfiltered, so a keyboard visitor continues
      // from where the page moved to instead of from the link they left.
      tabIndex={-1}
      aria-labelledby={headingId}
      // Clears the 4rem sticky header with a little air — the same offset
      // `Section` itself uses (`scroll-mt-20`), and the offset that applies
      // whether the browser scrolls here natively or Timeline calls
      // scrollIntoView. There is no docked index over this section, so it
      // needs none of the extra CaseStudy allows for one.
      className="relative scroll-mt-20 py-8 pl-10 md:grid md:grid-cols-[9rem_1fr] md:gap-x-10 md:py-10 md:pl-0"
    >
      {/*
        Decorative connector, anchored to this <li>'s own box including its
        padding, so consecutive segments meet with no seam.

        The segment must start at the top of the box rather than at the
        marker, except on the first entry. An earlier version ran every
        segment from the marker (top-2) to the bottom of the box, which
        left the top 8px of every entry undrawn — a visible break at every
        boundary down the whole timeline.

        Ends are handled by position, not by suppression: the first segment
        starts at its marker so nothing juts above it, and the last stops
        at its marker so nothing dangles below. Both are computed against
        the *filtered* list, so the line stays correct as filters change.
      */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-4 md:left-[10.25rem]"
      >
        <span className="absolute left-1/2 top-2 h-2 w-2 -translate-x-1/2 rounded-full bg-[color:var(--rule-color)]" />
        {isFirst && isLast ? null : (
          <span
            className={cn(
              "absolute left-1/2 w-px -translate-x-1/2 bg-[color:var(--rule-color)]",
              isFirst ? "top-2" : "top-0",
              isLast ? "h-2" : "bottom-0",
            )}
          />
        )}
      </div>

      <div>
        <p className="eyebrow">
          {entry.dateRange}
        </p>
        <Tag className="mt-3">{TYPE_LABEL[entry.type]}</Tag>
      </div>

      <div className="mt-4 md:mt-0">
        <h3
          id={headingId}
          className="font-display text-[length:var(--step-2)] font-normal leading-[1.15] tracking-[-0.02em] text-[color:var(--fg)]"
        >
          {entry.role}
        </h3>
        <p className="wrap-anywhere mt-1.5 font-mono text-[length:var(--step--1)] uppercase tracking-[0.06em] text-[color:var(--fg-subtle)]">
          {entry.organization}
          {locationOrMode ? <> · {locationOrMode}</> : null}
        </p>
        <p className={cn(PROSE_CLASS, "prose-measure mt-3")}>{entry.context}</p>

        {headlineImpact ? (
          <p className={cn(PROSE_CLASS, "prose-measure mt-4 text-[color:var(--fg)]")}>
            <span className={cn(MICRO_LABEL_CLASS, "mr-2")}>Impact</span>
            {headlineImpact}
          </p>
        ) : null}

        {hasMore ? (
          <div className="mt-5">
            <Disclosure
              id={`journey-${entry.id}`}
              summary={
                <>
                  More detail
                  <VisuallyHidden> — {entry.role}, {entry.organization}</VisuallyHidden>
                </>
              }
              expandLabel="Expand"
              collapseLabel="Collapse"
            >
              <div className="space-y-4 border-t border-[color:var(--rule-color)] pt-4">
                <LabeledList label="Responsibilities" items={entry.responsibilities} />
                <LabeledList label="What I built" items={entry.built} />
                <LabeledList label="Impact" items={restImpact} />
                {learned ? <LeadIn label="What I learned">{learned}</LeadIn> : null}
                {entry.technologies.length > 0 ? (
                  <div>
                    <p className={MICRO_LABEL_CLASS}>Technologies</p>
                    <ul role="list" aria-label="Technologies" className="token-run mt-2">
                      {entry.technologies.map((tech) => (
                        <li key={tech}>
                          <span className="wrap-anywhere">{tech}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {entry.link ? (
                  <p className={PROSE_CLASS}>
                    <ExternalLink
                      href={entry.link.href}
                      className="text-[color:var(--fg)] underline underline-offset-4 hover:no-underline"
                    >
                      <span className="wrap-anywhere">{entry.link.label}</span>
                    </ExternalLink>
                  </p>
                ) : null}
              </div>
            </Disclosure>
          </div>
        ) : null}
      </div>
    </li>
  );
}

export default TimelineEntry;
