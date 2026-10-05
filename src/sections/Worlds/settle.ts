/**
 * The part of `GlobeCanvas`'s view bag that can be in motion. Structural, so
 * the bag itself is passed straight in.
 */
export interface Motion {
  spin: number;
  tilt: number;
  vSpin: number;
  vTilt: number;
  target: { spin: number; tilt: number } | null;
  playing: boolean;
  flight: number;
  landed: boolean;
  seed: number;
  robot: number;
  walking: boolean;
}

/**
 * Put everything that is moving where it was going, so a single draw shows
 * the end state and no frame is needed after it: the played crossing lands on
 * the arrival pin with the sapling grown (the same frame reduced motion's
 * `fly()` draws), a growing sapling finishes, an easing camera arrives,
 * inertia stops, and a robot mid-walk ends lit. A crossing the visitor is
 * dragging is theirs and is left alone.
 *
 * Returns true when it landed a flight, so the caller can fire `onLanded`.
 */
export function settleMotion(m: Motion, arrival: { spin: number; tilt: number }): boolean {
  const landing = m.playing;
  if (landing) {
    m.playing = false;
    m.flight = 1;
    m.landed = true;
    m.seed = 1;
    m.target = arrival;
  }
  if (m.seed > 0) m.seed = 1;
  if (m.target) {
    m.spin = m.target.spin;
    m.tilt = m.target.tilt;
    m.target = null;
  }
  m.vSpin = 0;
  m.vTilt = 0;
  if (m.walking) {
    m.robot = 1;
    m.walking = false;
  }
  return landing;
}
