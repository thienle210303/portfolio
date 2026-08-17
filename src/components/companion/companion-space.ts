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

export function clampToViewport(point: Point): Point {
  return {
    x: clamp(point.x, EDGE, Math.max(EDGE, window.innerWidth - CAT_W - EDGE)),
    y: clamp(point.y, EDGE, Math.max(EDGE, window.innerHeight - CAT_H - EDGE)),
  };
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
  if (x < 0 || y < 0) return false;
  if (x + CAT_W > window.innerWidth || y + CAT_H > window.innerHeight) return false;
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
  const rightGutter = Math.max(EDGE, window.innerWidth - CAT_W - EDGE);
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
 * Written straight to the DOM rather than through React state: it changes with
 * position, and position is deliberately not in React.
 */
export function syncTone(node: HTMLElement | null, at: Point): void {
  if (!node) return;
  const behind = elementBehind(at.x, at.y);
  node.classList.toggle("tone-contrast", behind?.closest(".tone-contrast") != null);
}
