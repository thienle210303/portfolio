# Round 18 Plan C — The Living Earth: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the flat orthographic disc into a lit sphere with six chapters of facts and five skins of pure spectacle, add no runtime dependency, and leave initial JS exactly where it is.

**Architecture:** One full-viewport quad and a fragment shader that intersects a ray with a sphere — no mesh, no matrices, no scene graph, which is why this costs ten kilobytes instead of a hundred and thirty. `src/lib/globe.ts`'s projector is kept and still does every piece of maths it does today; the shader only draws. The coastlines are baked once into an equirectangular texture from the data already in the repo, so no new asset ships. A **chapter** decides which facts are on the planet; a **skin** decides what the planet looks like and carries no facts at all. Both are uniforms, which is what makes thirty planets cost eleven pieces of code.

**Tech Stack:** WebGL2 with a WebGL1 and Canvas-2D fallback, TypeScript (strict), Tailwind v4 via `@theme`, vitest + jsdom, Playwright + axe-core, pnpm only. No 3D library.

**Spec:** [docs/superpowers/specs/2026-09-30-round-18-design.md](../specs/2026-09-30-round-18-design.md) — §5 and §6.4.

**Depends on:** Plan A, complete. `origin.to`, `companions[].belongsTo`, the four new projects and the act anchors all come from there.

## Global Constraints

- **No 3D library, and no new runtime dependency of any kind.** Measured, not assumed: three.js ≈133 KB gz, `@react-three/fiber` + `drei` ≈254 KB, `globe.gl` ≈509 KB, against a 188.2 KB initial-JS budget.
- **Initial JS must not move.** Everything here lives behind the existing `import()` in `WorldsStage.tsx`.
- **`src/sections/Worlds/coastline-data.ts` is fenced.** `GlobeCanvas.tsx` is the only file permitted to import it, and `tests/lib/coastline-data.test.ts` fails if anything else does. A static import of `GlobeCanvas` from anything server-rendered pulls the engine *and* the coastlines into the initial bundle.
- **Every drawn object is a plaque or a decoration, and nothing else.** A plaque quotes one authored field verbatim or renders one named computation, and names its source. A decoration carries no fact and says so in its own accessible name. `tests/lib/worlds.test.ts` enforces it string-for-string. **A skin is a decoration.**
- **If a quoted plaque's text is not `===` a string the content layer produces, fix the reference or the authored field — never relax the assertion** to a substring or a normalised comparison.
- **Semantic aliases only** in any DOM this plan adds: `text-fg`, `text-fg-muted`, `border-rule`, `bg-surface`, `text-accent`. Shader colours are read from the computed values of those same custom properties at runtime, never hard-coded.
- **Blue is the only hue** and it is not decoration.
- **WCAG 2.2 AA.** Every marker and every mode is a real focusable control in the DOM; nothing is reachable only by hit-testing pixels.
- **`prefers-reduced-motion` is implemented in CSS and in the render loop**, and under it nothing animates while every chapter, every skin and every fact remains available.
- **`pnpm perf` runs against a production build**, initial JS is read first, and a run reporting any skipped responses is under-reported and must not be recorded in `docs/feedback-tracker.md`.

## Review Focus

1. **No WebGL context.** Locked-down browsers, some corporate images, and software-rendering blocklists return `null` from `getContext("webgl2")`. The section must degrade to the 2D globe that ships today, not to an empty box. → Task 1 asserts the fallback renders with context creation stubbed to `null`.
2. **A skin quietly acquiring a plaque.** Skins are the new concept and the honesty rule is the section's whole reason to exist. Nothing structurally stops someone adding a `plaques: [...]` to a skin later. → Task 5 asserts no skin carries a plaque, and that every skin's accessible name carries `DECORATION_LABEL`.
3. **The animation running while the visitor is elsewhere.** The owner was explicit: play once per visit, and *"non-sense if it keep playing when user in bottom"*. A `requestAnimationFrame` loop that never stops burns battery on a page nobody is looking at. → Task 6 asserts the loop stops when the stage leaves the viewport and does not restart on re-entry.
4. **Video autoplaying or preloading.** Eighty-nine megabytes of recordings exist. One `preload="auto"` or a missing `muted` turns a portfolio into a bandwidth incident. → Task 10 asserts every `<video>` carries `preload="none"`, `muted`, and a `poster`, and that none has `autoplay`.
5. **A shader that fails to compile in the wild.** A GLSL error is silent at build time and black at runtime, and precision qualifiers and integer-switch support differ across drivers. → Task 1 asserts compile and link status are checked and that a failure falls back rather than painting nothing.

---

## File Structure

**Engine (Tasks 1–3)**
- Create `src/sections/Worlds/gl/context.ts` — context acquisition, capability detection, and the one place that decides WebGL or 2D.
- Create `src/sections/Worlds/gl/shaders.ts` — the vertex and fragment source, as template strings.
- Create `src/sections/Worlds/gl/sphere.ts` — the quad, the uniforms, the draw call.
- Create `src/sections/Worlds/gl/coastline-texture.ts` — bakes `coastline-data` into one equirectangular texture.
- Modify `src/sections/Worlds/GlobeCanvas.tsx` — picks the renderer, keeps every existing interaction.

**Chapters and skins (Tasks 4–5)**
- Modify `src/content/worlds.ts` — seven worlds become six chapters.
- Create `src/content/skins.ts` — the five skins.
- Modify `src/lib/worlds.ts` — `resolveChapters()`, `SKINS` resolution.
- Modify `src/sections/Worlds/WorldsStage.tsx`, `WorldPanel.tsx` — two dials.

**Behaviour (Tasks 6–9)**
- Modify `src/sections/Worlds/gl/sphere.ts` — the crossing, the robot.
- Modify `src/app/globals.css` — the reduced-motion rules.

**Video (Task 10)**
- Create `public/media/*.mp4` and `*.jpg` posters.
- Create `src/sections/CareerTree/ProjectRecording.tsx`.

---

### Task 1: a context, or an honest fallback

Review Focus 1 and 5. This task is the whole risk surface of the plan: if the engine cannot be created or the shader cannot compile, the section must be the one that ships today, not a black rectangle.

**Files:**
- Create: `src/sections/Worlds/gl/context.ts`
- Test: `tests/lib/gl-context.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `acquireRenderer(canvas: HTMLCanvasElement): Renderer` where `Renderer = { kind: "webgl"; gl: WebGL2RenderingContext } | { kind: "canvas2d"; ctx: CanvasRenderingContext2D } | { kind: "none" }`, and `compileProgram(gl, vertexSource, fragmentSource): WebGLProgram | null`. Tasks 2, 3 and 6 consume both.

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it, vi } from "vitest";
import { acquireRenderer, compileProgram } from "@/sections/Worlds/gl/context";

function canvasWith(contexts: Record<string, unknown>): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.getContext = vi.fn((id: string) => contexts[id] ?? null) as never;
  return canvas;
}

describe("acquireRenderer", () => {
  it("prefers WebGL2 when it is there", () => {
    const gl = {} as WebGL2RenderingContext;
    expect(acquireRenderer(canvasWith({ webgl2: gl })).kind).toBe("webgl");
  });

  it("falls back to Canvas 2D when WebGL is refused", () => {
    // Locked-down browsers, corporate images and driver blocklists all return
    // null here. The section that ships today is the fallback, and it works.
    const ctx = {} as CanvasRenderingContext2D;
    expect(acquireRenderer(canvasWith({ "2d": ctx })).kind).toBe("canvas2d");
  });

  it("reports none rather than throwing when a canvas gives nothing", () => {
    expect(acquireRenderer(canvasWith({})).kind).toBe("none");
  });
});

describe("compileProgram", () => {
  it("returns null on a shader that will not compile, rather than a broken program", () => {
    // A GLSL error is silent at build time and black at runtime. Precision
    // qualifiers and integer switch support differ across drivers, so this is
    // a real runtime path, not a theoretical one.
    const gl = {
      createShader: () => ({}),
      shaderSource: () => {},
      compileShader: () => {},
      getShaderParameter: () => false,
      getShaderInfoLog: () => "ERROR: 0:1: syntax error",
      deleteShader: () => {},
      COMPILE_STATUS: 1,
      VERTEX_SHADER: 2,
      FRAGMENT_SHADER: 3,
    } as unknown as WebGL2RenderingContext;
    expect(compileProgram(gl, "bad", "bad")).toBeNull();
  });

  it("returns null when linking fails even though both shaders compiled", () => {
    const gl = {
      createShader: () => ({}),
      shaderSource: () => {},
      compileShader: () => {},
      getShaderParameter: () => true,
      createProgram: () => ({}),
      attachShader: () => {},
      linkProgram: () => {},
      getProgramParameter: () => false,
      getProgramInfoLog: () => "link failed",
      deleteProgram: () => {},
      deleteShader: () => {},
      COMPILE_STATUS: 1,
      LINK_STATUS: 4,
      VERTEX_SHADER: 2,
      FRAGMENT_SHADER: 3,
    } as unknown as WebGL2RenderingContext;
    expect(compileProgram(gl, "ok", "ok")).toBeNull();
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm vitest run tests/lib/gl-context.test.ts`
Expected: FAIL — cannot resolve the module.

- [ ] **Step 3: Implement it**

```ts
/**
 * The one place that decides how the globe is drawn, and the one place that
 * admits it cannot be.
 *
 * Three outcomes, and all three are real: WebGL2 where it exists, the Canvas
 * 2D globe that shipped through round 17 where it does not, and nothing at all
 * on a canvas that refuses both — which still means the section renders, because
 * every plaque, marker and mode in it is a real DOM control that never depended
 * on the drawing.
 *
 * WebGL1 is deliberately not attempted. The fragment shader uses integer
 * switching and `textureLod`, and a WebGL1 port would be a second shader to
 * keep correct for a shrinking set of browsers that all have a working 2D
 * canvas anyway.
 */
export type Renderer =
  | { readonly kind: "webgl"; readonly gl: WebGL2RenderingContext }
  | { readonly kind: "canvas2d"; readonly ctx: CanvasRenderingContext2D }
  | { readonly kind: "none" };

export function acquireRenderer(canvas: HTMLCanvasElement): Renderer {
  // `premultipliedAlpha: false` keeps the atmosphere rim's edge from
  // darkening against the section's ground; `antialias: false` because the
  // sphere's edge is computed in the shader, so MSAA costs fill rate and
  // changes nothing.
  const gl = canvas.getContext("webgl2", {
    alpha: true,
    antialias: false,
    premultipliedAlpha: false,
    powerPreference: "low-power",
  }) as WebGL2RenderingContext | null;
  if (gl) return { kind: "webgl", gl };

  const ctx = canvas.getContext("2d");
  if (ctx) return { kind: "canvas2d", ctx };

  return { kind: "none" };
}

function compileShader(
  gl: WebGL2RenderingContext,
  type: number,
  source: string,
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    // Logged, not thrown: a driver-specific compile failure should cost the
    // visitor a flatter planet, never a blank section.
    console.warn("globe: shader failed to compile", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export function compileProgram(
  gl: WebGL2RenderingContext,
  vertexSource: string,
  fragmentSource: string,
): WebGLProgram | null {
  const vertex = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  if (!vertex || !fragment) return null;

  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.warn("globe: program failed to link", gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }
  return program;
}
```

- [ ] **Step 4: Run them to verify they pass**

Run: `pnpm vitest run tests/lib/gl-context.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/sections/Worlds/gl/context.ts tests/lib/gl-context.test.ts
git commit -m "Acquire a GL context, or say so honestly

Three outcomes, all of them real: WebGL2, the Canvas 2D globe that shipped
through round 17, or nothing — and nothing still means the section renders,
because every plaque and mode in it is a real DOM control that never depended
on the drawing.

Compile and link status are both checked. A GLSL error is silent at build time
and black at runtime, and precision qualifiers differ across drivers, so a
failure logs and falls back rather than painting an empty rectangle."
```

---

### Task 2: bake the coastlines into a texture

The repo already has simplified Natural Earth coastlines. Rather than ship a new image, rasterise them once at runtime into an equirectangular canvas and upload that as a texture — so the planet gains a surface and the bundle gains nothing.

**Files:**
- Create: `src/sections/Worlds/gl/coastline-texture.ts`
- Modify: `tests/lib/coastline-data.test.ts`
- Test: `tests/lib/coastline-texture.test.ts`

**Interfaces:**
- Consumes: `COASTLINES` from `src/sections/Worlds/coastline-data.ts`.
- Produces: `bakeCoastlineTexture(rings, width, height): ImageData` — pure, so it is testable without a GL context. Task 3 uploads the result.

- [ ] **Step 1: Write the failing test**

```ts
describe("bakeCoastlineTexture", () => {
  it("maps longitude -180..180 to x and latitude 90..-90 to y", () => {
    // A single ring around the prime meridian at the equator must land in the
    // middle of the image. Off-by-one here is a planet with its continents in
    // the wrong hemisphere, which looks like a bug in the shader for hours.
    const image = bakeCoastlineTexture([[0, 0, 1, 0, 1, 1, 0, 1]], 360, 180);
    const index = (y: number, x: number) => (y * 360 + x) * 4;
    expect(image.data[index(90, 180) + 3]).toBeGreaterThan(0);
    expect(image.data[index(5, 5) + 3]).toBe(0);
  });

  it("produces an image of exactly the requested size", () => {
    const image = bakeCoastlineTexture([], 64, 32);
    expect(image.width).toBe(64);
    expect(image.height).toBe(32);
  });

  it("wraps a ring crossing the antimeridian instead of smearing it across the image", () => {
    // A ring from +179 to -179 is two degrees wide, not 358. Drawn naively it
    // paints a band across the entire texture.
    const image = bakeCoastlineTexture([[179, 0, -179, 0, -179, 1, 179, 1]], 360, 180);
    const index = (y: number, x: number) => (y * 360 + x) * 4;
    expect(image.data[index(90, 180) + 3]).toBe(0);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm vitest run tests/lib/coastline-texture.test.ts`
Expected: FAIL — cannot resolve the module.

- [ ] **Step 3: Implement it**

Write `bakeCoastlineTexture(rings: readonly (readonly number[])[], width: number, height: number): ImageData` as a **pure function over an `OffscreenCanvas`** (with a `document.createElement("canvas")` fallback), filling each ring as a path in equirectangular space. Requirements the tests pin:

- `x = (lon + 180) / 360 * width`, `y = (90 - lat) / 180 * height`.
- A ring whose longitude span exceeds 180° is split at the antimeridian and drawn as two paths.
- Land is opaque, ocean is transparent; the shader decides the colours, so the texture carries coverage only.
- `width` 2048, `height` 1024 in production — enough that a coastline reads crisply at the sphere's drawn size and small enough to upload in one frame.

- [ ] **Step 4: Run it to verify it passes**

Run: `pnpm vitest run tests/lib/coastline-texture.test.ts`
Expected: PASS.

- [ ] **Step 5: Keep the fence intact**

`tests/lib/coastline-data.test.ts` asserts `GlobeCanvas.tsx` is the only importer of `coastline-data.ts`. This task adds a second legitimate importer. Update the fence to permit **exactly** `src/sections/Worlds/gl/coastline-texture.ts` and no other — widening it to a glob defeats the test's purpose.

Run: `pnpm vitest run tests/lib/coastline-data.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Bake the coastlines into a texture instead of shipping one

The repo already has simplified Natural Earth rings. Rasterising them once at
runtime into an equirectangular canvas gives the planet a surface and costs the
bundle nothing.

A ring crossing the antimeridian is split rather than drawn naively, which
would paint a band across the whole texture; a test pins that, and pins the
lon/lat to x/y mapping, because an off-by-one there looks like a shader bug for
hours.

The coastline-data fence gains exactly one permitted importer, not a glob."
```

---

### Task 3: a lit sphere

**Files:**
- Create: `src/sections/Worlds/gl/shaders.ts`, `src/sections/Worlds/gl/sphere.ts`
- Modify: `src/sections/Worlds/GlobeCanvas.tsx`
- Test: `tests/lib/sphere.test.ts`

**Interfaces:**
- Consumes: `acquireRenderer`, `compileProgram` (Task 1); `bakeCoastlineTexture` (Task 2); `rotate`, `toVector`, `clampTilt`, `frameStep` from `src/lib/globe.ts`, all unchanged.
- Produces:

```ts
export interface SphereState {
  readonly spin: number;      // radians
  readonly tilt: number;      // radians, already through clampTilt()
  readonly chapter: number;   // index into CHAPTER_IDS
  readonly skin: number;      // index into SKIN_IDS, or -1 for none
  readonly crossing: number;  // 0..1, the arc's draw progress
  readonly robot: number;     // 0..1 across both passes, or -1 for absent
}

export interface SphereOptions {
  readonly coastlines: ImageData;
  /** The computed values of --fg, --ground and --accent, read off the canvas
   *  element so the planet follows both the theme and the tone it sits in. */
  readonly colors?: { ink: Vec3; paper: Vec3; accent: Vec3 };
}

export interface Sphere {
  draw(state: SphereState): void;
  dispose(): void;
}

export function createSphere(
  gl: WebGL2RenderingContext | null,
  options: SphereOptions,
): Sphere;

/** The at-rest state, exported for tests and for the reduced-motion path:
 *  the default chapter, no skin, the crossing already drawn, no robot. */
export const REST_STATE: SphereState = {
  spin: 0,
  tilt: 0,
  chapter: 0,
  skin: -1,
  crossing: 1,
  robot: -1,
};
```

Tasks 5–7 set `skin`, `crossing` and `robot`.

- [ ] **Step 1: Write the failing test**

```ts
describe("the sphere's uniform surface", () => {
  it("names every uniform the shader declares, and no others", () => {
    // A misspelled uniform name is a silent no-op: the value never reaches
    // the shader, the planet renders, and the feature simply does nothing.
    expect(SPHERE_UNIFORMS).toEqual([
      "uResolution", "uSpin", "uTilt", "uCoastlines",
      "uChapter", "uSkin", "uCrossing", "uRobot",
      "uInk", "uPaper", "uAccent",
    ]);
  });

  it("declares each one in the fragment source", () => {
    for (const name of SPHERE_UNIFORMS) {
      expect(FRAGMENT_SOURCE, name).toContain(name);
    }
  });

  it("reads its colours from the theme rather than hard-coding them", () => {
    // Two themes and three tones. A hex in the shader freezes the planet into
    // one of six combinations, which is exactly the bug the alias layer
    // exists to prevent.
    expect(FRAGMENT_SOURCE).not.toMatch(/#[0-9a-fA-F]{6}/);
  });

  it("falls back without a program rather than throwing", () => {
    const sphere = createSphere(null, { coastlines: new ImageData(2, 1) });
    expect(() => sphere.draw(REST_STATE)).not.toThrow();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm vitest run tests/lib/sphere.test.ts`
Expected: FAIL — cannot resolve the module.

- [ ] **Step 3: Write the shaders**

**The architecture that makes this small, and the reason `src/lib/globe.ts` survives untouched: two layers.** The GL canvas draws *the planet* — surface, lighting, terminator, atmosphere, skins. A second, transparent Canvas-2D element sits directly on top and draws *everything with a position*: the crossing arc, the markers, the glyphs, the labels. That overlay is the code shipping today, calling `project()` exactly as it does now. So the shader never needs to know what a plaque is, and the hit-testing, keyboard activation and label layout that already work are not rewritten.

`src/sections/Worlds/gl/shaders.ts`:

```ts
/**
 * One full-viewport triangle strip, and a fragment shader that intersects a
 * ray with a unit sphere. No mesh, no model/view/projection matrices, no index
 * buffer, no scene graph — that is the decision that makes this engine ten
 * kilobytes instead of three.js's hundred and thirty.
 *
 * Nothing positional lives here. Arcs, markers and labels are drawn by the 2D
 * overlay above this canvas, using `project()` from `src/lib/globe.ts`.
 */
export const VERTEX_SOURCE = `#version 300 es
in vec2 aCorner;
out vec2 vUv;
void main() {
  vUv = aCorner;
  gl_Position = vec4(aCorner * 2.0 - 1.0, 0.0, 1.0);
}`;

export const FRAGMENT_SOURCE = `#version 300 es
precision highp float;

uniform vec2 uResolution;
uniform float uSpin;
uniform float uTilt;
uniform sampler2D uCoastlines;
uniform int uChapter;
uniform int uSkin;
uniform float uCrossing;
uniform float uRobot;
uniform vec3 uInk;
uniform vec3 uPaper;
uniform vec3 uAccent;

in vec2 vUv;
out vec4 fragColor;

const float PI = 3.141592653589793;

mat3 rotX(float a) {
  float s = sin(a), c = cos(a);
  return mat3(1.0, 0.0, 0.0, 0.0, c, s, 0.0, -s, c);
}
mat3 rotY(float a) {
  float s = sin(a), c = cos(a);
  return mat3(c, 0.0, -s, 0.0, 1.0, 0.0, s, 0.0, c);
}

/** Surface point to equirectangular uv — the same mapping
 *  bakeCoastlineTexture() rasterises into, which is why an off-by-one in
 *  either one puts the continents in the wrong hemisphere. */
vec2 sphereUV(vec3 p) {
  float lon = atan(p.x, p.z);
  float lat = asin(clamp(p.y, -1.0, 1.0));
  return vec2(lon / (2.0 * PI) + 0.5, 0.5 - lat / PI);
}

void main() {
  // Square aspect-corrected device coordinates, -1..1, sphere radius 0.92 so
  // the atmosphere has somewhere to live.
  vec2 p = (vUv * uResolution * 2.0 - uResolution) / min(uResolution.x, uResolution.y);
  float r = 0.92;
  float d2 = dot(p, p);

  // Underwater moves the camera inside: the limb inverts and the surface is
  // seen from below, so the miss and hit branches swap roles.
  bool inside = (uSkin == 3);

  if (d2 > r * r) {
    // Missed the sphere. Fresnel-ish atmosphere falling off outside the limb.
    float rim = smoothstep(r * 1.34, r, sqrt(d2));
    vec3 air = mix(uPaper, uAccent, 0.55);
    if (uSkin == 2) air = mix(air, vec3(0.86, 0.35, 0.12), 0.75); // volcanic
    if (uSkin == 4) air = mix(air, vec3(0.78, 0.68, 0.49), 0.55); // desert dust
    fragColor = vec4(air, rim * 0.5);
    return;
  }

  // The hit point on the front of the sphere, then rotated by the same two
  // angles src/lib/globe.ts uses, so the overlay and the surface agree.
  float z = sqrt(max(0.0, r * r - d2));
  vec3 hit = normalize(vec3(p, inside ? -z : z));
  vec3 surface = rotX(-uTilt) * rotY(-uSpin) * hit;

  float land = texture(uCoastlines, sphereUV(surface)).a;
  float lat = asin(clamp(surface.y, -1.0, 1.0)) / (PI * 0.5);

  // One Lambert term against a fixed light gives a real terminator.
  vec3 light = normalize(vec3(-0.45, 0.35, 0.82));
  float lambert = clamp(dot(hit / r, light), 0.0, 1.0);

  vec3 ocean = mix(uPaper, uInk, 0.42);
  vec3 ground = mix(uPaper, uInk, 0.14);

  if (uSkin == 0) {                                   // Ice Age
    float ice = smoothstep(0.26, 0.62, abs(lat));
    ocean = mix(ocean, vec3(0.80, 0.86, 0.90), ice * 0.92);
    ground = mix(ground, vec3(0.93, 0.96, 0.98), ice);
    ocean = mix(ocean, vec3(0.74, 0.80, 0.84), 0.35);  // stilled, desaturated
  } else if (uSkin == 1) {                            // Night side
    lambert = 1.0 - lambert;
    // Cities: the coastline texture's own edge gradient stands in for
    // population, which is honest — it is a drawing, not a dataset.
    float coast = land * (1.0 - land) * 4.0;
    float lit = max(0.0, uRobot < 0.0 ? 1.0 : uRobot);
    ground += uAccent * coast * lambert * lit * 1.6;
  } else if (uSkin == 2) {                            // Volcanic
    float fissure = smoothstep(0.42, 0.52, land) * (1.0 - smoothstep(0.52, 0.66, land));
    ground = mix(vec3(0.16, 0.08, 0.06), vec3(0.95, 0.42, 0.10), fissure);
    ocean = mix(ocean, vec3(0.22, 0.10, 0.08), 0.8);
  } else if (uSkin == 4) {                            // Desert
    ground = mix(ground, vec3(0.80, 0.70, 0.50), 0.9);
    ocean = mix(ocean, vec3(0.72, 0.64, 0.50), 0.75);
  }

  vec3 color = mix(ocean, ground, land);

  // Sea chapter floods: land thins toward the ocean colour.
  if (uChapter == 1) color = mix(color, ocean, 0.55);
  // Plants chapter greens outward from the arrival pin's hemisphere.
  if (uChapter == 3) color = mix(color, mix(color, vec3(0.30, 0.52, 0.32), 0.7), land);
  // Technology chapter goes to lattice: a graticule, not a surface.
  if (uChapter == 5) {
    vec2 uv = sphereUV(surface) * vec2(48.0, 24.0);
    vec2 grid = abs(fract(uv) - 0.5);
    float wire = 1.0 - smoothstep(0.0, 0.06, min(grid.x, grid.y));
    color = mix(mix(uPaper, uInk, 0.08), uAccent, wire * 0.9);
  }

  // Terminator, then the limb's inner glow.
  color *= 0.30 + 0.70 * lambert;
  color = mix(color, mix(uPaper, uAccent, 0.5), smoothstep(r * 0.80, r, sqrt(d2)) * 0.30);

  // The arrival pin warms as the crossing lands. The arc itself is the 2D
  // overlay's job.
  color = mix(color, uAccent, clamp(uCrossing, 0.0, 1.0) * land * 0.06);

  fragColor = vec4(color, 1.0);
}`;

/** Every uniform the fragment shader declares. A misspelled name is a silent
 *  no-op — the value never arrives, the planet renders, and the feature simply
 *  does nothing — so the list is asserted against the source in the test. */
export const SPHERE_UNIFORMS = [
  "uResolution", "uSpin", "uTilt", "uCoastlines",
  "uChapter", "uSkin", "uCrossing", "uRobot",
  "uInk", "uPaper", "uAccent",
] as const;
```

Two things to check against a real GPU before trusting this, because neither fails at build time: that `highp float` is available in the fragment stage on the oldest target device, and that the `uSkin`/`uChapter` integer comparisons compile on a driver that dislikes dynamic branching. If either is a problem the fallback in Task 1 catches it, which is why Task 1 came first.

The skin and chapter index numbers above (`uSkin == 0` is Ice Age, `uChapter == 1` is Sea) must match `SKIN_IDS` and `CHAPTER_IDS` order from Tasks 4 and 5. **Those orders are the contract**; add a test asserting the index of each id rather than trusting the comments.

- [ ] **Step 4: Write the renderer**

`src/sections/Worlds/gl/sphere.ts` creates the program, uploads the texture once, caches every uniform location at creation (never per frame), and exposes `draw(state)`. `createSphere(null, …)` returns a no-op `Sphere` so the caller needs no branch — the test pins that.

- [ ] **Step 5: Wire it into `GlobeCanvas`**

`GlobeCanvas.tsx` keeps every interaction it has today — drag to spin, tilt, marker hit-testing, keyboard activation — and only swaps the painting. `acquireRenderer` decides; on `"canvas2d"` the existing 2D path runs untouched.

- [ ] **Step 6: Run the tests and verify in the browser**

Run: `pnpm test && pnpm dev`
Expected: PASS, and a lit sphere in both themes. Check `day` and `night`, and check it inside all three tones.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "Draw the planet as a lit sphere, with no dependency

One full-viewport triangle strip and a fragment shader that intersects a ray
with a unit sphere. No mesh, no matrices, no scene graph — which is the whole
reason this costs ten kilobytes instead of three.js's hundred and thirty.

src/lib/globe.ts is untouched and still does every piece of maths: the shader
only draws. Colours are uploaded from the computed values of --fg, --ground and
--accent, so the planet follows both the theme and the tone it is nested in; a
test asserts no hex ever appears in the shader, because one would freeze it into
a single one of six combinations."
```

---

### Task 4: seven worlds become six chapters

Spec §5.3. `vietnam` and `usa` merge into one chapter — the crossing has two ends and they belong to the same moment.

**Files:**
- Modify: `src/content/worlds.ts`, `src/lib/worlds.ts`, `src/types/portfolio.ts`
- Test: `tests/lib/worlds.test.ts`

**Interfaces:**
- Consumes: Plan A's content.
- Produces: `resolveChapters(): readonly ResolvedChapter[]`, six of them. Task 5 adds skins beside it.

- [ ] **Step 1: Write the failing test**

```ts
describe("the six chapters", () => {
  it("is six, in story order", () => {
    expect(resolveChapters().map((c) => c.id)).toEqual([
      "living-earth", "sea", "sky", "plants", "animals", "technology",
    ]);
  });

  it("keeps every plaque the seven worlds had", () => {
    // The merge must not lose a fact. Six chapters, same plaque count as the
    // seven worlds carried before it.
    const total = resolveChapters().reduce((n, c) => n + c.plaques.length, 0);
    expect(total).toBe(19);
  });

  it("puts both ends of the crossing in one chapter", () => {
    const living = resolveChapters().find((c) => c.id === "living-earth")!;
    expect(living.points).toHaveLength(2);
    expect(living.points).toContainEqual(origin.coordinates.from);
    expect(living.points).toContainEqual(origin.coordinates.to);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm vitest run tests/lib/worlds.test.ts -t "six chapters"`
Expected: FAIL — `resolveChapters is not a function`.

- [ ] **Step 3: Merge the two pins into one chapter**

In `src/content/worlds.ts`, replace the `vietnam` and `usa` entries with a single `living-earth` chapter holding every plaque both carried — `crossing` (computed), and the five `careerEntry` / `careerEntryLine` references from `usa` — and both anchors. A chapter's anchor becomes `anchors: readonly WorldAnchor[]` rather than a single `anchor`, which is what lets one chapter own two points.

`ResolvedWorld.point: GeoPoint | null` becomes `ResolvedChapter.points: readonly GeoPoint[]` — an empty array for the chapters that are not on the map. `coLocatedWorldIds()` and its tests change shape with it; keep the logic, which is correct and well-tested, and keep **every** one of its existing cases.

- [ ] **Step 4: Run it to verify it passes**

Run: `pnpm test`
Expected: PASS. If the plaque count is not 19, the merge dropped a reference — find it, do not change the expected number.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Seven worlds become six chapters

Việt Nam and the United States merge: a crossing has two ends and they belong
to the same moment, so one chapter owns both pins. A chapter carries a list of
anchors rather than one, which is what makes that possible.

A test pins the plaque count at nineteen across the merge. The point of the
merge is a better reading order, not fewer facts, and nineteen is how you tell
the difference."
```

---

### Task 5: five skins, and none of them may carry a fact

Review Focus 2. This is the task that keeps the section honest as it gets more fun.

**Files:**
- Create: `src/content/skins.ts`
- Modify: `src/lib/worlds.ts`, `src/sections/Worlds/WorldsStage.tsx`
- Test: `tests/lib/worlds.test.ts`

**Interfaces:**
- Consumes: `DECORATION_LABEL` from `src/lib/worlds.ts`.
- Produces: `SKIN_IDS`, `type SkinId`, `resolveSkins(): readonly ResolvedSkin[]` where a `ResolvedSkin` has `id`, `name`, `draws` and `label` — and **no** `plaques` field at all.

- [ ] **Step 1: Write the failing tests**

```ts
describe("the five skins", () => {
  it("is five, and Ice Age is one of them", () => {
    expect(resolveSkins().map((s) => s.id)).toEqual([
      "ice-age", "night-side", "volcanic", "underwater", "desert",
    ]);
  });

  it("gives every skin an accessible name that says it carries no fact", () => {
    // The same string the jellyfish already uses. The owner's answer on Ice
    // Age was "I mean the animation, not a quote or status — just a playful
    // interaction and design", and a skin is exactly that: honest decoration,
    // which the rule already permits.
    for (const skin of resolveSkins()) {
      expect(skin.label, skin.id).toContain(DECORATION_LABEL);
    }
  });

  it("makes it impossible for a skin to carry a plaque", () => {
    // Not "none of them currently does" — the type has no field for one, so a
    // future edit cannot add one without failing the typecheck. This test
    // documents the intent the type enforces.
    for (const skin of resolveSkins()) {
      expect("plaques" in skin, skin.id).toBe(false);
    }
  });

  it("keeps the chapters' plaque count unchanged by adding skins", () => {
    // Adding five visual modes must not add, move or drop a single fact.
    const total = resolveChapters().reduce((n, c) => n + c.plaques.length, 0);
    expect(total).toBe(19);
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm vitest run tests/lib/worlds.test.ts -t "five skins"`
Expected: FAIL — `resolveSkins is not a function`.

- [ ] **Step 3: Create the content**

```ts
import type { SkinId } from "@/types/portfolio";

/**
 * Five skins: pure spectacle, and honest about it.
 *
 * A skin changes what the planet *looks like* and carries no fact whatsoever.
 * That is not a loophole in the section's honesty rule, it is the rule's other
 * half — the same allowance the jellyfish and the plate of cơm tấm already use,
 * which is why both say so in their own accessible names.
 *
 * The owner's answer when asked whether Ice Age needed a fact to quote: "I mean
 * the animation, not a quote or status — just a playful interaction + design."
 * So it is a skin, and the type below has no field for a plaque. A future edit
 * cannot quietly give one a fact without failing the typecheck.
 *
 * Any skin wears over any chapter. Six times five is thirty planets, out of
 * eleven pieces of code.
 */
export const skins = [
  {
    id: "ice-age",
    name: "Ice Age",
    draws:
      "the poles advancing until they meet, the ocean stilling to a plate, the colour draining out, and the crossing frozen mid-flight",
  },
  {
    id: "night-side",
    name: "Night side",
    draws: "the planet turned into the dark, with every city a point of light",
  },
  {
    id: "volcanic",
    name: "Volcanic",
    draws:
      "the young Earth — molten fissures cracking along every coastline, and an atmosphere burning orange instead of blue",
  },
  {
    id: "underwater",
    name: "Underwater",
    draws:
      "the view from below the surface, looking up at the globe from inside it, with light shafting down through the water",
  },
  {
    id: "desert",
    name: "Desert",
    draws: "Ice Age at the other extreme — the oceans retreated, the surface gone to sand, dust hazing the limb",
  },
] as const;
```

In `src/lib/worlds.ts`, `resolveSkins()` maps each to `{ id, name, draws, label: `${draws} — ${DECORATION_LABEL}` }`. The `ResolvedSkin` interface declares exactly those four fields and nothing else.

- [ ] **Step 4: Add the second dial**

In `WorldsStage.tsx`, two toolbars: chapters and skins. Each is a group of real `<button>` elements with `aria-pressed`, arrow-key navigable, ≥44px. The skin toolbar's group label says these change only the look.

- [ ] **Step 5: Update the section's rail**

The rail counts what a reader cannot count by looking. It gains a skins row, and the existing `Plaques` and `Decorations` rows now include the skins:

```ts
  { term: "Skins", detail: `${SKINS.length} — looks only, carrying no fact` },
```

- [ ] **Step 6: Run the tests**

Run: `pnpm test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "Add five skins, and make it impossible for one to carry a fact

A chapter decides which facts are on the planet. A skin decides what the planet
looks like and carries nothing — the same allowance the jellyfish already uses,
declared the same way, in its own accessible name.

The ResolvedSkin type has no field for a plaque, so a future edit cannot give
one a fact without failing the typecheck. A test asserts the chapters' plaque
count is still nineteen: five new visual modes must not add, move or drop a
single fact.

This is the owner's answer on Ice Age — \"I mean the animation, not a quote or
status\" — turned into a type."
```

---

### Task 6: the crossing, once, and only while you are watching

Review Focus 3. The owner: *"play once then reset but only when user visit the page (because non-sense if it keep playing when user in bottom)"*.

**Files:**
- Modify: `src/sections/Worlds/GlobeCanvas.tsx`, `WorldsStage.tsx`
- Test: `tests/lib/crossing-loop.test.ts`

**Interfaces:**
- Consumes: `greatCircle`, `frameStep`, `easeFraction` from `src/lib/globe.ts`; `SphereState` from Task 3.
- Produces: `createCrossingLoop(options): CrossingLoop` where

```ts
interface CrossingLoopOptions {
  readonly onFrame: (progress: number) => void;
  readonly now: () => number;
  readonly reducedMotion?: boolean;
  readonly durationMs?: number;
}

interface CrossingLoop {
  start(): void;
  stop(): void;
  /** True once a run has begun. A second `start()` is a no-op. */
  readonly played: boolean;
  /** Frames actually scheduled. Exposed for the test, which is the only way
   *  to prove the second `start()` did nothing rather than quietly re-running. */
  readonly frameCount: number;
}
```

- [ ] **Step 1: Write the failing tests**

```ts
describe("the crossing animation", () => {
  it("plays once and does not replay when the stage is revisited", () => {
    const loop = createCrossingLoop({ onFrame: () => {}, now: () => 0 });
    loop.start();
    loop.stop();
    loop.start();
    expect(loop.played).toBe(true);
    // One play per visit. The second start is a no-op, not a second run.
    expect(loop.frameCount).toBe(0);
  });

  it("stops requesting frames when stopped", () => {
    const cancel = vi.fn();
    vi.stubGlobal("cancelAnimationFrame", cancel);
    const loop = createCrossingLoop({ onFrame: () => {}, now: () => 0 });
    loop.start();
    loop.stop();
    // A rAF loop that never stops burns battery on a page nobody is looking
    // at, which is exactly what the owner objected to.
    expect(cancel).toHaveBeenCalled();
  });

  it("jumps straight to the finished state under reduced motion", () => {
    const frames: number[] = [];
    const loop = createCrossingLoop({
      onFrame: (progress) => frames.push(progress),
      now: () => 0,
      reducedMotion: true,
    });
    loop.start();
    expect(frames).toEqual([1]);
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm vitest run tests/lib/crossing-loop.test.ts`
Expected: FAIL — cannot resolve the module.

- [ ] **Step 3: Implement it**

A loop that: refuses to start twice; cancels its `requestAnimationFrame` handle on `stop()`; under `reducedMotion` calls `onFrame(1)` once and never schedules a frame; and is driven by `frameStep`/`easeFraction` from `src/lib/globe.ts` rather than a hand-rolled timer, so it matches the easing the rest of the site uses.

`WorldsStage.tsx` starts it from the same `IntersectionObserver` that already triggers the chunk's `import()`, and calls `stop()` when the stage leaves the viewport.

- [ ] **Step 4: Run them to verify they pass**

Run: `pnpm vitest run tests/lib/crossing-loop.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Play the crossing once, and only while the stage is on screen

The owner's note: \"play once then reset but only when user visit the page,
because non-sense if it keep playing when user in bottom.\" The loop refuses to
start twice, cancels its frame handle when the stage leaves the viewport, and
under reduced motion calls onFrame(1) once and never schedules a frame at all.

Driven by frameStep and easeFraction from src/lib/globe.ts rather than a
hand-rolled timer, so it eases the way the rest of the site does."
```

---

### Task 7: the robot walks twice

Spec §5.3. The owner asked which was better — a robot destroying human life, or AI improving it. Neither alone.

**Files:**
- Modify: `src/sections/Worlds/gl/shaders.ts`, `src/sections/Worlds/gl/sphere.ts`, `WorldPanel.tsx`
- Test: `tests/lib/robot.test.ts`

**Interfaces:**
- Consumes: `SphereState.robot` (Task 3).
- Produces: `robotPass(progress: number): { pass: 1 | 2; lonDegrees: number; cityLight: number }`.

- [ ] **Step 1: Write the failing test**

```ts
describe("the robot's two passes", () => {
  it("darkens on the first lap", () => {
    const early = robotPass(0.25);
    expect(early.pass).toBe(1);
    // Behind it, the lights are out.
    expect(early.cityLight).toBeLessThan(0.5);
  });

  it("relights brighter than it started on the second", () => {
    const late = robotPass(0.75);
    expect(late.pass).toBe(2);
    expect(late.cityLight).toBeGreaterThan(1);
  });

  it("walks a full circle on each lap", () => {
    expect(robotPass(0).lonDegrees).toBeCloseTo(-180);
    expect(robotPass(0.5).lonDegrees).toBeCloseTo(-180);
    expect(robotPass(0.999).lonDegrees).toBeGreaterThan(170);
  });

  it("ends lit, not dark", () => {
    // The argument the content layer already makes is that accountability
    // stays human-owned. Ending on the dark pass would make the opposite one.
    expect(robotPass(1).pass).toBe(2);
    expect(robotPass(1).cityLight).toBeGreaterThan(1);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm vitest run tests/lib/robot.test.ts`
Expected: FAIL — cannot resolve.

- [ ] **Step 3: Implement it**

```ts
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
```

Then switch on `uRobot` in the fragment shader: the walked longitude gets a travelling highlight, and `cityLight` scales the night-side city emission.

- [ ] **Step 4: Run it to verify it passes**

Run: `pnpm vitest run tests/lib/robot.test.ts`
Expected: PASS.

- [ ] **Step 5: Name both passes in the panel**

The Technology chapter's panel says what is happening, in two lines, and both are about the *drawing*, not about the owner — this is a decoration, so neither line may read as a plaque. Label it with `DECORATION_LABEL` like any other drawing.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Let the robot walk twice

Asked whether it should destroy cities or light them, the answer is both, in
order. First lap unsupervised: the lights go out behind it. Second lap with a
human in the loop: they come back brighter than they started.

That is not a compromise between the two ideas — it is the argument the content
layer already makes, that architecture and accountability stay human-owned,
rendered instead of asserted. It ends on the lit pass, because ending dark
would make the opposite argument. A test pins that ending."
```

---

### Task 8: Việt Nam, furnished

**Files:**
- Modify: `src/content/worlds.ts`
- Test: `tests/lib/worlds.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
it("furnishes Việt Nam with the five things he named", () => {
  const living = resolveChapters().find((c) => c.id === "living-earth")!;
  const draws = living.decorations.map((d) => d.label).join("\n");
  for (const thing of ["cơm tấm", "bún bò Huế", "bún cá Rạch Giá", "mắm", "Tết"]) {
    expect(draws, thing).toContain(thing);
  }
});

it("still labels all five as carrying no fact", () => {
  const living = resolveChapters().find((c) => c.id === "living-earth")!;
  for (const decoration of living.decorations) {
    expect(decoration.label).toContain(DECORATION_LABEL);
  }
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm vitest run tests/lib/worlds.test.ts -t "furnishes"`
Expected: FAIL.

- [ ] **Step 3: Author the five**

Replace the chapter's single decoration:

```ts
    decorations: [
      { glyph: "comtam", draws: "a plate of cơm tấm — broken rice, a grilled chop, a fried egg" },
      { glyph: "bowl", draws: "a bowl of bún bò Huế" },
      // Rạch Giá is the capital of Kiên Giang — the province `origin.from`
      // names. This is the one drawing on the globe that is also the map, and
      // it is still a decoration: it carries no claim, only a place.
      { glyph: "bowl", draws: "a bowl of bún cá Rạch Giá, from the town the crossing starts in" },
      { glyph: "jar", draws: "a jar of mắm" },
      { glyph: "blossom", draws: "Tết — the new year, and the only holiday on this globe" },
    ],
```

Update the chapter's `disclosure` from "One object so far" to five, keeping its point: nothing here was invented to fill the space.

Add `bowl`, `jar` and `blossom` to the `GlyphId` union and draw them. Each is inline stroke SVG — no emoji, no icon font.

- [ ] **Step 4: Run it to verify it passes**

Run: `pnpm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Furnish Việt Nam with the five things he named

Cơm tấm, bún bò Huế, bún cá Rạch Giá, mắm, and Tết. All five are decorations
and all five say so, because none of them is a claim.

The bún cá is from Rạch Giá, the capital of the province origin.from names —
which makes it the one drawing on this globe that is also the map. The
disclosure goes from one object to five and keeps its point: nothing here was
invented to fill the space."
```

---

### Task 9: reduced motion, and a planet you can use with a keyboard

**Files:**
- Modify: `src/app/globals.css`, `WorldsStage.tsx`
- Test: `e2e/worlds.spec.ts`

- [ ] **Step 1: Write the failing e2e spec**

Assert, with `reducedMotion: "reduce"` in the Playwright context:
- every chapter button and every skin button is present and operable;
- each one's panel content is reachable;
- the crossing arc is drawn in its finished state;
- no element's computed `animation-name` or `transition-duration` is non-zero inside the section.

And with motion allowed:
- the chapter and skin toolbars are reachable by `Tab` and operable by arrow keys;
- activating a marker moves focus to its panel and `Escape` returns it;
- axe reports no violations, in both themes and all three tones.

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm playwright test e2e/worlds.spec.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

In `globals.css`, a `@media (prefers-reduced-motion: reduce)` block inside the section's scope that zeroes every transition and animation. The render loop's own `reducedMotion` branch (Task 6) handles the canvas. **Two implementations, deliberately:** CSS cannot stop a `requestAnimationFrame` loop, and JavaScript should not be the only thing honouring a user's stated preference.

- [ ] **Step 4: Run it to verify it passes**

Run: `pnpm test:e2e`
Expected: PASS. Never pipe through `tail`. Re-run with `--workers=2` on failure — documented saturation flake at 1440.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Honour reduced motion in CSS and in the loop

Two implementations on purpose: CSS cannot stop a requestAnimationFrame loop,
and JavaScript should not be the only thing honouring a preference the user
stated. Under reduce, nothing animates and every chapter, skin and fact is
still there.

The two dials are keyboard-operable, markers return focus on Escape, and axe
passes across both themes and all three tones."
```

---

### Task 10: the recordings, re-encoded

Review Focus 4. Raw: `toys.gif` 45.0 MB, `degreework.mp4` 19.4 MB, `foodroute.gif` 10.6 MB, `mentorhub.mp4` 7.5 MB, `chess.mp4` 4.2 MB, `conscea.mp4` 2.1 MB — about 89 MB.

**Files:**
- Create: `public/media/<id>.mp4`, `public/media/<id>.jpg`
- Create: `src/sections/CareerTree/ProjectRecording.tsx`
- Test: `tests/ui/ProjectRecording.test.tsx`

- [ ] **Step 1: Re-encode**

```bash
mkdir -p public/media
for f in chess conscea degreework mentorhub; do
  ffmpeg -i "/d/Project/Portfolio-v2/src/assets/experience/$f.mp4" \
    -vf "scale=1280:-2" -c:v libx264 -crf 30 -preset slow -an \
    -movflags +faststart "public/media/$f.mp4"
done
for f in toys foodroute; do
  ffmpeg -i "/d/Project/Portfolio-v2/src/assets/experience/$f.gif" \
    -vf "scale=1280:-2" -c:v libx264 -crf 30 -preset slow -an \
    -movflags +faststart "public/media/$f.mp4"
done
for f in chess conscea degreework mentorhub toys foodroute; do
  ffmpeg -i "public/media/$f.mp4" -vframes 1 -q:v 4 "public/media/$f.jpg"
done
ls -la public/media
```

**Every output must be ≤ 1.5 MB.** If one is not, raise `-crf` to 34 and re-encode that file. A 45 MB GIF becomes roughly a megabyte of H.264; if `toys.mp4` is still large, the source is long rather than high-bitrate — trim it with `-t 20` rather than shipping it.

- [ ] **Step 2: Write the failing test**

```tsx
describe("a project recording", () => {
  it("never fetches until the visitor asks", () => {
    // 89 MB of source exists. One preload="auto" turns a portfolio into a
    // bandwidth incident.
    render(<ProjectRecording id="chess" title="A chess engine" />);
    const video = screen.getByLabelText(/chess engine/i);
    expect(video).toHaveAttribute("preload", "none");
    expect(video).toHaveAttribute("poster", "/media/chess.jpg");
    expect(video).not.toHaveAttribute("autoplay");
    expect(video).toHaveAttribute("muted");
  });

  it("shows a poster and a play control under reduced motion rather than looping", () => {
    render(<ProjectRecording id="chess" title="A chess engine" reducedMotion />);
    expect(screen.getByLabelText(/chess engine/i)).not.toHaveAttribute("loop");
    expect(screen.getByRole("button", { name: /play/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `pnpm vitest run tests/ui/ProjectRecording.test.tsx`
Expected: FAIL — cannot resolve.

- [ ] **Step 4: Implement and wire it in**

`<video preload="none" muted loop playsinline poster="/media/<id>.jpg" aria-label="<title> — screen recording">` with a visible play control, rendered inside an opened branch in the Journey stage. Under `reducedMotion`, drop `loop` and require an explicit play.

- [ ] **Step 5: Run it to verify it passes**

Run: `pnpm vitest run tests/ui/ProjectRecording.test.tsx`
Expected: PASS.

- [ ] **Step 6: Prove nothing loads until a branch opens**

With `pnpm dev` running, open the page with the network panel recording, scroll past the Journey without opening a branch, and confirm **no** request to `/media/*.mp4`. Then open a branch and confirm exactly one.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "Bring four screen recordings across, re-encoded

Video is the one kind of evidence this site had none of. The sources are 89 MB
— toys.gif alone is 45 — so every one is re-encoded to H.264 under 1.5 MB with
a poster frame.

preload=\"none\", muted, no autoplay, inside an opened branch: nothing is
fetched until a visitor asks for it, verified in the network panel rather than
assumed. Under reduced motion the loop is dropped and play is explicit."
```

---

### Task 11: measure it, then record the row

**Files:**
- Modify: `docs/feedback-tracker.md`, `CLAUDE.md`

- [ ] **Step 1: Full verification**

```bash
pnpm verify
```

Expected: PASS — typecheck, lint, contrast, test, build.

- [ ] **Step 2: Both themes, every chapter, every skin, in a browser**

```bash
pnpm dev
```

Walk all six chapters against all five skins in `day` and `night`. Confirm: the crossing plays once and does not replay, the robot's two passes both run and it ends lit, every plaque panel names its source, every skin says it carries no fact, and Việt Nam has five objects.

- [ ] **Step 3: The accessibility and responsive suites**

```bash
pnpm test:e2e
```

Expected: PASS across both themes and all three tones, including keyboard nav, focus restoration, reduced motion, and no horizontal overflow at 320–1440px. Never pipe through `tail`. Re-run with `--workers=2` on failure.

- [ ] **Step 4: Measure against a production build**

```bash
pnpm perf
```

**Read initial JS first.** It must not have moved more than a kilobyte or two from the 188.2 KB baseline. A larger move means the shader, the coastline texture or a video has leaked out of the lazy chunk — find it before recording anything.

Check the skipped-response count and the `content-length` cross-check. **A run reporting any skipped responses is under-reported and must not be recorded.** Re-run until clean.

- [ ] **Step 5: Record the row**

Add the row to `docs/feedback-tracker.md` with the initial-JS figure, the node count, the run count, and the skipped count (which must be zero).

- [ ] **Step 6: Update CLAUDE.md**

Its globe section describes a Canvas-2D-only renderer and says the globe uses no runtime dependency at all. The second half is still true and now more interesting; the first half is not. Rewrite it to say: hand-written WebGL2 with a Canvas 2D fallback, still no dependency, the measured comparison that justified it, the chapters-versus-skins rule, and that a skin may never carry a plaque.

Add the `coastline-data` fence's second permitted importer.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "Record the living Earth's measured cost

pnpm perf against a production build, zero skipped responses. Initial JS has
not moved: the shader, the baked coastline texture and every video are behind
the lazy chunk, which is the whole reason a real 3D planet was affordable
without a 3D library.

CLAUDE.md's globe section described a Canvas-2D renderer. It now describes
hand-written WebGL2 with a 2D fallback, still with no runtime dependency, and
records the rule that keeps the section honest: a chapter carries facts, a skin
carries none, and a skin may never acquire a plaque."
```
