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

/**
 * Whatever `setReservedRects`/`setControlRects` need out of a rectangle —
 * the four edges, nothing else. A real `DOMRect` satisfies this
 * structurally, so a caller with one on hand (the bubbles, measured because
 * their size is content-dependent) can still just pass it straight through.
 * The point of naming a narrower shape is the *other* kind of caller: the
 * lead's own control rect is computed directly from state — its position
 * and a compile-time-constant box — and never needs to touch the DOM at
 * all, so it should not have to fake a whole `DOMRect` (`x`, `y`, `width`,
 * `height`, `toJSON`) just to satisfy a type it only ever reads four fields
 * of.
 */
export interface RectLike {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
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
 * Rects the placement probe must also treat as occupied — the duet's own
 * speech bubbles and mini-Thien's caption.
 *
 * They cannot be found the way ordinary content is: `elementBehind` walks
 * straight through anything inside `[data-companion]` (see `SELF` above), on
 * purpose — without that, the two cats would each read the other as
 * "occupied" and never be able to stand near one another. That same rule
 * makes the companion's own bubbles invisible to `occupied()`, which is
 * exactly the reported bug: a cat could rest on top of, or under, the very
 * bubble a scene had just opened.
 *
 * So this is a second, narrower list, kept out of band from the DOM scan and
 * populated only by `Companion.tsx`, once a frame, from the bounding boxes of
 * whichever bubbles or captions are actually mounted — empty the rest of the
 * time, which is the common case and costs this module nothing then.
 */
const EMPTY_RECTS: readonly RectLike[] = [];
let reserved: readonly RectLike[] = EMPTY_RECTS;

export function setReservedRects(rects: readonly RectLike[]): void {
  reserved = rects.length > 0 ? rects : EMPTY_RECTS;
}

function reservedAt(x: number, y: number): boolean {
  for (const rect of reserved) {
    if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) return true;
  }
  return false;
}

/**
 * The companion's own fixed controls a *different* cat must never be placed
 * on top of — currently just the toolkit toggle, which is the lead cat's own
 * button. Axe caught this one live: `target-size` flagged the toggle with
 * only a sliver of its target left clickable, because the follower had been
 * placed squarely over it.
 *
 * Deliberately **not** folded into `reserved`/`isClearSpot` above, and that
 * is not an oversight — a bubble is always offset a few pixels clear of the
 * cat it belongs to, so nothing that reads a bubble as occupied ever asks
 * about a point a cat is actually standing on. The toolkit toggle *is* the
 * lead cat's own current position. Wiring it into `isClearSpot` would make
 * the lead read its own settled spot as occupied by itself on every frame
 * `restingPlaces()` re-validates a held mood (`isClearSpot(held.spots.lead)`
 * in `Companion.tsx`), which would drop every mood the instant it was taken
 * up. So this is its own registry, consulted only by the two functions that
 * ever compute one cat's position *relative to the other's* — `mateSpot`
 * (companion-moods.ts) and `findClearSpot` below — never by a cat validating
 * its own spot.
 *
 * This one is never measured off the DOM. It was, for one round, on a
 * 320ms-then-120ms throttle — and it went stale under load exactly when it
 * mattered most: axe caught the follower placed against a coordinate the
 * lead had already walked away from, because a `getBoundingClientRect()`
 * on a timer is a photograph, and a photograph taken too rarely under
 * contention is a photograph of the past. `Companion.tsx`'s own rAF loop
 * already knows the lead's position every frame — it is what writes the
 * `transform` — so the caller derives this rect straight from that state
 * (`grey.pos` plus the fixed, compile-time padded box a roaming lead is
 * drawn in) instead of asking the browser to re-measure a box whose shape
 * never changes. Zero reflow, zero staleness window: there is no frame this
 * rect can be older than the position that produced it.
 */
const EMPTY_CONTROL_RECTS: readonly RectLike[] = [];
let controlRects: readonly RectLike[] = EMPTY_CONTROL_RECTS;

export function setControlRects(rects: readonly RectLike[]): void {
  controlRects = rects.length > 0 ? rects : EMPTY_CONTROL_RECTS;
}

/** Same three-point probe `isClearSpot` uses, for the same reason: a single
 *  centre sample would let a cat straddle the edge of a control with half of
 *  it clear. */
export function clearsControls(point: Point): boolean {
  const { x, y } = point;
  const probes: Point[] = [
    { x: x + CAT_W / 2, y: y + CAT_H * 0.6 },
    { x: x + 6, y: y + CAT_H - 6 },
    { x: x + CAT_W - 6, y: y + CAT_H - 6 },
  ];
  for (const rect of controlRects) {
    for (const probe of probes) {
      if (probe.x >= rect.left && probe.x <= rect.right && probe.y >= rect.top && probe.y <= rect.bottom) {
        return false;
      }
    }
  }
  return true;
}

/**
 * WCAG 2.5.8's target-size minimum (24px) plus a small safety margin — the
 * least gap `keepClearOfControl` below will ever leave between a cat's box
 * and a registered control rect.
 *
 * `clearsControls` above only ever rejects or approves a *candidate* a
 * placement function is choosing between — `mateSpot`, `sideStep`. That
 * guarantees the follower is never *placed* onto the toggle, but it cannot
 * guarantee the pair never end up too close, because nothing stops the
 * *lead* from independently walking towards wherever the follower already
 * stands: `elementBehind` deliberately looks straight through the
 * companion's own subtree, so the two cats have always looked through each
 * other by design, and a mood or tour stop choosing the lead's next spot
 * has no idea the follower is there. Axe caught exactly this: a huddle
 * scene pulling the pair together, from the lead's side rather than the
 * follower's.
 *
 * So the real invariant cannot live at *placement* time at all — it has to
 * be re-asserted after both cats' positions are final for the frame,
 * regardless of which of the many paths chose them. `keepClearOfControl` is
 * that correction: called once a frame, it only ever moves the follower —
 * the lead is the interactive element, and a control that visibly recoiled
 * from its own decoration would be a stranger bug than the one this fixes.
 */
export const TOGGLE_CLEARANCE = 24 + 4;

/** The follower's own drawn box, and its true axis-aligned gap to `rect` —
 *  negative when they already overlap on that axis, which `Math.max` here
 *  turns into "how deep", so a genuinely separated pair reports its real
 *  clearance and an overlapping pair reports a negative one, never a false
 *  positive from comparing the wrong pair of edges. */
function gapToRect(box: RectLike, rect: RectLike): number {
  const dxOut = Math.max(box.left - rect.right, rect.left - box.right);
  const dyOut = Math.max(box.top - rect.bottom, rect.top - box.bottom);
  return Math.max(dxOut, dyOut);
}

function catBox(pos: Point): RectLike {
  return { left: pos.x, top: pos.y, right: pos.x + CAT_W, bottom: pos.y + CAT_H };
}

/**
 * Push a candidate position for the follower away from `rect` — a
 * registered control, such as the lead's own live button — until its drawn
 * box clears it by at least `TOGGLE_CLEARANCE`. Returns `pos` unchanged
 * when it already does.
 *
 * Four candidates — right, left, below, above — ordered by how little each
 * would actually move her: whichever side of `rect` she is already biased
 * towards on each axis is tried before the far side of either. A follower
 * a couple of pixels short of clearance on her own side is nudged those few
 * pixels, not relocated across the lead entirely because "right" happened
 * to be checked first; the very first version of this function did exactly
 * that, tried in a fixed order regardless of where `pos` already was, and
 * would have visibly teleported her for a near-miss this small ever to
 * come up in a snapshot test.
 *
 * Every candidate is clamped into the viewport *and re-measured after the
 * clamp*, which is where round 10's own bug lived: a clamp that pulls a
 * candidate back towards an edge can silently collapse a gap that was only
 * ever checked before the clamp ran. The first candidate that clears after
 * clamping wins; if a viewport is narrow enough that none of the four do
 * (two cats and 2×28px of margin is over 200px — implausible, not
 * impossible), this returns whichever candidate cleared the most rather
 * than the one it started with, so a cramped viewport still gets the best
 * available answer instead of a known conflict handed back unchanged.
 */
export function keepClearOfControl(pos: Point, rect: RectLike): Point {
  if (gapToRect(catBox(pos), rect) >= TOGGLE_CLEARANCE) return pos;

  const right: Point = { x: rect.right + TOGGLE_CLEARANCE, y: pos.y };
  const left: Point = { x: rect.left - CAT_W - TOGGLE_CLEARANCE, y: pos.y };
  const below: Point = { x: pos.x, y: rect.bottom + TOGGLE_CLEARANCE };
  const above: Point = { x: pos.x, y: rect.top - CAT_H - TOGGLE_CLEARANCE };

  const posOnRight = pos.x + CAT_W / 2 >= (rect.left + rect.right) / 2;
  const posBelow = pos.y + CAT_H / 2 >= (rect.top + rect.bottom) / 2;
  const nearHorizontal = posOnRight ? right : left;
  const farHorizontal = posOnRight ? left : right;
  const nearVertical = posBelow ? below : above;
  const farVertical = posBelow ? above : below;
  const candidates = [nearHorizontal, nearVertical, farHorizontal, farVertical];

  let best = clampToViewport(candidates[0]);
  let bestGap = gapToRect(catBox(best), rect);
  for (const candidate of candidates) {
    const safe = clampToViewport(candidate);
    const gap = gapToRect(catBox(safe), rect);
    if (gap > bestGap) {
      bestGap = gap;
      best = safe;
    }
    if (gap >= TOGGLE_CLEARANCE) return safe;
  }
  return best;
}

/**
 * The widened search `keepClearOfControl` hands off to when its own cheap
 * push lands somewhere it should not — WP-R round 15's own follow-up.
 *
 * The four-candidate push above answers one question — "is there room
 * *immediately* beside this position" — and knows nothing about content, on
 * the assumption (true for the tour and watch spots it was built for) that
 * the caller already probed the *starting* position for content and the
 * ground right around an already-clear spot is itself clear. Extending the
 * correction to spots that were never probed that carefully broke that
 * assumption outright: the push can legitimately land on a paragraph, and
 * accepting it there trades one violation (the toggle) for a worse one
 * (content). Reverting to the original position does not fix anything
 * either — it is exactly the too-close spot the push was trying to escape.
 *
 * The honest answer, per round 9's own lesson about weights and the page —
 * "the weights say what the companion would rather do, the page decides
 * what it can do" — is to keep looking rather than accept either compromise.
 * `candidates` is expected ordered nearest-preferred-first (`standingSpots`'
 * own shape: a coarse sweep of the whole page band, not just the four points
 * immediately around `rect`), and this returns the first one that clears
 * *both* `rect` (by the ordinary `TOGGLE_CLEARANCE` margin) and content (via
 * `isClear`, injected rather than imported so this stays a pure function a
 * test can drive without a browser in the room — the DOM-dependent half of
 * the question is the caller's business, same as every other probe on this
 * layer).
 *
 * A candidate that fails `isClear` is discarded outright, never merely
 * scored — overlapping content is not a "worse but usable" outcome the way
 * a narrow toggle gap is, so it never becomes the running best. If nothing
 * in the whole pool clears the control by the full margin, the content-clear
 * candidate that came *closest* is returned instead of `null` — "distance is
 * always available; overlap never is", so a real resting position, merely
 * short of the preferred gap, beats no answer at all. Only when the pool has
 * no content-clear candidate whatsoever — the whole page band conflicted,
 * which should not happen on a real page — does this return `null`, leaving
 * the caller to fall back to whatever it already had.
 */
export function searchClearOfToggle(
  candidates: readonly Point[],
  rect: RectLike,
  isClear: (point: Point) => boolean,
): Point | null {
  let best: Point | null = null;
  let bestGap = -Infinity;
  for (const candidate of candidates) {
    if (!isClear(candidate)) continue;
    const gap = gapToRect(catBox(candidate), rect);
    if (gap >= TOGGLE_CLEARANCE) return candidate;
    if (gap > bestGap) {
      bestGap = gap;
      best = candidate;
    }
  }
  return best;
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
  const belly = { x: x + CAT_W / 2, y: y + CAT_H * 0.6 };
  const leftFoot = { x: x + 6, y: y + CAT_H - 6 };
  const rightFoot = { x: x + CAT_W - 6, y: y + CAT_H - 6 };
  return (
    !occupied(belly.x, belly.y) &&
    !occupied(leftFoot.x, leftFoot.y) &&
    !occupied(rightFoot.x, rightFoot.y) &&
    !reservedAt(belly.x, belly.y) &&
    !reservedAt(leftFoot.x, leftFoot.y) &&
    !reservedAt(rightFoot.x, rightFoot.y)
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
 * `clearsControls` is deliberately **not** part of `free()`, the check run
 * against `want` and every `nearbyWhitespace` candidate — it was, briefly,
 * and it broke the guided tour. `want` here is very often the *other* cat's
 * own current position (`mateSpot`'s fallback passes the follower's live
 * spot; `restSpots` passes it too), which trails the lead within a few tens
 * of pixels by construction — normal, harmless proximity that is not the
 * same claim as "standing on the toggle". Rejecting it on every frame a
 * tour stop is recomputed (every frame, walking or arrived — see
 * `Companion.tsx`) fed the follower's own moving position back into its own
 * target, and the two never converged. The controls check is applied only
 * to the corner fallback below, where `home` is a fixed point rather than a
 * moving one and cannot create that feedback.
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
  const fallback = clampToViewport(home);
  if (free(fallback) && clearsControls(fallback)) return fallback;
  // The corner itself is never occupied by page content, so failing here
  // means `avoid` — another cat, or a fixed control such as the toolkit
  // toggle — is standing on it. One nudge a full cat-width away, on
  // whichever side `avoid` is not, before genuinely giving up: this
  // function never returns null, so the alternative to a nudge that also
  // fails is handing back a point already known to conflict.
  if (avoid) {
    const nudged = clampToViewport({
      x: fallback.x + (fallback.x >= avoid.x ? CAT_W : -CAT_W),
      y: fallback.y,
    });
    if (!overlaps(nudged, avoid) && clearsControls(nudged)) return nudged;
  }
  return fallback;
}

/* -------------------------------------------------------------------------- */
/* Somewhere else entirely                                                     */
/*                                                                             */
/* `findClearSpot` answers "where near here", which is the right question for   */
/* a cat that is settling down and the wrong one for a scene the visitor has    */
/* just asked for. A play needs a *stage* — a couple of hundred clear pixels    */
/* for a ball to roll across or a cat to run down — and whether one exists is   */
/* a question about the page, not about where the pair happen to be standing    */
/* when the button is pressed. Answering it from their current position is how  */
/* the same button came to give different answers depending on how long the     */
/* toolkit had been open, and how three whole sections came to answer "no room" */
/* to everything: the corner the panel calls them to is one arbitrary spot, and */
/* under Philosophy, Journey and Skills it happens to be full.                  */
/* -------------------------------------------------------------------------- */

/** How many columns the sweep below tries. Five is the two gutters, the middle
 *  of the content column, and the two quarter points — enough to find the
 *  vertical whitespace between blocks, which is where the wide scenes fit. */
const SWEEP_COLUMNS = 5;

/**
 * A coarse sweep of every place on this page a cat could stand, nearest to
 * `near` first.
 *
 * Deliberately does no hit testing of its own: the caller has a more expensive
 * question to ask at each candidate than "is it clear" — whether a whole scene
 * fits there — and wants to stop at the first that answers yes rather than pay
 * for the whole grid every time.
 *
 * The grid itself is a function of the viewport alone, so the *set* of places
 * considered is the same whoever asks and whenever they ask; `near` only
 * decides the order, which is what keeps the pair from crossing the page when
 * there is somewhere to play beside them.
 */
export function standingSpots(near: Point): Point[] {
  const box = bounds();
  const stride = CAT_H + 26;
  const spots: Point[] = [];
  for (let column = 0; column < SWEEP_COLUMNS; column += 1) {
    const x = box.minX + ((box.maxX - box.minX) * column) / (SWEEP_COLUMNS - 1);
    for (let y = box.minY; y < box.maxY + stride; y += stride) {
      spots.push({ x, y: Math.min(y, box.maxY) });
    }
  }
  return spots.sort(
    (a, b) => (a.x - near.x) ** 2 + (a.y - near.y) ** 2 - ((b.x - near.x) ** 2 + (b.y - near.y) ** 2),
  );
}

/* -------------------------------------------------------------------------- */
/* Wandering: genuinely anywhere                                               */
/*                                                                             */
/* `standingSpots` above answers "every place a cat could stand", but its own   */
/* five columns are the two gutters, the content column's middle and the two    */
/* quarter points — a grid built to find whitespace *between* blocks of prose,  */
/* which on an ordinary page is the margins. `wander` (companion-moods.ts)      */
/* used exactly that pool for its own destinations, and the owner's own report  */
/* is what that reads as from the visitor's side: "they always try to come to  */
/* corners or edges" — correct, because the pool was built to prefer edges on   */
/* purpose for a *different* question (where can a whole scene's stage fit).    */
/* `randomViewportPoint` is the other kind of pool: no columns, no bias, every  */
/* point in the margin-inset box equally likely, so a page with clear ground in */
/* the middle of it is no longer invisible to the planner. Wander tries this    */
/* first and falls back to `standingSpots`'s own pool only when a page has      */
/* genuinely nothing free but its margins — see `planWander`.                   */
/* -------------------------------------------------------------------------- */

/**
 * A point drawn uniformly at random from the same margin-inset box every
 * settle position is clamped into — the bounds `bounds()` already computes
 * for `clampToViewport`, sampled instead of clamped towards.
 *
 * `rng` defaults to `Math.random`, exactly like every other roll on this
 * layer (see `companion-moods.ts`'s own `wanderCandidates` and the idle
 * flourishes in `Companion.tsx`); it takes an injectable source only so a
 * test can hand it a fixed sequence and assert the sampled point lands
 * inside the box without needing to mock the global.
 */
export function randomViewportPoint(rng: () => number = Math.random): Point {
  const box = bounds();
  return {
    x: box.minX + rng() * (box.maxX - box.minX),
    y: box.minY + rng() * (box.maxY - box.minY),
  };
}

/**
 * A small FNV-1a hash into `0..1` — the same shape `list-ink.tsx` and
 * `DrawnTree.tsx` already use for their own per-branch variation, kept as a
 * private copy here for the same reason theirs are private to each other:
 * this is a handful of lines, not a shared dependency worth a third module.
 */
function hash01(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 4096) / 4096;
}

/**
 * Left or right, deterministically, from a seed unique to one arrival.
 *
 * A wandering cat used to keep whatever facing its last step of travel left
 * it with — correct for a cat still walking, and the reason it is never
 * touched here, but a settled cat facing forever "the direction I most
 * recently arrived from" reads as an accident of pathfinding, not a choice.
 * The owner's ask is for it to actually be one: "randomly facing left or
 * right". Hashed rather than `Math.random()` so the choice for one arrival
 * is a pure function of that arrival (call it twice with the same seed, get
 * the same face) — a property a unit test can pin down, which a live
 * `Math.random()` call at the moment of arrival cannot be. The caller (see
 * `wanderTo` in `Companion.tsx`) builds the seed from the arrival time and
 * the spot chosen, which is unique enough per arrival without this module
 * ever having to hold state of its own.
 */
export function randomFacing(seed: string): 1 | -1 {
  return hash01(seed) < 0.5 ? -1 : 1;
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
 *
 * One contract on the caller, and FB-9.2 is what happens without it: whatever
 * element is handed here must name its own colour from the alias — `text-fg`,
 * `text-fg-muted` — on that element or on a descendant of it. Repointing sets
 * custom properties, and a drawing that says `currentColor` while no element
 * inside the tone scope has said `color: var(--fg-muted)` inherits a value
 * that was resolved further up, outside every tone scope. It then keeps the
 * root's ink over a `contrast` section, where the root's ink *is* that
 * section's ground: a cat drawn in the colour it is standing on.
 */
export function syncTone(node: HTMLElement | null, at: Point): void {
  if (!node) return;
  const zone = elementBehind(at.x, at.y)?.closest(TONES) ?? null;
  node.classList.toggle("tone-contrast", zone?.classList.contains("tone-contrast") === true);
  node.classList.toggle("tone-deep", zone?.classList.contains("tone-deep") === true);
}
