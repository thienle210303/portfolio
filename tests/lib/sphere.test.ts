import { describe, expect, it, vi } from "vitest";
import { unproject } from "@/lib/globe";
import { SKIN_IDS } from "@/lib/skins";
import { CHAPTER_IDS } from "@/lib/worlds";
import {
  CHAPTER_INDEX,
  FRAGMENT_SOURCE,
  SKIN_INDEX,
  SPHERE_UNIFORMS,
  VERTEX_SOURCE,
  glslName,
} from "@/sections/Worlds/gl/shaders";
import {
  REST_STATE,
  createSphere,
  inverseRotation,
  parseCssColor,
  sphereView,
  surfaceGeo,
  type SphereColors,
} from "@/sections/Worlds/gl/sphere";

const DEG = Math.PI / 180;

/** Every numeric-only argument to a vec3/vec4 constructor, except on the
 *  lines that set a light direction. A direction is geometry, not a colour. */
function colourLiterals(source: string): string[] {
  const found: string[] = [];
  for (const line of source.split("\n")) {
    if (/^\s*vec3 light\w* = /.test(line)) continue;
    for (const match of line.matchAll(/vec[34]\(([^()]*)\)/g)) {
      const literals = match[1]
        .split(",")
        .map((arg) => arg.trim())
        .filter((arg) => /^-?\d*\.?\d+$/.test(arg));
      if (literals.some((arg) => Number(arg) !== 0 && Number(arg) !== 1)) found.push(match[0]);
    }
  }
  return found;
}

function declaredUniforms(source: string): string[] {
  return [...source.matchAll(/^uniform \w+ (\w+);$/gm)].map((m) => m[1]);
}

describe("the sphere's uniform surface", () => {
  it("names every uniform the shader declares, in order, and no others", () => {
    // A misspelled uniform name is a silent no-op: the value never reaches
    // the shader, the planet renders, and the feature simply does nothing.
    expect(SPHERE_UNIFORMS).toEqual([
      "uResolution", "uCenter", "uRadius", "uInverseRotation", "uCoastlines",
      "uChapter", "uSkin", "uCrossing", "uRobot",
      "uInk", "uPaper", "uAccent",
    ]);
    expect(declaredUniforms(FRAGMENT_SOURCE)).toEqual([...SPHERE_UNIFORMS]);
  });

  it("declares each uniform exactly once", () => {
    for (const name of SPHERE_UNIFORMS) {
      const declarations = FRAGMENT_SOURCE.match(new RegExp(`^uniform \\w+ ${name};$`, "gm"));
      expect(declarations, name).toHaveLength(1);
    }
  });
});

describe("the shader's colours", () => {
  it("contains no colour literal: only ink, paper and accent, mixed", () => {
    // Two themes and three tones. A literal colour freezes the planet into one
    // of six combinations, which is exactly the bug the alias layer exists to
    // prevent.
    expect(colourLiterals(FRAGMENT_SOURCE)).toEqual([]);
    expect(FRAGMENT_SOURCE).not.toMatch(/#[0-9a-fA-F]{3,6}\b/);
  });

  it("the check catches a literal colour", () => {
    expect(colourLiterals("  air = mix(air, vec3(0.86, 0.35, 0.12), 0.75);")).toHaveLength(1);
    expect(colourLiterals("  fragColor = vec4(0.0, 0.0, 0.0, 0.0);")).toEqual([]);
  });
});

describe("the index contract with CHAPTER_IDS and SKIN_IDS", () => {
  it("maps each id to its position in the content-derived arrays", () => {
    CHAPTER_IDS.forEach((id, i) => expect(CHAPTER_INDEX[id], id).toBe(i));
    SKIN_IDS.forEach((id, i) => expect(SKIN_INDEX[id], id).toBe(i));
    expect(Object.keys(CHAPTER_INDEX)).toHaveLength(CHAPTER_IDS.length);
    expect(Object.keys(SKIN_INDEX)).toHaveLength(SKIN_IDS.length);
  });

  it("declares a GLSL constant for every id, equal to that id's index", () => {
    CHAPTER_IDS.forEach((id, i) =>
      expect(FRAGMENT_SOURCE).toContain(`const int ${glslName("CHAPTER", id)} = ${i};`),
    );
    SKIN_IDS.forEach((id, i) =>
      expect(FRAGMENT_SOURCE).toContain(`const int ${glslName("SKIN", id)} = ${i};`),
    );
  });

  it("branches only through those constants, never a bare index", () => {
    expect(FRAGMENT_SOURCE).not.toMatch(/u(Chapter|Skin)\s*[=!]=\s*-?\d/);
    const used = new Set(FRAGMENT_SOURCE.match(/\b(CHAPTER|SKIN)_[A-Z_]+\b/g));
    const declared = new Set(
      [...FRAGMENT_SOURCE.matchAll(/const int ((?:CHAPTER|SKIN)_\w+) =/g)].map((m) => m[1]),
    );
    for (const name of used) expect(declared, name).toContain(name);
  });

  it("draws every skin, and the three chapters that change the surface", () => {
    for (const id of SKIN_IDS) {
      expect(FRAGMENT_SOURCE, id).toMatch(new RegExp(`uSkin == ${glslName("SKIN", id)}\\b`));
    }
    for (const id of ["sea", "plants", "tech"]) {
      expect(CHAPTER_IDS).toContain(id);
      expect(FRAGMENT_SOURCE, id).toMatch(new RegExp(`uChapter == ${glslName("CHAPTER", id)}\\b`));
    }
  });
});

describe("GLSL sanity, short of a parser", () => {
  for (const [label, source] of [["vertex", VERTEX_SOURCE], ["fragment", FRAGMENT_SOURCE]] as const) {
    it(`${label}: starts with the ES 3.00 version line, and uses no ES 1.00 forms`, () => {
      // Anything before #version, even a newline, fails the compile.
      expect(source.startsWith("#version 300 es\n")).toBe(true);
      expect(source).not.toMatch(/\b(gl_FragColor|texture2D|varying|attribute)\b/);
    });
  }

  it("fragment: declares highp float precision", () => {
    expect(FRAGMENT_SOURCE).toContain("\nprecision highp float;\n");
  });

  it("fragment: assigns no int literal to a float", () => {
    // ES 3.00 has no implicit int -> float conversion.
    expect(FRAGMENT_SOURCE).not.toMatch(/\bfloat\s+\w+\s*=\s*-?\d+\s*;/);
    expect(FRAGMENT_SOURCE).not.toMatch(
      /\b(smoothstep|mix|clamp|step|pow|max|min|fract|abs)\([^()]*(?<![\w.])\d+(?![\w.])/,
    );
  });

  it("fragment: declares every function before its first call", () => {
    for (const m of FRAGMENT_SOURCE.matchAll(/^(?:float|vec2|vec3|bool) (\w+)\(/gm)) {
      expect(FRAGMENT_SOURCE.indexOf(`${m[1]}(`), m[1]).toBe(m.index + m[0].length - m[1].length - 1);
    }
  });
});

describe("sphereView", () => {
  it("matches GlobeCanvas's stroke (cx = w/2, cy = 0.44h), in device pixels", () => {
    // GlobeCanvas: radius = min(w, 0.82h) * 0.42, all times the device ratio.
    expect(sphereView(800, 600, 2)).toEqual({
      width: 1600,
      height: 1200,
      cx: 800,
      cy: 528,
      radius: Math.min(800, 600 * 0.82) * 0.42 * 2,
    });
    const narrow = sphereView(320, 500, 1.5);
    expect(narrow.cx).toBeCloseTo(240, 12);
    expect(narrow.cy).toBeCloseTo(330, 12);
    expect(narrow.radius).toBeCloseTo(320 * 0.42 * 1.5, 12);
    expect(narrow.width).toBe(480);
    expect(narrow.height).toBe(750);
  });
});

describe("inverseRotation and the shader's screen -> (lon, lat) twin", () => {
  it("is column-major and undoes rotate()", () => {
    const m = inverseRotation(0.7, -0.3);
    expect(m).toHaveLength(9);
    // Columns are images of the view axes; each column is a unit vector.
    for (let c = 0; c < 3; c++) {
      expect(Math.hypot(m[c * 3], m[c * 3 + 1], m[c * 3 + 2])).toBeCloseTo(1, 12);
    }
    expect(inverseRotation(0, 0)).toEqual([1, 0, 0, 0, 1, 0, 0, 0, 1]);
  });

  const pairs: readonly (readonly [number, number])[] = [
    [0, 0],
    [-105 * DEG, -12 * DEG],
    [40 * DEG, 40 * DEG],
    [-170 * DEG, -40 * DEG],
    [2.5, 0.3],
    [-0.4, -12 * DEG],
  ];
  const view = sphereView(800, 600, 2);
  // Pixel centres, as gl_FragCoord delivers them; top-down rows for unproject.
  const pixels: readonly (readonly [number, number])[] = [
    [800.5, 528.5],
    [612.5, 401.5],
    [1003.5, 700.5],
    [700.5, 300.5],
    [1150.5, 560.5],
    [520.5, 790.5],
  ];

  for (const [spin, tilt] of pairs) {
    it(`equals unproject() within 1e-6 at spin ${(spin / DEG).toFixed(1)}°, tilt ${(tilt / DEG).toFixed(1)}°`, () => {
      const m = inverseRotation(spin, tilt);
      for (const [x, y] of pixels) {
        const expected = unproject(x, y, spin, tilt, view);
        const actual = surfaceGeo(x, view.height - y, view, m);
        expect(expected, `${x},${y}`).not.toBeNull();
        expect(actual, `${x},${y}`).not.toBeNull();
        expect(Math.abs(actual!.lat - expected!.lat)).toBeLessThan(1e-6);
        const dLon = Math.abs(((actual!.lon - expected!.lon + 540) % 360) - 180);
        expect(dLon).toBeLessThan(1e-6);
      }
    });
  }

  it("returns null off the disc, as unproject() does", () => {
    const m = inverseRotation(0, -12 * DEG);
    expect(surfaceGeo(10.5, 10.5, view, m)).toBeNull();
    expect(unproject(10.5, view.height - 10.5, 0, -12 * DEG, view)).toBeNull();
  });
});

describe("parseCssColor", () => {
  it("reads hex, short hex and rgb()/rgba() into 0..1", () => {
    expect(parseCssColor("#12181c")).toEqual([0x12 / 255, 0x18 / 255, 0x1c / 255]);
    expect(parseCssColor("  #FFF ")).toEqual([1, 1, 1]);
    expect(parseCssColor("rgb(30, 78, 140)")).toEqual([30 / 255, 78 / 255, 140 / 255]);
    expect(parseCssColor("rgba(255, 0, 0, 0.5)")).toEqual([1, 0, 0]);
    expect(parseCssColor("rgb(30 78 140 / 50%)")).toEqual([30 / 255, 78 / 255, 140 / 255]);
  });

  it("returns null for what it cannot read, rather than guessing", () => {
    for (const value of ["", "CanvasText", "var(--color-ink)", "#12", "oklch(0.5 0.1 200)", "rgb(1, 2)"]) {
      expect(parseCssColor(value), value).toBeNull();
    }
  });
});

const COLORS: SphereColors = { ink: [0, 0, 0], paper: [1, 1, 1], accent: [0, 0, 1] };
const COVERAGE = { width: 4, height: 2, data: new Uint8ClampedArray(4 * 2 * 4) };

/** A WebGL2 stand-in that records every call by name. */
function fakeGl(options: { linkOk?: boolean } = {}) {
  const calls: { name: string; args: unknown[] }[] = [];
  const handles = { program: { p: 1 }, buffer: { b: 1 }, texture: { t: 1 }, vao: { v: 1 } };
  const constants = {
    VERTEX_SHADER: 1, FRAGMENT_SHADER: 2, COMPILE_STATUS: 3, LINK_STATUS: 4,
    ARRAY_BUFFER: 5, STATIC_DRAW: 6, FLOAT: 7, TEXTURE_2D: 8, TEXTURE0: 9,
    RGBA8: 10, RGBA: 11, UNSIGNED_BYTE: 12, TEXTURE_WRAP_S: 13, TEXTURE_WRAP_T: 14,
    TEXTURE_MIN_FILTER: 15, TEXTURE_MAG_FILTER: 16, LINEAR: 17, REPEAT: 18,
    CLAMP_TO_EDGE: 19, TRIANGLE_STRIP: 20, UNPACK_ALIGNMENT: 21,
  };
  const returns: Record<string, (...args: unknown[]) => unknown> = {
    createShader: () => ({}),
    getShaderParameter: () => true,
    createProgram: () => handles.program,
    getProgramParameter: () => options.linkOk ?? true,
    getProgramInfoLog: () => "fake link failure",
    createBuffer: () => handles.buffer,
    createTexture: () => handles.texture,
    createVertexArray: () => handles.vao,
    getUniformLocation: (_p: unknown, name: unknown) => ({ name }),
  };
  const gl = new Proxy(constants as Record<string, unknown>, {
    get(target, key: string) {
      if (key in target) return target[key];
      return (...args: unknown[]) => {
        calls.push({ name: key, args });
        return returns[key]?.(...args);
      };
    },
  }) as unknown as WebGL2RenderingContext;
  const named = (name: string) => calls.filter((c) => c.name === name);
  return { gl, calls, named, handles };
}

describe("createSphere", () => {
  it("falls back to a no-op without a context, and says so", () => {
    const sphere = createSphere(null, { coverage: COVERAGE, colors: COLORS });
    expect(sphere.ok).toBe(false);
    expect(sphere.program).toBeNull();
    expect(() => sphere.draw(REST_STATE, sphereView(10, 10, 1))).not.toThrow();
    expect(() => sphere.setColors(COLORS)).not.toThrow();
    expect(() => sphere.dispose()).not.toThrow();
  });

  it("falls back to a no-op when the program fails to link, and says so", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const fake = fakeGl({ linkOk: false });
    const sphere = createSphere(fake.gl, { coverage: COVERAGE, colors: COLORS });
    expect(sphere.ok).toBe(false);
    expect(sphere.program).toBeNull();
    sphere.draw(REST_STATE, sphereView(10, 10, 1));
    expect(fake.named("drawArrays")).toHaveLength(0);
    expect(fake.named("createTexture")).toHaveLength(0);
    warn.mockRestore();
  });

  it("looks up exactly SPHERE_UNIFORMS, once each, at creation", () => {
    const fake = fakeGl();
    const sphere = createSphere(fake.gl, { coverage: COVERAGE, colors: COLORS });
    expect(sphere.ok).toBe(true);
    expect(sphere.program).toBe(fake.handles.program);
    const looked = fake.named("getUniformLocation").map((c) => c.args[1]);
    expect(looked).toEqual([...SPHERE_UNIFORMS]);
    sphere.draw(REST_STATE, sphereView(10, 10, 1));
    sphere.draw(REST_STATE, sphereView(10, 10, 1));
    expect(fake.named("getUniformLocation")).toHaveLength(SPHERE_UNIFORMS.length);
  });

  it("uploads the coverage once: RGBA8, linear, repeating in u and clamped in v", () => {
    const fake = fakeGl();
    const sphere = createSphere(fake.gl, { coverage: COVERAGE, colors: COLORS });
    sphere.draw(REST_STATE, sphereView(10, 10, 1));
    sphere.draw(REST_STATE, sphereView(10, 10, 1));
    const uploads = fake.named("texImage2D");
    expect(uploads).toHaveLength(1);
    expect(uploads[0].args).toEqual([8, 0, 10, 4, 2, 0, 11, 12, COVERAGE.data]);
    const params = Object.fromEntries(fake.named("texParameteri").map((c) => [c.args[1], c.args[2]]));
    expect(params).toEqual({ 13: 18, 14: 19, 15: 17, 16: 17 });
  });

  it("issues exactly one drawArrays per draw, with the state's uniforms", () => {
    const fake = fakeGl();
    const sphere = createSphere(fake.gl, { coverage: COVERAGE, colors: COLORS });
    const view = sphereView(800, 600, 2);
    sphere.draw({ ...REST_STATE, chapter: CHAPTER_INDEX.tech, skin: SKIN_INDEX.volcanic }, view);
    expect(fake.named("drawArrays")).toHaveLength(1);
    expect(fake.named("drawArrays")[0].args).toEqual([20, 0, 4]);
    sphere.draw(REST_STATE, view);
    expect(fake.named("drawArrays")).toHaveLength(2);

    const ints = fake.named("uniform1i").map((c) => [(c.args[0] as { name: string }).name, c.args[1]]);
    expect(ints).toContainEqual(["uChapter", CHAPTER_INDEX.tech]);
    expect(ints).toContainEqual(["uSkin", SKIN_INDEX.volcanic]);
    expect(ints).toContainEqual(["uSkin", -1]);
    const center = fake.named("uniform2f").find((c) => (c.args[0] as { name: string }).name === "uCenter");
    expect(center?.args.slice(1)).toEqual([view.cx, view.cy]);
    const matrix = fake.named("uniformMatrix3fv").at(-1);
    expect(matrix?.args[1]).toBe(false);
    expect(Array.from(matrix?.args[2] as Float32Array)).toEqual(
      Array.from(new Float32Array(inverseRotation(REST_STATE.spin, REST_STATE.tilt))),
    );
    expect(fake.named("viewport").at(-1)?.args).toEqual([0, 0, view.width, view.height]);
  });

  it("sends the three colours, and re-sends them on setColors", () => {
    const fake = fakeGl();
    const sphere = createSphere(fake.gl, { coverage: COVERAGE, colors: COLORS });
    const sent = () =>
      fake.named("uniform3f").map((c) => [(c.args[0] as { name: string }).name, ...c.args.slice(1)]);
    expect(sent()).toEqual([
      ["uInk", 0, 0, 0],
      ["uPaper", 1, 1, 1],
      ["uAccent", 0, 0, 1],
    ]);
    sphere.setColors({ ink: [1, 1, 1], paper: [0, 0, 0], accent: [0.5, 0.5, 1] });
    expect(sent().slice(3)).toEqual([
      ["uInk", 1, 1, 1],
      ["uPaper", 0, 0, 0],
      ["uAccent", 0.5, 0.5, 1],
    ]);
  });

  it("dispose frees the program, buffer, vertex array and texture, then draws nothing", () => {
    const fake = fakeGl();
    const sphere = createSphere(fake.gl, { coverage: COVERAGE, colors: COLORS });
    sphere.dispose();
    expect(fake.named("deleteProgram").map((c) => c.args[0])).toEqual([fake.handles.program]);
    expect(fake.named("deleteBuffer").map((c) => c.args[0])).toEqual([fake.handles.buffer]);
    expect(fake.named("deleteTexture").map((c) => c.args[0])).toEqual([fake.handles.texture]);
    expect(fake.named("deleteVertexArray").map((c) => c.args[0])).toEqual([fake.handles.vao]);
    sphere.draw(REST_STATE, sphereView(10, 10, 1));
    expect(fake.named("drawArrays")).toHaveLength(0);
    expect(sphere.ok).toBe(false);
  });
});
