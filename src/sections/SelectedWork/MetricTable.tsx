/**
 * Renders a project's `metrics` as a real table: label / before / after /
 * source. `source` is always rendered — these numbers come straight off the
 * résumé, and the citation is part of why they're credible. Nothing here is
 * computed or invented; every cell is a verbatim content string.
 *
 * The table scrolls inside its own labelled region so a narrow viewport
 * never causes page-level horizontal overflow. Styled against the semantic
 * aliases in globals.css, matching every shared primitive.
 */
import type { MetricComparison } from "@/types/portfolio";

interface MetricTableProps {
  readonly metrics: readonly MetricComparison[];
  /** Used as both the visible `<caption>` and the scroll region's accessible name. */
  readonly caption: string;
}

const HEADER_CELL_CLASS = "eyebrow border-b border-[color:var(--rule-color)] px-4 py-2.5 text-left";

export default function MetricTable({ metrics, caption }: MetricTableProps) {
  if (metrics.length === 0) return null;

  return (
    <div
      role="region"
      aria-label={caption}
      tabIndex={0}
      className="mt-4 overflow-x-auto border border-[color:var(--rule-color)]"
      style={{ WebkitOverflowScrolling: "touch" }}
    >
      <table className="w-full min-w-[34rem] border-collapse">
        <caption className="eyebrow border-b border-[color:var(--rule-color)] px-4 py-3 text-left">
          {caption}
        </caption>
        <thead>
          <tr>
            <th scope="col" className={HEADER_CELL_CLASS}>
              Metric
            </th>
            <th scope="col" className={HEADER_CELL_CLASS}>
              Before
            </th>
            <th scope="col" className={HEADER_CELL_CLASS}>
              After
            </th>
            <th scope="col" className={HEADER_CELL_CLASS}>
              Source
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[color:var(--rule-color)]">
          {metrics.map((metric) => (
            <tr key={metric.label}>
              <th
                scope="row"
                className="wrap-anywhere px-4 py-3 text-left text-[length:var(--step-0)] font-normal text-[color:var(--fg)]"
              >
                {metric.label}
              </th>
              <td className="wrap-anywhere px-4 py-3 text-[length:var(--step-0)] text-[color:var(--fg-muted)]">
                {metric.before}
              </td>
              <td className="wrap-anywhere px-4 py-3 font-mono text-[length:var(--step-0)] text-[color:var(--fg)]">
                {metric.after}
              </td>
              <td className="wrap-anywhere px-4 py-3 text-[length:var(--step--1)] text-[color:var(--fg-subtle)]">
                {metric.source}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
