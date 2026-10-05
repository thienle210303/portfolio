import type { GlyphId } from "@/types/portfolio";

/**
 * Every figure on the globe, drawn the way the companion cats are: open
 * strokes, no fills, in a 24-unit box centred on the origin.
 *
 * Plain path strings rather than components because they are consumed twice,
 * in two different renderers — as the `d` of an `<svg><path>` in a world's
 * panel, and as a `new Path2D(d)` stroked onto the canvas. One vocabulary,
 * two renderers, no second set of drawings to keep in step.
 *
 * Centred on the origin, not on a corner, so the canvas can `translate` to a
 * marker's projected position and `scale` by its depth without doing any
 * arithmetic about the box first.
 */
export const GLYPH_VIEWBOX = "-14 -14 28 28";

export const GLYPHS: Record<GlyphId, string> = {
  // cơm tấm — the plate: broken rice, a grilled chop, a fried egg. Named by
  // the owner; one of the five objects Living Earth draws, and its panel says so.
  comtam:
    "M-12 2A12 12 0 0012 2A12 12 0 00-12 2M-12 2C-12 6 -6 8 0 8S12 6 12 2" +
    "M-9 0C-8 -5 -3 -7 1 -6C0 -2 -3 0 -9 0" +
    "M2 -1C2 -5 6 -7 9 -5C11 -3 10 0 7 1C5 1.6 3 1 2 -1M4 -4L7.5 -2.6" +
    "M-6 1.5A3.2 3.2 0 00.4 1.5A3.2 3.2 0 00-6 1.5M-3.4 1.2A1.2 1.2 0 00-1 1.2A1.2 1.2 0 00-3.4 1.2",
  // bún bò Huế and bún cá Rạch Giá share this bowl: both are a bowl of noodle
  // soup, and the drawing claims nothing that tells them apart.
  bowl: "M-11 -2H11M-10 -2C-9 6 -5 10 0 10C5 10 9 6 10 -2M-3 -4C-5 -7 -1 -8 -3 -11M3 -4C1 -7 5 -8 3 -11",
  jar: "M-5 -10H5M-4 -10V-7C-8 -5 -8 -2 -8 2V7C-8 10 -5 11 0 11S8 10 8 7V2C8 -2 8 -5 4 -7V-10M-4 0H4V5H-4Z",
  // Tết — five round petals around a centre.
  blossom:
    "M-3.5 -6.5a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0 -7 0M2.7 -2a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0 -7 0" +
    "M0.3 5.3a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0 -7 0M-7.3 5.3a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0 -7 0" +
    "M-9.7 -2a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0 -7 0M-1.2 0a1.2 1.2 0 1 0 2.4 0a1.2 1.2 0 1 0 -2.4 0",
  cap: "M-11 -3L0 -8L11 -3L0 2ZM-6 -1V5C-6 7 6 7 6 5V-1M11 -3V4",
  trophy:
    "M-6 -8H6V-2C6 2 3 4 0 4S-6 2 -6 -2ZM-6 -6H-9V-4C-9 -1 -7 0 -6 0M6 -6H9V-4C9 -1 7 0 6 0M0 4V8M-4 8H4",
  ribbon: "M0 -8A5 5 0 100 2A5 5 0 100 -8M-3 1L-5 9L0 6L5 9L3 1",
  chalk: "M-8 6L4 -6L8 -2L-4 10ZM-8 6L-9 10L-5 9",
  net: "M-10 -6H10L7 8H-7ZM-6 -6L-4 8M0 -6V8M6 -6L4 8M-9 -1H9M-8 3H8",
  buoy: "M-5 3H5L3 -3H-3ZM0 -3V-9M-3 -9H3M0 -11V-9M-7 5C-4 7 4 7 7 5M-9 8C-5 10 5 10 9 8",
  // The dome's arc ends at x=8, not 16. At 16 the chord is 24 units against a
  // 16-unit diameter, so SVG scales the radii up to 12.01 to make the arc
  // reachable at all: the dome then spans x −8…16, overflowing `GLYPH_VIEWBOX`
  // on the right, and centres at x≈4 while the four tentacles below still
  // centre on 0. At 8 the dome spans −8…8.02, y −8.52…0, and the whole figure
  // stays inside the ±12 box every other glyph here keeps to.
  jelly: "M-8 -1A8 8 0 0 1 8 0H-8ZM-5 -1C-5 4 -7 6 -6 9M-2 -1C-2 5 -3 7 -2 10M2 -1C2 5 1 7 2 10M5 -1C5 4 7 6 6 9",
  bird: "M-11 2Q-5 -7 0 0Q5 -7 11 2",
  plane: "M-10 -2L10 -7L2 3L0 9L-2 3Z M-2 3L10 -7",
  sprout: "M0 9V-2M0 1C-4 1 -7 -2 -7 -6C-3 -6 0 -3 0 1M0 -2C4 -2 7 -5 7 -9C3 -9 0 -6 0 -2",
  cat: "M-9 6Q-11 -4 -8 -8L-4 -3Q0 -5 4 -3L8 -8Q11 -4 9 6Q0 12 -9 6M-4 1V1.5M4 1V1.5M-1 5H1",
  sat: "M-3 -3H3V3H-3ZM-3 0H-11M3 0H11M-11 -4V4M11 -4V4M0 3V7M-3 7H3",
  chip:
    "M-7 -7H7V7H-7ZM-3 -3H3V3H-3M-4.5 -7V-11M0 -7V-11M4.5 -7V-11M-4.5 7V11M0 7V11M4.5 7V11" +
    "M-7 -4.5H-11M-7 0H-11M-7 4.5H-11M7 -4.5H11M7 0H11M7 4.5H11",
  star: "M0 -10L2.9 -3.1L10 -3.1L4.3 1.2L6.5 8L0 3.8L-6.5 8L-4.3 1.2L-10 -3.1L-2.9 -3.1Z",
  magnifier: "M-2 -2m-6 0a6 6 0 1012 0a6 6 0 10-12 0M2.4 2.4L9 9",
  book: "M-8 -7H0V8H-8ZM0 -7H8V8H0M0 -7V8",
};
