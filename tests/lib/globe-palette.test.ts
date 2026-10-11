import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { palette, sphereColors, themeKey } from "@/sections/Worlds/palette";

// jsdom has no custom-property cascade, so the theme is mocked into the computed style.
const INK = { day: "#111111", night: "#eeeeee" } as const;
const PAPER = { day: "#fafafa", night: "#0a0a0a" } as const;

function mockStyles() {
  return vi.spyOn(window, "getComputedStyle").mockImplementation(() => {
    const t = (document.documentElement.dataset.theme ?? "day") as "day" | "night";
    const values: Record<string, string> = {
      "--fg": INK[t],
      "--ground": PAPER[t],
    };
    return { getPropertyValue: (n: string) => ` ${values[n] ?? ""} ` } as CSSStyleDeclaration;
  });
}

let forced = false;

beforeEach(() => {
  forced = false;
  document.documentElement.dataset.theme = "day";
  window.matchMedia = ((q: string) => ({
    matches: q.includes("forced-colors") && forced,
  })) as typeof window.matchMedia;
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

    forced = true;
    expect(palette(el).fg).toBe("CanvasText");
    forced = false;
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
    forced = true;
    expect(themeKey()).toBe("day|1");
  });
});
