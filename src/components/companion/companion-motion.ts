"use client";

import { clamp, type Point } from "./companion-space";

/**
 * The one rule every animal on this layer moves by: **a hard, per-frame speed
 * cap that does not care how far the target is.**
 *
 * WP-P round 14 ("scroll must not speed them up"): the cats are
 * `position: fixed`, so they hold their place in the *viewport* frame by
 * frame, but almost every target they walk to is *content*-anchored — a
 * mood's anchor rect, a tour stop, a nap spot, all read off
 * `getBoundingClientRect()`. Scroll the page hard enough and one of those
 * rectangles can move hundreds of pixels between two calls, which teleports
 * the *target* across the viewport. A cat that closed a fraction of whatever
 * gap `want` and `pos` happen to be apart this frame would cover that whole
 * distance in one step and read as sprinting to keep up with the scroll,
 * which is the opposite of a companion that has its own pace.
 *
 * `advance` is the guarantee against that: its step is bounded by `maxSpeed`
 * outright, never by a fraction of `dist`. Every mover on the companion layer
 * — the lead, the follower, the police escort, mini-Thien — is walked by
 * this one function, called once a frame with a `maxSpeed` that is a plain
 * constant (`LEAD_SPEED`, `ESCORT_SPEED`, `POLICE_SPEED`, `DASH_SPEED`,
 * `THIEN_SPEED` in `Companion.tsx`) chosen by *what the cat is doing*, never
 * by how far `want` is. However far a target has jumped, the animal takes the
 * same size step towards it this frame that it would towards a target four
 * pixels away — it just keeps taking that step, frame after frame, until the
 * gap the scroll opened up is closed, which is what "lag behind calmly and
 * catch up at cat pace" actually looks like.
 *
 * The follower's own curve (`followTarget` + `ramp`, below) looks different
 * — her top speed depends on how far behind she has fallen — but it is built
 * to the same guarantee from the other direction: `followTarget` *saturates*
 * at `FOLLOW_MAX` however large `away` gets, so a target that has jumped a
 * thousand pixels asks for exactly the same top speed as one two hundred
 * pixels off. That saturation is round 2's own fix (FB2-7, "continuous eased
 * speed" — see `ramp`'s own note) for a different symptom, a follower that
 * used to snap straight to a "sprint" speed the instant a gap crossed a
 * threshold; this file extends the same promise to the scroll case, which is
 * a target that can now jump far *enough* to have tested it.
 *
 * Kept out of `Companion.tsx` — a "use client" component file with no test of
 * its own — and in its own pure module instead, exactly the way the
 * placement geometry lives in `companion-space.ts` rather than inline: the
 * whole point of the cap is a property a test can pin down without a browser
 * ("however far `want` is, one call moves `pos` by at most `maxSpeed`"), and
 * that only works from something importable on its own.
 */

/** Whatever `advance` needs to move a position — the four fields every
 *  `Mover.pos` in `Companion.tsx` already has, named narrowly so a caller
 *  never has to fake a richer shape than this actually reads and writes. */
export interface MutablePoint {
  x: number;
  y: number;
}

/**
 * Move `pos` toward `want` by at most `maxSpeed`, and report how far it
 * actually travelled — which is what the gait speed (walk-cycle phase) is
 * scaled by elsewhere, so a cat creeping the last few pixels onto a target
 * is not drawn mid-stride on the spot.
 *
 * `dist * 0.14` is the *arrival* ease — close in on the last few pixels
 * rather than overshoot and correct — and it is only ever the smaller of the
 * three terms `Math.min` picks between once `dist` clears roughly
 * `maxSpeed / 0.14`. Below that, `maxSpeed` is the one that wins, every time,
 * regardless of how much further `dist` still has to go: a target a hundred
 * pixels off and a target ten thousand pixels off (a page-length scroll
 * jump) both cap out at the same `maxSpeed` this call is allowed to spend.
 */
export function advance(pos: MutablePoint, want: Point, maxSpeed: number): number {
  if (maxSpeed <= 0) return 0;
  const dx = want.x - pos.x;
  const dy = want.y - pos.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 0.6) return 0;
  const step = Math.min(maxSpeed, dist * 0.14, dist);
  pos.x += (dx / dist) * step;
  pos.y += (dy / dist) * step;
  return step;
}

/* -------------------------------------------------------------------------- */
/* The follower's speed curve                                                 */
/*                                                                             */
/* She used to have three speeds: nothing while disengaged or watching, one    */
/* flat pace while trailing, and a faster one that cut in the instant the gap  */
/* passed a threshold. That was a discrete jump in *velocity*, which no amount */
/* of easing elsewhere hides — the drawing is moving at one speed and then,    */
/* one frame later, at another. `followTarget` replaces the jump with a curve, */
/* and `ramp` replaces the snap with a limiter on how fast she may change her   */
/* mind about it, which between them is what makes her read as an animal      */
/* rather than a state machine — and, per the file banner above, is also what  */
/* already keeps a scroll-sized jump in `away` from reading as a sprint.       */
/* -------------------------------------------------------------------------- */

/** How far past her comfortable distance she has to be before she is running
 *  flat out. */
export const FOLLOW_RANGE = 200;
/** Her top speed, in px/frame — a hard ceiling `followTarget` cannot be asked
 *  to exceed no matter how far `away` grows past `FOLLOW_RANGE`. */
export const FOLLOW_MAX = 6.4;
/** How fast she is allowed to speed up, and slow down, in px/frame/frame.
 *  Braking is quicker than accelerating, which is true of cats and also
 *  keeps her from sailing past whatever she was heading for. */
export const FOLLOW_ACCEL = 0.34;
export const FOLLOW_BRAKE = 0.5;

/**
 * How fast she *wants* to be going, given how far she has to go.
 *
 * `gap` is the distance she is entitled to keep — the follow gap when she is
 * trailing him, zero when she is walking to a fixed place like the bed — so
 * the curve is always "speed proportional to distance beyond where I should
 * be". Eased out rather than smoothstepped: a curve that is flat at *both*
 * ends looks right leaving the gap but leaves her creeping the last few
 * pixels onto a target forever, which matters now that some of those targets
 * are places she has to actually arrive at.
 *
 * `t` is clamped to `0..1` before the curve ever sees it, which is the whole
 * of the saturation: once `away` is `FOLLOW_RANGE` past `gap`, further
 * distance changes nothing about the answer. A target that has jumped by a
 * whole viewport under a fast scroll and a target merely `FOLLOW_RANGE`
 * pixels off ask for the identical top speed.
 */
export function followTarget(away: number, gap: number): number {
  const t = clamp((away - gap) / FOLLOW_RANGE, 0, 1);
  return FOLLOW_MAX * (1 - (1 - t) * (1 - t));
}

/** And how fast she is allowed to change her mind. This is the half that
 *  makes her *personality* smooth as well as her pursuit: stopping to watch
 *  the cursor drops the target to zero, and she coasts down over ~13 frames
 *  instead of freezing mid-stride — and a target that jumps drops her back
 *  to the *start* of the ramp rather than letting her inherit a speed she
 *  never actually built up to. */
export function ramp(from: number, to: number): number {
  return from + clamp(to - from, -FOLLOW_BRAKE, FOLLOW_ACCEL);
}
