import { cn } from "@/lib/cn";
import { VisuallyHidden } from "@/components/ui/VisuallyHidden";
import type { MetricComparison } from "@/types/portfolio";

/**
 * A project's measured results, promoted out of the collapsed case study and
 * into the summary a reader sees first.
 *
 * The reasoning is about scanning, not decoration. Someone deciding whether to
 * open a case study is asking "did this work?", and the answer is a number —
 * but the numbers used to live inside `MetricTable`, behind a disclosure, so
 * the summary answered that question in prose bullets instead. A figure is
 * read in a glance; a sentence is read in a second. These are the same
 * verbatim strings the table renders, shown at a size that can be taken in
 * while scrolling past.
 *
 * This is also the one component allowed to spend the accent at size. The
 * palette rule reserves blue for "annotation, links and measured values" —
 * a sourced figure is the most literal measured value on the site, so if blue
 * is not for this, it is not for anything.
 *
 * Every figure carries its source, exactly as the table does. A number without
 * a citation is the thing this site exists not to do.
 */

interface MetricHighlightsProps {
  readonly metrics: readonly MetricComparison[];
  /** id of the visible group label the `<ul>` points at. */
  readonly labelId: string;
  /** Appended to the group's accessible name, visually hidden: five groups
   *  all announced as "Measured results" are indistinguishable in a screen
   *  reader's list of them. */
  readonly projectTitle: string;
}

/** More than three abreast stops being scannable and starts being a table,
 *  which is what the disclosure already contains. */
const MAX_SHOWN = 3;

/**
 * Columns follow the number of figures. A fixed three-column grid left one
 * filled cell beside two empty ones — which read as a rendering fault, not as
 * restraint.
 *
 * The step back to a single column at `lg` is not a whim: from 1024px the
 * section spends a fixed 10rem on the case-study index (SelectedWork.tsx),
 * and three figures in what remains set "Under 1 hour, end to end" as four
 * ragged lines — which is no longer a figure. Full width until `xl`, where
 * the column is wide enough to hold them abreast again.
 */
const COLUMNS: Record<number, string> = {
  1: "sm:grid-cols-1",
  2: "sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2",
  3: "sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3",
};

/**
 * Figures are not all numbers. `after` is a verbatim content string, and the
 * real values range from "99% reduction" to "Under 1 hour, end to end" — set
 * at one size, the long ones wrap to three ragged lines and stop reading as a
 * headline figure at all. Size steps down as the string grows so the slot
 * stays a glanceable fact either way.
 */
function figureSize(value: string): string {
  if (value.length <= 10) return "text-[length:var(--step-3)] tracking-[-0.03em]";
  if (value.length <= 20) return "text-[length:var(--step-2)] tracking-[-0.02em]";
  return "text-[length:var(--step-1)] tracking-[-0.01em]";
}

export default function MetricHighlights({
  metrics,
  labelId,
  projectTitle,
}: MetricHighlightsProps) {
  if (metrics.length === 0) return null;

  const shown = metrics.slice(0, MAX_SHOWN);
  // Sources repeat across a project's metrics far more often than not, so one
  // line underneath beats the same résumé citation printed three times.
  const sources = [...new Set(shown.map((metric) => metric.source))];

  return (
    <div className="mt-8">
      {/* Labelled in the same micro-type as "Technologies" and "Proof", so
          the row's three annotated blocks stay one system. What lifts this
          one is the panel below it, not a louder label. */}
      <p id={labelId} className="eyebrow">
        Measured results
        {/* Explicit text-node space, not decorative whitespace — see the same
            note in Disclosure and ExternalLink. A space written inside
            VisuallyHidden is trimmed when that element's contribution to the
            accessible name is computed, so the name would announce as
            "Measured results— …". A sibling text node survives. */}
        {" "}
        <VisuallyHidden>— {projectTitle}</VisuallyHidden>
      </p>
      <ul
        aria-labelledby={labelId}
        className={cn(
          "mt-3 grid gap-px border border-[color:var(--rule-color)] bg-[color:var(--rule-color)]",
          COLUMNS[shown.length] ?? "sm:grid-cols-3",
        )}
      >
        {shown.map((metric) => (
          <li
            key={metric.label}
            // `--surface`, not `--ground`: the figures are the section's
            // evidence, and lifting them onto the same raised paper the cards
            // and code panel use is what separates proof from the prose
            // around it — without spending a second colour to do it.
            className="flex flex-col gap-1.5 bg-[color:var(--surface)] px-5 py-5"
          >
            <span
              className={cn(
                "font-mono leading-[1.1] text-[color:var(--accent)]",
                figureSize(metric.after),
              )}
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {metric.after}
            </span>
            <span className="text-[length:var(--step-0)] leading-snug text-[color:var(--fg)]">
              {metric.label}
            </span>
            {/* The "from" state is what makes the figure mean something, but it
                is supporting detail — small, muted, and never competing with
                the number it qualifies. */}
            <span className="text-[length:var(--step--1)] leading-snug text-[color:var(--fg-muted)]">
              from {metric.before.toLowerCase()}
            </span>
          </li>
        ))}
      </ul>

      <p className="eyebrow mt-2.5">
        {sources.length === 1 ? "Source" : "Sources"} · {sources.join(" · ")}
      </p>
    </div>
  );
}
