import { cn } from "@/lib/cn";
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
  /** Labels the group for assistive technology, e.g. "Measured results — …". */
  readonly label: string;
}

/** More than three abreast stops being scannable and starts being a table,
 *  which is what the disclosure already contains. */
const MAX_SHOWN = 3;

/** Columns follow the number of figures. A fixed three-column grid left one
 *  filled cell beside two empty ones — which read as a rendering fault, not as
 *  restraint. */
const COLUMNS: Record<number, string> = {
  1: "sm:grid-cols-1",
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-3",
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

export default function MetricHighlights({ metrics, label }: MetricHighlightsProps) {
  if (metrics.length === 0) return null;

  const shown = metrics.slice(0, MAX_SHOWN);
  // Sources repeat across a project's metrics far more often than not, so one
  // line underneath beats the same résumé citation printed three times.
  const sources = [...new Set(shown.map((metric) => metric.source))];

  return (
    <div className="mt-6">
      <ul
        aria-label={label}
        className={cn(
          "grid gap-px border border-[color:var(--rule-color)] bg-[color:var(--rule-color)]",
          COLUMNS[shown.length] ?? "sm:grid-cols-3",
        )}
      >
        {shown.map((metric) => (
          <li
            key={metric.label}
            className="flex flex-col gap-1 bg-[color:var(--ground)] px-4 py-4"
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
