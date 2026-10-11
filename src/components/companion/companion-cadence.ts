/**
 * How soon the cats' loop runs again after a frame.
 *
 * `"frame"` is the next animation frame, `"idle"` a slow tick `IDLE_TICK_MS`
 * later, `"stop"` no frame at all until something calls `wake()`. A pair
 * sitting still with nothing in progress needs only the idle tick: it is
 * enough to notice the next blink, flick or flourish falling due, and those
 * gaps are random seconds long, so starting one a tick late cannot be seen.
 */
export const IDLE_TICK_MS = 250;

export type Cadence = "frame" | "idle" | "stop";

export function nextCadence(s: {
  /** Either cat moving, or an escort run. */
  busy: boolean;
  /** Both cats asleep. */
  asleep: boolean;
  /** A blink or flick in progress on either cat, or a scene, duet, beat or
   *  tour active. */
  animating: boolean;
}): Cadence {
  if (s.animating || s.busy) return "frame";
  return s.asleep ? "stop" : "idle";
}
