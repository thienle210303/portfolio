import type { GeoPoint } from "@/types/portfolio";

/**
 * The whole reason this site draws a planet without a 3D library.
 *
 * An orthographic projection is three steps and no matrices worth the name:
 * put the point on a unit sphere, rotate the sphere, then throw away the axis
 * pointing at the viewer. What is left is a disc, and the discarded axis's
 * sign is the answer to "is this on the near side?" — the only hidden-surface
 * test a wireframe globe needs.
 *
 * Axis convention, chosen so the arithmetic stays boring:
 *   +x points at the viewer, +y points right on screen, +z points to the
 *   north pole. So 0°N 0°E at rest is `[1, 0, 0]`: dead centre, nearest.
 *
 * Screen y is negated at projection time, once, here — canvas y grows
 * downward and latitude grows upward, and every caller that does that
 * conversion for itself eventually gets it wrong in one place.
 *
 * Nothing in this file touches the DOM, React, or `document`. That is what
 * makes the interesting half of the globe testable in Vitest, and it is why
 * every geometric bug in this feature is a unit-test failure rather than a
 * screenshot someone has to squint at.
 */

const DEG = Math.PI / 180;

export const EARTH_RADIUS_KM = 6371;

/** Tilt clamp, from the spec: past 40° the graticule reads as a mistake and
 *  both pins can leave the visible hemisphere at once. */
export const MAX_TILT_RADIANS = 40 * DEG;

export type Vec3 = readonly [number, number, number];

export function toVector(point: GeoPoint): Vec3 {
  const phi = point.lat * DEG;
  const lambda = point.lon * DEG;
  const c = Math.cos(phi);
  return [c * Math.cos(lambda), c * Math.sin(lambda), Math.sin(phi)];
}

export function toGeo(v: Vec3): GeoPoint {
  // `v` is expected to be a unit vector; the clamp guards the one input that
  // can push asin out of domain — a component that arrived as 1 + 1e-16 from
  // an interpolation.
  const z = Math.max(-1, Math.min(1, v[2]));
  return { lat: Math.asin(z) / DEG, lon: Math.atan2(v[1], v[0]) / DEG };
}

/**
 * Spin about the polar axis, then tilt the pole toward or away from the
 * viewer. Two angles, in that order, and no third: a globe that can also roll
 * about the view axis is a globe whose horizon is crooked, which reads as a
 * bug rather than a feature.
 */
export function rotate(v: Vec3, spin: number, tilt: number): Vec3 {
  const cs = Math.cos(spin);
  const ss = Math.sin(spin);
  const ct = Math.cos(tilt);
  const st = Math.sin(tilt);
  const x = v[0] * cs - v[1] * ss;
  const y = v[0] * ss + v[1] * cs;
  const z = v[2];
  return [x * ct - z * st, y, x * st + z * ct];
}

export interface Projected {
  readonly x: number;
  readonly y: number;
  /** True on the hemisphere facing the viewer. The pen lifts when this is
   *  false, which is what keeps coastlines from smearing across the limb. */
  readonly front: boolean;
  /** The discarded axis, in [-1, 1]. Nearest the viewer is 1. Used to scale a
   *  marker so the ones at the limb read as further away. */
  readonly depth: number;
}

export interface Viewport {
  readonly cx: number;
  readonly cy: number;
  readonly radius: number;
}

export function project(v: Vec3, spin: number, tilt: number, view: Viewport): Projected {
  const r = rotate(v, spin, tilt);
  return {
    x: view.cx + view.radius * r[1],
    y: view.cy - view.radius * r[2],
    front: r[0] > 0,
    depth: r[0],
  };
}

export interface GreatCircle {
  readonly points: readonly Vec3[];
  /** Angular separation of the two ends, in radians. */
  readonly radians: number;
}

/**
 * The shortest path between two places, sampled evenly, by spherical linear
 * interpolation.
 *
 * Two inputs break the textbook formula and both are reachable from authored
 * coordinates, so both are handled rather than documented as unlikely: two
 * identical points make `sin(d)` zero, and exact antipodes make the shortest
 * path ambiguous. Both return the start point repeated, which draws nothing
 * and flies nowhere — the honest rendering of "there is no crossing here".
 *
 * The degenerate guard uses sin < 1e-6 rather than sin < 1e-9. `Math.acos`
 * loses about eight decimal digits of precision near ±1, so inputs very close
 * to antipodal (dot ≈ -1) return an angle ε short of π, giving sin ≈ ε.
 * This epsilon can be ~1e-8 without reaching the tighter threshold, allowing
 * SLERP's denominator to become tiny and cause catastrophic cancellation,
 * producing zero vectors. The 1e-6 threshold catches these cases.
 */
export function greatCircle(a: GeoPoint, b: GeoPoint, segments: number): GreatCircle {
  const va = toVector(a);
  const vb = toVector(b);
  const dot = Math.max(-1, Math.min(1, va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2]));
  const radians = Math.acos(dot);
  const sin = Math.sin(radians);
  const points: Vec3[] = [];
  for (let i = 0; i <= segments; i += 1) {
    if (sin < 1e-6) {
      points.push(va);
      continue;
    }
    const t = i / segments;
    const A = Math.sin((1 - t) * radians) / sin;
    const B = Math.sin(t * radians) / sin;
    points.push([va[0] * A + vb[0] * B, va[1] * A + vb[1] * B, va[2] * A + vb[2] * B]);
  }
  return { points, radians };
}

export function arcKm(radians: number): number {
  return radians * EARTH_RADIUS_KM;
}

/** The Sea world's home: halfway along the crossing, derived rather than
 *  typed, so it cannot drift from the two pins. */
export function arcMidpoint(arc: GreatCircle): GeoPoint {
  return toGeo(arc.points[Math.floor(arc.points.length / 2)]);
}

/** The Sky world's home: the highest latitude the crossing reaches. */
export function arcApex(arc: GreatCircle): GeoPoint {
  let best = toGeo(arc.points[0]);
  for (const point of arc.points) {
    const geo = toGeo(point);
    if (geo.lat > best.lat) best = geo;
  }
  return best;
}

/**
 * Parallels and meridians as polylines, ready to project. One step value
 * drives both, because a graticule whose parallels and meridians disagree
 * about spacing reads as two overlaid grids.
 *
 * Parallels stop short of the poles (a parallel at ±90° is a point) and
 * meridians run pole to pole.
 *
 * Non-positive steps return an empty array rather than hanging: a graticule
 * is decoration, and nonsense input should produce no grid lines, not a hang.
 */
export function graticule(stepDegrees: number): readonly (readonly GeoPoint[])[] {
  if (stepDegrees <= 0) return [];
  const lines: GeoPoint[][] = [];
  for (let lat = -90 + stepDegrees; lat <= 90 - stepDegrees + 1e-9; lat += stepDegrees) {
    const parallel: GeoPoint[] = [];
    for (let lon = -180; lon <= 180; lon += 5) parallel.push({ lat, lon });
    lines.push(parallel);
  }
  for (let lon = -180; lon < 180 - 1e-9; lon += stepDegrees) {
    const meridian: GeoPoint[] = [];
    for (let lat = -90; lat <= 90; lat += 5) meridian.push({ lat, lon });
    lines.push(meridian);
  }
  return lines;
}

/** `rotate` applies spin about the polar axis and then tilt; this undoes them
 *  in the opposite order, which is all an inverse is. */
function unrotate(v: Vec3, spin: number, tilt: number): Vec3 {
  const ct = Math.cos(-tilt);
  const st = Math.sin(-tilt);
  const x = v[0] * ct - v[2] * st;
  const z = v[0] * st + v[2] * ct;
  const cs = Math.cos(-spin);
  const ss = Math.sin(-spin);
  return [x * cs - v[1] * ss, x * ss + v[1] * cs, z];
}

/**
 * Screen point → the place on the near hemisphere under it, or `null` when the
 * click landed off the disc.
 *
 * This exists for one reason and it is not convenience: WCAG 2.5.7 requires
 * that anything a drag does be achievable with a single pointer and no drag.
 * With this, one click brings the place you clicked round to face you, which
 * is what the drag is for. See `GlobeCanvas.tsx`'s release handler.
 *
 * The early return `if (squared > 1) return null;` is the guard against
 * negative radicands at the limb: IEEE-754 guarantees that when it is false,
 * `1 - squared` cannot be negative. The `Math.max(0, …)` is belt-and-braces
 * against a future edit that removes or loosens that return.
 */
export function unproject(
  x: number,
  y: number,
  spin: number,
  tilt: number,
  view: Viewport,
): GeoPoint | null {
  const nx = (x - view.cx) / view.radius;
  const ny = (view.cy - y) / view.radius;
  const squared = nx * nx + ny * ny;
  if (squared > 1) return null;
  const rx = Math.sqrt(Math.max(0, 1 - squared));
  return toGeo(unrotate([rx, nx, ny], spin, tilt));
}

export function clampTilt(tilt: number): number {
  return Math.max(-MAX_TILT_RADIANS, Math.min(MAX_TILT_RADIANS, tilt));
}
