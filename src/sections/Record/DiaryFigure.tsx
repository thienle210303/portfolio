import { Drawing } from "@/components/scenery/Drawing";
import type { DiaryDrawingName, DiaryFigure as Figure } from "@/types/portfolio";

/** Written out whole, so Tailwind sees each class. The tall one holds four pictures. */
const DRAWING_HEIGHT: Record<DiaryDrawingName, string> = {
  "diary-selftaught": "h-44",
  "diary-cap": "h-24",
  "diary-podium": "h-24",
};

/**
 * A small picture of the work, drawn from the entry's own `diary.figure` and
 * nothing else (round 23): two bars for a before and an after, marks for a
 * count, or a committed drawing. The chart is the same kind of thing as the
 * tree slice, arithmetic on content rather than an illustration, so a changed
 * figure redraws itself.
 *
 * The figure is a `<figure>` with its caption; what it shows is also in words
 * (the bars' labels, the count in the caption), so the drawing itself is
 * decoration to a screen reader.
 */
export default function DiaryFigure({ figure }: { readonly figure: Figure }) {
  return (
    <figure className="m-0">
      <div aria-hidden={figure.kind === "before-after" ? undefined : true}>
        {figure.kind === "before-after" ? <Bars figure={figure} /> : null}
        {figure.kind === "count" ? <Marks figure={figure} /> : null}
        {figure.kind === "drawing" ? (
          <Drawing name={figure.name} className={`mx-auto w-full max-w-[14rem] text-accent ${DRAWING_HEIGHT[figure.name]}`} />
        ) : null}
      </div>
      <figcaption className="mt-2 font-mono text-[length:var(--step--2)] leading-snug text-fg-muted">{figure.caption}</figcaption>
    </figure>
  );
}

/** The longer bar is the full width; a short one keeps a sliver, so it is
 *  still seen. */
function Bars({ figure }: { readonly figure: Extract<Figure, { kind: "before-after" }> }) {
  const top = Math.max(figure.before.value, figure.after.value);
  const share = (value: number) => `${Math.max(2.5, (value / top) * 100).toFixed(1)}%`;
  const rows = [
    { side: "Before", ...figure.before, tone: "bg-(--fg-muted)" },
    { side: "After", ...figure.after, tone: "bg-(--accent)" },
  ] as const;
  return (
    <dl className="m-0 space-y-2">
      {rows.map((row) => (
        <div key={row.side}>
          <dt className="sr-only">{row.side}</dt>
          <dd className="m-0">
            <span className="block h-3.5 max-w-full" style={{ width: share(row.value) }}>
              <span aria-hidden="true" className={`block size-full ${row.tone}`} />
            </span>
            <span className="mt-0.5 block font-mono text-[length:var(--step--1)] text-fg">{row.label}</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}

const DOT_MAX = 12;

/** Dots when each stands for several (`per`) or there are few; otherwise
 *  tally gates, four strokes and a slash, five to a gate. */
function Marks({ figure }: { readonly figure: Extract<Figure, { kind: "count" }> }) {
  const n = Math.ceil(figure.total / (figure.per ?? 1));
  if (figure.per || n <= DOT_MAX) {
    const cols = Math.min(n, 10);
    const rows = Math.ceil(n / cols);
    return (
      <svg
        viewBox={`0 0 ${cols * 16} ${rows * 16}`}
        className="block h-auto w-full fill-(--accent)"
        style={{ maxWidth: `${Math.min(cols * 1.5, 16)}rem` }}
        role="presentation"
      >
        {Array.from({ length: n }, (_, i) => (
          <circle key={i} cx={(i % cols) * 16 + 8} cy={Math.floor(i / cols) * 16 + 8} r={5.5} />
        ))}
      </svg>
    );
  }
  const gates = Math.ceil(n / 5);
  const perRow = 5;
  const rows = Math.ceil(gates / perRow);
  return (
    <svg
      viewBox={`0 0 ${perRow * 44} ${rows * 34}`}
      className="block h-auto w-full max-w-[16rem] fill-none stroke-(--accent)"
      strokeWidth={2.4}
      strokeLinecap="round"
      role="presentation"
    >
      {Array.from({ length: gates }, (_, g) => {
        const marks = Math.min(5, n - g * 5);
        const x0 = (g % perRow) * 44 + 6;
        const y0 = Math.floor(g / perRow) * 34 + 4;
        return (
          <g key={g}>
            {Array.from({ length: Math.min(marks, 4) }, (_, k) => (
              <path key={k} d={`M${x0 + k * 7} ${y0}V${y0 + 24}`} />
            ))}
            {marks === 5 ? <path d={`M${x0 - 4} ${y0 + 20}L${x0 + 28} ${y0 + 4}`} /> : null}
          </g>
        );
      })}
    </svg>
  );
}
