import { describe, expect, it } from "vitest";
import { PHONE, TABLET, hangVars, lineFloor, lineY, passPath, type Yard } from "@/sections/Hero/line";

/**
 * Round 25: the clothesline below 1024 is described once (line.ts) and
 * everything that has to meet it is derived from that description. These are
 * the rules the description itself has to keep; e2e/hero.spec.ts measures the
 * drawn result at real widths.
 */

const YARDS: readonly (readonly [string, Yard])[] = [
  ["phone", PHONE],
  ["tablet", TABLET],
];

describe("the clothesline's description", () => {
  it("draws each pass as the parabola the strings are worked out from", () => {
    for (const [name, yard] of YARDS) {
      for (const pass of yard.passes) {
        const match = /^M0 ([\d.]+)Q50 ([\d.]+) 100 ([\d.]+)$/.exec(passPath(pass));
        expect(match, `${name}: ${passPath(pass)}`).not.toBeNull();
        const [left, control, right] = match!.slice(1).map(Number);
        expect(left).toBe(pass.left);
        expect(right).toBe(pass.right);
        // A quadratic with its control point mid-span: its height at t is
        // (1-t)² left + 2t(1-t) control + t² right, which is lineY.
        for (const t of [0, 0.125, 0.25, 0.5, 0.775, 1]) {
          const bezier = (1 - t) ** 2 * left + 2 * t * (1 - t) * control + t ** 2 * right;
          expect(lineY(pass, t)).toBeCloseTo(bezier, 6);
        }
      }
    }
  });

  it("ties on at its ends and sags between them", () => {
    for (const [name, yard] of YARDS) {
      for (const pass of yard.passes) {
        expect(lineY(pass, 0)).toBe(pass.left);
        expect(lineY(pass, 1)).toBe(pass.right);
        expect(pass.sag, name).toBeGreaterThanOrEqual(16);
        expect(lineY(pass, 0.5)).toBeCloseTo((pass.left + pass.right) / 2 + pass.sag, 6);
        // Never level: one end ties on lower than the other.
        expect(Math.abs(pass.left - pass.right), name).toBeGreaterThanOrEqual(10);
        expect(lineFloor(pass)).toBeGreaterThanOrEqual(Math.max(pass.left, pass.right));
        expect(lineFloor(pass, 0, 0.5)).toBeLessThanOrEqual(lineFloor(pass));
      }
    }
  });

  it("slopes each of the phone's three passes the other way to the one before", () => {
    expect(PHONE.passes.map((p) => Math.sign(p.right - p.left))).toEqual([1, -1, 1]);
    expect(TABLET.passes).toHaveLength(2);
  });

  it("hangs every thing on the middle of its grid columns", () => {
    // Phone: two columns a pass; my field tag across both.
    expect(PHONE.tags.map((t) => [t.pass, t.t])).toEqual([
      [0, 0.25],
      [0, 0.75],
      [1, 0.25],
      [1, 0.75],
    ]);
    expect(PHONE.field).toMatchObject({ pass: 2, t: 0.5 });
    // Tablet: twenty columns, five to a tag; my field tag in the last nine.
    expect(TABLET.tags.map((t) => [t.pass, t.t])).toEqual([0, 1, 2, 3].map((i) => [0, (i * 5 + 2.5) / 20]));
    expect(TABLET.field).toMatchObject({ pass: 1, t: (11 + 4.5) / 20 });
  });

  it("gives no two neighbours on a pass the same string, and every string room to show", () => {
    for (const [name, yard] of YARDS) {
      const all = [...yard.tags, yard.field];
      for (const hang of all) expect(hang.string, name).toBeGreaterThanOrEqual(12);
      yard.passes.forEach((_, pass) => {
        const strings = yard.tags.filter((t) => t.pass === pass).map((t) => t.string);
        expect(new Set(strings).size, `${name} pass ${pass + 1}: ${strings.join(", ")}`).toBe(strings.length);
      });
    }
  });

  it("hands CSS each hung thing's place as pixels on both bands", () => {
    expect(hangVars(PHONE.tags[1], TABLET.tags[1])).toEqual({
      "--y-phone": `${Math.round(lineY(PHONE.passes[0], 0.75) * 10) / 10}px`,
      "--string-phone": "34px",
      "--y-tablet": `${Math.round(lineY(TABLET.passes[0], 0.375) * 10) / 10}px`,
      "--string-tablet": "30px",
    });
    const field = hangVars(PHONE.field, TABLET.field);
    expect(field["--y-phone"]).toBe("60px");
    expect(Object.values(field).every((v) => /^\d+(\.\d)?px$/.test(v))).toBe(true);
  });
});
