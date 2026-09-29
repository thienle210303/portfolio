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
      expect(Math.hypot(x, y, z)).toBeCloseTo(1, 8);
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
  it("returns the correct count of parallels and meridians for the given step", () => {
    const step = 30;
    const lines = graticule(step);
    // Parallels: -90 + step, -90 + 2*step, ..., 90 - step
    // Count: (90 - (-90)) / step = 180 / 30 = 6 parallels
    // Meridians: -180, -180 + step, ..., 180 - step
    // Count: 360 / step = 12 meridians
    const expectedParallels = (180 - 2 * step) / step + 1; // -60, -30, 0, 30, 60 = 5, but formula gives 6 - need to recalculate
    const expectedMeridians = 360 / step; // -180 to 150 in 30° steps
    // Actually: parallels from (-90 + 30) to (90 - 30) = -60 to 60 in 30° steps = 5 lines
    // meridians from -180 to < 180 in 30° steps = -180, -150, ..., 150 = 12 lines
    const parallels = lines.filter((line) => {
      const firstPoint = line[0];
      // Parallels have constant latitude
      return line.every((p) => Math.abs(p.lat - firstPoint.lat) < 1e-9);
    });
    const meridians = lines.filter((line) => {
      const firstPoint = line[0];
      // Meridians have constant longitude
      return line.every((p) => Math.abs(p.lon - firstPoint.lon) < 1e-9);
    });
    expect(parallels.length).toBe((180 - 2 * step) / step + 1);
    expect(meridians.length).toBe(360 / step);
    // No parallel at ±90°
    for (const parallel of parallels) {
      expect(Math.abs(parallel[0].lat)).toBeLessThan(90);
    }
    // Meridians span pole to pole
    for (const meridian of meridians) {
      expect(meridian[0].lat).toBeCloseTo(-90, 6);
      expect(meridian[meridian.length - 1].lat).toBeCloseTo(90, 6);
    }
  });

  it("returns an empty array for non-positive step", () => {
    expect(graticule(0)).toEqual([]);
    expect(graticule(-30)).toEqual([]);
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
