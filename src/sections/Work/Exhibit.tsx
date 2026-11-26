import type { CSSProperties } from "react";
import DiaryFigure from "@/sections/Record/DiaryFigure";
import type { ExhibitDrawing, ShareFigure, ShowFigure } from "@/types/portfolio";

/**
 * The drawings a case study is shown with (round 32; Thien: "show case
 * instead of bunch of text"). All of it renders on the server: a hand-made
 * diagram from a few words (`ExhibitDrawing`), or arithmetic on the project's
 * own numbers (`ShowFigure`, the Diary's bars and marks plus a share). Motion
 * is CSS keyed off `InkReveal`'s `[data-inked]` (globals.css, "Work"), so a
 * drawing plays when its sheet comes into view and is simply drawn under
 * reduced motion or with JavaScript off.
 */

/** A diagram: decoration to a screen reader, the sheet's words carry it. */
export function ShowDrawing({ drawing }: { readonly drawing: ExhibitDrawing }) {
  return (
    <div aria-hidden="true" className="ex-drawing">
      {drawing.kind === "agents" ? <Agents drawing={drawing} /> : null}
      {drawing.kind === "rings" ? <Rings /> : null}
      {drawing.kind === "paper" ? <Paper versions={drawing.versions} /> : null}
    </div>
  );
}

/** A figure: the Diary's own, or a share. */
export function ShowFigureView({ figure }: { readonly figure: ShowFigure }) {
  return <div className="ex-figure">{figure.kind === "share" ? <Share figure={figure} /> : <DiaryFigure figure={figure} />}</div>;
}

/** The old way as days crossed out, then four strategies at once into a
 *  verdict, the way the workflow does it. */
function Agents({ drawing }: { readonly drawing: Extract<ExhibitDrawing, { kind: "agents" }> }) {
  return (
    <div className="ex-agents">
      <p className="ex-days">
        {Array.from({ length: 5 }, (_, i) => (
          <span key={i} className="ex-day" />
        ))}
        <span>{drawing.before}</span>
      </p>
      <div className="ex-agents-run">
        <span className="ex-node">retailer</span>
        <ul className="ex-lanes">
          {drawing.lanes.map((lane, i) => (
            <li key={lane} style={{ "--i": i } as CSSProperties}>
              <span>{lane}</span>
              <i />
            </li>
          ))}
        </ul>
        <span className="ex-node ex-verdict">{drawing.verdict}</span>
      </div>
    </div>
  );
}

/** A seed, then rings of 6, 12 and 18 linked to the nearest node a ring in:
 *  breadth-first, one ring at a time. Computed, so it is the same every time. */
const RINGS = (() => {
  const rings: { x: number; y: number }[][] = [[{ x: 0, y: 0 }]];
  [6, 12, 18].forEach((n, k) => {
    const r = 22 * (k + 1);
    rings.push(
      Array.from({ length: n }, (_, i) => {
        const a = (i / n) * Math.PI * 2 + k * 0.3;
        return { x: Math.cos(a) * r, y: Math.sin(a) * r };
      }),
    );
  });
  const lines = rings.slice(1).flatMap((ring, k) =>
    ring.map((p) => {
      const q = rings[k]!.reduce((b, c) => (Math.hypot(c.x - p.x, c.y - p.y) < Math.hypot(b.x - p.x, b.y - p.y) ? c : b));
      return { x1: q.x, y1: q.y, x2: p.x, y2: p.y };
    }),
  );
  return { rings, lines };
})();

function Rings() {
  return (
    <svg viewBox="-75 -75 150 150" className="ex-rings" role="presentation">
      {RINGS.lines.map((l, i) => (
        <line key={i} x1={l.x1.toFixed(1)} y1={l.y1.toFixed(1)} x2={l.x2.toFixed(1)} y2={l.y2.toFixed(1)} />
      ))}
      {RINGS.rings.map((ring, k) =>
        ring.map((p, i) => (
          <circle
            key={`${k}-${i}`}
            cx={p.x.toFixed(1)}
            cy={p.y.toFixed(1)}
            r={k === 0 ? 5 : 3.6}
            data-seed={k === 0 ? "" : undefined}
            style={{ "--ring": k } as CSSProperties}
          />
        )),
      )}
    </svg>
  );
}

/** A loose stack of setup sheets, then the same sheets as versions. */
function Paper({ versions }: { readonly versions: readonly string[] }) {
  return (
    <div className="ex-paper">
      <div className="ex-stack">
        <span style={{ "--r": "-7deg" } as CSSProperties} />
        <span style={{ "--r": "5deg" } as CSSProperties} />
        <span style={{ "--r": "-2deg" } as CSSProperties} />
      </div>
      <span className="ex-arrow">→</span>
      <ol className="ex-versions">
        {versions.map((v, i) => (
          <li key={v} style={{ "--i": i } as CSSProperties}>
            <b>{v}</b>
            {i === 0 ? <span>current</span> : null}
          </li>
        ))}
      </ol>
    </div>
  );
}

/** A share of a whole: a notch of `percent` in a full-width track. The labels
 *  carry the figure in words, so the tracks are decoration. */
function Share({ figure }: { readonly figure: ShareFigure }) {
  const rows = [
    ...(figure.before ? [{ side: "Before", ...figure.before, tone: "ex-share-before" }] : []),
    { side: figure.before ? "After" : "", ...figure.after, tone: "ex-share-after" },
  ];
  return (
    <figure className="m-0">
      <dl className="ex-share m-0">
        {rows.map((row) => (
          <div key={row.side || "only"}>
            <dt className="font-mono text-[length:var(--step--2)] tracking-(--tracking-caps) text-fg-muted uppercase">
              {row.side ? `${row.side} · ${row.label}` : row.label}
            </dt>
            <dd className="m-0">
              <span aria-hidden="true" className={`ex-track ${row.tone}`}>
                <span style={{ width: `${row.percent}%` } as CSSProperties} />
              </span>
            </dd>
          </div>
        ))}
      </dl>
      <figcaption className="mt-2 font-mono text-[length:var(--step--2)] leading-snug text-fg-muted">{figure.caption}</figcaption>
    </figure>
  );
}
