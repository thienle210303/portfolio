import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { CatGlyph } from "@/components/companion/CatIcon";
import { CAT_HOP_RISE } from "@/components/companion/CompanionCat";
import { CAT_ICONS } from "@/components/companion/companion-dialogue";

describe("CatGlyph", () => {
  it("draws every icon in the bank, so the loop below is not vacuous", () => {
    expect(CAT_ICONS.length).toBe(12);
  });

  for (const name of CAT_ICONS) {
    it(`draws "${name}" as one hidden 12px line drawing in the current colour, with no text`, () => {
      const { container } = render(<CatGlyph name={name} />);
      const svgs = container.querySelectorAll("svg");
      expect(svgs).toHaveLength(1);
      const svg = svgs[0];
      expect(svg).toHaveAttribute("aria-hidden", "true");
      expect(svg).toHaveAttribute("width", "12");
      expect(svg).toHaveAttribute("height", "12");
      expect(svg).toHaveAttribute("viewBox", "0 0 12 12");
      expect(svg).toHaveAttribute("stroke", "currentColor");
      expect(svg).toHaveAttribute("fill", "none");
      // It draws something: an icon with no shapes inside would pass every
      // attribute check above and still be a blank in the bubble.
      expect(svg.querySelectorAll("path, circle, line, polyline, ellipse, rect").length).toBeGreaterThan(0);
      // No shape may repaint itself in a colour of its own — the whole point
      // is that it inherits the bubble's ink and so follows theme and tone.
      for (const shape of Array.from(svg.querySelectorAll("*"))) {
        for (const attr of ["stroke", "fill", "color", "style"]) {
          const value = shape.getAttribute(attr);
          if (value !== null) expect(["currentColor", "none"], `${name} <${shape.tagName}> ${attr}`).toContain(value);
        }
      }
      expect(container.textContent).toBe("");
    });
  }

  it("draws twelve different pictures", () => {
    const drawn = CAT_ICONS.map((name) => render(<CatGlyph name={name} />).container.innerHTML);
    expect(new Set(drawn).size).toBe(CAT_ICONS.length);
  });
});

describe("the hop the stylesheet draws", () => {
  // The loop lifts a hopping cat's bubble, and keeps the caption off her, by
  // `CAT_HOP_RISE` (see `catBoxes` in Companion.tsx). That number is only true
  // while it is the height the keyframes actually reach, so the two are read
  // against each other here rather than trusted to stay in step.
  const css = readFileSync("src/app/globals.css", "utf8");

  /** The body of the block whose `{` is the first one at or after `at`. */
  function blockAt(at: number): string {
    const open = css.indexOf("{", at);
    let depth = 0;
    for (let index = open; index < css.length; index += 1) {
      if (css[index] === "{") depth += 1;
      else if (css[index] === "}" && --depth === 0) return css.slice(open + 1, index);
    }
    throw new Error("unbalanced braces in globals.css");
  }

  it("peaks at CAT_HOP_RISE, the clearance the bubble placement reserves", () => {
    const at = css.indexOf("@keyframes cat-hop");
    expect(at, "no @keyframes cat-hop in globals.css").toBeGreaterThan(-1);
    const lifts = Array.from(blockAt(at).matchAll(/translateY\((-?\d+(?:\.\d+)?)px\)/g), (m) =>
      Number(m[1]),
    );
    expect(lifts.length).toBeGreaterThan(0);
    expect(Math.min(...lifts)).toBe(-CAT_HOP_RISE);
  });

  it("only runs for a visitor who has not asked for less motion", () => {
    const guard = "@media screen and (prefers-reduced-motion: no-preference)";
    const guarded: string[] = [];
    for (let at = css.indexOf(guard); at !== -1; at = css.indexOf(guard, at + 1)) guarded.push(blockAt(at));
    const home = guarded.find((block) => block.includes("@keyframes cat-hop"));
    expect(home, "@keyframes cat-hop is not inside a no-preference guard").toBeDefined();
    expect(home).toMatch(/\[data-cat-hop\]\s*\{[^}]*animation:\s*cat-hop\b/);
    // And nowhere else: a second copy of the rule outside every guard would
    // hop for a reduced-motion visitor too.
    const outside = guarded
      .reduce((rest, block) => rest.replace(block, ""), css)
      .replace(/\/\*[\s\S]*?\*\//g, "");
    expect(outside).not.toMatch(/cat-hop/);
  });
});
