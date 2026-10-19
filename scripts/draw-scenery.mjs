/**
 * Draws the hero's scenery once into committed SVGs under public/scenery/.
 *
 * The source is the approved canvas board (the round 21 hero board's
 * generator): every helper below is ported from it verbatim, same seeds and
 * same rounding, parameterised only by colour. "Ink" files paint in #000 so
 * the page can use them as one-colour masks and tint them per theme; "art"
 * files keep the board's own colours.
 *
 * Output has no newlines on purpose: core.autocrlf would rewrite them on
 * checkout and break the byte-for-byte comparison.
 *
 * tests/lib/scenery.test.ts fails until the files are re-drawn
 * (`pnpm draw:scenery`) and committed.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

const f = (n) => Math.round(n * 10) / 10;
function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function rice(x0, baseY, n, step, seed, color, hMin = 110, hRange = 110) {
  const r = rng(seed); let s = "";
  for (let i = 0; i < n; i++) {
    const x = x0 + i * step + (r() - 0.5) * step * 0.6, h = hMin + r() * hRange, lean = (r() - 0.35) * 40;
    const tip = [x + lean, baseY - h], c = [x + lean * 0.2, baseY - h * 0.6];
    s += `<path d="M${f(x)} ${baseY}Q${f(c[0])} ${f(c[1])} ${f(tip[0])} ${f(tip[1])}"/>`;
    for (const dir of [-1, 1]) {
      const bl = 50 + r() * 70;
      s += `<path d="M${f(x)} ${baseY - 4}Q${f(x + dir * bl * 0.25)} ${f(baseY - bl * 0.95)} ${f(x + dir * bl * 0.75)} ${f(baseY - bl * 0.7)}"/>`;
    }
    const d = (r() > 0.5 ? 1 : -1) * (22 + r() * 18), hd = [tip[0] + d, tip[1] + 34 + r() * 22], hc = [tip[0] + d * 0.9, tip[1] - 8];
    s += `<path d="M${f(tip[0])} ${f(tip[1])}Q${f(hc[0])} ${f(hc[1])} ${f(hd[0])} ${f(hd[1])}"/>`;
    for (let t = 0.14; t <= 1; t += 0.085) {
      const u = 1 - t;
      const px = u*u*tip[0] + 2*u*t*hc[0] + t*t*hd[0], py = u*u*tip[1] + 2*u*t*hc[1] + t*t*hd[1];
      const dx = 2*u*(hc[0]-tip[0]) + 2*t*(hd[0]-hc[0]), dy = 2*u*(hc[1]-tip[1]) + 2*t*(hd[1]-hc[1]);
      const len = Math.hypot(dx, dy) || 1, ang = (Math.atan2(dy, dx) * 180) / Math.PI;
      for (const side of [-1, 1]) {
        const gx = px + (-dy / len) * 2.6 * side, gy = py + (dx / len) * 2.6 * side;
        s += `<ellipse cx="${f(gx)}" cy="${f(gy)}" rx="3.3" ry="1.4" transform="rotate(${f(ang + side * 28)} ${f(gx)} ${f(gy)})"/>`;
      }
    }
  }
  return `<g fill="none" stroke="${color}" stroke-width="1.1" stroke-linecap="round">${s}</g>`;
}

function pine(x, base, h, color) {
  let s = `<path d="M${x} ${base}L${x} ${base - h}" stroke-width="1.6"/>`;
  for (let k = 0; k < 9; k++) {
    const y = base - h * 0.25 - k * (h * 0.75) / 9, w = 34 - k * 3.2;
    for (const dir of [-1, 1]) for (let j = 0; j < 4; j++) {
      const sx = x + dir * j * (w / 4);
      s += `<path d="M${f(sx)} ${f(y - j * 1.2)}l${f(dir * 7)} ${f(5 - j)}"/>`;
    }
    s += `<path d="M${x} ${f(y)}Q${f(x - w * 0.5)} ${f(y - 2)} ${f(x - w)} ${f(y + 5)}M${x} ${f(y)}Q${f(x + w * 0.5)} ${f(y - 2)} ${f(x + w)} ${f(y + 5)}"/>`;
  }
  return `<g fill="none" stroke="${color}" stroke-width="0.9" stroke-linecap="round">${s}</g>`;
}
function palmetto(x, base, h, color) {
  let s = `<path d="M${x} ${base}Q${x + 6} ${base - h * 0.5} ${x + 2} ${base - h}" stroke-width="3" />`;
  for (let k = base - 8; k > base - h + 6; k -= 7) s += `<path d="M${x - 2} ${k}l6 -3" stroke-width="0.8"/>`;
  const cx = x + 2, cy = base - h;
  for (let i = 0; i < 9; i++) {
    const a = (-180 + i * 22.5) * Math.PI / 180, L = 38 + (i % 2) * 6;
    const ex = cx + Math.cos(a) * L, ey = cy + Math.sin(a) * L * 0.8 + (Math.abs(Math.cos(a)) > 0.7 ? 16 : 0);
    s += `<path d="M${cx} ${cy}Q${f((cx + ex) / 2)} ${f(Math.min(cy, ey) - 8)} ${f(ex)} ${f(ey)}"/>`;
    for (let j = 1; j < 4; j++) {
      const px = cx + (ex - cx) * (0.55 + j * 0.12), py = cy + (ey - cy) * (0.55 + j * 0.12);
      s += `<path d="M${f(px)} ${f(py)}l${f(Math.cos(a + 0.5) * 8)} ${f(Math.sin(a + 0.5) * 8)}"/>`;
    }
  }
  return `<g fill="none" stroke="${color}" stroke-width="1" stroke-linecap="round">${s}</g>`;
}
function ripples(x, y, w, n, color, seed) {
  const r = rng(seed); let s = "";
  for (let i = 0; i < n; i++) {
    const yy = y + i * 9, x0 = x + r() * w * 0.3, x1 = x0 + w * (0.3 + r() * 0.5);
    let d = `M${f(x0)} ${f(yy)}`;
    for (let xx = x0; xx < x1; xx += 18) d += `q4.5 -2.5 9 0t9 0`;
    s += `<path d="${d}"/>`;
  }
  return `<g fill="none" stroke="${color}" stroke-width="1" stroke-linecap="round">${s}</g>`;
}
// Con trâu: a water buffalo, grazing, head low.
function buffalo(x, y, sc, fill) {
  return `<g transform="translate(${x} ${y}) scale(${sc})" fill="${fill}">`
    + `<path d="M18 30C26 10 70 6 104 12C124 16 136 26 136 44C136 58 126 64 112 64L40 64C26 64 16 54 18 30Z"/>`
    + `<path d="M30 60l-4 34h9l5-30M58 62l-1 32h9l2-31M100 62l2 32h9l1-33M120 58l5 34h9l-4-38"/>`
    + `<path d="M136 34C146 40 150 56 146 70" fill="none" stroke="${fill}" stroke-width="3" stroke-linecap="round"/>`
    + `<path d="M24 28C10 30 0 44 -4 58C-6 66 0 72 8 70C16 68 22 56 30 46Z"/>`
    + `<path d="M14 30C2 18 -14 16 -26 22C-12 22 -2 28 4 36ZM22 26C26 12 40 6 54 8C42 12 34 20 30 30Z"/>`
    + `</g>`;
}
// The hero's bamboo pole; the board fills its leaves rgba(moss, 0.18).
function bamboo(color, leafFill) {
  let s = "";
  for (let y = 900; y > 120; y -= 74) s += `<path d="M64 ${y}V${y - 70}M80 ${y}V${y - 70}"/><path d="M60 ${y - 72}Q72 ${y - 78} 84 ${y - 72}" stroke-width="2"/>`;
  const leaf = (x, y, a, L) => { const ex = x + Math.cos(a) * L, ey = y + Math.sin(a) * L, nx = -Math.sin(a) * L * 0.12, ny = Math.cos(a) * L * 0.12; return `<path d="M${f(x)} ${f(y)}Q${f((x + ex) / 2 + nx)} ${f((y + ey) / 2 + ny)} ${f(ex)} ${f(ey)}Q${f((x + ex) / 2 - nx)} ${f((y + ey) / 2 - ny)} ${f(x)} ${f(y)}Z"/>`; };
  const r = rng(19); let leaves = "";
  for (let i = 0; i < 16; i++) { const y = 120 + r() * 200, side = r() > 0.4 ? 1 : -1; leaves += leaf(72, y, (side > 0 ? 0.35 : Math.PI - 0.35) + (r() - 0.5) * 0.7, 46 + r() * 30); }
  return `<g fill="none" stroke="${color}" stroke-width="1.3" stroke-linecap="round">${s}</g><g ${leafFill} stroke="${color}" stroke-width="1">${leaves}</g>`;
}
// The DoorDash tag's laptop.
const laptop = (color) => `<g fill="none" stroke="${color}" stroke-width="1.2"><rect x="44" y="30" width="62" height="40" rx="3"/><path d="M34 76H116M58 44h14M58 54h26M90 44l6 5-6 5"/></g>`;

// Nón lá: a conical straw hat, hung by its chin strap.
function nonLa(x, y, sc) {
  let straw = "";
  for (let k = -4; k <= 4; k++) straw += `<path d="M0 -44L${k * 13} 0" stroke="#A88A4E" stroke-width="0.8"/>`;
  return `<g transform="translate(${x} ${y}) scale(${sc})">`
    + `<path d="M-62 0Q-30 -26 0 -46Q30 -26 62 0Q30 8 0 8Q-30 8 -62 0Z" fill="#E2C68A" stroke="#8A6E3A" stroke-width="1.2"/>`
    + `${straw}<path d="M-62 0Q0 12 62 0" fill="none" stroke="#8A6E3A" stroke-width="1.4"/>`
    + `<path d="M-34 5Q-6 40 4 58M34 5Q10 40 4 58" fill="none" stroke="#B8322A" stroke-width="1.2"/></g>`;
}
// A low plastic stool and what sits on it: phin coffee by day, lẩu by night.
const INK2 = "#2E3833";
function stool(x, y, col, sc = 1) {
  return `<g transform="translate(${x} ${y}) scale(${sc})">`
    + `<path d="M-26 0h52l-4 8h-44Z" fill="${col}"/><path d="M-22 8l-6 34h9l4-26h30l4 26h9l-6-34Z" fill="${col}"/>`
    + `<path d="M-12 16h24" stroke="rgba(0,0,0,0.18)" stroke-width="3"/><path d="M-24 1h48" stroke="rgba(255,255,255,0.35)" stroke-width="1.5"/></g>`;
}
const STILL = {
  phin: (x, y) => `<g transform="translate(${x} ${y})">`
    + `<path d="M-12 -30h24l-3 30h-18Z" fill="#F4EFE6" fill-opacity="0.85" stroke="${INK2}" stroke-width="1"/><path d="M-11 -14h22l-1.6 14h-18.8Z" fill="#5A3A24"/><path d="M-11.4 -20h22.8l-.6 6h-21.6Z" fill="#F1E6C8"/>`
    + `<rect x="-10" y="-46" width="20" height="14" rx="1.5" fill="#A9B0B4" stroke="#6E777C" stroke-width="1"/><rect x="-13" y="-34" width="26" height="3" rx="1" fill="#8E979C"/><path d="M-6 -50h12" stroke="#6E777C" stroke-width="2.4" stroke-linecap="round"/></g>`,
  lau: (x, y) => `<g transform="translate(${x} ${y})">`
    + [0, 1, 2].map((i) => `<path d="M${-14 + i * 14} -30q-5 -9 0 -18t0 -18" fill="none" stroke="#C9D4CC" stroke-width="1.6" stroke-linecap="round" opacity="0.6"/>`).join("")
    + `<path d="M-30 -24h60l-4 22h-52Z" fill="#B8BEC2" stroke="#6E777C" stroke-width="1.2"/><ellipse cx="0" cy="-24" rx="30" ry="6" fill="#C8352B"/>`
    + `<circle cx="-12" cy="-25" r="3" fill="#E8A7B0"/><circle cx="4" cy="-26" r="2.6" fill="#5E8A4A"/><circle cx="14" cy="-24" r="2.4" fill="#F3E3B5"/>`
    + `<path d="M-34 -24h-6M34 -24h6" stroke="#6E777C" stroke-width="3" stroke-linecap="round"/><rect x="-22" y="-2" width="44" height="8" rx="2" fill="#3B433E"/><path d="M-14 6l-3 6M14 6l3 6" stroke="#3B433E" stroke-width="2"/>`
    + `<ellipse cx="0" cy="-2" rx="16" ry="2.4" fill="#FF8A3D" opacity="0.9"/></g>`,
};

// Both branches of the board's skyLayer, without its outer <svg>.
function skyLayer(night, moon, seed) {
  if (!night) {
    // a morning field: low sun, soft clouds, a few birds, dandelion seeds drifting where the fireflies are at night
    const r = rng(seed + 40); let clouds = "", birds = "", seeds = "";
    for (let i = 0; i < 3; i++) {
      const cx = 760 + r() * 560, cy = 50 + r() * 70, w = 110 + r() * 100;
      clouds += `<g opacity="${f(0.55 + r() * 0.25)}" filter="url(#soft)"><ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(w)}" ry="${f(w * 0.16)}" fill="#FFFFFF"/><ellipse cx="${f(cx - w * 0.3)}" cy="${f(cy - w * 0.08)}" rx="${f(w * 0.45)}" ry="${f(w * 0.14)}" fill="#FFFFFF"/><ellipse cx="${f(cx + w * 0.25)}" cy="${f(cy - w * 0.1)}" rx="${f(w * 0.4)}" ry="${f(w * 0.15)}" fill="#FFFFFF"/></g>`;
    }
    for (let i = 0; i < 5; i++) {
      const bx = 720 + r() * 600, by = 40 + r() * 90, sc = 0.6 + r() * 0.6;
      birds += `<path d="M${f(bx)} ${f(by)}q${f(6 * sc)} ${f(-5 * sc)} ${f(12 * sc)} 0q${f(6 * sc)} ${f(-5 * sc)} ${f(12 * sc)} 0" fill="none" stroke="#56605A" stroke-width="1.2" stroke-linecap="round" opacity="0.7"/>`;
    }
    for (let i = 0; i < 18; i++) {
      const sx = 80 + r() * 1300, sy = 520 + r() * 340, a0 = r() * 6.28;
      let fl = "";
      for (let k = 0; k < 7; k++) { const a = a0 + (k * Math.PI * 2) / 7; fl += `M${f(sx)} ${f(sy)}l${f(Math.cos(a) * 5)} ${f(Math.sin(a) * 5)}`; }
      seeds += `<g opacity="${f(0.45 + r() * 0.4)}"><path d="${fl}M${f(sx)} ${f(sy)}l${f(-3)} ${f(9)}" fill="none" stroke="#7D867E" stroke-width="0.8" stroke-linecap="round"/><circle cx="${f(sx - 3)}" cy="${f(sy + 9)}" r="1.1" fill="#7D867E"/></g>`;
    }
    const [mx, my] = moon;
    return `<defs><filter id="soft" x="-30%" y="-80%" width="160%" height="260%"><feGaussianBlur stdDeviation="6"/></filter>`
      + `<radialGradient id="sunhalo"><stop offset="0" stop-color="#FFE9A8" stop-opacity="0.55"/><stop offset="1" stop-color="#FFE9A8" stop-opacity="0"/></radialGradient></defs>`
      + `<circle cx="${mx}" cy="${my}" r="150" fill="url(#sunhalo)"/><circle cx="${mx}" cy="${my}" r="32" fill="#F7E3A6"/>`
      + `${clouds}${birds}${seeds}`;
  }
  const r = rng(seed); let stars = "", flies = "";
  for (let i = 0; i < 70; i++) stars += `<circle cx="${f(r() * 1440)}" cy="${f(r() * 360)}" r="${[0.8, 1, 1.3][Math.floor(r() * 3)]}" fill="#E8EEDF" opacity="${f(0.35 + r() * 0.55)}"/>`;
  for (let i = 0; i < 22; i++) flies += `<circle cx="${f(80 + r() * 1300)}" cy="${f(520 + r() * 360)}" r="${f(1.6 + r())}" fill="#FFE18A" filter="url(#glow)" opacity="${f(0.6 + r() * 0.4)}"/>`;
  const [mx, my] = moon;
  return `<defs><filter id="glow" x="-200%" y="-200%" width="500%" height="500%"><feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`
    + `<radialGradient id="halo"><stop offset="0" stop-color="#F6EFD5" stop-opacity="0.35"/><stop offset="1" stop-color="#F6EFD5" stop-opacity="0"/></radialGradient></defs>`
    + `${stars}<circle cx="${mx}" cy="${my}" r="110" fill="url(#halo)"/><circle cx="${mx}" cy="${my}" r="30" fill="#F3EBD2"/><circle cx="${mx + 9}" cy="${my - 6}" r="5" fill="#E4DBBE"/><circle cx="${mx - 10}" cy="${my + 8}" r="3.5" fill="#E4DBBE"/>`
    + flies;
}

const svg = (viewBox, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${body}</svg>`;
const K = "#000";

/** @returns {Record<string, string>} file stem → SVG text */
export function drawScenery() {
  return {
    bamboo: svg("0 110 170 790", bamboo(K, `fill="${K}" fill-opacity="0.18"`)),
    pine: svg("1260 80 180 820", `<g transform="translate(1356 900) scale(2.7)">${pine(0, 0, 300, K)}</g>`),
    "rice-field": svg("600 740 620 160", rice(640, 890, 15, 34, 11, K, 70, 70)),
    ripples: svg("560 860 660 30", ripples(560, 872, 640, 3, K, 3)),
    buffalo: svg("905 790 150 80", buffalo(930, 790, 0.78, K)),
    "tag-rice": svg("0 0 150 88", rice(52, 84, 3, 20, 4, K, 44, 26)),
    "tag-pine": svg("0 0 150 88", pine(75, 84, 76, K)),
    "tag-palmetto": svg("0 0 150 88", palmetto(75, 84, 48, K)),
    "tag-laptop": svg("0 0 150 88", laptop(K)),
    "non-la": svg("44 370 120 130", `<path d="M80 372Q96 380 102 396" fill="none" stroke="#8b7b5e" stroke-width="1.2"/>${nonLa(104, 444, 0.9)}`),
    "sky-day": svg("0 0 1440 900", skyLayer(false, [880, 120], 1)),
    "sky-night": svg("0 0 1440 900", skyLayer(true, [880, 120], 1)),
    morning: svg("420 750 100 134", stool(470, 840, "#C8352B") + STILL.phin(470, 838)),
    evening: svg("420 750 100 134", stool(470, 840, "#2E6DB4") + STILL.lau(470, 838)),
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const dir = fileURLToPath(new URL("../public/scenery/", import.meta.url));
  mkdirSync(dir, { recursive: true });
  for (const [stem, text] of Object.entries(drawScenery())) {
    writeFileSync(`${dir}${stem}.svg`, text);
    console.log(`${stem}.svg  ${Buffer.byteLength(text)} B`);
  }
}
