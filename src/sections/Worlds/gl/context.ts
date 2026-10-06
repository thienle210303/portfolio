/**
 * Decides whether the globe gets a GL surface under its 2D canvas.
 *
 * The 2D overlay always exists and, alone, is the globe that shipped through
 * round 17. So the only question here is "GL surface, or none": every failure
 * (no context, shader that will not compile or link, forced colours) answers
 * "none" and costs the visitor a flatter planet, never a blank section.
 *
 * WebGL1 is deliberately not attempted: the fragment shader needs WebGL2, and
 * a second shader for a shrinking set of browsers that all have a working 2D
 * canvas is not worth keeping correct.
 */
export type Renderer =
  | { readonly kind: "webgl"; readonly gl: WebGL2RenderingContext }
  | { readonly kind: "none" };

export function acquireRenderer(surface: HTMLCanvasElement): Renderer {
  // `antialias: false` because the sphere's edge is computed in the shader;
  // `premultipliedAlpha: false` keeps the rim from darkening against the ground.
  const gl = surface.getContext("webgl2", {
    alpha: true,
    antialias: false,
    premultipliedAlpha: false,
    powerPreference: "low-power",
  }) as WebGL2RenderingContext | null;
  return gl ? { kind: "webgl", gl } : { kind: "none" };
}

export type SurfaceReason =
  | "ok"
  | "no-context"
  | "no-program"
  | "forced-colors";

export interface SurfaceChoice {
  readonly useGl: boolean;
  readonly reason: SurfaceReason;
}

export function pickSurface(input: {
  gl: WebGL2RenderingContext | null;
  program: WebGLProgram | null;
  forcedColors: boolean;
}): SurfaceChoice {
  if (!input.gl) return { useGl: false, reason: "no-context" };
  if (!input.program) return { useGl: false, reason: "no-program" };
  // Only the overlay honours the system palette, so forced colours keep it and
  // drop the surface. GlobeCanvas never builds a sphere under forced colours,
  // so this branch is reached only by a caller that does.
  if (input.forcedColors) return { useGl: false, reason: "forced-colors" };
  return { useGl: true, reason: "ok" };
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
  if (!vertex || !fragment) {
    if (vertex) gl.deleteShader(vertex);
    if (fragment) gl.deleteShader(fragment);
    return null;
  }

  const program = gl.createProgram();
  if (!program) {
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    return null;
  }
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
