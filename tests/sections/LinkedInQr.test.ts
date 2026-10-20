import { describe, expect, it } from "vitest";
import { QR_PATH, QR_URL } from "@/sections/Hero/LinkedInQr";
import { socialLinks } from "@/content/portfolio";

const N = 29;
function parse(): boolean[][] {
  const m = Array.from({ length: N }, () => Array<boolean>(N).fill(false));
  let x = 0;
  let y = 0;
  for (const [, cmd, a, b] of QR_PATH.matchAll(/([Mmh])(-?[\d.]+)(?: (-?[\d.]+))?/g)) {
    if (cmd === "M") [x, y] = [+a, +b];
    else if (cmd === "m") [x, y] = [x + +a, y + +b];
    else {
      for (let i = 0; i < +a; i++) m[Math.floor(y)][x + i] = true;
      x += +a;
    }
  }
  return m;
}
const m = parse();
const at = (r: number, c: number) => r >= 0 && c >= 0 && r < N && c < N && m[r][c];

describe("LinkedInQr", () => {
  it("is a 29-module code", () => {
    expect(m.flat().some(Boolean)).toBe(true);
    expect(m[0].some(Boolean)).toBe(true);
    expect(m[28].some(Boolean)).toBe(true);
  });

  it("has the three finder patterns", () => {
    for (const [r0, c0] of [[0, 0], [0, 22], [22, 0]]) {
      for (let r = 0; r < 7; r++)
        for (let c = 0; c < 7; c++) {
          const ring = r === 0 || r === 6 || c === 0 || c === 6;
          const centre = r >= 2 && r <= 4 && c >= 2 && c <= 4;
          expect(at(r0 + r, c0 + c), `${r0},${c0} @ ${r},${c}`).toBe(ring || centre);
        }
      for (let i = -1; i <= 7; i++) {
        const sr = r0 === 0 ? 7 : 21;
        const sc = c0 === 0 ? 7 : 21;
        expect(at(sr, c0 + i)).toBe(false);
        expect(at(r0 + i, sc)).toBe(false);
      }
    }
  });

  it("has the timing patterns", () => {
    for (let i = 8; i <= 20; i++) {
      expect(at(6, i)).toBe(i % 2 === 0);
      expect(at(i, 6)).toBe(i % 2 === 0);
    }
  });

  it("has version 3's dark module", () => {
    expect(at(21, 8)).toBe(true);
  });

  it("encodes my LinkedIn", () => {
    expect(QR_URL).toBe(socialLinks.find((l) => l.id === "linkedin")!.href);
  });
});
