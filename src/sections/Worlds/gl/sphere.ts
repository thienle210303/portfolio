import { rotate, toGeo, type Vec3, type Viewport } from "@/lib/globe";
import type { GeoPoint } from "@/types/portfolio";
import type { CoastlineTexture } from "./coastline-texture";
import { compileProgram } from "./context";
import { CHAPTER_INDEX, FRAGMENT_SOURCE, SPHERE_UNIFORMS, VERTEX_SOURCE, type SphereUniform } from "./shaders";

export interface SphereState {
  readonly spin: number;      // radians
  readonly tilt: number;      // radians, already through clampTilt()
  readonly chapter: number;   // CHAPTER_INDEX[id]
  readonly skin: number;      // SKIN_INDEX[id], or -1 for none
  readonly crossing: number;  // 0..1, the arc's draw progress
  readonly robot: number;     // 0..1 across both passes, or -1 for absent
}

/** The at-rest state: Living Earth, no skin, the crossing drawn, no robot. */
export const REST_STATE: SphereState = {
  spin: 0,
  tilt: 0,
  chapter: CHAPTER_INDEX["living-earth"],
  skin: -1,
  crossing: 1,
  robot: -1,
};

/** `--fg`, `--ground` and `--accent`, parsed to 0..1. */
export interface SphereColors {
  readonly ink: Vec3;
  readonly paper: Vec3;
  readonly accent: Vec3;
}

export interface SphereOptions {
  readonly coverage: CoastlineTexture;
  readonly colors: SphereColors;
}

/** The drawing buffer's size and GlobeCanvas's stroke, all in device pixels. */
export interface SphereView extends Viewport {
  readonly width: number;
  readonly height: number;
}

export interface Sphere {
  /** False when there was no context, the program failed, or after dispose. */
  readonly ok: boolean;
  /** The linked program, or null: what `pickSurface({ program })` needs. */
  readonly program: WebGLProgram | null;
  draw(state: SphereState, view: SphereView): void;
  setColors(colors: SphereColors): void;
  dispose(): void;
}

/**
 * GlobeCanvas's `view.stroke` (cx = w/2, cy = 0.44h, radius =
 * min(w, 0.82h) * 0.42), scaled to device pixels. The overlay draws in CSS
 * pixels through `setTransform(ratio, …)`, so scaling by the same ratio keeps
 * the two canvases on one disc.
 */
export function sphereView(cssWidth: number, cssHeight: number, ratio: number): SphereView {
  return {
    width: Math.round(cssWidth * ratio),
    height: Math.round(cssHeight * ratio),
    cx: (cssWidth / 2) * ratio,
    cy: cssHeight * 0.44 * ratio,
    radius: Math.min(cssWidth, cssHeight * 0.82) * 0.42 * ratio,
  };
}

/**
 * The inverse of `rotate(·, spin, tilt)` as a GLSL `mat3`, column-major.
 * `rotate` is orthonormal, so its inverse is its transpose: row i of the
 * inverse is `rotate(e_i)`, which makes the matrix exact by construction
 * rather than a second hand-derived copy of the angles.
 */
export function inverseRotation(spin: number, tilt: number): number[] {
  const rows = [
    rotate([1, 0, 0], spin, tilt),
    rotate([0, 1, 0], spin, tilt),
    rotate([0, 0, 1], spin, tilt),
  ];
  const out: number[] = [];
  for (let column = 0; column < 3; column++) {
    for (let row = 0; row < 3; row++) out.push(rows[row][column]);
  }
  return out;
}

/**
 * The fragment shader's pixel → place mapping, step for step. `fragX`/`fragY`
 * are `gl_FragCoord` (pixel centres, rows counted from the bottom).
 */
export function surfaceGeo(
  fragX: number,
  fragY: number,
  view: SphereView,
  inverse: readonly number[],
): GeoPoint | null {
  const nx = (fragX - view.cx) / view.radius;
  const ny = (view.cy - (view.height - fragY)) / view.radius;
  const d2 = nx * nx + ny * ny;
  if (d2 > 1) return null;
  const v: Vec3 = [Math.sqrt(Math.max(0, 1 - d2)), nx, ny];
  const m = inverse;
  return toGeo([
    m[0] * v[0] + m[3] * v[1] + m[6] * v[2],
    m[1] * v[0] + m[4] * v[1] + m[7] * v[2],
    m[2] * v[0] + m[5] * v[1] + m[8] * v[2],
  ]);
}

/**
 * A computed colour (`#rgb`, `#rrggbb`, `rgb()`/`rgba()` in comma or space
 * syntax) as 0..1. Anything else, including forced-colours keywords, is null:
 * the caller decides what a planet with no readable palette does.
 */
export function parseCssColor(value: string): Vec3 | null {
  const text = value.trim();
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(text);
  if (hex) {
    const digits = hex[1].length === 3 ? [...hex[1]].map((c) => c + c) : hex[1].match(/../g)!;
    return digits.map((pair) => parseInt(pair, 16) / 255) as unknown as Vec3;
  }
  const rgb = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)\s*(?:[,/]\s*[\d.]+%?\s*)?\)$/i.exec(text);
  if (rgb) return [Number(rgb[1]) / 255, Number(rgb[2]) / 255, Number(rgb[3]) / 255];
  return null;
}

function noop(): Sphere {
  return { ok: false, program: null, draw() {}, setColors() {}, dispose() {} };
}

// Two triangles as a strip, in clip space.
const CORNERS = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);

export function createSphere(gl: WebGL2RenderingContext | null, options: SphereOptions): Sphere {
  if (!gl) return noop();
  const program = compileProgram(gl, VERTEX_SOURCE, FRAGMENT_SOURCE);
  if (!program) return noop();

  const vao = gl.createVertexArray();
  const buffer = gl.createBuffer();
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, CORNERS, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);

  // REPEAT in u so linear filtering blends across the antimeridian seam;
  // CLAMP_TO_EDGE in v so the poles do not bleed into each other.
  const { coverage } = options;
  const texture = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.texImage2D(
    gl.TEXTURE_2D, 0, gl.RGBA8, coverage.width, coverage.height, 0,
    gl.RGBA, gl.UNSIGNED_BYTE, coverage.data,
  );
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  const at = {} as Record<SphereUniform, WebGLUniformLocation | null>;
  for (const name of SPHERE_UNIFORMS) at[name] = gl.getUniformLocation(program, name);

  const setColors = (colors: SphereColors) => {
    gl.useProgram(program);
    gl.uniform3f(at.uInk, ...colors.ink);
    gl.uniform3f(at.uPaper, ...colors.paper);
    gl.uniform3f(at.uAccent, ...colors.accent);
  };
  gl.useProgram(program);
  gl.uniform1i(at.uCoastlines, 0);
  setColors(options.colors);

  const matrix = new Float32Array(9);
  let live = true;

  return {
    get ok() {
      return live;
    },
    get program() {
      return live ? program : null;
    },
    draw(state, view) {
      if (!live) return;
      gl.viewport(0, 0, view.width, view.height);
      gl.useProgram(program);
      gl.bindVertexArray(vao);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      matrix.set(inverseRotation(state.spin, state.tilt));
      gl.uniform2f(at.uResolution, view.width, view.height);
      gl.uniform2f(at.uCenter, view.cx, view.cy);
      gl.uniform1f(at.uRadius, view.radius);
      gl.uniformMatrix3fv(at.uInverseRotation, false, matrix);
      gl.uniform1i(at.uChapter, state.chapter);
      gl.uniform1i(at.uSkin, state.skin);
      gl.uniform1f(at.uCrossing, state.crossing);
      gl.uniform1f(at.uRobot, state.robot);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      gl.bindVertexArray(null);
    },
    setColors(colors) {
      if (live) setColors(colors);
    },
    dispose() {
      if (!live) return;
      live = false;
      gl.deleteProgram(program);
      gl.deleteBuffer(buffer);
      gl.deleteVertexArray(vao);
      gl.deleteTexture(texture);
    },
  };
}
