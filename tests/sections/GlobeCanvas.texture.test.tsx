import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { resolveChapters } from "@/lib/worlds";
import GlobeCanvas, { COASTLINE_PNG } from "@/sections/Worlds/GlobeCanvas";

/*
 * The coverage texture is a committed PNG the browser decodes, so the GL
 * surface is built only once `decode()` settles. What is tested here is that
 * wait: a failed decode is a fallback like any other, and a decoded image is
 * what the sphere is built from. jsdom has no WebGL2, so the context and the
 * sphere are stand-ins; the real upload is covered in `tests/lib/sphere.test.ts`.
 */

const fake = vi.hoisted(() => ({
  createSphere: null as null | ReturnType<typeof import("vitest").vi.fn>,
}));

vi.mock("@/sections/Worlds/gl/context", async (importActual) => ({
  ...(await importActual<typeof import("@/sections/Worlds/gl/context")>()),
  acquireRenderer: () => ({ kind: "webgl", gl: {} }),
}));

vi.mock("@/sections/Worlds/gl/sphere", async (importActual) => {
  const actual = await importActual<typeof import("@/sections/Worlds/gl/sphere")>();
  fake.createSphere = vi.fn(() => ({
    ok: true,
    program: {},
    draw() {},
    setColors() {},
    dispose() {},
  }));
  return { ...actual, createSphere: fake.createSphere };
});

const WORLDS = resolveChapters();

function mount(onSurfaceChange: (live: boolean) => void) {
  return render(
    <GlobeCanvas
      worlds={WORLDS}
      currentId={WORLDS[0].id}
      onSelect={() => {}}
      onLanded={() => {}}
      onReady={() => {}}
      skinId={null}
      onSurfaceChange={onSurfaceChange}
      robotHold="unsupervised"
    />,
  );
}

beforeEach(() => {
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  }));
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  // No 2D context: the overlay's draw returns early, which is all jsdom can do.
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  const real = window.getComputedStyle;
  vi.spyOn(window, "getComputedStyle").mockImplementation((element) => {
    const style = real(element);
    return {
      ...style,
      getPropertyValue: (name: string) =>
        name === "--fg" ? "#111111" : name === "--ground" ? "#eeeeee" : style.getPropertyValue(name),
    } as CSSStyleDeclaration;
  });
  fake.createSphere?.mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("GlobeCanvas's coverage texture", () => {
  it("falls back to the 2D globe when the PNG fails to decode", async () => {
    const decode = vi.fn(() => Promise.reject(new DOMException("broken", "EncodingError")));
    Object.defineProperty(HTMLImageElement.prototype, "decode", { value: decode, configurable: true });
    const onSurfaceChange = vi.fn();
    const view = mount(onSurfaceChange);

    await waitFor(() => expect(onSurfaceChange).toHaveBeenCalledWith(false));
    expect(onSurfaceChange).not.toHaveBeenCalledWith(true);
    expect(fake.createSphere).not.toHaveBeenCalled();
    expect(decode).toHaveBeenCalledTimes(1);
    expect((decode.mock.contexts[0] as unknown as HTMLImageElement).getAttribute("src")).toBe(COASTLINE_PNG);
    expect(view.container.querySelectorAll("canvas")).toHaveLength(1);
  });

  it("builds the sphere from the decoded image", async () => {
    Object.defineProperty(HTMLImageElement.prototype, "decode", {
      value: () => Promise.resolve(),
      configurable: true,
    });
    const onSurfaceChange = vi.fn();
    mount(onSurfaceChange);

    await waitFor(() => expect(onSurfaceChange).toHaveBeenCalledWith(true));
    const coverage = fake.createSphere!.mock.calls[0][1].coverage as HTMLImageElement;
    expect(coverage).toBeInstanceOf(HTMLImageElement);
    expect(coverage.getAttribute("src")).toBe(COASTLINE_PNG);
  });

  it("builds nothing once it has unmounted", async () => {
    let finish = () => {};
    Object.defineProperty(HTMLImageElement.prototype, "decode", {
      value: () => new Promise<void>((resolve) => (finish = resolve)),
      configurable: true,
    });
    const onSurfaceChange = vi.fn();
    mount(onSurfaceChange).unmount();
    finish();
    await Promise.resolve();
    await Promise.resolve();
    expect(fake.createSphere).not.toHaveBeenCalled();
    expect(onSurfaceChange).not.toHaveBeenCalled();
  });
});
