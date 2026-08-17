/**
 * The companions' bodies: two cats, drawn as single-weight line drawings.
 *
 * Drawn from photographs of Thien's actual animals, which is why the pair are
 * not mirror images of each other:
 *
 *  - **The grey one** (cat-fancy "blue") is solid grey with amber eyes and
 *    *grey* paws. He leads.
 *  - **The tabby** is a mackerel with dark striping, a heavily ringed tail and
 *    white socks. She follows.
 *
 * Both are deliberately wide and low. They are a little fat.
 *
 * ## How the two coats are told apart without adding a single colour
 *
 * The obvious way to draw a grey cat next to a brown tabby is two coat colours,
 * and that would mean amending the ten-token palette rule in `globals.css` for
 * the sake of an illustration. It is not necessary. The grey one carries a
 * `currentColor` wash at `COAT_WASH` opacity and the tabby carries none, so one
 * reads as a solid-coated animal and the other as an outline with markings.
 * Because the wash *is* the text colour, both cats follow theme and tone like
 * every other component, and neither needs a palette of its own.
 *
 * That trick also gets the paws right for free, which is the detail the
 * photographs are most unambiguous about: the grey one's feet are the same grey
 * as the rest of him, so his filled body simply extends into them, while the
 * tabby's unfilled feet sit behind a cuff line and read as white socks. The
 * single exception, inherited from the original drawing, is the eye — it uses
 * `--accent`, the one detail worth spending the site's colour licence on.
 *
 * Each pose is one continuous contour wherever it can be. A silhouette drawn as
 * one line survives being scaled down far better than the same shape assembled
 * from a dozen separate strokes, which is the size this is actually seen at.
 *
 * Purely presentational and `aria-hidden`: `Companion` owns the button, the
 * accessible name and every behaviour.
 */

/**
 * One cat is drawn in a local 50×42 box; the pair sit side by side in a 92-wide
 * one. They are placed with a gap rather than nose-to-tail on purpose — the
 * tabby has no fill, so an overlap would show the leader's tail crossing her
 * face as a tangle of hairlines rather than as depth.
 */
export const CAT_W = 92;
export const CAT_H = 42;

/** Where the leading cat's local box starts inside the pair's viewBox. */
const LEAD_X = 46;

/**
 * The grey coat. High enough to read as a solid-coated animal beside the
 * tabby's bare outline, low enough that the contour and the markings still
 * carry the drawing rather than being swallowed by it.
 */
const COAT_WASH = 0.42;

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
 *  cats cannot drift into looking like different animals between poses. */
const HEAD =
  "L 29.5 5 L 35 9 C 37 8.2, 39.5 8.2, 41.5 9.2 L 44 3 L 45.5 10.5 C 47 13, 46.5 17.5, 43.5 19.5";

/**
 * The three body contours.
 *
 * Each is the outline main's single cat used, with the belly dropped and the
 * chest pushed out — the brief is two fat cats, and the original was drawn
 * lean. The legs shortened to match: on a deeper body the same leg length
 * turns a cat into a table.
 */
const SIT_BODY = `M 11 22 C 5.5 25, 5.5 32.5, 11.5 33.5 C 11.5 25, 15.5 19.5, 22 18.5
   C 27 17.8, 28.5 16, 29 12 ${HEAD}
   C 42 21, 41.5 23.5, 41.5 26.5 L 41.5 36.5 L 19.5 36.5 C 11.5 36.5, 9.5 35, 11.5 33.5`;

const WALK_BODY = `M 13.5 26 C 12.5 20.5, 15 18, 20.5 17.5 C 26 17, 28.5 16, 29 12 ${HEAD}
   C 42 21, 41 23.5, 41 27.5
   C 40 30, 34 30.4, 22 30.4 C 16.5 30.4, 14 29, 13.5 26`;

/**
 * Curled up. The two ear points are kept close to the same height on purpose:
 * an earlier draft raised the first one, and a tall spike followed by a short
 * bump stopped reading as two ears and started reading as a shark fin.
 */
const SLEEP_BODY = `M 12.5 34 C 6 31, 6 22.5, 13.5 20 C 21 17.5, 31.5 19, 35 24 L 35.8 18.4
   L 40 21.4 C 41.5 21.1, 43 21.3, 44 22 L 46.3 17.6 L 47 23.5
   C 48 25.5, 47.5 29.5, 44.5 31.2 C 40.5 33.4, 33 35 26 35.5
   C 20 35.9, 15.5 35.4, 12.5 34 Z`;

/**
 * Walk-cycle legs: the hip each one hangs from, and which way its foot swings.
 * Front and back pairs oppose each other, which is what makes four straight
 * lines read as a gait rather than as a table.
 */
const WALK_LEGS = [
  { x: 39, y: 29.8, dir: 1 },
  { x: 35.4, y: 30.2, dir: -1 },
  { x: 19, y: 30.4, dir: -1 },
  { x: 15.6, y: 29.4, dir: 1 },
] as const;

interface CatProps {
  readonly pose: "sit" | "walk" | "sleep";
  readonly phase: number;
  readonly blinking: boolean;
  readonly variant: "grey" | "tabby";
}

/**
 * One cat, in its own local 50×42 box, facing right.
 *
 * The tabby's markings are plain short strokes rather than shapes fitted to the
 * contour. In a drawing with no fill there is nothing for a marking to spill
 * out of, so they only have to be placed inside the body — which is why they
 * can stay this simple. Each is positioned per pose, because a stripe that
 * follows the spine while the cat is sitting is in mid-air once it lies down.
 */
function Cat({ pose, phase, blinking, variant }: CatProps) {
  const tabby = variant === "tabby";
  const sway = Math.sin(phase * Math.PI * 2);

  /** The solid coat. Applied to the body contour only — never to the tail or
   *  the legs, which are open strokes that a fill would close into blobs. */
  const coat = tabby ? STROKE : { ...STROKE, fill: "currentColor", fillOpacity: COAT_WASH };

  const face = (
    <>
      {blinking ? (
        <path {...STROKE} d="M 39.6 14.2 q 1.4 1.2 2.8 0" />
      ) : (
        <circle cx="41" cy="14.2" r="1.3" fill="var(--accent)" stroke="none" />
      )}
      <path {...STROKE} d="M 45.6 16.6 L 44 17.8" />
    </>
  );

  if (pose === "sleep") {
    return (
      <g>
        <path {...coat} d={SLEEP_BODY} />
        {/* Tail wrapped around the front paws, the way a cat closes the circle. */}
        <path {...STROKE} d="M 12.5 34 C 7.5 36.5, 13.5 39, 21.5 38 C 27.5 37.3, 33 36.4, 36 35.4" />
        {tabby ? (
          <g {...STROKE}>
            {/* Rings across the curled tail, and stripes over the shoulder —
                the only part of a sleeping cat's back that still faces up. */}
            <path d="M 16.5 37.6 L 17.2 35.4" />
            <path d="M 21.5 38 L 22 35.6" />
            <path d="M 26.5 37.4 L 27 35.2" />
            <path d="M 17 22.5 L 15.5 26" />
            <path d="M 22 21 L 20.5 24.5" />
            <path d="M 27 20.6 L 26 24" />
          </g>
        ) : null}
        <path {...STROKE} d="M 43.4 26 q 1.8 1.3 3.4 0" />
      </g>
    );
  }

  if (pose === "walk") {
    // Front and back pairs swing in opposition, which is what makes four
    // straight lines read as a gait rather than as a table.
    const swing = sway * 2;
    return (
      <g>
        <path {...coat} d={WALK_BODY} />
        <path
          {...STROKE}
          d={`M 13.5 25.5 C ${6.5 + sway} ${23.5 - sway}, ${4 + sway * 1.5} ${16 - sway},
              ${8.5 + sway * 2} ${13 - sway}`}
        />
        {tabby ? (
          <g {...STROKE}>
            {/* Mackerel striping: short bars dropping from the spine down the
                flank, thinning towards the hips the way the real coat does. */}
            <path d="M 18 19.4 L 17 24" />
            <path d="M 22 18.2 L 21 23.6" />
            <path d="M 26 17.8 L 25.2 23" />
            <path d="M 30.5 18.6 L 30 22.6" />
            {/* Tail rings, following the sway so they stay on the tail. */}
            <path d={`M ${9.5 + sway * 0.6} ${23.4 - sway * 0.6} l 2.6 -1`} />
            <path d={`M ${6 + sway * 1.2} ${19 - sway * 0.9} l 2.6 -1.1`} />
          </g>
        ) : null}
        {face}
        {/*
          Four legs, and — on the tabby — four white socks.

          The socks were first drawn as a cuff line across each ankle, on the
          theory that in an unfilled drawing a line is all it takes to mark a
          change of colour. At this size it isn't: a horizontal rule crossing a
          vertical leg reads as a tick mark, and four of them read as hash
          marks. A small closed boot at the foot is unambiguous instead, so the
          tabby's legs stop short of the ground and the boot carries the last
          two units. The grey one keeps full-length legs and no boot, because
          the photographs are clear that his feet are the same grey as the rest
          of him — the wash on his body simply runs all the way down.
        */}
        {WALK_LEGS.map(({ x, y, dir }) => {
          const foot = x + dir * swing;
          return tabby ? (
            <g key={x}>
              <path {...STROKE} d={`M ${x} ${y} L ${foot} 33.2`} />
              <ellipse {...STROKE} cx={foot} cy={34.7} rx={2.1} ry={1.5} />
            </g>
          ) : (
            <path key={x} {...STROKE} d={`M ${x} ${y} L ${foot} 36`} />
          );
        })}
      </g>
    );
  }

  return (
    <g>
      <path {...coat} d={SIT_BODY} />
      {/* The tail is the cat's whole emotional range while it is sitting still,
          so it carries all of the idle movement and the body carries none. */}
      <path
        {...STROKE}
        d={`M 11.5 33.5 C 3.5 34, ${1 + sway * 0.9} ${25 - sway}, ${6.5 + sway * 1.6} ${20.5 - sway * 1.2}
            C ${8.5 + sway * 1.6} ${18.9 - sway}, ${10.5 + sway} ${19.6 - sway * 0.8},
            ${10.5 + sway * 0.6} ${21.6 - sway * 0.5}`}
      />
      {tabby ? (
        <g {...STROKE}>
          {/* Stripes down the back and haunch while seated. */}
          <path d="M 15.5 23.5 L 13.8 27" />
          <path d="M 19 20.6 L 17 24.4" />
          <path d="M 23.5 19 L 22 23" />
          {/* Two rings near the tail's base, which is the part that stays put. */}
          <path d={`M ${4.4 + sway * 0.5} ${30.5} l 2.4 0.9`} />
          <path d={`M ${2.2 + sway * 0.8} ${26} l 2.5 0.6`} />
        </g>
      ) : null}
      {face}
      {/* Seated, only the front legs show — so the tabby gets two boots, sat
          on the body's own bottom edge rather than hanging below it. */}
      <path {...STROKE} d={`M 34.5 ${tabby ? 33.4 : 36.5} L 34.5 26.5`} />
      {tabby ? (
        <g {...STROKE}>
          <ellipse cx="34.5" cy="35" rx="2.2" ry="1.5" />
          <ellipse cx="39.4" cy="35" rx="2.2" ry="1.5" />
        </g>
      ) : null}
    </g>
  );
}

export function CompanionCat({ pose, phase, blinking }: CompanionCatProps) {
  return (
    <svg
      viewBox={`0 0 ${CAT_W} ${CAT_H}`}
      width={CAT_W}
      height={CAT_H}
      aria-hidden="true"
      focusable="false"
    >
      {/*
        The tabby follows, so she is drawn on the left — the pair face right,
        and `Companion` flips the whole group when they turn around, which keeps
        the follower behind the leader in both directions.

        Her gait runs half a cycle out of step with his. Two cats walking in
        perfect lockstep read as one sprite stamped twice, and that half-phase
        offset is the single cheapest thing that makes them two animals.
      */}
      <g transform="translate(0 0)">
        <Cat variant="tabby" pose={pose} phase={(phase + 0.5) % 1} blinking={blinking} />
      </g>
      <g transform={`translate(${LEAD_X} 0)`}>
        <Cat variant="grey" pose={pose} phase={phase} blinking={blinking} />
      </g>
    </svg>
  );
}

export default CompanionCat;
