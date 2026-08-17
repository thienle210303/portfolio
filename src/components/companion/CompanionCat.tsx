/**
 * The companions' bodies: one cat per instance, drawn as a single-weight line
 * drawing.
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
 * This file used to draw both of them inside one 92-wide viewBox, which meant
 * they shared a pose, a phase and a position by construction — two animals that
 * could only ever be one sprite stamped twice. Each cat is its own element now
 * and `Companion` positions them independently; the only thing they still share
 * is this drawing and the rAF loop that drives it.
 *
 * ## How the coats are told apart without adding a single colour
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
 * The police cat is the same drawing again — the grey one's wash, none of the
 * tabby's markings — plus a cap. A third coat would have needed a third way of
 * filling a silhouette, and there isn't one that stays inside the palette.
 *
 * Each pose is one continuous contour wherever it can be. A silhouette drawn as
 * one line survives being scaled down far better than the same shape assembled
 * from a dozen separate strokes, which is the size this is actually seen at.
 *
 * Purely presentational and `aria-hidden`: `Companion` owns the buttons, the
 * accessible names and every behaviour.
 */

/** One cat's local drawing box. Everything the contours reach stays inside it,
 *  including the tail at full sway. */
export const CAT_W = 50;
export const CAT_H = 42;

/**
 * The grey coat. High enough to read as a solid-coated animal beside the
 * tabby's bare outline, low enough that the contour and the markings still
 * carry the drawing rather than being swallowed by it.
 */
const COAT_WASH = 0.42;

/**
 * Six poses out of four contours.
 *
 * `sit`, `walk` and `sleep` are the three shapes an animal this size can hold
 * and still be read; `stretch` is the fourth, and it earns its own contour
 * because a stretch is a change of *silhouette* — the whole point of it is the
 * hollowed back and the raised rump, and nothing short of a new outline says
 * that. `groom` and `bat` deliberately do not get one: both are a sitting cat
 * doing something with one front paw, and re-drawing the body for them would
 * only invite the two sitting shapes to drift apart. They are the sit contour
 * with a different foreleg, which is also exactly what they are in life.
 */
export type CatPose = "sit" | "walk" | "sleep" | "stretch" | "groom" | "bat";
export type CatVariant = "grey" | "tabby" | "police";

interface CompanionCatProps {
  readonly variant: CatVariant;
  readonly pose: CatPose;
  /** 0..1 through the current cycle. Drives tail sway and the walk gait. */
  readonly phase: number;
  readonly blinking: boolean;
  /**
   * 0..1, and 0 almost always: a quick twitch that needs no pose of its own.
   * The near ear tips out and the tail lashes wider for a few hundred ms. The
   * ear is worth animating precisely because it is the smallest thing on a cat
   * that moves by itself — at 50px a twitching ear is legible where a shifting
   * shoulder is not.
   */
  readonly flick?: number;
  /** Drawn smaller inside the resting box. 1 everywhere else. */
  readonly scale?: number;
}

const STROKE = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

/** Head, both ears and the brow, shared by the upright contours so the cats
 *  cannot drift into looking like different animals between poses. `flick` tips
 *  the near ear out and back; at 0 this is the original path, unchanged. */
function head(flick: number): string {
  return `L 29.5 5 L 35 9 C 37 8.2, 39.5 8.2, 41.5 9.2 L ${44 + flick * 2.4} ${
    3 + flick * 2.2
  } L 45.5 10.5 C 47 13, 46.5 17.5, 43.5 19.5`;
}

/** The same head, dropped and pushed forward for the stretch — the identical
 *  ears, brow and muzzle, translated by (-3, +15), so the animal mid-stretch is
 *  recognisably the animal that was sitting a second ago. */
const HEAD_DROP = { x: -3, y: 15 } as const;

function headLow(flick: number): string {
  return `L 26.5 20 L 32 24 C 34 23.2, 36.5 23.2, 38.5 24.2 L ${41 + flick * 2.4} ${
    18 + flick * 2.2
  } L 42.5 25.5 C 44 28, 43.5 32.5, 40.5 34.5`;
}

/**
 * The four body contours.
 *
 * Each is the outline main's single cat used, with the belly dropped and the
 * chest pushed out — the brief is two fat cats, and the original was drawn
 * lean. The legs shortened to match: on a deeper body the same leg length
 * turns a cat into a table.
 */
function sitBody(flick: number): string {
  return `M 11 22 C 5.5 25, 5.5 32.5, 11.5 33.5 C 11.5 25, 15.5 19.5, 22 18.5
   C 27 17.8, 28.5 16, 29 12 ${head(flick)}
   C 42 21, 41.5 23.5, 41.5 26.5 L 41.5 36.5 L 19.5 36.5 C 11.5 36.5, 9.5 35, 11.5 33.5`;
}

function walkBody(flick: number): string {
  return `M 13.5 26 C 12.5 20.5, 15 18, 20.5 17.5 C 26 17, 28.5 16, 29 12 ${head(flick)}
   C 42 21, 41 23.5, 41 27.5
   C 40 30, 34 30.4, 22 30.4 C 16.5 30.4, 14 29, 13.5 26`;
}

/**
 * The stretch: rump up, back hollowed, chest and head low and forward. Closed,
 * because unlike the sit and the walk the belly line here is the long edge that
 * carries the pose, and leaving it open lets the coat wash bleed out of it.
 */
function stretchBody(flick: number): string {
  return `M 8.5 30.5 C 6 24.5, 8.5 18, 15 17.6
   C 20.5 17.2, 24.5 21.5, 26 27 ${headLow(flick)}
   C 38.5 36.4, 30 36.8, 20 36
   C 12.5 35.4, 9.5 32.8, 8.5 30.5 Z`;
}

/**
 * Stretch legs: the forelegs reaching down and forward off a chest that is
 * already on the floor, and the hind pair braced straight under the raised
 * rump. Laid out by hand rather than swung off the walk cycle, because between
 * them and the hollowed back they are the whole read of the pose.
 *
 * The paws stay *behind* the muzzle, which is the one thing this drawing cannot
 * afford to get wrong: a first pass ran them out past the nose, anatomically
 * closer to a real stretch and, at 50px, indistinguishable from two sticks
 * coming out of the cat's face.
 */
const STRETCH_LEGS = [
  { x: 33.5, y: 35, fx: 38.5, fy: 38.4 },
  { x: 30, y: 35.6, fx: 34.8, fy: 39 },
  { x: 13.5, y: 32.8, fx: 12.6, fy: 37.4 },
  { x: 17.5, y: 34.4, fx: 17.4, fy: 38 },
] as const;

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
 * The cap, drawn between the two ear tips and sitting on the skull line the
 * `HEAD` contour already establishes (y ≈ 8.2–9.2 across x 35–41.5). It is the
 * police cat's only distinguishing mark, so it has to read at 50px wide: a
 * crown, the band under it and a peak thrown forward over the eye — three
 * strokes, no fill, same weight as the animal it sits on.
 *
 * Only drawn on the standing poses. The police cat escorts and leaves; it never
 * curls up, and a cap positioned for an upright head lands in mid-air once the
 * body lies down.
 */
const CAP_CROWN = "M 33.6 9.2 C 34.6 5.2, 41.4 5, 42.6 9.4";
const CAP_BAND = "M 33 9.5 L 43.2 9.7";
const CAP_PEAK = "M 42.4 9.6 L 46.8 10.9";

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

/**
 * One cat, in its own local 50×42 box, facing right.
 *
 * The tabby's markings are plain short strokes rather than shapes fitted to the
 * contour. In a drawing with no fill there is nothing for a marking to spill
 * out of, so they only have to be placed inside the body — which is why they
 * can stay this simple. Each is positioned per pose, because a stripe that
 * follows the spine while the cat is sitting is in mid-air once it lies down.
 */
function Cat({ pose, phase, blinking, variant, flick = 0 }: Omit<CompanionCatProps, "scale">) {
  const tabby = variant === "tabby";
  const sway = Math.sin(phase * Math.PI * 2);
  /** The tail carries the twitch as well as the ear: a flicking cat lashes
   *  wider, and the same number drives both so the two read as one impulse.
   *  The boost is modest because the tail's control points already sit close to
   *  the left edge of the drawing box — the ear is the loud half of a flick,
   *  and it has room to move. */
  const lash = sway * (1 + flick * 0.6);

  /** The solid coat. Applied to the body contour only — never to the tail or
   *  the legs, which are open strokes that a fill would close into blobs. */
  const coat = tabby ? STROKE : { ...STROKE, fill: "currentColor", fillOpacity: COAT_WASH };

  const cap =
    variant === "police" ? (
      <g {...STROKE}>
        <path d={CAP_CROWN} />
        <path d={CAP_BAND} />
        <path d={CAP_PEAK} />
      </g>
    ) : null;

  /** One eye, one muzzle line, positioned relative to the upright head so the
   *  stretch can reuse them by passing the head's own offset. */
  const faceAt = (shut: boolean, dx = 0, dy = 0) => (
    <>
      {shut ? (
        <path {...STROKE} d={`M ${39.6 + dx} ${14.2 + dy} q 1.4 1.2 2.8 0`} />
      ) : (
        <circle cx={41 + dx} cy={14.2 + dy} r="1.3" fill="var(--accent)" stroke="none" />
      )}
      <path {...STROKE} d={`M ${45.6 + dx} ${16.6 + dy} L ${44 + dx} ${17.8 + dy}`} />
    </>
  );

  const face = faceAt(blinking);

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

  if (pose === "stretch") {
    return (
      <g>
        <path {...coat} d={stretchBody(flick)} />
        {/* Tail up and back over the raised rump — the counterweight that stops
            a hollowed back reading as a cat that has been stepped on. */}
        <path
          {...STROKE}
          d={`M 8.5 30.5 C 3.5 28, ${2.2 + lash} ${21 - lash}, ${5.5 + lash * 1.6} ${16.5 - lash}`}
        />
        {tabby ? (
          <g {...STROKE}>
            {/* Striping follows the new spine; the old sit/walk placements sit
                in mid-air once the back changes shape. */}
            <path d="M 15.5 19 L 15 23.4" />
            <path d="M 19.5 19.4 L 19 23.8" />
            <path d="M 23.5 22 L 23.2 26" />
            <path d={`M ${4 + lash * 0.8} 24.5 l 2.4 0.8`} />
            <path d={`M ${2.8 + lash * 1.2} 20 l 2.4 0.9`} />
          </g>
        ) : null}
        {faceAt(blinking, HEAD_DROP.x, HEAD_DROP.y)}
        {/* No cap: the police cat escorts and leaves, it never stretches, and a
            cap placed for an upright head lands in mid-air on this one. */}
        {STRETCH_LEGS.map(({ x, y, fx, fy }) => {
          const toeX = x + (fx - x) * 0.78;
          const toeY = y + (fy - y) * 0.78;
          return tabby ? (
            <g key={x}>
              <path {...STROKE} d={`M ${x} ${y} L ${toeX.toFixed(2)} ${toeY.toFixed(2)}`} />
              <ellipse {...STROKE} cx={fx} cy={fy} rx={2.1} ry={1.5} />
            </g>
          ) : (
            <path key={x} {...STROKE} d={`M ${x} ${y} L ${fx} ${fy}`} />
          );
        })}
      </g>
    );
  }

  if (pose === "walk") {
    // Front and back pairs swing in opposition, which is what makes four
    // straight lines read as a gait rather than as a table.
    const swing = sway * 2;
    return (
      <g>
        <path {...coat} d={walkBody(flick)} />
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
        {cap}
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

  /*
   * Sitting, and the two things a sitting cat does with a front paw.
   *
   * `groom` washes: the near foreleg comes up to the muzzle and the eyes shut,
   * because a cat cleaning itself is never looking at you. `bat` reaches: the
   * same leg goes out low and forward, patting at whatever is in front of it —
   * which, for the tabby, is the grey one's tail.
   *
   * Both keep the far leg and boot exactly where the plain sit has them, so the
   * animal is visibly the same animal doing one thing differently.
   */
  const grooming = pose === "groom";
  const batting = pose === "bat";
  /** The batting paw pats back and forth off the same phase that sways the
   *  tail, so a batting cat has one rhythm rather than two. Carried high enough
   *  to clear the chest: a reach at belly height disappears inside the grey
   *  one's coat wash and reads as a stub. */
  const paw = 45.2 + sway * 1.5;

  return (
    <g>
      <path {...coat} d={sitBody(flick)} />
      {/* The tail is the cat's whole emotional range while it is sitting still,
          so it carries all of the idle movement and the body carries none. */}
      <path
        {...STROKE}
        d={`M 11.5 33.5 C 3.5 34, ${1 + lash * 0.9} ${25 - lash}, ${6.5 + lash * 1.6} ${20.5 - lash * 1.2}
            C ${8.5 + lash * 1.6} ${18.9 - lash}, ${10.5 + lash} ${19.6 - lash * 0.8},
            ${10.5 + lash * 0.6} ${21.6 - lash * 0.5}`}
      />
      {tabby ? (
        <g {...STROKE}>
          {/* Stripes down the back and haunch while seated. */}
          <path d="M 15.5 23.5 L 13.8 27" />
          <path d="M 19 20.6 L 17 24.4" />
          <path d="M 23.5 19 L 22 23" />
          {/* Two rings near the tail's base, which is the part that stays put. */}
          <path d={`M ${4.4 + lash * 0.5} ${30.5} l 2.4 0.9`} />
          <path d={`M ${2.2 + lash * 0.8} ${26} l 2.5 0.6`} />
        </g>
      ) : null}
      {faceAt(grooming || blinking)}
      {cap}
      {/* Seated, only the front legs show — so the tabby gets two boots, sat
          on the body's own bottom edge rather than hanging below it. */}
      {grooming ? (
        // Bent at the elbow and carried out before it comes up, so it reads as
        // a leg rather than a rod, and it finishes at the *mouth* — a paw that
        // stops at the eye is a cat poking itself in the eye.
        <>
          <path {...STROKE} d={`M 34.6 30.4 C 39 29, 43.5 25, ${tabby ? 43.1 : 43.4} 20` } />
          {tabby ? <ellipse {...STROKE} cx="43" cy="18.9" rx="1.9" ry="1.4" /> : null}
        </>
      ) : batting ? (
        <>
          <path
            {...STROKE}
            d={`M 34.5 29.5 C 38.5 28.8, 42 27.6, ${(tabby ? paw - 1.6 : paw).toFixed(2)} 26.8`}
          />
          {tabby ? <ellipse {...STROKE} cx={paw.toFixed(2)} cy={26.9} rx={1.9} ry={1.4} /> : null}
        </>
      ) : (
        <path {...STROKE} d={`M 34.5 ${tabby ? 33.4 : 36.5} L 34.5 26.5`} />
      )}
      {tabby ? (
        <g {...STROKE}>
          {grooming || batting ? null : <ellipse cx="34.5" cy="35" rx="2.2" ry="1.5" />}
          <ellipse cx="39.4" cy="35" rx="2.2" ry="1.5" />
        </g>
      ) : null}
      {/* The grey one has no boots, so his far leg has to be drawn for the two
          busy poses or he sits on one leg. */}
      {!tabby && (grooming || batting) ? (
        <path {...STROKE} d="M 39.4 36.5 L 39.4 27" />
      ) : null}
    </g>
  );
}

export function CompanionCat({
  variant,
  pose,
  phase,
  blinking,
  flick = 0,
  scale = 1,
}: CompanionCatProps) {
  return (
    <svg
      viewBox={`0 0 ${CAT_W} ${CAT_H}`}
      width={CAT_W * scale}
      height={CAT_H * scale}
      aria-hidden="true"
      focusable="false"
    >
      <Cat variant={variant} pose={pose} phase={phase} blinking={blinking} flick={flick} />
    </svg>
  );
}

export default CompanionCat;
