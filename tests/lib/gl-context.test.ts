import { describe, expect, it, vi } from "vitest";
import {
  acquireRenderer,
  compileProgram,
  pickSurface,
} from "@/sections/Worlds/gl/context";

function canvasWith(contexts: Record<string, unknown>): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.getContext = vi.fn((id: string) => contexts[id] ?? null) as never;
  return canvas;
}

const GL = {} as WebGL2RenderingContext;
const PROGRAM = {} as WebGLProgram;

describe("acquireRenderer", () => {
  it("returns the WebGL2 context when it is there", () => {
    const result = acquireRenderer(canvasWith({ webgl2: GL }));
    expect(result).toEqual({ kind: "webgl", gl: GL });
  });

  it("reports none rather than throwing when WebGL2 is refused", () => {
    expect(acquireRenderer(canvasWith({})).kind).toBe("none");
  });

  it("does not fall back to WebGL1 or a 2D context on the surface", () => {
    // The 2D overlay is a separate canvas; a 2D context taken here would also
    // lock the surface out of WebGL for good.
    const canvas = canvasWith({ webgl: GL, experimental: GL, "2d": {} });
    expect(acquireRenderer(canvas).kind).toBe("none");
    const ids = (canvas.getContext as ReturnType<typeof vi.fn>).mock.calls.map(
      (call) => call[0],
    );
    expect(ids).toEqual(["webgl2"]);
  });
});

describe("pickSurface", () => {
  it("uses the GL surface when there is a context and a program", () => {
    expect(
      pickSurface({ gl: GL, program: PROGRAM, forcedColors: false }),
    ).toEqual({ useGl: true, reason: "ok" });
  });

  it("falls back when there is no context", () => {
    expect(
      pickSurface({ gl: null, program: null, forcedColors: false }),
    ).toEqual({ useGl: false, reason: "no-context" });
  });

  it("falls back when the shader failed to compile or link", () => {
    expect(
      pickSurface({ gl: GL, program: null, forcedColors: false }),
    ).toEqual({ useGl: false, reason: "no-program" });
  });

  it("falls back under forced colours even with a working program", () => {
    expect(
      pickSurface({ gl: GL, program: PROGRAM, forcedColors: true }),
    ).toEqual({ useGl: false, reason: "forced-colors" });
  });
});

describe("compileProgram", () => {
  it("returns the program when both shaders compile and it links", () => {
    const program = {};
    const gl = {
      createShader: () => ({}),
      shaderSource: () => {},
      compileShader: () => {},
      getShaderParameter: () => true,
      createProgram: () => program,
      attachShader: () => {},
      linkProgram: () => {},
      getProgramParameter: () => true,
      deleteProgram: vi.fn(),
      deleteShader: () => {},
      COMPILE_STATUS: 1,
      LINK_STATUS: 4,
      VERTEX_SHADER: 2,
      FRAGMENT_SHADER: 3,
    } as unknown as WebGL2RenderingContext;
    expect(compileProgram(gl, "ok", "ok")).toBe(program);
    expect(gl.deleteProgram).not.toHaveBeenCalled();
  });

  it("returns null on a shader that will not compile, rather than a broken program", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
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
    vi.spyOn(console, "warn").mockImplementation(() => {});
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
