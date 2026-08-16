/**
 * Renders a project's `metrics` as a real table: label / before / after /
 * source. `source` is always rendered — these numbers come straight off the
 * résumé, and the citation is part of why they're credible. Nothing here is
 * computed or invented; every cell is a verbatim content string.
 *
 * The table scrolls inside its own labelled region so a narrow viewport
 * never causes page-level horizontal overflow.
 */
import type { MetricComparison } from "@/types/portfolio";

interface MetricTableProps {
  readonly metrics: readonly MetricComparison[];
  /** Used as both the visible `<caption>` and the scroll region's accessible name. */
  readonly caption: string;
}

export default function MetricTable({ metrics, caption }: MetricTableProps) {
  if (metrics.length === 0) return null;

  return (
    <div
      role="region"
      aria-label={caption}
      tabIndex={0}
      className="mt-4 overflow-x-auto border border-hairline"
      style={{ WebkitOverflowScrolling: "touch" }}
    >
      <table className="w-full min-w-[34rem] border-collapse">
        <caption className="border-b border-hairline px-4 py-3 text-left font-mono text-[length:var(--step--1)] uppercase tracking-[0.14em] text-silver">
          {caption}
        </caption>
        <thead>
          <tr>
            <th
              scope="col"
              className="border-b border-hairline px-4 py-2.5 text-left font-mono text-[length:var(--step--1)] uppercase tracking-[0.08em] text-silver"
            >
              Metric
            </th>
            <th
              scope="col"
              className="border-b border-hairline px-4 py-2.5 text-left font-mono text-[length:var(--step--1)] uppercase tracking-[0.08em] text-silver"
            >
              Before
            </th>
            <th
              scope="col"
              className="border-b border-hairline px-4 py-2.5 text-left font-mono text-[length:var(--step--1)] uppercase tracking-[0.08em] text-silver"
            >
              After
            </th>
            <th
              scope="col"
              className="border-b border-hairline px-4 py-2.5 text-left font-mono text-[length:var(--step--1)] uppercase tracking-[0.08em] text-silver"
            >
              Source
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-hairline">
          {metrics.map((metric) => (
            <tr key={metric.label}>
              <th
                scope="row"
                className="wrap-anywhere px-4 py-3 text-left text-[length:var(--step-0)] font-normal text-paper"
              >
                {metric.label}
              </th>
              <td className="wrap-anywhere px-4 py-3 text-[length:var(--step-0)] text-muted">
                {metric.before}
              </td>
              <td className="wrap-anywhere px-4 py-3 font-mono text-[length:var(--step-0)] text-paper">
                {metric.after}
              </td>
              <td className="wrap-anywhere px-4 py-3 text-[length:var(--step--1)] text-silver">
                {metric.source}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
