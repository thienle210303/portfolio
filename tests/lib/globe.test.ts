import { describe, expect, it } from "vitest";
import {
  arcApex,
  arcKm,
  arcMidpoint,
  clampTilt,
  graticule,
  greatCircle,
  MAX_TILT_RADIANS,
  project,
  rotate,
  toGeo,
  toVector,
  unproject,
  type Viewport,
} from "@/lib/globe";
import { origin } from "@/content/portfolio";

const VIEW: Viewport = { cx: 200, cy: 200, radius: 100 };

describe("toVector / toGeo", () => {
  it("puts 0°N 0°E on the +x axis, facing the viewer", () => {
    expect(toVector({ lat: 0, lon: 0 })).toEqual([1, 0, 0]);
  });

  it("puts the north pole on +z", () => {
    const [x, y, z] = toVector({ lat: 90, lon: 0 });
    expect(x).toBeCloseTo(0, 10);
    expect(y).toBeCloseTo(0, 10);
    expect(z).toBeCloseTo(1, 10);
  });

  it("round-trips every point it is given", () => {
    for (const point of [
      { lat: 10, lon: 105.1 },
      { lat: -33.9, lon: 18.4 },
      { lat: 39.83, lon: -98.58 },
      { lat: 0, lon: 180 },
      { lat: -89.9, lon: -179.9 },
    ]) {
      const back = toGeo(toVector(point));
      expect(back.lat).toBeCloseTo(point.lat, 6);
      // ±180 is the same meridian; compare positions on the circle.
      expect(Math.cos(((back.lon - point.lon) * Math.PI) / 180)).toBeCloseTo(1, 6);
    }
  });

  it("returns a unit vector for every input", () => {
    for (const lat of [-90, -45, 0, 45, 90]) {
      for (const lon of [-180, -90, 0, 90, 180]) {
        const [x, y, z] = toVector({ lat, lon });
        expect(Math.hypot(x, y, z)).toBeCloseTo(1, 10);
      }
    }
  });
});

describe("rotate", () => {
  it("is the identity at zero spin and zero tilt", () => {
    const v = toVector({ lat: 12, lon: 34 });
    const r = rotate(v, 0, 0);
    expect(r[0]).toBeCloseTo(v[0], 10);
    expect(r[1]).toBeCloseTo(v[1], 10);
    expect(r[2]).toBeCloseTo(v[2], 10);
  });

  it("brings a meridian to face the viewer when spin is its negated longitude", () => {
    const spin = (-105.1 * Math.PI) / 180;
    const [x, y] = rotate(toVector({ lat: 0, lon: 105.1 }), spin, 0);
    expect(x).toBeCloseTo(1, 6); // dead centre, nearest the viewer
    expect(y).toBeCloseTo(0, 6);
  });

  it("preserves length", () => {
    const [x, y, z] = rotate(toVector({ lat: -40, lon: 77 }), 1.2, -0.4);
    expect(Math.hypot(x, y, z)).toBeCloseTo(1, 10);
  });
});

describe("project", () => {
  it("puts the sub-viewer point at the centre of the disc", () => {
    const p = project(toVector({ lat: 0, lon: 0 }), 0, 0, VIEW);
    expect(p.x).toBeCloseTo(200, 6);
    expect(p.y).toBeCloseTo(200, 6);
    expect(p.front).toBe(true);
  });

  it("reports the far hemisphere as not front, and still inside the disc", () => {
    const p = project(toVector({ lat: 0, lon: 180 }), 0, 0, VIEW);
    expect(p.front).toBe(false);
    expect(Math.hypot(p.x - VIEW.cx, p.y - VIEW.cy)).toBeLessThanOrEqual(VIEW.radius + 1e-9);
  });

  it("puts north above centre — screen y grows downward", () => {
    expect(project(toVector({ lat: 45, lon: 0 }), 0, 0, VIEW).y).toBeLessThan(VIEW.cy);
  });

  it("keeps every projected point inside the limb circle", () => {
    for (let lat = -90; lat <= 90; lat += 15) {
      for (let lon = -180; lon <= 180; lon += 15) {
        const p = project(toVector({ lat, lon }), 0.7, -0.3, VIEW);
        expect(Math.hypot(p.x - VIEW.cx, p.y - VIEW.cy)).toBeLessThanOrEqual(VIEW.radius + 1e-9);
      }
    }
  });

  it("gives a front point positive depth and a back point negative depth", () => {
    expect(project(toVector({ lat: 0, lon: 0 }), 0, 0, VIEW).depth).toBeGreaterThan(0);
    expect(project(toVector({ lat: 0, lon: 170 }), 0, 0, VIEW).depth).toBeLessThan(0);
  });
});

describe("greatCircle", () => {
  const arc = greatCircle(origin.coordinates.from, origin.coordinates.to, 72);

  it("returns segments + 1 points, starting and ending on the two pins", () => {
    expect(arc.points).toHaveLength(73);
    expect(toGeo(arc.points[0]).lat).toBeCloseTo(origin.coordinates.from.lat, 6);
    expect(toGeo(arc.points[arc.points.length - 1]).lat).toBeCloseTo(
      origin.coordinates.to.lat,
      6,
    );
  });

  it("keeps every interior point on the unit sphere", () => {
    for (const [x, y, z] of arc.points) {
      expect(Math.hypot(x, y, z)).toBeCloseTo(1, 8);
    }
  });

  it("measures the crossing at roughly 13,500 km", () => {
    const km = arcKm(arc.radians);
    expect(km).toBeGreaterThan(12_000);
    expect(km).toBeLessThan(15_000);
  });

  it("survives two identical points without dividing by zero", () => {
    const degenerate = greatCircle({ lat: 10, lon: 20 }, { lat: 10, lon: 20 }, 8);
    expect(degenerate.radians).toBeCloseTo(0, 10);
    expect(degenerate.points).toHaveLength(9);
    for (const [x, y, z] of degenerate.points) {
      expect(Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z)).toBe(true);
      expect(Math.hypot(x, y, z)).toBeCloseTo(1, 8);
    }
  });

  it("survives exact antipodes without returning NaN", () => {
    for (const [x, y, z] of greatCircle({ lat: 10, lon: 0 }, { lat: -10, lon: 180 }, 8).points) {
      expect(Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z)).toBe(true);
    }
  });
});

describe("derived worlds", () => {
  const arc = greatCircle(origin.coordinates.from, origin.coordinates.to, 72);

  it("puts the Sea's midpoint between the two pins, out over the Pacific", () => {
    const mid = arcMidpoint(arc);
    expect(mid.lat).toBeGreaterThan(origin.coordinates.from.lat);
    expect(Math.abs(mid.lon)).toBeGreaterThan(150);
  });

  it("puts the Sky's apex at the arc's highest latitude", () => {
    const apex = arcApex(arc);
    for (const point of arc.points) {
      expect(apex.lat).toBeGreaterThanOrEqual(toGeo(point).lat - 1e-9);
    }
  });
});

describe("graticule", () => {
  it("returns parallels and meridians at the given step, all in range", () => {
    const lines = graticule(30);
    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) {
      expect(line.length).toBeGreaterThan(2);
      for (const point of line) {
        expect(Math.abs(point.lat)).toBeLessThanOrEqual(90);
        expect(Math.abs(point.lon)).toBeLessThanOrEqual(180);
      }
    }
  });
});

describe("unproject", () => {
  // The inverse is what makes a single click able to do what a drag does —
  // WCAG 2.5.7 (see the Review Focus). Every assertion here is a round trip,
  // because that is the only property the caller actually depends on.
  it("round-trips a front-hemisphere point back to where it was projected from", () => {
    for (const spin of [0, 0.7, -2.1]) {
      for (const tilt of [0, 0.3, -0.5]) {
        for (const point of [
          { lat: 0, lon: 0 },
          { lat: 10, lon: 105.1 },
          { lat: 39.83, lon: -98.58 },
          { lat: -20, lon: 40 },
        ]) {
          const p = project(toVector(point), spin, tilt, VIEW);
          if (!p.front) continue;
          const back = unproject(p.x, p.y, spin, tilt, VIEW);
          expect(back).not.toBeNull();
          expect(back?.lat).toBeCloseTo(point.lat, 4);
          expect(Math.cos((((back?.lon ?? 0) - point.lon) * Math.PI) / 180)).toBeCloseTo(1, 4);
        }
      }
    }
  });

  it("returns null for a click outside the disc", () => {
    expect(unproject(VIEW.cx + VIEW.radius * 2, VIEW.cy, 0, 0, VIEW)).toBeNull();
  });

  it("returns a point, not null, exactly on the limb", () => {
    // The boundary is reachable by a real click and must not produce NaN from
    // a negative square root.
    const edge = unproject(VIEW.cx + VIEW.radius, VIEW.cy, 0, 0, VIEW);
    expect(edge).not.toBeNull();
    expect(Number.isFinite(edge?.lat ?? NaN)).toBe(true);
    expect(Number.isFinite(edge?.lon ?? NaN)).toBe(true);
  });
});

describe("clampTilt", () => {
  it("clamps to ±40° and leaves anything inside alone", () => {
    expect(clampTilt(-99)).toBeCloseTo(-MAX_TILT_RADIANS, 10);
    expect(clampTilt(99)).toBeCloseTo(MAX_TILT_RADIANS, 10);
    expect(clampTilt(0.1)).toBeCloseTo(0.1, 10);
  });
});
