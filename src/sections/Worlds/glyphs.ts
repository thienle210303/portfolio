/**
 * The figures the globe draws, the way the companion cats are drawn: open
 * strokes, no fills, in a 24-unit box centred on the origin, so the canvas can
 * `translate` to a projected position and `scale` by its depth without any
 * arithmetic about the box first. Stroked onto the canvas as `new Path2D(d)`.
 */
export const GLYPHS = {
  bird: "M-11 2Q-5 -7 0 0Q5 -7 11 2",
  // The robot that walks the globe's equator after each landing: a boxed head
  // with an antenna, a body, two arms and two legs.
  robot: "M-5 -9H5V-2H-5ZM0 -9V-12M-2.5 -6V-5M2.5 -6V-5M-7 0H7V8H-7ZM-7 2L-10 6M7 2L10 6M-4 8V11M4 8V11",
  // The Moon over the robot's dark lap and the Sun over its lit one. The
  // moon's inner arc has radius 12, not under 10: a radius below half the
  // chord makes the arc rescale it and overflow the box.
  sun:
    "M-4 0a4 4 0 1 0 8 0a4 4 0 1 0 -8 0M0 -11V-7M0 7V11M-11 0H-7M7 0H11" +
    "M-7.8 -7.8L-5 -5M5 5L7.8 7.8M-7.8 7.8L-5 5M5 -5L7.8 -7.8",
  moon: "M3 -10A10 10 0 0 0 3 10A12 12 0 0 1 3 -10",
} as const;
