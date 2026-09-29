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

/* -------------------------------------------------------------------------- */
/* Frames, and why none of these constants is really "per frame"              */
/*                                                                             */
/* Round 17: every speed on this layer is a plain number of pixels, and the    */
/* loop used to spend one of them per rAF *callback*. That is only a speed if  */
/* every display ticks at the same rate, and displays do not: the pair crossed */
/* the page in half the time on a 120 Hz monitor and double on a 30 Hz one,    */
/* while the state machine around them — every threshold, every dwell, the     */
/* bedtime clock — was already wall-clock. The motion was the one part of the  */
/* companion that measured time in callbacks.                                  */
/*                                                                             */
/* So the constants are re-read as "per *reference* frame" — one 60 Hz tick,   */
/* which is what they were tuned against — and every rate they feed is         */
/* multiplied by how many reference frames the callback was actually worth.    */
/* At 60 Hz that multiplier is exactly 1 and nothing about the drawing         */
/* changes, which is the point: this is a correction for every other display,  */
/* not a retune of the one it was authored on.                                 */
/*                                                                             */
/* Two rules for applying it, and they are not the same rule:                  */
/*                                                                             */
/*  - A **linear rate** — a speed cap, an acceleration limit — scales by       */
/*    multiplication. Twice the time, twice the pixels.                        */
/*  - A **gap-closer** — "move 14% of the remaining distance" — has to         */
/*    *compound*: `1 - (1-k)^frames`, never `k * frames`. Closing 14% twice    */
/*    leaves 74%, not 72%, and the naive form overshoots hardest at low frame  */
/*    rates, which is exactly where an arrival ease is meant to be gentlest.   */
/*                                                                             */
/* `advance` below is both at once, which is why it is the one place this is   */
/* easy to get wrong.                                                         */
/* -------------------------------------------------------------------------- */

/** One 60 Hz frame, in ms: the tick every speed on this layer is quoted in. */
export const REFERENCE_FRAME_MS = 1000 / 60;

/**
 * The most reference frames a single callback is allowed to be worth.
 *
 * Without a ceiling, a tab that comes back after a minute in the background
 * hands the loop a delta the size of the whole absence, and the pair teleport
 * across the page on the frame the visitor returns to. Three frames — 50ms —
 * clamps nothing at or above 20Hz, so it costs a real slow display nothing and
 * only ever bites the case it exists for.
 */
export const MAX_FRAME_STEP = 3;

/**
 * How many reference frames `elapsedMs` is worth — the multiplier every rate
 * below is scaled by.
 *
 * Zero for a gap of zero or less rather than anything negative: two callbacks
 * inside the same millisecond are a frame with no time in it, and a frame with
 * no time in it moves nothing.
 */
export function frameStep(elapsedMs: number): number {
  if (!(elapsedMs > 0)) return 0;
  return Math.min(elapsedMs / REFERENCE_FRAME_MS, MAX_FRAME_STEP);
}

/** The arrival ease: the fraction of the remaining gap one reference frame
 *  closes once the cat is near enough that this, rather than its speed cap,
 *  is the binding term. Compounded over `frames`, never multiplied. */
const ARRIVAL_EASE = 0.14;

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
export function advance(
  pos: MutablePoint,
  want: Point,
  maxSpeed: number,
  frames = 1,
): number {
  if (maxSpeed <= 0 || frames <= 0) return 0;
  const dx = want.x - pos.x;
  const dy = want.y - pos.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 0.6) return 0;
  // The cap is a rate and multiplies; the ease is a gap-closer and compounds.
  // See the frames banner above for why those cannot be the same arithmetic.
  const eased = dist * (1 - Math.pow(1 - ARRIVAL_EASE, frames));
  const step = Math.min(maxSpeed * frames, eased, dist);
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
/** Her top speed, in px per reference frame — a hard ceiling `followTarget`
 *  cannot be asked to exceed no matter how far `away` grows past
 *  `FOLLOW_RANGE`. Scaled by `frames` where it is spent, not here. */
export const FOLLOW_MAX = 6.4;
/** How fast she is allowed to speed up, and slow down, in px per reference
 *  frame, per reference frame.
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
export function ramp(from: number, to: number, frames = 1): number {
  return from + clamp(to - from, -FOLLOW_BRAKE * frames, FOLLOW_ACCEL * frames);
}

/* -------------------------------------------------------------------------- */
/* Riding the page                                                            */
/*                                                                             */
/* WP-R round 15 ("when I scroll up and down the cat is moving really forward */
/* and backward"): round 14's cap, above, only ever fixed *half* of the       */
/* scroll problem — the half where the cats *chase* a content-anchored target */
/* too fast. The other half is that they are `position: fixed`, so on an      */
/* ordinary scroll they do not chase anything at all: `want` and `pos` are    */
/* already equal, `advance` correctly returns a zero step, and the cat holds  */
/* its exact pixel in the *viewport* while the page slides past underneath    */
/* it. Relative to the paragraph it was "standing beside", that is the cat    */
/* doing the travelling — forward while the page goes one way, backward when  */
/* it goes the other — even though not one call to `advance` has fired.       */
/*                                                                             */
/* A speed cap cannot fix that, because nothing is *moving* in the vocabulary */
/* the cap understands: `want` is a settled mood's spot, held in viewport     */
/* coordinates precisely so a stationary visitor does not watch two cats      */
/* re-probe the page every frame (see `restingPlaces` in `Companion.tsx`).    */
/* Scrolling does not change that held value at all — it changes what it      */
/* *means*, out from under it, every frame the wheel turns.                   */
/*                                                                             */
/* `rideStep` answers a different question, deliberately outside `advance`'s  */
/* target-and-cap vocabulary: not "where do you want to be" but "how far did  */
/* the ground just move under you". A `RideTracker` remembers `window.scroll` */
/* from the previous frame; each call reports the `dx`/`dy` a fixed element   */
/* has to be nudged by to hold its place over the content — already the sign  */
/* a caller adds straight onto a position, so the page scrolling down by `dy` */
/* moves the content *up* by `dy` and a companion riding along follows it up  */
/* by the same amount, not down. `Companion.tsx` applies that nudge to both   */
/* cats before anything else that frame decides where they are going, then    */
/* — for as long as `riding` reads true — holds `want` at the ridden `pos`    */
/* rather than letting `advance` spend a frame's worth of speed pulling them  */
/* back toward a target that is now stale by exactly the same amount the ride */
/* just corrected for. That is what makes the two agree instead of fight: the */
/* ride is an exact, uncapped correction for a real, uncapped event, and the  */
/* speed cap is left to do only the job it was built for — closing a gap once */
/* there genuinely is one to close.                                          */
/*                                                                             */
/* `riding` is a settle detector, not a scroll-event flag, which is the whole */
/* reason this lives beside `advance` rather than behind a `window.addEvent   */
/* Listener("scroll", …)` of its own: `Companion`'s rAF loop already samples  */
/* `window.scrollX/Y` every frame it runs, so asking it again here costs      */
/* nothing new and needs no listener at all. "Settled" is defined honestly on */
/* elapsed time since the scroll position last actually changed, not merely   */
/* since a `scroll` event last fired — a momentum scroll's own last few       */
/* sub-pixel ticks arrive seconds apart, and a detector keyed to the event     */
/* stream rather than the position itself would read every one of those gaps  */
/* as "settled, walk home" and back again, which is the flicker this exists   */
/* to avoid.                                                                  */
/* -------------------------------------------------------------------------- */

/** How long the scroll position has to hold still before a rider calls it
 *  settled and goes back to walking under its own power. Long enough that a
 *  momentum scroll's last, seconds-apart sub-pixel ticks still read as one
 *  continuous ride rather than a flicker between riding and settled, short
 *  enough that "the page stopped moving" reads as immediate to a visitor. */
export const RIDE_SETTLE_MS = 220;

/** What `rideStep` remembers between frames — the scroll position it last
 *  saw, and the last frame that position actually differed from the one
 *  before it. One instance covers the whole page: both cats ride the same
 *  scroll, so there is exactly one `RideTracker`, not one per animal. */
export interface RideTracker {
  scrollX: number;
  scrollY: number;
  lastDeltaAt: number;
}

/** A tracker primed at the page's current scroll position, so the very first
 *  call to `rideStep` reports a zero delta for whatever scrolling happened
 *  before anyone was watching, rather than one enormous "ride" on the first
 *  frame the loop runs. */
export function initRide(scrollX: number, scrollY: number): RideTracker {
  return { scrollX, scrollY, lastDeltaAt: 0 };
}

/** One frame's worth of riding: how far a fixed element has to move to hold
 *  its place over the content, and whether the page is still moving recently
 *  enough that this counts as a ride rather than a settled stop. */
export interface RideFrame {
  readonly dx: number;
  readonly dy: number;
  readonly riding: boolean;
}

/**
 * Advance `tracker` to `(scrollX, scrollY)` at `now`, and report this frame's
 * ride.
 *
 * `dx`/`dy` are the *previous* scroll position minus the current one — the
 * page scrolling down moves the content up, so a caller adds this straight
 * onto a `Spot` with no sign to remember. `riding` is `true` on the frame a
 * delta actually happens and stays `true` for `RIDE_SETTLE_MS` after the
 * last one, which is what lets a caller freeze ordinary target-chasing for
 * exactly as long as the ride is doing that job instead — see the file
 * banner above.
 */
export function rideStep(tracker: RideTracker, scrollX: number, scrollY: number, now: number): RideFrame {
  const dx = tracker.scrollX - scrollX;
  const dy = tracker.scrollY - scrollY;
  if (dx !== 0 || dy !== 0) tracker.lastDeltaAt = now;
  tracker.scrollX = scrollX;
  tracker.scrollY = scrollY;
  return { dx, dy, riding: now - tracker.lastDeltaAt < RIDE_SETTLE_MS };
}

/* -------------------------------------------------------------------------- */
/* Trailing                                                                    */
/*                                                                             */
/* WP-R round 15's second follow-up: riding and its own settle chokepoints    */
/* (searchClearOfToggle, companion-space.ts) guarantee a *resting* spot is    */
/* clear of the toolkit toggle. They say nothing about the WALK there. Before */
/* this, a long walk — the "no pointer, go home" branch chief among them —    */
/* sent both cats *independently* toward two separately-computed points, and  */
/* two animals each closing on their own target at their own capped speed can */
/* cross paths on the way, however clear the two endpoints are. Axe caught    */
/* this live: not mid-ride, but seconds later, mid-transit, gap measured as   */
/* low as -36px — a real, if momentary, overlap of the follower's own drawn   */
/* box with the lead's live button.                                          */
/*                                                                             */
/* `trailBehind` is not new geometry — it is the exact offset the philosophy  */
/* mood's own lap and the ordinary pointer-chase already walk the follower by */
/* while the lead is *going* somewhere specific, extracted here so a long walk */
/* toward any fixed target can reuse it instead of inventing a fourth copy.   */
/* Companion.tsx switches a walking follower onto it and off her own,         */
/* separately-computed spot until the lead is within a few pixels of *his*    */
/* target — at which point there is no more distance left for their paths to  */
/* diverge, and she peels off onto her own, already clearance-vetted spot for */
/* the last few steps. She is never far from him, so there is no second path  */
/* to cross in the first place — a structural fix, not a wider tolerance.     */
/* -------------------------------------------------------------------------- */

/**
 * Where the follower trails while the lead is walking toward `lead`, facing
 * `facing` — unclamped, the same as every other raw target on this layer;
 * the caller runs this through `clampToViewport`.
 *
 * `width` and `gap` are the follower's own drawn width and the ordinary
 * following distance (`CAT_W`, `FOLLOW_GAP` in `Companion.tsx`) — passed in
 * rather than imported, so this stays a plain geometry function with no
 * dependency on either constants module. `dy` defaults to the small downward
 * nudge the existing lap and chase formulas both already use, so a caller
 * that does not need to vary it can drop it entirely.
 */
export function trailBehind(lead: Point, facing: 1 | -1, width: number, gap: number, dy = 3): Point {
  return { x: lead.x - facing * (width + gap), y: lead.y + dy };
}
