import { SKIN_IDS } from "@/lib/skins";
import { CHAPTER_IDS } from "@/lib/worlds";

/**
 * The planet's surface: one quad covering the canvas, and a fragment shader
 * that finds the sphere point under each pixel. Nothing positional lives here;
 * arcs, markers and labels stay on the 2D overlay, drawn with `project()`.
 *
 * The geometry mirrors `src/lib/globe.ts` exactly: the disc is centred and
 * sized from `uCenter`/`uRadius` (GlobeCanvas's stroke, in device pixels), and
 * the view → model rotation arrives as `uInverseRotation`, computed in
 * TypeScript from `rotate()`. `surfaceGeo()` in `sphere.ts` is the TS twin of
 * this mapping, tested against `unproject()`.
 *
 * Colour enters only through `uInk`, `uPaper` and `uAccent`. "Darkest" and
 * "palest" are whichever of ink and paper is darker or paler, so a skin that
 * says "pale" or "dark" stays true in both themes.
 */

/** `CHAPTER` + `"living-earth"` → `CHAPTER_LIVING_EARTH`. */
export function glslName(prefix: string, id: string): string {
  return `${prefix}_${id.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}`;
}

function indexOf<T extends string>(ids: readonly T[]): Readonly<Record<T, number>> {
  return Object.fromEntries(ids.map((id, i) => [id, i])) as Record<T, number>;
}

/** `uChapter` values: positions in `CHAPTER_IDS`. */
export const CHAPTER_INDEX: Readonly<Record<string, number>> = indexOf(CHAPTER_IDS);
/** `uSkin` values: positions in `SKIN_IDS`; -1 is no skin. */
export const SKIN_INDEX = indexOf(SKIN_IDS);

// Generated from the arrays, so the shader's branch numbers cannot drift from
// the order 3b uploads them in.
const INDEX_CONSTANTS = [
  ...CHAPTER_IDS.map((id, i) => `const int ${glslName("CHAPTER", id)} = ${i};`),
  ...SKIN_IDS.map((id, i) => `const int ${glslName("SKIN", id)} = ${i};`),
].join("\n");

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
uniform int uChapter;
uniform int uSkin;
uniform float uCrossing;
uniform float uRobot;
uniform float uRobotLon;
uniform vec2 uCityLight;
uniform vec3 uInk;
uniform vec3 uPaper;
uniform vec3 uAccent;

out vec4 fragColor;

const float PI = 3.141592653589793;
${INDEX_CONSTANTS}

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

// The coverage buffer is binary, so its spread across a few texels is
// non-zero only where land meets sea.
float coastline(vec2 uv) {
  vec2 texel = 1.5 / vec2(textureSize(uCoastlines, 0));
  float a = coverage(uv + vec2(texel.x, 0.0));
  float b = coverage(uv - vec2(texel.x, 0.0));
  float c = coverage(uv + vec2(0.0, texel.y));
  float d = coverage(uv - vec2(0.0, texel.y));
  return clamp(max(max(a, b), max(c, d)) - min(min(a, b), min(c, d)), 0.0, 1.0);
}

float grain(vec2 uv) {
  vec2 cell = floor(uv * vec2(1024.0, 512.0));
  return fract(sin(dot(cell, vec2(12.9898, 78.233))) * 43758.5453);
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

  vec3 darkest = grey(uInk) < grey(uPaper) ? uInk : uPaper;
  vec3 palest = grey(uInk) < grey(uPaper) ? uPaper : uInk;

  if (d > 1.0) {
    float reach = uSkin == SKIN_DESERT ? 1.22 : 1.1;
    float haze = 1.0 - smoothstep(1.0, reach, d);
    vec3 air = uSkin == SKIN_DESERT ? mix(palest, darkest, 0.25) : mix(uPaper, uInk, 0.2);
    float strength = uSkin == SKIN_DESERT ? 0.55 : (uSkin == SKIN_UNDERWATER ? 0.0 : 0.25);
    fragColor = vec4(air, haze * strength);
    return;
  }

  // globe.ts axes: x toward the viewer, y right, z up.
  vec3 view = vec3(sqrt(max(0.0, 1.0 - d * d)), n.x, n.y);
  vec3 model = uInverseRotation * view;
  vec2 uv = sphereUV(model);
  float land = coverage(uv);
  float coast = coastline(uv);
  float polar = abs(model.z);

  vec3 light = normalize(vec3(0.82, -0.45, 0.35));
  float lambert = clamp(dot(view, light), 0.0, 1.0);

  // The overlay's labels are drawn to read against the ground, so the
  // unskinned planet stays within a short step of it: sea and shadow at most
  // 0.14 of the way to ink, which keeps accent and muted labels above 4.5:1
  // on the disc in both themes. \`shadow\` is that step taken toward whichever
  // of ink and paper is darker, so in night it is the ground itself and the
  // unlit side only ever gains contrast. Skins keep the deeper terminator:
  // they are an asked-for look, and their own palettes leave that range.
  vec3 sea = mix(uPaper, uInk, 0.1);
  vec3 shore = mix(uPaper, uInk, 0.02);
  vec3 shadow = mix(uPaper, darkest, 0.14);
  float glow = 0.0;
  float cityGlow = 0.0;

  if (uSkin == SKIN_ICE_AGE) {
    float ice = smoothstep(0.02, 0.3, polar);
    sea = mix(mix(sea, vec3(grey(sea)), 0.85), palest, 0.45);
    shore = mix(mix(shore, vec3(grey(shore)), 0.85), palest, 0.6);
    sea = mix(sea, palest, ice * 0.85);
    shore = mix(shore, palest, ice);
  } else if (uSkin == SKIN_NIGHT_SIDE) {
    sea = mix(darkest, palest, 0.06);
    shore = mix(darkest, palest, 0.14);
    lambert = 1.0 - lambert;
    glow = coast * (0.35 + 0.65 * lambert);
  } else if (uSkin == SKIN_VOLCANIC) {
    sea = mix(darkest, palest, 0.1);
    shore = mix(darkest, palest, 0.04);
    // Coarse cells switch stretches of coast off, so the glow reads as cracks.
    glow = coast * step(0.3, grain(uv * 0.125));
  } else if (uSkin == SKIN_UNDERWATER) {
    vec3 lightAbove = vec3(0.0, 0.0, 1.0);
    lambert = clamp(dot(view, lightAbove) * 0.5 + 0.5, 0.0, 1.0);
  } else if (uSkin == SKIN_DESERT) {
    float g = grain(uv);
    sea = mix(palest, darkest, 0.12 + 0.08 * g);
    shore = mix(palest, darkest, 0.2 + 0.08 * g);
  }

  if (uChapter == CHAPTER_SEA) {
    shore = mix(shore, sea, 0.55);
  } else if (uChapter == CHAPTER_PLANTS) {
    shore = clamp(shore + (shore - sea) * 0.9, 0.0, 1.0);
  }

  vec3 color = mix(sea, shore, land);

  if (uChapter == CHAPTER_TECH) {
    vec2 grid = abs(fract(uv * vec2(48.0, 24.0)) - 0.5);
    float wire = smoothstep(0.44, 0.5, max(grid.x, grid.y));
    // Ink on a paper-faded surface: the lattice carries no fact, so no blue.
    color = mix(mix(color, uPaper, 0.55), uInk, wire * 0.1);
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
  }

  bool skinned = uSkin >= 0;
  color = mix(mix(color, skinned ? darkest : shadow, skinned ? 0.65 : 0.8), color, lambert);

  float rim = smoothstep(0.75, 1.0, d);
  if (uSkin == SKIN_UNDERWATER) {
    color = mix(color, darkest, (1.0 - d) * 0.35);
    color = mix(color, palest, rim * 0.6);
  } else if (uSkin == SKIN_DESERT) {
    color = mix(color, mix(palest, darkest, 0.25), rim * 0.5);
  } else {
    color = mix(color, skinned ? darkest : shadow, rim * 0.25);
  }

  // After the lighting, so a light on the unlit side still shines.
  color = mix(color, uInk, cityGlow);
  color = mix(color, uAccent, glow);
  fragColor = vec4(color, 1.0);
}`;

/** Every uniform the fragment shader declares, in declaration order. A
 *  misspelled name is a silent no-op, so the test pins this list to the
 *  source. `uCrossing` is declared for Task 6 and not yet read, so a
 *  compiler may optimise it out and report no location. */
export const SPHERE_UNIFORMS = [
  "uResolution", "uCenter", "uRadius", "uInverseRotation", "uCoastlines",
  "uChapter", "uSkin", "uCrossing", "uRobot", "uRobotLon", "uCityLight",
  "uInk", "uPaper", "uAccent",
] as const;

export type SphereUniform = (typeof SPHERE_UNIFORMS)[number];
