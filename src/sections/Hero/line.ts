/**
 * The clothesline below 1024 (round 25), described once.
 *
 * A line is strung between two things that stand in the ground: bamboo and
 * bamboo on a phone, bamboo and the pine on a tablet. It crosses the yard as
 * many times as the width needs (three passes on a phone, two on a tablet),
 * and each pass is a parabola: tied on `left` px below the pass's top at the
 * left pole and `right` px at the right one, hanging `sag` px below the
 * straight line between them at mid-span. Because the passes slope opposite
 * ways and sag by different amounts, nothing sits on a ruler.
 *
 * Everything that has to agree with the curve is derived from it here: the
 * drawn path (`passPath`), and where each hung thing's string meets the line
 * (`hangs`), which Hero.tsx and ChapterTags.tsx hand to CSS as custom
 * properties. A thing hangs at `t`, a fraction of the way from the left pole
 * to the right. That fraction is the middle of its grid column (globals.css,
 * `.hero-yard`), so it holds at every width in the band with nothing fitted
 * per width; e2e/hero.spec.ts measures the strings against the drawn path.
 *
 * From 1024 the line is the scenery's own (Scenery.tsx), and globals.css
 * works each string out from that curve.
 */

export interface Pass {
  /** px below the pass's top where the line ties on at the left pole. */
  readonly left: number;
  /** The same at the right pole. */
  readonly right: number;
  /** px the line hangs below the chord between its ends, at mid-span. */
  readonly sag: number;
}

export interface Hang {
  /** Which pass it hangs from, counting from 0. */
  readonly pass: number;
  /** Where along the pass: 0 at the left pole, 1 at the right. */
  readonly t: number;
  /** Its string, from the line down to the top of its paper, in px. */
  readonly string: number;
}

export interface Yard {
  readonly passes: readonly Pass[];
  /** The four chapter tags, in reading order. */
  readonly tags: readonly [Hang, Hang, Hang, Hang];
  /** My field tag. */
  readonly field: Hang;
}

/**
 * Round 28: 2003 and 2021 are clothespinned straight to the line (their
 * "string" is the few px between the line and the paper's top, which the
 * clothespin's legs cover); 2018 and 2025 hang on strings.
 */
export const PINNED = 6;

/**
 * From 1024 every string's drop is worked out from the scenery's curve
 * (globals.css), but its length is its own: the two pinned chapters sit on
 * the line, the stub and the receipt hang below it, and my field tag hangs
 * lowest, on the longest string. The row is as tall as its tallest hung
 * thing, string and all (the receipt), and the Moon vignette under my words
 * must still make a 1440×900 screen, so keep the receipt's string short.
 */
export const WIDE = { tags: [PINNED, 20, PINNED, 12], field: 32 } as const;

/**
 * Phone: two columns. Pass 1 runs down to the right and carries 2003 and
 * 2018; pass 2 comes back down to the left with 2021 and 2025; pass 3 carries
 * my field tag from its middle.
 */
export const PHONE: Yard = {
  passes: [
    { left: 34, right: 84, sag: 22 },
    { left: 58, right: 16, sag: 34 },
    { left: 30, right: 50, sag: 20 },
  ],
  tags: [
    { pass: 0, t: 0.25, string: PINNED },
    { pass: 0, t: 0.75, string: 34 },
    { pass: 1, t: 0.25, string: PINNED },
    { pass: 1, t: 0.75, string: 24 },
  ],
  field: { pass: 2, t: 0.5, string: 18 },
};

/**
 * Tablet: twenty columns. Pass 1 carries all four tags, five columns each;
 * pass 2 comes back lower and carries my field tag, which takes the last nine
 * columns (so its middle is 15.5 twentieths along). My words sit under pass 2
 * in the first eleven.
 */
export const TABLET: Yard = {
  passes: [
    { left: 40, right: 70, sag: 38 },
    { left: 35, right: 50, sag: 29 },
  ],
  tags: [
    { pass: 0, t: 0.125, string: PINNED },
    { pass: 0, t: 0.375, string: 30 },
    { pass: 0, t: 0.625, string: PINNED },
    { pass: 0, t: 0.875, string: 22 },
  ],
  field: { pass: 1, t: 0.775, string: 20 },
};

/** The line's height below its pass's top, `t` of the way across. */
export function lineY(pass: Pass, t: number): number {
  return pass.left + (pass.right - pass.left) * t + 4 * pass.sag * t * (1 - t);
}

/** The lowest the line gets between `from` and `to` of the way across. */
export function lineFloor(pass: Pass, from = 0, to = 1): number {
  let low = 0;
  for (let i = 0; i <= 40; i += 1) low = Math.max(low, lineY(pass, from + ((to - from) * i) / 40));
  return low;
}

/**
 * The pass as an SVG path in a `0 0 100 h` box stretched to the yard's width
 * (so x is a percentage and y is a pixel). A quadratic with its control point
 * mid-span is exactly the parabola `lineY` describes.
 */
export function passPath(pass: Pass): string {
  const control = (pass.left + pass.right) / 2 + 2 * pass.sag;
  return `M0 ${pass.left}Q50 ${control} 100 ${pass.right}`;
}

const px = (n: number) => `${Math.round(n * 10) / 10}px`;

/**
 * A hung thing's custom properties: where its string meets the line (px
 * below the top of its pass's row) and how long the string is, on a phone
 * and on a tablet. `phone` and `tablet` are its entries in PHONE and TABLET.
 */
export function hangVars(phone: Hang, tablet: Hang, wide: number): Record<string, string> {
  return {
    "--string-lg": px(wide),
    "--y-phone": px(lineY(PHONE.passes[phone.pass], phone.t)),
    "--string-phone": px(phone.string),
    "--y-tablet": px(lineY(TABLET.passes[tablet.pass], tablet.t)),
    "--string-tablet": px(tablet.string),
  };
}

/**
 * How a hung thing reads them: `--y` and `--string` are the phone's below
 * 640 and the tablet's from there; from 1024 the string is its own
 * (`WIDE`) and globals.css works the drop out from the scenery's line itself.
 */
export const HUNG =
  "[--y:var(--y-phone)] [--string:var(--string-phone)] sm:[--y:var(--y-tablet)] sm:[--string:var(--string-tablet)] lg:[--string:var(--string-lg)]";
