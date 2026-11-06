import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildTokens } from "../../scripts/design-tokens.mjs";

/**
 * design/system/tokens.css is the boards' mirror of globals.css (round 25).
 * It is generated, so a palette or scale change that forgets
 * `pnpm design:tokens` fails here instead of leaving the boards drawn in last
 * round's colours.
 */
describe("design tokens mirror", () => {
  const committed = readFileSync("design/system/tokens.css", "utf8");

  it("matches a fresh run of scripts/design-tokens.mjs", () => {
    expect(committed).toBe(buildTokens());
  });

  it("carries both themes, the tones and the type steps", () => {
    for (const needle of [
      "--color-lichen:",
      '[data-theme="night"]',
      ".tone-contrast {",
      "--step-5:",
      "--gutter:",
      "--ease-ink:",
    ]) {
      expect(committed).toContain(needle);
    }
  });

  it("names the three faces layout.tsx loads", () => {
    const layout = readFileSync("src/app/layout.tsx", "utf8");
    for (const [face, name] of [
      ["Bricolage_Grotesque", "Bricolage Grotesque"],
      ["Courier_Prime", "Courier Prime"],
      ["Newsreader", "Newsreader"],
    ]) {
      expect(layout).toContain(face);
      expect(committed).toContain(`"${name}"`);
    }
  });
});
