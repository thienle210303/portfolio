/**
 * The planet's surface: one quad covering the canvas, and a fragment shader
 * that finds the sphere point under each pixel. Nothing positional lives here;
 * the crossing, the pins and the labels stay on the 2D overlay, drawn with
 * `project()`.
 *
 * The geometry mirrors `src/lib/globe.ts` exactly: the disc is centred and
 * sized from `uCenter`/`uRadius` (GlobeCanvas's stroke, in device pixels), and
 * the view → model rotation arrives as `uInverseRotation`, computed in
 * TypeScript from `rotate()`. `surfaceGeo()` in `sphere.ts` is the TS twin of
 * this mapping, tested against `unproject()`.
 *
 * Colour enters only through `uInk` and `uPaper`. "Darkest" is whichever of
 * the two is darker, so the shadow deepens the right way in both themes.
 * There is no accent input: the surface carries no fact, and blue is never
 * decoration.
 */

export const VERTEX_SOURCE = `#version 300 es
layout(location = 0) in vec2 aCorner;
void main() {
  gl_Position = vec4(aCorner, 0.0, 1.0);
}`;

export const FRAGMENT_SOURCE = `#version 300 es
precision highp float;

uniform vec2 uResolution;
uniform vec2 uCenter;
uniform float uRadius;
uniform mat3 uInverseRotation;
uniform sampler2D uCoastlines;
uniform float uRobot;
uniform float uRobotLon;
uniform vec2 uCityLight;
uniform vec3 uInk;
uniform vec3 uPaper;

out vec4 fragColor;

const float PI = 3.141592653589793;

float grey(vec3 c) {
  return (c.r + c.g + c.b) / 3.0;
}

// The same equirectangular mapping bakeCoastlineTexture() fills: u from
// longitude -180..180, v from latitude 90..-90 (row 0 is the north edge).
vec2 sphereUV(vec3 p) {
  float lon = atan(p.y, p.x);
  float lat = asin(clamp(p.z, -1.0, 1.0));
  return vec2(lon / (2.0 * PI) + 0.5, 0.5 - lat / PI);
}

float coverage(vec2 uv) {
  return texture(uCoastlines, uv).a;
}

// Points of light on land: a sparse, fixed scatter over coarse cells, so the
// same towns go dark and come back. Decoration, not a map of real cities.
float cityLights(vec2 uv) {
  vec2 cells = vec2(240.0, 120.0);
  vec2 cell = floor(uv * cells);
  float onLand = step(0.5, coverage((cell + 0.5) / cells));
  float picked = step(0.84, fract(sin(dot(cell, vec2(12.9898, 78.233))) * 43758.5453));
  float spot = 1.0 - smoothstep(0.16, 0.3, length(fract(uv * cells) - 0.5));
  return onLand * picked * spot;
}

void main() {
  // Device pixels, rows counted from the top like the 2D overlay's.
  vec2 screen = vec2(gl_FragCoord.x, uResolution.y - gl_FragCoord.y);
  vec2 n = vec2(screen.x - uCenter.x, uCenter.y - screen.y) / uRadius;
  float d = length(n);

  if (d > 1.0) {
    float haze = 1.0 - smoothstep(1.0, 1.1, d);
    fragColor = vec4(mix(uPaper, uInk, 0.2), haze * 0.25);
    return;
  }

  vec3 darkest = grey(uInk) < grey(uPaper) ? uInk : uPaper;

  // globe.ts axes: x toward the viewer, y right, z up.
  vec3 view = vec3(sqrt(max(0.0, 1.0 - d * d)), n.x, n.y);
  vec3 model = uInverseRotation * view;
  vec2 uv = sphereUV(model);
  float land = coverage(uv);

  vec3 light = normalize(vec3(0.82, -0.45, 0.35));
  float lambert = clamp(dot(view, light), 0.0, 1.0);

  // The overlay's labels are drawn to read against the ground, so the planet
  // stays within a short step of it: sea and shadow at most 0.14 of the way
  // to ink, which keeps accent and muted labels above 4.5:1 on the disc in
  // both themes. \`shadow\` is that step taken toward whichever of ink and
  // paper is darker, so in night it is the ground itself and the unlit side
  // only ever gains contrast.
  vec3 sea = mix(uPaper, uInk, 0.1);
  vec3 shore = mix(uPaper, uInk, 0.02);
  vec3 shadow = mix(uPaper, darkest, 0.14);
  float cityGlow = 0.0;

  vec3 color = mix(sea, shore, land);

  if (uRobot >= 0.0) {
    // The robot's walk (robot.ts). West of it is what it has walked this
    // lap, at the lap's new level; east, the level the lap found. Lit in
    // the planet's own ink: pale points by night, dark ones by day.
    float lon = atan(model.y, model.x);
    float walked = step(lon, uRobotLon);
    float level = mix(uCityLight.y, uCityLight.x, walked);
    cityGlow = clamp(cityLights(uv) * level * 0.6, 0.0, 1.0);
    // The meridian it is standing on.
    float gap = abs(atan(sin(lon - uRobotLon), cos(lon - uRobotLon)));
    cityGlow = max(cityGlow, (1.0 - smoothstep(0.0, 0.035, gap)) * 0.2);
  }

  color = mix(mix(color, shadow, 0.8), color, lambert);

  float rim = smoothstep(0.75, 1.0, d);
  color = mix(color, shadow, rim * 0.25);

  // After the lighting, so a light on the unlit side still shines.
  color = mix(color, uInk, cityGlow);
  fragColor = vec4(color, 1.0);
}`;

/** Every uniform the fragment shader declares, in declaration order. A
 *  misspelled name is a silent no-op, so the test pins this list to the
 *  source. */
export const SPHERE_UNIFORMS = [
  "uResolution", "uCenter", "uRadius", "uInverseRotation", "uCoastlines",
  "uRobot", "uRobotLon", "uCityLight",
  "uInk", "uPaper",
] as const;

export type SphereUniform = (typeof SPHERE_UNIFORMS)[number];
