"use client";

import { CAT_H, CAT_W } from "./CompanionCat";

/**
 * Where a cat is allowed to be, and what colour it has to be to be seen there.
 *
 * Both questions are answered by hit-testing the page rather than by modelling
 * it. The alternative — keeping a list of the rectangles the cats must dodge —
 * means a second, always-stale copy of the layout, and it would have to be
 * rebuilt on every resize, scroll, disclosure toggle and font swap. One
 * `elementsFromPoint` call asks the browser the same question against the
 * layout it has already computed.
 *
 * The cost of that is real, so it is spent sparingly: nothing here runs per
 * frame. Placement is probed only at the moment a cat decides where to settle,
 * and the tone sample is throttled by its caller to a few times a second. While
 * a cat is actively trailing the pointer it is allowed to cross anything —
 * brief overlap is what makes it a companion rather than a cursor. It is
 * *resting* on top of a paragraph that reads as broken.
 */

export interface Point {
  readonly x: number;
  readonly y: number;
}

/** The companion's own root, marked so the probes can look straight through
 *  it. Without this a cat reads its own button as content and flees itself. */
const SELF = "[data-companion]";

/**
 * What a cat must not park on.
 *
 * Deliberately a tag list rather than "any element with text". `elementFromPoint`
 * returns the innermost box containing the point, so a layout container really
 * is whitespace even though its subtree is full of prose, while a `<p>` is
 * content anywhere inside its box — including the ragged end of its last line,
 * which is close enough to the text to be worth avoiding anyway.
 *
 * `[tabindex]` is narrowed to exclude `-1`: `<main>` carries `tabindex="-1"` as
 * a focus landing point for the skip link, and an unnarrowed selector would
 * match every point on the page and send both cats permanently into the corner.
 */
const OCCUPIED = [
  // Chrome as well as content: the site header is sticky, so a cat that parked
  // on it would ride down the page glued to a bar it does not belong to.
  "header",
  "a",
  "button",
  "input",
  "select",
  "textarea",
  "label",
  "summary",
  "details",
  "form",
  "img",
  "svg",
  "canvas",
  "video",
  "iframe",
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "li",
  "dt",
  "dd",
  "blockquote",
  "figure",
  "figcaption",
  "pre",
  "code",
  "table",
  "[role='button']",
  "[role='link']",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

/** How close to the viewport edge a cat may sit. Enough that it is never
 *  clipped, small enough that the page gutter still counts as whitespace. */
const EDGE = 8;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/* -------------------------------------------------------------------------- */
/* Where a cat can actually be seen                                            */
/*                                                                             */
/* "Inside the viewport" is not the same question as "visible", and conflating  */
/* the two is what made the cats vanish. Two distinct ways to lose an animal:   */
/*                                                                             */
/*  1. Off the viewport. `html` and `body` carry `overflow-x: clip`, so a fixed */
/*     element parked past an edge produces no scrollbar and no other tell —    */
/*     the cat is simply not there, and nothing about the page hints at it.     */
/*  2. Behind the chrome. The site header is `sticky top-0 z-50` and opaque     */
/*     (`bg-ground`); the entire companion layer is `fixed inset-0 z-40`. Any   */
/*     cat in the top band is painted *under* a solid bar. The old probe could  */
/*     not see this at all: it samples the cat's belly and feet — the bottom    */
/*     60% of the box — so a spot whose feet clear the header by a pixel reads  */
/*     as "clear" while the animal's head and shoulders are behind it.          */
/*                                                                             */
/* Both are answered here, once, by a single pair of bounds that every target   */
/* and every settle position is run through.                                    */
/* -------------------------------------------------------------------------- */

/** The height of the page chrome that paints above the companion layer. */
let overlayTop = 0;

/**
 * Re-measure the band at the top of the viewport the cats cannot be seen in.
 *
 * Measured rather than hardcoded, so it cannot drift from the header's actual
 * height, and only called when the page can have moved (loop start, scroll,
 * resize) rather than per frame.
 */
export function refreshSafeArea(): void {
  let top = 0;
  const header = document.querySelector("header");
  if (header) {
    const rect = header.getBoundingClientRect();
    // Only counts while it is actually pinned across the top of the viewport;
    // a header that has scrolled away covers nothing.
    if (rect.top <= EDGE && rect.bottom > 0) top = rect.bottom;
  }
  // Whatever the chrome is doing, the cats still need somewhere to be.
  overlayTop = clamp(top, 0, (document.documentElement.clientHeight || window.innerHeight) / 3);
}

/** The top of the band a cat may occupy, in viewport coordinates. */
export function safeTop(): number {
  return overlayTop;
}

/**
 * The box the cats are actually positioned inside.
 *
 * `documentElement.clientWidth`, not `window.innerWidth`: the companion's root
 * is `position: fixed; inset: 0`, so its coordinate space is the initial
 * containing block — the viewport *minus* any classic scrollbar. Measuring with
 * `innerWidth` lets the right-hand clamp put a cat's last few pixels underneath
 * the scrollbar, and puts every corner-anchored target the same few pixels out
 * of step with the furniture it is supposed to line up with.
 */
export function viewport(): { width: number; height: number } {
  const root = document.documentElement;
  return {
    width: root.clientWidth || window.innerWidth,
    height: root.clientHeight || window.innerHeight,
  };
}

/** Every position a cat may hold, as the bounds of its top-left corner. */
function bounds() {
  const view = viewport();
  const minY = overlayTop + EDGE;
  return {
    minX: EDGE,
    maxX: Math.max(EDGE, view.width - CAT_W - EDGE),
    minY,
    maxY: Math.max(minY, view.height - CAT_H - EDGE),
  };
}

export function clampToViewport(point: Point): Point {
  const box = bounds();
  return {
    x: clamp(point.x, box.minX, box.maxX),
    y: clamp(point.y, box.minY, box.maxY),
  };
}

/**
 * Drag a cat that the viewport has moved out from under back into view, and
 * report whether it had to.
 *
 * Invalidating the *targets* on resize was never enough on its own: a cat holds
 * its own position, and there is at least one branch of the loop that tells it
 * to stay exactly where it is (trailing a pointer already inside its personal
 * space). Shrink the window under that cat — a rotation, a devtools split, a
 * window drag between displays — and it stays off-screen indefinitely. Called
 * once per animal per frame, and does nothing in the overwhelming case where
 * the cat is already somewhere it can be seen.
 */
export function keepInView(pos: { x: number; y: number }): boolean {
  const safe = clampToViewport(pos);
  if (safe.x === pos.x && safe.y === pos.y) return false;
  pos.x = safe.x;
  pos.y = safe.y;
  return true;
}

/** The topmost element at this point that is not part of the companion. */
export function elementBehind(x: number, y: number): Element | null {
  const stack = document.elementsFromPoint(x, y);
  for (let i = 0; i < stack.length; i += 1) {
    if (!stack[i].closest(SELF)) return stack[i];
  }
  return null;
}

function occupied(x: number, y: number): boolean {
  const element = elementBehind(x, y);
  return element !== null && element.closest(OCCUPIED) !== null;
}

/**
 * Three probes, not one: the cat's middle and both of the points its feet
 * actually rest on. A single centre sample lets a cat straddle the edge of a
 * paragraph with half of it on the text, which is the case this exists to stop.
 */
export function isClearSpot(point: Point): boolean {
  const { x, y } = point;
  // Somewhere it cannot be seen is not a spot, whatever is drawn there. The
  // half-pixel slack is for values that have already been through
  // `clampToViewport` and came back at the bound itself.
  const box = bounds();
  if (x < box.minX - 0.5 || x > box.maxX + 0.5) return false;
  if (y < box.minY - 0.5 || y > box.maxY + 0.5) return false;
  return (
    !occupied(x + CAT_W / 2, y + CAT_H * 0.6) &&
    !occupied(x + 6, y + CAT_H - 6) &&
    !occupied(x + CAT_W - 6, y + CAT_H - 6)
  );
}

/**
 * Candidate whitespace near a spot the cat cannot have, nearest first.
 *
 * The page gutters lead because they are the one region this layout guarantees
 * is empty at every width: `.shell` caps the content column and pads it with
 * `--gutter`, so the margins outside it hold nothing but ground. The vertical
 * offsets are the fallback for narrow viewports, where the gutter is thinner
 * than a cat and the only whitespace left is the space between blocks.
 */
function nearbyWhitespace(want: Point): Point[] {
  const leftGutter = EDGE;
  const rightGutter = Math.max(EDGE, viewport().width - CAT_W - EDGE);
  const gutters =
    Math.abs(want.x - leftGutter) <= Math.abs(want.x - rightGutter)
      ? [leftGutter, rightGutter]
      : [rightGutter, leftGutter];

  // Every offset on the near side before any on the far side, so a pair that
  // both get bumped out of the text end up in the same margin rather than one
  // on each side of the page.
  const stride = CAT_H + 26;
  const candidates: Point[] = [];
  for (const x of gutters) {
    for (const dy of [0, -stride, stride, -stride * 2, stride * 2]) {
      candidates.push(clampToViewport({ x, y: want.y + dy }));
    }
  }
  // Straight up and down from where it wanted to be, for the case where both
  // gutters are content (a full-bleed section) but the gap above it is not.
  for (const dy of [-stride, stride, -stride * 2, stride * 2]) {
    candidates.push(clampToViewport({ x: want.x, y: want.y + dy }));
  }
  return candidates;
}

/** Two cats asleep in the same 50px box read as one badly drawn cat, and the
 *  probe has no way to see that coming: the first one is invisible to a hit
 *  test that already looks through the companion's own subtree. */
function overlaps(a: Point, b: Point): boolean {
  return Math.abs(a.x - b.x) < CAT_W * 0.7 && Math.abs(a.y - b.y) < CAT_H * 0.7;
}

/**
 * The nearest place to `want` a cat may actually sleep, falling back to `home`
 * — the bottom corner, which is furniture rather than content and is where the
 * toolkit panel is anchored anyway. `avoid` is the spot the other cat has
 * already claimed.
 *
 * Bounded work: at most fifteen candidates × three hit tests, and only ever at
 * the moment a cat settles.
 */
export function findClearSpot(want: Point, home: Point, avoid?: Point): Point {
  const free = (point: Point) => (!avoid || !overlaps(point, avoid)) && isClearSpot(point);
  const wanted = clampToViewport(want);
  if (free(wanted)) return wanted;
  for (const candidate of nearbyWhitespace(wanted)) {
    if (free(candidate)) return candidate;
  }
  return clampToViewport(home);
}

/** The three scopes a section can be in. `tone-base` is the same alias set the
 *  root already carries, so it is only listed to stop `closest` walking past a
 *  base section into something outside it. */
const TONES = ".tone-contrast,.tone-deep,.tone-base";

/**
 * Repoint a cat's own semantic aliases at whatever section it is currently over.
 *
 * The cats are `position: fixed`, so they inherit their colour from the root
 * scope — the quiet one — no matter what they are flying across. Over a
 * `tone="contrast"` section in day theme that is ink line work on an ink
 * ground, which is the bug FB-4 reported. Toggling the tone class on the cat's
 * *own* wrapper repoints `--fg`, `--fg-muted`, `--accent` and `--rule-color`
 * for that one element, which is precisely what the tone layer is for: no new
 * token, no second palette, and it stays correct in both themes because the
 * theme decides what "loud" resolves to.
 *
 * `tone-deep` is sampled as well as `tone-contrast`, and it did not have to be
 * until round 5. The line work reads fine on either quiet ground, so for four
 * rounds only the loud one mattered. Then the cats became opaque: they knock
 * themselves out of the page in `var(--ground)`, and `--ground` on a `deep`
 * section is a visible half-step darker than the base one (`#e3e8ec` against
 * `#edf0f2`). A cat carrying the base ground across Philosophy, Skills or
 * Contact would be a paler cat-shaped patch on a darker page — which is the
 * same class of bug as the transparent cat, arrived at from the other side.
 *
 * Written straight to the DOM rather than through React state: it changes with
 * position, and position is deliberately not in React.
 */
export function syncTone(node: HTMLElement | null, at: Point): void {
  if (!node) return;
  const zone = elementBehind(at.x, at.y)?.closest(TONES) ?? null;
  node.classList.toggle("tone-contrast", zone?.classList.contains("tone-contrast") === true);
  node.classList.toggle("tone-deep", zone?.classList.contains("tone-deep") === true);
}
