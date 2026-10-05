/**
 * The robot's walk, as a pure function of one progress value.
 *
 * Two laps. On the first it is unsupervised and the city lights go out behind
 * it; on the second a human is in the loop and they come back brighter than
 * they started. The owner asked which of his two ideas was better — a robot
 * destroying human life, or AI improving it — and this is neither, because the
 * content layer already makes the argument: architecture and accountability
 * stay human-owned. Two passes render that instead of asserting it, and the
 * visitor decides which one they believe.
 *
 * It ends on the lit pass. Ending dark would make the opposite argument.
 */
export function robotPass(progress: number): {
  pass: 1 | 2;
  lonDegrees: number;
  cityLight: number;
} {
  const clamped = Math.min(1, Math.max(0, progress));
  const pass: 1 | 2 = clamped < 0.5 ? 1 : 2;
  const lap = pass === 1 ? clamped * 2 : (clamped - 0.5) * 2;
  return {
    pass,
    lonDegrees: -180 + lap * 360,
    // Pass 1 falls from 1 to 0 behind it; pass 2 rises from 0 to 1.4.
    cityLight: pass === 1 ? 1 - lap : lap * 1.4,
  };
}

export interface RobotLights {
  readonly pass: 1 | 2;
  readonly lonDegrees: number;
  /** The light level west of the robot: the longitudes it has walked this lap. */
  readonly behind: number;
  /** The level east of it, still as the lap found them. */
  readonly ahead: number;
}

/**
 * `robotPass` laid out on the globe. A lap starts with every city at the
 * previous lap's level and leaves each one at its own as the robot passes, so
 * the level behind it is where this lap ends and the level ahead is where it
 * began. Averaged over longitude that is exactly `cityLight` (the test pins
 * it), so the shader draws the same quantity, spread out, rather than a second
 * one. Null below zero: no robot.
 */
export function robotLights(progress: number): RobotLights | null {
  if (progress < 0) return null;
  const { pass, lonDegrees } = robotPass(progress);
  const [start, end] = pass === 1 ? [0, 0.5] : [0.5, 1];
  return {
    pass,
    lonDegrees,
    behind: robotPass(end).cityLight,
    ahead: robotPass(start).cityLight,
  };
}

/** One longitude's light level. The shader's twin of this is `walked` in
 *  `FRAGMENT_SOURCE`'s Technology branch. */
export function lightLevel(lights: RobotLights, lonDegrees: number): number {
  return lonDegrees <= lights.lonDegrees ? lights.behind : lights.ahead;
}

/** Both laps, in reference frames (see GlobeCanvas's note on time): six
 *  seconds on any display. */
export const ROBOT_WALK_FRAMES = 360;

/**
 * Under reduced motion the two passes are two still frames behind a toggle.
 * "Unsupervised" is the instant the dark lap finishes, every light out;
 * "Human in the loop" is where the walk ends.
 */
export const ROBOT_HOLDS = {
  unsupervised: 0.5 - Number.EPSILON,
  "human-in-the-loop": 1,
} as const;

export type RobotHold = keyof typeof ROBOT_HOLDS;
