import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Installed before the module under test evaluates, because it holds its MediaQueryLists.
const mq = vi.hoisted(() => {
  const state = { forced: false, dark: false };
  window.matchMedia = ((q: string) => ({
    get matches() {
      return q.includes("forced-colors") ? state.forced : state.dark;
    },
  })) as unknown as typeof window.matchMedia;
  return state;
});

import { palette, sphereColors, themeKey } from "@/sections/Worlds/palette";

// jsdom has no custom-property cascade, so the theme is mocked into the computed style.
const INK = { day: "#111111", night: "#eeeeee" } as const;
const PAPER = { day: "#fafafa", night: "#0a0a0a" } as const;

function mockStyles() {
  return vi.spyOn(window, "getComputedStyle").mockImplementation(() => {
    const t = (document.documentElement.dataset.theme ?? "day") as
      "day" | "night";
    const values: Record<string, string> = {
      "--fg": INK[t],
      "--ground": PAPER[t],
    };
    return {
      getPropertyValue: (n: string) => ` ${values[n] ?? ""} `,
    } as CSSStyleDeclaration;
  });
}

beforeEach(() => {
  mq.forced = false;
  mq.dark = false;
  document.documentElement.dataset.theme = "day";
});

afterEach(() => {
  vi.restoreAllMocks();
  delete document.documentElement.dataset.theme;
});

describe("globe palette cache", () => {
  it("palette cache keys on theme and forced-colors", () => {
    const spy = mockStyles();
    const el = document.createElement("canvas");

    const day = palette(el);
    expect(palette(el)).toBe(day);
    expect(spy).toHaveBeenCalledTimes(1);

    document.documentElement.dataset.theme = "night";
    const night = palette(el);
    expect(spy).toHaveBeenCalledTimes(2);
    expect(night.fg).toBe(INK.night);
    expect(day.fg).toBe(INK.day);

    mq.forced = true;
    expect(palette(el).fg).toBe("CanvasText");
    mq.forced = false;
    expect(palette(el).fg).toBe(INK.night);
  });

  it("sphereColors key changes with theme", () => {
    const spy = mockStyles();
    const el = document.createElement("canvas");

    const day = sphereColors(el);
    expect(sphereColors(el)).toBe(day);
    expect(spy).toHaveBeenCalledTimes(1);

    document.documentElement.dataset.theme = "night";
    const night = sphereColors(el);
    expect(night.key).not.toBe(day.key);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("themeKey carries theme and forced-colors", () => {
    expect(themeKey()).toBe("day|0");
    mq.forced = true;
    expect(themeKey()).toBe("day|1");
  });

  it("themeKey follows the OS scheme when data-theme was never stamped", () => {
    const spy = mockStyles();
    const el = document.createElement("canvas");
    delete document.documentElement.dataset.theme;
    const light = themeKey();
    palette(el);
    mq.dark = true;
    expect(themeKey()).not.toBe(light);
    palette(el);
    expect(spy).toHaveBeenCalledTimes(2);
  });
});
