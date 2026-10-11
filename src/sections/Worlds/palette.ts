import { parseCssColor, type SphereColors } from "./gl/sphere";

export interface Palette {
  readonly fg: string;
  readonly muted: string;
  readonly subtle: string;
  readonly accent: string;
  readonly rule: string;
  readonly ground: string;
  /** The ink a label's halo is stroked in, or null for no halo. */
  readonly halo: string | null;
}

// Held, not re-queried per call. Created on first use because jsdom (and the
// server) have no matchMedia at import time.
let lists: { forced: MediaQueryList; dark: MediaQueryList } | undefined;
function mqls() {
  return (lists ??= {
    forced: window.matchMedia("(forced-colors: active)"),
    dark: window.matchMedia("(prefers-color-scheme: dark)"),
  });
}

/**
 * Everything the reads below depend on besides the element: the visitor's
 * theme (`data-theme` on <html>) and forced-colors. Tone is fixed per element
 * (it is set by the <Section> the canvas sits in), so it needs no key. When
 * the inline script never stamped `data-theme`, the CSS follows the OS, so the
 * OS scheme is part of the key then.
 */
export function themeKey(): string {
  const theme = document.documentElement.dataset.theme ?? "";
  const scheme = theme === "" && mqls().dark.matches ? "dark" : "";
  return `${theme}${scheme}|${mqls().forced.matches ? 1 : 0}`;
}

const paletteCache = new WeakMap<Element, { key: string; value: Palette }>();
const sphereCache = new WeakMap<
  Element,
  { key: string; value: { key: string; colors: SphereColors | null } }
>();

/** One `getComputedStyle` per (element, theme) instead of one per frame. */
function memo<T>(
  cache: WeakMap<Element, { key: string; value: T }>,
  element: Element,
  read: () => T,
): T {
  const key = themeKey();
  const hit = cache.get(element);
  if (hit && hit.key === key) return hit.value;
  const value = read();
  cache.set(element, { key, value });
  return value;
}

/**
 * The section's own ink, read off the canvas at draw time.
 *
 * The forced-colors branch is not a nicety. In Windows High Contrast the
 * browser overrides CSS colours, but **a canvas bitmap is not touched** — the
 * custom properties still hold their authored values (measured under
 * `forced-colors: active`: `--accent` is still `#1e4e8c`), so a globe that
 * trusted them would draw a mid-blue graticule on a forced black page and the
 * one hue carrying meaning would stop being distinguishable. System colour
 * keywords are the only values the forced palette actually maps, so in that
 * mode the globe is drawn in `CanvasText` on `Canvas`, with `LinkText` for
 * everything blue was doing — that is the slot the forced palette reserves for
 * annotation, which is the whole of what blue means here.
 *
 * Do not assume those keywords resolve to greys. Measured in this Chromium's
 * emulated palette: `Canvas` #ffffff, `CanvasText` #000000, `GrayText`
 * #600000 — a dark red — and `LinkText` #00009f. A real user's theme can map
 * them to anything at all, and that is the point: the theme guarantees they
 * are distinguishable from each other, and nothing else does.
 */
export function palette(element: Element): Palette {
  return memo(paletteCache, element, () => readPalette(element));
}

function readPalette(element: Element): Palette {
  if (mqls().forced.matches) {
    return {
      fg: "CanvasText",
      muted: "CanvasText",
      subtle: "GrayText",
      accent: "LinkText",
      rule: "GrayText",
      ground: "Canvas",
      // No halo: the forced-colours globe stays exactly as it was drawn
      // before there were halos.
      halo: null,
    };
  }
  const style = getComputedStyle(element);
  const read = (name: string) => style.getPropertyValue(name).trim();
  return {
    fg: read("--fg"),
    muted: read("--fg-muted"),
    subtle: read("--fg-subtle"),
    accent: read("--accent"),
    rule: read("--rule-color"),
    ground: read("--ground"),
    halo: read("--ground"),
  };
}

/**
 * The GL surface's two inputs, read off the element the same way `palette()`
 * reads the overlay's, so the planet follows the tone it sits in as well as
 * the theme. `key` is the raw strings, for "did anything change since the
 * last upload". `colors` is null when either does not parse.
 */
export function sphereColors(element: Element): {
  key: string;
  colors: SphereColors | null;
} {
  return memo(sphereCache, element, () => readSphereColors(element));
}

function readSphereColors(element: Element): {
  key: string;
  colors: SphereColors | null;
} {
  const style = getComputedStyle(element);
  const ink = style.getPropertyValue("--fg").trim();
  const paper = style.getPropertyValue("--ground").trim();
  const i = parseCssColor(ink);
  const p = parseCssColor(paper);
  return {
    key: `${ink}|${paper}`,
    colors: i && p ? { ink: i, paper: p } : null,
  };
}
