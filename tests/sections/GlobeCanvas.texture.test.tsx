import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, waitFor } from "@testing-library/react";
import { resolveChapters } from "@/lib/worlds";
import GlobeCanvas, { COASTLINE_PNG } from "@/sections/Worlds/GlobeCanvas";

/*
 * The coverage texture is a committed PNG, fetched and decoded with
 * `createImageBitmap`, so the GL surface is built only once that settles.
 * What is tested here is that wait: a failed decode is a fallback like any other, and a decoded bitmap is
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

/** The PNG's bytes as `fetch` would hand them over, and a bitmap that
 *  records its own `close()`. `createImageBitmap` is resolved or rejected by
 *  the test through `decoded`. */
function stubTexture() {
  const fetch = vi.fn(async () => new Response(new Blob(["png"])));
  const bitmap = { width: 2048, height: 1024, close: vi.fn() };
  const decoded = {} as { resolve: (b: typeof bitmap) => void; reject: (e: unknown) => void };
  const createImageBitmap = vi.fn<(blob: Blob, options?: ImageBitmapOptions) => Promise<unknown>>(
    () => new Promise((resolve, reject) => Object.assign(decoded, { resolve, reject })),
  );
  vi.stubGlobal("fetch", fetch);
  vi.stubGlobal("createImageBitmap", createImageBitmap);
  return { fetch, bitmap, decoded, createImageBitmap };
}

/** Lets the fetch → blob → createImageBitmap chain reach the decode. */
async function untilDecoding(texture: ReturnType<typeof stubTexture>) {
  await waitFor(() => expect(texture.createImageBitmap).toHaveBeenCalled());
}

describe("GlobeCanvas's coverage texture", () => {
  it("decodes the PNG without premultiply or colour conversion", async () => {
    const texture = stubTexture();
    mount(vi.fn());
    await untilDecoding(texture);
    expect(texture.fetch).toHaveBeenCalledWith(COASTLINE_PNG);
    expect(texture.createImageBitmap.mock.calls[0][1]).toEqual({
      premultiplyAlpha: "none",
      colorSpaceConversion: "none",
    });
  });

  it("falls back to the 2D globe when the PNG fails to decode", async () => {
    const texture = stubTexture();
    const onSurfaceChange = vi.fn();
    const view = mount(onSurfaceChange);
    await untilDecoding(texture);
    texture.decoded.reject(new DOMException("broken", "InvalidStateError"));

    await waitFor(() => expect(onSurfaceChange).toHaveBeenCalledWith(false));
    expect(onSurfaceChange).not.toHaveBeenCalledWith(true);
    expect(fake.createSphere).not.toHaveBeenCalled();
    expect(view.container.querySelectorAll("canvas")).toHaveLength(1);
  });

  it("falls back to the 2D globe when the PNG fails to load", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 404 })));
    const createImageBitmap = vi.fn();
    vi.stubGlobal("createImageBitmap", createImageBitmap);
    const onSurfaceChange = vi.fn();
    mount(onSurfaceChange);

    await waitFor(() => expect(onSurfaceChange).toHaveBeenCalledWith(false));
    expect(createImageBitmap).not.toHaveBeenCalled();
    expect(fake.createSphere).not.toHaveBeenCalled();
  });

  it("builds the sphere from the decoded bitmap, then closes it", async () => {
    const texture = stubTexture();
    const onSurfaceChange = vi.fn();
    mount(onSurfaceChange);
    await untilDecoding(texture);
    texture.decoded.resolve(texture.bitmap);

    await waitFor(() => expect(onSurfaceChange).toHaveBeenCalledWith(true));
    expect(fake.createSphere!.mock.calls[0][1].coverage).toBe(texture.bitmap);
    expect(texture.bitmap.close).toHaveBeenCalledTimes(1);
  });

  it("builds nothing once it has unmounted, and still closes the bitmap", async () => {
    const texture = stubTexture();
    const onSurfaceChange = vi.fn();
    const view = mount(onSurfaceChange);
    await untilDecoding(texture);
    view.unmount();
    texture.decoded.resolve(texture.bitmap);

    await waitFor(() => expect(texture.bitmap.close).toHaveBeenCalledTimes(1));
    expect(fake.createSphere).not.toHaveBeenCalled();
    expect(onSurfaceChange).not.toHaveBeenCalled();
  });

  it("a context lost while the texture is pending ends the surface once", async () => {
    const texture = stubTexture();
    const onSurfaceChange = vi.fn();
    const view = mount(onSurfaceChange);
    await untilDecoding(texture);
    const surface = view.container.querySelector("[data-globe-surface]")!;
    act(() => {
      surface.dispatchEvent(new Event("webglcontextlost"));
    });
    texture.decoded.resolve(texture.bitmap);

    await waitFor(() => expect(texture.bitmap.close).toHaveBeenCalledTimes(1));
    expect(fake.createSphere).not.toHaveBeenCalled();
    expect(onSurfaceChange).toHaveBeenCalledTimes(1);
    expect(onSurfaceChange).toHaveBeenCalledWith(false);
  });
});
