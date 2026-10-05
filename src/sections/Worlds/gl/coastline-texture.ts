/**
 * Rasterises flat [lon, lat, ...] coastline rings into an equirectangular
 * coverage buffer. Pure JS on purpose: no canvas, so it runs in vitest's jsdom.
 *
 * Takes the rings as an argument rather than importing them, so the
 * coastline-data fence (GlobeCanvas is its only importer) stays intact.
 *
 * Output is RGBA with land = (255,255,255,255) and ocean = all zero; the
 * shader reads alpha and picks the colours.
 */

export interface CoastlineTexture {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

type Ring = readonly number[];

/**
 * Longitudes are unwrapped so a step of more than 180 degrees is read as a
 * crossing, not a jump. A ring that ends 360 degrees away from where it began
 * encloses a pole (Antarctica); it is closed along that pole. The polygon is
 * then filled at its unwrapped position and at one wrap either side.
 */
function unwrap(ring: Ring, width: number, height: number): number[] {
  const xs: number[] = [];
  let lon = ring[0];
  let latSum = 0;
  for (let i = 0; i < ring.length; i += 2) {
    if (i > 0) {
      const step = ring[i] - ring[i - 2];
      lon += step > 180 ? step - 360 : step < -180 ? step + 360 : step;
    }
    latSum += ring[i + 1];
    xs.push(((lon + 180) / 360) * width, ((90 - ring[i + 1]) / 180) * height);
  }
  const first = xs[0];
  const last = xs[xs.length - 2];
  if (Math.abs(last - first) > width / 2) {
    const poleY = latSum < 0 ? height : 0;
    xs.push(last, poleY, first, poleY);
  }
  return xs;
}

function fillRing(pts: number[], width: number, height: number, data: Uint8ClampedArray): void {
  let minY = Infinity;
  let maxY = -Infinity;
  for (let i = 1; i < pts.length; i += 2) {
    minY = Math.min(minY, pts[i]);
    maxY = Math.max(maxY, pts[i]);
  }
  const rowStart = Math.max(0, Math.ceil(minY - 0.5));
  const rowEnd = Math.min(height - 1, Math.ceil(maxY - 0.5) - 1);
  if (rowEnd < rowStart) return;

  const crossings: number[][] = [];
  const n = pts.length / 2;
  for (let e = 0; e < n; e++) {
    const x0 = pts[e * 2];
    const y0 = pts[e * 2 + 1];
    const next = ((e + 1) % n) * 2;
    const x1 = pts[next];
    const y1 = pts[next + 1];
    if (y0 === y1) continue;
    const [top, bottom] = y0 < y1 ? [y0, y1] : [y1, y0];
    // Half-open [top, bottom): a vertex on a scanline counts once.
    const from = Math.max(rowStart, Math.ceil(top - 0.5));
    const to = Math.min(rowEnd, Math.ceil(bottom - 0.5) - 1);
    for (let row = from; row <= to; row++) {
      const t = (row + 0.5 - y0) / (y1 - y0);
      (crossings[row - rowStart] ??= []).push(x0 + t * (x1 - x0));
    }
  }

  for (let row = rowStart; row <= rowEnd; row++) {
    const xs = crossings[row - rowStart];
    if (!xs) continue;
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      for (const shift of [-width, 0, width]) {
        // Pixel c is land when its centre c+0.5 lies in [xa, xb).
        const c0 = Math.max(0, Math.ceil(xs[k] + shift - 0.5));
        const c1 = Math.min(width - 1, Math.ceil(xs[k + 1] + shift - 0.5) - 1);
        for (let c = c0; c <= c1; c++) data.fill(255, (row * width + c) * 4, (row * width + c) * 4 + 4);
      }
    }
  }
}

export function bakeCoastlineTexture(
  rings: readonly Ring[],
  width: number,
  height: number,
): CoastlineTexture {
  const data = new Uint8ClampedArray(width * height * 4);
  for (const ring of rings) {
    if (ring.length >= 6) fillRing(unwrap(ring, width, height), width, height, data);
  }
  return { width, height, data };
}
