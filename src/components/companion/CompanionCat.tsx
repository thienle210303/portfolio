/**
 * The cat's body: a single-weight line drawing, no fill.
 *
 * Drawn at the same hairline weight as the rest of the site so it reads as a
 * margin doodle on an engineering drawing rather than as a cartoon mascot
 * bolted onto a minimal page. It takes its colour from `currentColor`, so it
 * follows theme and tone like every other component and needs no palette of
 * its own. The one exception is the eye, which uses `--accent` — the same
 * licence the rest of the design gives blue, spent on the single detail that
 * makes the drawing look awake.
 *
 * Each pose is one continuous contour wherever it can be. A silhouette drawn
 * as one line survives being scaled down to 50px far better than the same
 * shape assembled from a dozen separate strokes, which is the size this is
 * actually seen at.
 *
 * Purely presentational and `aria-hidden`: `Companion` owns the button, the
 * accessible name and every behaviour.
 */

export const CAT_W = 50;
export const CAT_H = 42;

interface CompanionCatProps {
  readonly pose: "sit" | "walk" | "sleep";
  /** 0..1 through the current cycle. Drives tail sway and the walk gait. */
  readonly phase: number;
  readonly blinking: boolean;
}

const STROKE = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

/** Head, both ears and the brow, shared by the sit and walk contours so the
 *  cat cannot drift into looking like two different animals. */
const HEAD =
  "L 29.5 5 L 35 9 C 37 8.2, 39.5 8.2, 41.5 9.2 L 44 3 L 45.5 10.5 C 47 13, 46.5 17.5, 43.5 19.5";

export function CompanionCat({ pose, phase, blinking }: CompanionCatProps) {
  const sway = Math.sin(phase * Math.PI * 2);

  const face = (
    <>
      {blinking ? (
        <path {...STROKE} d="M 39.6 14.2 q 1.4 1.2 2.8 0" />
      ) : (
        <circle cx="41" cy="14.2" r="1.25" fill="var(--accent)" stroke="none" />
      )}
      <path {...STROKE} d="M 45.6 16.6 L 44 17.8" />
    </>
  );

  if (pose === "sleep") {
    return (
      <svg viewBox="0 0 50 42" width={CAT_W} height={CAT_H} aria-hidden="true" focusable="false">
        <path
          {...STROKE}
          d="M 13 34 C 7 31, 7 23, 14 20.5 C 21 18, 31 19.5, 34.5 24 L 35 17.5 L 39.5 21.5
             C 41 21.2, 42.5 21.4, 43.5 22.2 L 46 17 L 46.5 24 C 47.5 26, 47 29.5, 44 31
             C 40 33, 33 34.5, 26 35 C 20 35.4, 16 35.2, 13 34 Z"
        />
        {/* Tail wrapped around the front paws, the way a cat closes the circle. */}
        <path {...STROKE} d="M 13 34 C 8 36.5, 14 39, 22 38 C 28 37.3, 33 36.4, 36 35.4" />
        <path {...STROKE} d="M 42.6 26.6 q 1.8 1.3 3.4 0" />
      </svg>
    );
  }

  if (pose === "walk") {
    // Front and back pairs swing in opposition, which is what makes four
    // straight lines read as a gait rather than as a table.
    const swing = sway * 2;
    return (
      <svg viewBox="0 0 50 42" width={CAT_W} height={CAT_H} aria-hidden="true" focusable="false">
        <path
          {...STROKE}
          d={`M 14 25.5 C 13 21, 15 19, 20.5 18.5 C 26 18, 28.5 16, 29 12 ${HEAD}
              C 41.5 20.8, 40.5 23, 40.5 26
              C 34 27.6, 22 27.8, 17 27 C 15 26.7, 14.4 26.2, 14 25.5`}
        />
        <path
          {...STROKE}
          d={`M 14 25 C ${7 + sway} ${23.5 - sway}, ${4.5 + sway * 1.5} ${16 - sway},
              ${9 + sway * 2} ${13 - sway}`}
        />
        {face}
        <path {...STROKE} d={`M 39 26.4 L ${39 + swing} 34.5`} />
        <path {...STROKE} d={`M 35.4 26.8 L ${35.4 - swing} 34.5`} />
        <path {...STROKE} d={`M 18 27 L ${18 - swing} 34.5`} />
        <path {...STROKE} d={`M 14.6 26.4 L ${14.6 + swing} 34.5`} />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 50 42" width={CAT_W} height={CAT_H} aria-hidden="true" focusable="false">
      <path
        {...STROKE}
        d={`M 11 22 C 6 25, 6 32, 12 33 C 12 25, 16 20, 22 19 C 27 18, 28.5 16, 29 12 ${HEAD}
            C 41.5 20.8, 40.5 22.8, 40.5 25.5 L 40.5 36 L 21 36 C 13 36, 11 34.5, 12 33`}
      />
      {/* The tail is the cat's whole emotional range while it is sitting still,
          so it carries all of the idle movement and the body carries none. */}
      <path
        {...STROKE}
        d={`M 12 33 C 4 33.5, ${1.5 + sway * 0.9} ${25 - sway}, ${7 + sway * 1.6} ${20.5 - sway * 1.2}
            C ${9 + sway * 1.6} ${18.9 - sway}, ${11 + sway} ${19.6 - sway * 0.8},
            ${11 + sway * 0.6} ${21.6 - sway * 0.5}`}
      />
      {face}
      <path {...STROKE} d="M 34.5 36 L 34.5 25.5" />
    </svg>
  );
}

export default CompanionCat;
