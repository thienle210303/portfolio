import { describe, expect, it } from "vitest";
import { drawing } from "@/lib/share-image";

/** The SVG inside a `data:image/svg+xml;base64,…` source. */
const svgOf = (src: string) => Buffer.from(src.slice(src.indexOf(",") + 1), "base64").toString("utf8");

describe("drawing (the share card's scenery)", () => {
  it("inks every black fill and stroke, and the root's default fill, in the colour given", async () => {
    const svg = svgOf(await drawing("pine", "#46603a"));
    expect(svg).not.toMatch(/(fill|stroke)="#000/);
    expect(svg.startsWith('<svg fill="#46603a" ')).toBe(true);
  });

  it("leaves a drawing that is already in colour as it is", async () => {
    const svg = svgOf(await drawing("sky-day"));
    expect(svg).toContain("#F7E3A6");
    expect(svg.startsWith("<svg xmlns=")).toBe(true);
  });
});
