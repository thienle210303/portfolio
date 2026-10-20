// Generates the "1b · The Pass, grown outdoors" boards with procedural line drawings.
import fs from "node:fs";
import path from "node:path";

const OUT = process.argv[2];
const f = (n) => Math.round(n * 10) / 10;
function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// palette
const NIGHT = process.env.NIGHT === "1";
const C = {
  ground: "#E4E8E0", paper: "#FBFBF8", ink: "#1D2321", muted: "#56605A",
  moss: "#46603A", mossDeep: "#1F3A30", river: "#173A3D", riverLight: "#E9EFEA",
  riverMuted: "#A9BDB8", red: "#B3362B", redOnDark: "#E86A5C", twine: "#8B7B5E", hair: "#C9D0C8",
  // text and lines that sit on the ground (not on paper)
  fgGround: "#1D2321", mutedGround: "#56605A", lineGround: "#1D2321", bark: "#1D2321",
  onControl: "#FFFFFF", mossPaper: "#46603A", card: "#FFFFFF", back: "#EEF2EA", ruled: "#E3E9E4", water: "#9FB3AE",
};
if (NIGHT) Object.assign(C, {
  // a moonlit field: sky ground, silhouettes, lantern-lit paper that keeps dark ink
  ground: "#142024", paper: "#EDE7D8", card: "#F3EEE2", back: "#E2DCCB", ruled: "#D8D1BE",
  ink: "#1D2321", muted: "#5A5F55", moss: "#7FA06E", mossDeep: "#A8C99A", onControl: "#10181A",
  twine: "#B3A27F", hair: "#D3CCB9", water: "#3F5A5A",
  fgGround: "#E6ECE7", mutedGround: "#A9B6AE", lineGround: "#C9D4CC", bark: "#070C0D",
});
const GROUND = NIGHT ? "linear-gradient(180deg, #1F3237 0%, #142024 50%, #0D1416 100%)" : "linear-gradient(180deg, #DCE6E2 0%, #E4EAE1 45%, #ECECE2 100%)";
// Paper grain, multiplied so it darkens paper a touch in both themes.
const GRAIN = `url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22180%22 height=%22180%22%3E%3Cfilter id=%22n%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%22.9%22 numOctaves=%222%22 stitchTiles=%22stitch%22/%3E%3CfeColorMatrix values=%220 0 0 0 .32 0 0 0 0 .27 0 0 0 0 .18 0 0 0 .10 0%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22/%3E%3C/svg%3E')`;
function skyLayer(moon, seed) {
  if (!NIGHT) {
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
    return `<svg aria-hidden="true" width="1440" height="900" viewBox="0 0 1440 900" style="position: absolute; inset: 0">
<defs><filter id="soft" x="-30%" y="-80%" width="160%" height="260%"><feGaussianBlur stdDeviation="6"/></filter>
<radialGradient id="sunhalo"><stop offset="0" stop-color="#FFE9A8" stop-opacity="0.55"/><stop offset="1" stop-color="#FFE9A8" stop-opacity="0"/></radialGradient></defs>
<circle cx="${mx}" cy="${my}" r="150" fill="url(#sunhalo)"/><circle cx="${mx}" cy="${my}" r="32" fill="#F7E3A6"/>
${clouds}${birds}${seeds}</svg>`;
  }
  const r = rng(seed); let stars = "", flies = "";
  for (let i = 0; i < 70; i++) stars += `<circle cx="${f(r() * 1440)}" cy="${f(r() * 360)}" r="${[0.8, 1, 1.3][Math.floor(r() * 3)]}" fill="#E8EEDF" opacity="${f(0.35 + r() * 0.55)}"/>`;
  for (let i = 0; i < 22; i++) flies += `<circle cx="${f(80 + r() * 1300)}" cy="${f(520 + r() * 360)}" r="${f(1.6 + r())}" fill="#FFE18A" filter="url(#glow)" opacity="${f(0.6 + r() * 0.4)}"/>`;
  const [mx, my] = moon;
  return `<svg aria-hidden="true" width="1440" height="900" viewBox="0 0 1440 900" style="position: absolute; inset: 0">
<defs><filter id="glow" x="-200%" y="-200%" width="500%" height="500%"><feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<radialGradient id="halo"><stop offset="0" stop-color="#F6EFD5" stop-opacity="0.35"/><stop offset="1" stop-color="#F6EFD5" stop-opacity="0"/></radialGradient></defs>
${stars}<circle cx="${mx}" cy="${my}" r="110" fill="url(#halo)"/><circle cx="${mx}" cy="${my}" r="30" fill="#F3EBD2"/><circle cx="${mx + 9}" cy="${my - 6}" r="5" fill="#E4DBBE"/><circle cx="${mx - 10}" cy="${my + 8}" r="3.5" fill="#E4DBBE"/>
${flies}</svg>`;
}
const FONTS = `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600&amp;family=Courier+Prime:wght@400;700&amp;family=Newsreader:ital,opsz,wght@1,6..72,400&amp;display=swap">`;

// ---------- drawing helpers ----------
function cubic(p, t) {
  const u = 1 - t;
  return [0, 1].map((i) => u*u*u*p[0][i] + 3*u*u*t*p[1][i] + 3*u*t*t*p[2][i] + t*t*t*p[3][i]);
}
function cubicD(p, t) {
  const u = 1 - t;
  return [0, 1].map((i) => 3*u*u*(p[1][i]-p[0][i]) + 6*u*t*(p[2][i]-p[1][i]) + 3*t*t*(p[3][i]-p[2][i]));
}
function taper(p, w0, w1, fill) {
  const L = [], R = [];
  for (let k = 0; k <= 24; k++) {
    const t = k / 24, [x, y] = cubic(p, t), [dx, dy] = cubicD(p, t);
    const len = Math.hypot(dx, dy) || 1, w = (w0 + (w1 - w0) * t) / 2;
    L.push([x - (dy / len) * w, y + (dx / len) * w]);
    R.push([x + (dy / len) * w, y - (dx / len) * w]);
  }
  const pts = [...L, ...R.reverse()];
  return `<path fill="${fill}" d="M${pts.map(([x, y]) => `${f(x)} ${f(y)}`).join("L")}Z"/>`;
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

function blob(cx, cy, base, ph, k = 0) {
  let d = "";
  for (let a = 0; a <= 360; a += 4) {
    const th = (a * Math.PI) / 180;
    const rr = base * (1 + 0.2*Math.sin(2*th+ph[0]) + 0.1*Math.sin(3*th+ph[1]+k*0.25) + 0.07*Math.sin(7*th+ph[2]) + 0.035*Math.sin(13*th+ph[0]*2) / (1 + k*0.4));
    d += (a ? "L" : "M") + f(cx + rr * Math.cos(th)) + " " + f(cy + rr * Math.sin(th));
  }
  return d + "Z";
}
function island(cx, cy, base, rings, seed, landFill, lineColor) {
  const r = rng(seed), ph = [r() * 6.28, r() * 6.28, r() * 6.28];
  let s = "";
  for (let k = rings; k >= 1; k--) s += `<path d="${blob(cx, cy, base + k * 16, ph, k)}" fill="none" stroke="${lineColor}" stroke-width="1"/>`;
  return s + `<path d="${blob(cx, cy, base, ph)}" fill="${landFill}" stroke="${lineColor}" stroke-width="1.2"/>`;
}

function twigs(x, y, ang, len, w, depth, r, out, leafColor) {
  const ex = x + Math.cos(ang) * len, ey = y + Math.sin(ang) * len;
  const bend = (r() - 0.5) * len * 0.3;
  out.lines += `<path d="M${f(x)} ${f(y)}Q${f((x+ex)/2 - Math.sin(ang)*bend)} ${f((y+ey)/2 + Math.cos(ang)*bend)} ${f(ex)} ${f(ey)}" stroke-width="${f(w)}"/>`;
  if (depth > 0) {
    const n = r() > 0.4 ? 2 : 3;
    for (let i = 0; i < n; i++) twigs(ex, ey, ang + (r() - 0.5) * 1.3, len * (0.6 + r() * 0.15), w * 0.62, depth - 1, r, out, leafColor);
  } else {
    for (let i = 0; i < 7; i++) {
      const lx = ex + (r() - 0.5) * 16, ly = ey + (r() - 0.5) * 12;
      out.leaves += `<ellipse cx="${f(lx)}" cy="${f(ly)}" rx="4.2" ry="1.9" transform="rotate(${f(r() * 180)} ${f(lx)} ${f(ly)})"/>`;
    }
  }
}
function moss(x, y, len, r) {
  let s = "";
  for (let j = 0; j < 3; j++) {
    let d = `M${f(x + (j - 1) * 4)} ${f(y)}`, cx = x + (j - 1) * 4, cy = y;
    const L = len * (0.6 + r() * 0.5);
    for (let k = 0; k < L; k += 7) { cx += (k / 7) % 2 ? 2.2 : -2.2; cy += 7; d += `L${f(cx)} ${f(cy)}`; }
    s += `<path d="${d}"/>`;
  }
  return s;
}

function oak(limbs, seed, cfg) {
  const r = rng(seed), out = { lines: "", leaves: "" };
  let body = "", mossS = "";
  for (const L of limbs) {
    body += taper(L.p, L.w0, L.w1, C.bark);
    if (L.twigs === 0) continue;
    for (let i = 0; i < (L.twigs ?? 7); i++) {
      const t = 0.25 + (0.75 * (i + r() * 0.6)) / (L.twigs ?? 7);
      const [x, y] = cubic(L.p, Math.min(t, 1)), [dx, dy] = cubicD(L.p, Math.min(t, 1));
      const base = Math.atan2(dy, dx);
      const side = r() > 0.3 ? -1 : 1; // mostly upward
      const ang = base + side * (0.5 + r() * 0.7);
      const w = (L.w0 + (L.w1 - L.w0) * t) * 0.35;
      twigs(x, y, ang, cfg.twig * (0.7 + r() * 0.5), Math.max(w, 1.4), 2, r, out);
    }
    for (let i = 0; i < (L.moss ?? 0); i++) {
      const [x, y] = cubic(L.p, 0.2 + r() * 0.75);
      mossS += moss(x, y + L.w1 / 2, 40 + r() * 70, r);
    }
  }
  return `<g fill="${C.moss}" fill-opacity="0.5">${out.leaves}</g>`
    + `<g fill="none" stroke="#8C9A86" stroke-width="0.9" stroke-linejoin="round">${mossS}</g>`
    + body
    + `<g fill="none" stroke="${C.bark}" stroke-linecap="round">${out.lines}</g>`;
}

function fern(x, y, len, angDeg, seed, color, maxP = 26) {
  const r = rng(seed), a = (angDeg * Math.PI) / 180;
  const tip = [x + Math.cos(a) * len, y + Math.sin(a) * len];
  const ctrl = [x + Math.cos(a) * len * 0.5 + Math.sin(a) * len * 0.18, y + Math.sin(a) * len * 0.5 - Math.cos(a) * len * 0.18];
  let s = `<path d="M${f(x)} ${f(y)}Q${f(ctrl[0])} ${f(ctrl[1])} ${f(tip[0])} ${f(tip[1])}" stroke-width="1.3"/>`;
  const n = 18;
  for (let i = 1; i < n; i++) {
    const t = i / n, u = 1 - t;
    const px = u*u*x + 2*u*t*ctrl[0] + t*t*tip[0], py = u*u*y + 2*u*t*ctrl[1] + t*t*tip[1];
    const dx = 2*u*(ctrl[0]-x) + 2*t*(tip[0]-ctrl[0]), dy = 2*u*(ctrl[1]-y) + 2*t*(tip[1]-ctrl[1]);
    const base = Math.atan2(dy, dx), pl = maxP * Math.pow(Math.sin(Math.PI * (0.15 + t * 0.85)), 0.8) * (1 - t * 0.35);
    for (const side of [-1, 1]) {
      const pa = base + side * (0.95 + (r() - 0.5) * 0.15) - side * t * 0.2;
      const ex = px + Math.cos(pa) * pl, ey = py + Math.sin(pa) * pl;
      const nx = -Math.sin(pa) * pl * 0.22, ny = Math.cos(pa) * pl * 0.22;
      const mx = (px + ex) / 2, my = (py + ey) / 2;
      s += `<path d="M${f(px)} ${f(py)}Q${f(mx + nx)} ${f(my + ny)} ${f(ex)} ${f(ey)}Q${f(mx - nx)} ${f(my - ny)} ${f(px)} ${f(py)}"/>`;
    }
  }
  return `<g fill="none" stroke="${color}" stroke-width="0.9" stroke-linejoin="round">${s}</g>`;
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

const cat = (x, y, s, stroke, bg) => `<g transform="translate(${x} ${y}) scale(${s})" fill="none" stroke="${stroke}" stroke-width="${f(1.6 / s)}" stroke-linecap="round" stroke-linejoin="round">
<path d="M150 74C152 96 112 101 70 96" />
<path d="M22 70C22 42 60 28 96 32C130 36 152 54 150 72C148 88 122 93 90 93L44 93C30 93 22 84 22 70Z" fill="${bg}"/>
<path d="M60 52C76 46 98 46 116 54" stroke-width="${f(0.9 / s)}"/>
<path d="M28 52L25 33L40 45M48 43L59 29L61 46" fill="${bg}"/>
<path d="M22 66C20 50 34 40 48 42C62 44 68 56 64 68C60 80 46 84 34 80C26 77 22 72 22 66Z" fill="${bg}"/>
<path d="M33 62q4 3 8 0M48 62q4 3 8 0M43 69l1 2l1 -2" />
<path d="M30 70l-12 -2M30 73l-11 3M58 70l12 -2M58 73l11 3" stroke-width="${f(0.7 / s)}"/>
</g>`;
const heron = (x, y, s, stroke) => `<g transform="translate(${x} ${y}) scale(${s})" fill="none" stroke="${stroke}" stroke-width="${f(1.5 / s)}" stroke-linecap="round" stroke-linejoin="round">
<path d="M40 90C55 70 95 70 105 92C112 108 90 122 62 120C48 119 36 108 40 90Z"/>
<path d="M58 96C70 92 86 94 98 102M54 104C66 101 80 103 90 110" stroke-width="${f(0.8 / s)}"/>
<path d="M62 120L34 134M66 121L42 138"/>
<path d="M97 80C102 56 82 46 88 28C92 16 104 12 112 18"/>
<path d="M112 18C116 13 125 15 125 22C123 26 116 27 112 24"/>
<path d="M124 19L152 25L123 25M110 15L96 10"/>
<path d="M70 120L72 200M82 118L88 200M72 200l-11 4M72 200l11 3M88 200l-9 4M88 200l13 2"/>
</g>`;

// ---------- shared HTML pieces ----------
const doc = (title, body, script = "renderVals() { return {}; }") => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${title}</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
${FONTS}
<style>body{margin:0} a{color:inherit}</style>
</helmet>
${body}
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{"$preview":{"width":1440,"height":900}}'>
class Component extends DCLogic {
${script}
}
</script>
</body>
</html>
`;
const frame = (bg, color, inner, moon = [1180, 110], seed = 2) => `<div style="width: 1440px; height: 900px; box-sizing: border-box; background: ${bg === C.ground ? GROUND : bg}; color: ${color}; font-family: 'Bricolage Grotesque', sans-serif; position: relative; overflow: hidden">
${skyLayer(moon, seed)}
${inner}
</div>`;
const TAG_CLIP = "clip-path: polygon(22px 0, calc(100% - 22px) 0, 100% 22px, 100% 100%, 0 100%, 0 22px)";
const hole = (bg) => `<div style="position: absolute; left: 50%; top: 12px; width: 12px; height: 12px; margin-left: -6px; border-radius: 50%; background: ${bg}; box-shadow: inset 0 0 0 1.5px #B9AE95"></div>`;
const nav = (color) => `<div style="position: absolute; left: 0; right: 0; top: 0; height: 72px; display: flex; align-items: center; justify-content: space-between; padding: 0 96px; font-size: 16px; color: ${color}">
<span style="font-weight: 600; font-size: 19px">Thien Le</span>
<nav style="display: flex; gap: 36px"><a href="#" style="text-decoration: none">Where I'm from</a><a href="#" style="text-decoration: none">The work</a><a href="#" style="text-decoration: none">Say hi</a></nav>
</div>`;

const QR_PATHS = `<path class="qrline" stroke="#1d2321" d="M0 0.5h7m4 0h1m1 0h1m2 0h1m1 0h1m3 0h7m-29 1h1m5 0h1m1 0h2m1 0h2m4 0h1m2 0h1m1 0h1m5 0h1m-29 1h1m1 0h3m1 0h1m1 0h5m1 0h1m4 0h1m2 0h1m1 0h3m1 0h1m-29 1h1m1 0h3m1 0h1m1 0h1m4 0h2m2 0h1m2 0h1m1 0h1m1 0h3m1 0h1m-29 1h1m1 0h3m1 0h1m2 0h2m1 0h1m1 0h1m2 0h4m1 0h1m1 0h3m1 0h1m-29 1h1m5 0h1m2 0h1m6 0h1m5 0h1m5 0h1m-29 1h7m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h7m-21 1h2m2 0h1m3 0h1m2 0h2m-21 1h1m5 0h1m1 0h2m1 0h3m1 0h1m1 0h3m1 0h2m2 0h3m-28 1h2m1 0h2m2 0h2m3 0h1m2 0h1m1 0h4m2 0h2m1 0h2m-28 1h4m1 0h2m1 0h4m1 0h1m1 0h1m1 0h1m4 0h1m-22 1h2m1 0h2m2 0h2m1 0h2m1 0h1m1 0h1m2 0h2m2 0h1m1 0h1m-24 1h2m1 0h3m1 0h2m1 0h1m1 0h1m1 0h1m3 0h1m1 0h2m4 0h1m-29 1h3m1 0h1m3 0h1m1 0h3m1 0h7m1 0h1m1 0h1m2 0h2m-28 1h2m1 0h1m1 0h1m3 0h3m2 0h1m2 0h1m1 0h4m1 0h2m-27 1h2m1 0h2m3 0h2m4 0h2m4 0h5m1 0h1m1 0h1m-29 1h2m2 0h1m1 0h2m2 0h1m1 0h2m3 0h1m1 0h1m3 0h1m1 0h2m-27 1h4m1 0h1m2 0h1m2 0h2m1 0h7m1 0h3m1 0h3m-29 1h2m4 0h3m1 0h1m1 0h1m1 0h2m3 0h2m4 0h1m2 0h1m-29 1h1m2 0h3m3 0h2m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h3m-25 1h1m4 0h2m1 0h1m2 0h2m2 0h1m1 0h2m1 0h5m1 0h3m-21 1h1m1 0h1m3 0h2m1 0h2m1 0h1m3 0h2m-26 1h7m3 0h2m3 0h3m1 0h2m1 0h1m1 0h3m-27 1h1m5 0h1m3 0h1m8 0h2m3 0h1m2 0h1m-28 1h1m1 0h3m1 0h1m2 0h1m1 0h4m1 0h1m2 0h7m1 0h1m-28 1h1m1 0h3m1 0h1m2 0h1m2 0h1m2 0h2m2 0h1m1 0h1m1 0h1m1 0h2m1 0h1m-29 1h1m1 0h3m1 0h1m3 0h4m1 0h1m3 0h1m1 0h7m-28 1h1m5 0h1m2 0h1m1 0h4m1 0h1m1 0h1m4 0h1m1 0h2m1 0h1m-29 1h7m1 0h1m1 0h1m1 0h1m1 0h1m2 0h1m1 0h1m2 0h5"/>
`;
// Nón lá: a conical straw hat, hung by its chin strap.
function nonLa(x, y, sc) {
  let straw = "";
  for (let k = -4; k <= 4; k++) straw += `<path d="M0 -44L${k * 13} 0" stroke="#A88A4E" stroke-width="0.8"/>`;
  return `<g transform="translate(${x} ${y}) scale(${sc})">
<path d="M-62 0Q-30 -26 0 -46Q30 -26 62 0Q30 8 0 8Q-30 8 -62 0Z" fill="#E2C68A" stroke="#8A6E3A" stroke-width="1.2"/>
${straw}<path d="M-62 0Q0 12 62 0" fill="none" stroke="#8A6E3A" stroke-width="1.4"/>
<path d="M-34 5Q-6 40 4 58M34 5Q10 40 4 58" fill="none" stroke="#B8322A" stroke-width="1.2"/></g>`;
}
// One Hội An silk lantern; lit at night.
function hoiAn(x, y, col, sc) {
  const lit = NIGHT ? `<ellipse cx="0" cy="26" rx="46" ry="52" fill="url(#hoiGlow)"/>` : "";
  return `<g transform="translate(${x} ${y}) scale(${sc})">${lit}
<rect x="-7" y="-6" width="14" height="6" rx="1.5" fill="#6B5640"/>
<path d="M-15 0C-27 14 -27 38 -15 52H15C27 38 27 14 15 0Z" fill="${NIGHT ? "url(#hoiLit)" : col}"/>
<path d="M-7 0C-12 16 -12 36 -7 52M7 0C12 16 12 36 7 52M0 0V52" stroke="rgba(60,30,20,0.28)" stroke-width="1" fill="none"/>
<rect x="-7" y="52" width="14" height="5" rx="1.5" fill="#6B5640"/>
<path d="M0 57V76" stroke="${col}" stroke-width="1.6" stroke-linecap="round"/></g>`;
}
const HOI_DEFS = (col) => `<defs><radialGradient id="hoiGlow"><stop offset="0" stop-color="#FFC768" stop-opacity="0.55"/><stop offset="1" stop-color="#FFC768" stop-opacity="0"/></radialGradient><radialGradient id="hoiLit" cx="50%" cy="45%" r="60%"><stop offset="0" stop-color="#FFE7A8"/><stop offset="0.55" stop-color="${col}"/><stop offset="1" stop-color="${col}" stop-opacity="0.85"/></radialGradient></defs>`;
// A pressed lotus (Việt Nam's flower), flattened like a specimen.
function pressedLotus(x, y, sc) {
  const petal = (a, len, w) => { const r = (a * Math.PI) / 180, ex = Math.cos(r) * len, ey = Math.sin(r) * len, nx = -Math.sin(r) * w, ny = Math.cos(r) * w;
    return `<path d="M0 0Q${f(ex / 2 + nx)} ${f(ey / 2 + ny)} ${f(ex)} ${f(ey)}Q${f(ex / 2 - nx)} ${f(ey / 2 - ny)} 0 0Z" fill="#E8A7B0" fill-opacity="0.75" stroke="#B5606F" stroke-width="0.9"/>`; };
  let petals = "";
  [[-150, 40, 13], [-120, 48, 14], [-90, 52, 14], [-60, 48, 14], [-30, 40, 13], [-105, 34, 10], [-75, 34, 10]].forEach(([a, l, w]) => { petals += petal(a, l, w); });
  return `<g transform="translate(${x} ${y}) scale(${sc}) rotate(-12)">
<path d="M0 4Q-6 60 4 120" fill="none" stroke="#5E7A4A" stroke-width="2"/>
<path d="M2 70Q40 54 62 72Q40 92 2 78Z" fill="#9DB384" fill-opacity="0.7" stroke="#5E7A4A" stroke-width="0.9"/>
${petals}<circle cx="0" cy="-10" r="6" fill="#E3C46A" stroke="#A88A3A" stroke-width="0.8"/></g>`;
}
const TET = process.env.TET === "1";
// Con trâu: a water buffalo, grazing, head low.
function buffalo(x, y, sc, fill) {
  return `<g transform="translate(${x} ${y}) scale(${sc})" fill="${fill}">
<path d="M18 30C26 10 70 6 104 12C124 16 136 26 136 44C136 58 126 64 112 64L40 64C26 64 16 54 18 30Z"/>
<path d="M30 60l-4 34h9l5-30M58 62l-1 32h9l2-31M100 62l2 32h9l1-33M120 58l5 34h9l-4-38"/>
<path d="M136 34C146 40 150 56 146 70" fill="none" stroke="${fill}" stroke-width="3" stroke-linecap="round"/>
<path d="M24 28C10 30 0 44 -4 58C-6 66 0 72 8 70C16 68 22 56 30 46Z"/>
<path d="M14 30C2 18 -14 16 -26 22C-12 22 -2 28 4 36ZM22 26C26 12 40 6 54 8C42 12 34 20 30 30Z"/>
</g>`;
}
// A bowl of phở, steaming, chopsticks resting across it.
function phoBowl(x, y, sc) {
  const steam = [0, 1, 2].map((i) => `<path d="M${-14 + i * 14} -16q-6 -10 0 -20t0 -20" fill="none" stroke="${C.lineGround}" stroke-width="1.4" stroke-linecap="round" opacity="0.55"/>`).join("");
  return `<g transform="translate(${x} ${y}) scale(${sc})">${steam}
<path d="M-46 0A46 26 0 0 0 46 0Z" fill="#F4EFE6" stroke="#5B6B7E" stroke-width="1.4"/>
<path d="M-40 10Q0 22 40 10" fill="none" stroke="#3A5A8C" stroke-width="1.6"/><path d="M-30 18Q0 27 30 18" fill="none" stroke="#3A5A8C" stroke-width="1"/>
<ellipse cx="0" cy="0" rx="46" ry="9" fill="#D9A55A" stroke="#5B6B7E" stroke-width="1.2"/>
<path d="M-30 -1q8 -4 16 0t16 0t16 0M-24 3q8 -3 16 0t16 0t14 0" fill="none" stroke="#F3E3B5" stroke-width="1.6"/>
<circle cx="-12" cy="-3" r="2.6" fill="#5E8A4A"/><circle cx="8" cy="-4" r="2.2" fill="#5E8A4A"/><circle cx="20" cy="0" r="2.4" fill="#5E8A4A"/><ellipse cx="-2" cy="1" rx="5" ry="2.4" fill="#B5606F"/>
<path d="M-8 -28L56 8M-2 -32L62 4" stroke="#8A6E3A" stroke-width="2.4" stroke-linecap="round"/></g>`;
}
// Tết only: a branch of hoa mai (yellow apricot blossom) and a bánh tét.
function hoaMai(x, y, sc, flip = 1) {
  const r = rng(Math.round(x)); let fl = "";
  for (let i = 0; i < 7; i++) {
    const fx = 20 + i * 22 + r() * 8, fy = -10 - Math.sin(i) * 14 + r() * 10;
    let pet = ""; for (let k = 0; k < 5; k++) { const a = (k * 72 * Math.PI) / 180; pet += `<ellipse cx="${f(fx + Math.cos(a) * 5)}" cy="${f(fy + Math.sin(a) * 5)}" rx="4.4" ry="3.2" transform="rotate(${k * 72} ${f(fx + Math.cos(a) * 5)} ${f(fy + Math.sin(a) * 5)})" fill="#F2C230"/>`; }
    fl += pet + `<circle cx="${f(fx)}" cy="${f(fy)}" r="2" fill="#C2701E"/>`;
  }
  return `<g transform="translate(${x} ${y}) scale(${sc * flip} ${sc})"><path d="M0 0C40 -10 90 -30 170 -20" fill="none" stroke="#6B5640" stroke-width="3" stroke-linecap="round"/><path d="M60 -16l14 -18M110 -22l10 -16" stroke="#6B5640" stroke-width="2" stroke-linecap="round"/>${fl}</g>`;
}
function banhTet(x, y, sc) {
  return `<g transform="translate(${x} ${y}) scale(${sc})">
<rect x="-70" y="-22" width="120" height="44" rx="20" fill="#5E8A4A" stroke="#3F5E35" stroke-width="1.4"/>
<path d="M-50 -22v44M-20 -22v44M10 -22v44M36 -21v42" stroke="#C7B27A" stroke-width="2.2"/>
<path d="M-62 -14q40 6 106 0M-62 14q40 -6 106 0" fill="none" stroke="#3F5E35" stroke-width="0.9"/>
<ellipse cx="70" cy="0" rx="20" ry="22" fill="#F3EEE2" stroke="#3F5E35" stroke-width="3"/>
<ellipse cx="70" cy="0" rx="11" ry="12" fill="#E3C46A"/><ellipse cx="70" cy="0" rx="5" ry="5.5" fill="#C98B7A"/></g>`;
}
// ---- Vietnamese street life: a low plastic stool and what sits on it ----
const INK2 = "#2E3833";
function stool(x, y, col, sc = 1) {
  return `<g transform="translate(${x} ${y}) scale(${sc})">
<path d="M-26 0h52l-4 8h-44Z" fill="${col}"/><path d="M-22 8l-6 34h9l4-26h30l4 26h9l-6-34Z" fill="${col}"/>
<path d="M-12 16h24" stroke="rgba(0,0,0,0.18)" stroke-width="3"/><path d="M-24 1h48" stroke="rgba(255,255,255,0.35)" stroke-width="1.5"/></g>`;
}
function smallCap(x, y, text, color) {
  return `<text x="${x}" y="${y}" font-family="Newsreader" font-style="italic" font-size="14" fill="${color}">${text}</text>`;
}
const STILL = {
  // morning
  phin: (x, y) => `<g transform="translate(${x} ${y})">
<path d="M-12 -30h24l-3 30h-18Z" fill="#F4EFE6" fill-opacity="0.85" stroke="${INK2}" stroke-width="1"/><path d="M-11 -14h22l-1.6 14h-18.8Z" fill="#5A3A24"/><path d="M-11.4 -20h22.8l-.6 6h-21.6Z" fill="#F1E6C8"/>
<rect x="-10" y="-46" width="20" height="14" rx="1.5" fill="#A9B0B4" stroke="#6E777C" stroke-width="1"/><rect x="-13" y="-34" width="26" height="3" rx="1" fill="#8E979C"/><path d="M-6 -50h12" stroke="#6E777C" stroke-width="2.4" stroke-linecap="round"/></g>`,
  banhMi: (x, y) => `<g transform="translate(${x} ${y}) rotate(-8)">
<path d="M-38 -6C-36 -18 30 -20 40 -8C44 -2 40 6 30 8L-30 8C-40 6 -40 0 -38 -6Z" fill="#D9A55A" stroke="#8A5E2A" stroke-width="1.2"/>
<path d="M-24 -10l6 10M-8 -12l6 10M8 -12l6 10M24 -10l5 9" stroke="#F3DCA6" stroke-width="2" stroke-linecap="round"/>
<path d="M-30 2l-8 10h40l6-10" fill="#EFE7D2" stroke="#B9AE95" stroke-width="1"/><path d="M-6 0q4 -4 8 0" stroke="#5E8A4A" stroke-width="2.4" fill="none"/></g>`,
  suaDa: (x, y) => `<g transform="translate(${x} ${y})">
<path d="M-11 -40h22l-2 40h-18Z" fill="#F4EFE6" fill-opacity="0.55" stroke="${INK2}" stroke-width="1"/><path d="M-10.4 -26h20.8l-1.4 26h-18Z" fill="#9A6A44"/>
<rect x="-6" y="-24" width="7" height="7" rx="1.5" fill="#FFFFFF" fill-opacity="0.6"/><rect x="2" y="-18" width="6" height="6" rx="1.5" fill="#FFFFFF" fill-opacity="0.6"/>
<path d="M3 -52L-1 -14" stroke="#C8352B" stroke-width="2.4" stroke-linecap="round"/></g>`,
  pho: (x, y) => `<g transform="translate(${x} ${y}) scale(0.55)">${[0, 1, 2].map((i) => `<path d="M${-14 + i * 14} -16q-6 -10 0 -20t0 -20" fill="none" stroke="#9AA39C" stroke-width="2" stroke-linecap="round" opacity="0.7"/>`).join("")}
<path d="M-46 0A46 26 0 0 0 46 0Z" fill="#F4EFE6" stroke="#5B6B7E" stroke-width="1.4"/><path d="M-40 10Q0 22 40 10" fill="none" stroke="#3A5A8C" stroke-width="1.6"/>
<ellipse cx="0" cy="0" rx="46" ry="9" fill="#D9A55A" stroke="#5B6B7E" stroke-width="1.2"/><circle cx="-12" cy="-3" r="2.6" fill="#5E8A4A"/><circle cx="10" cy="-3" r="2.4" fill="#5E8A4A"/>
<path d="M-8 -28L56 8M-2 -32L62 4" stroke="#8A6E3A" stroke-width="2.4" stroke-linecap="round"/></g>`,
  // evening
  lau: (x, y) => `<g transform="translate(${x} ${y})">
${[0, 1, 2].map((i) => `<path d="M${-14 + i * 14} -30q-5 -9 0 -18t0 -18" fill="none" stroke="#C9D4CC" stroke-width="1.6" stroke-linecap="round" opacity="0.6"/>`).join("")}
<path d="M-30 -24h60l-4 22h-52Z" fill="#B8BEC2" stroke="#6E777C" stroke-width="1.2"/><ellipse cx="0" cy="-24" rx="30" ry="6" fill="#C8352B"/>
<circle cx="-12" cy="-25" r="3" fill="#E8A7B0"/><circle cx="4" cy="-26" r="2.6" fill="#5E8A4A"/><circle cx="14" cy="-24" r="2.4" fill="#F3E3B5"/>
<path d="M-34 -24h-6M34 -24h6" stroke="#6E777C" stroke-width="3" stroke-linecap="round"/><rect x="-22" y="-2" width="44" height="8" rx="2" fill="#3B433E"/><path d="M-14 6l-3 6M14 6l3 6" stroke="#3B433E" stroke-width="2"/>
<ellipse cx="0" cy="-2" rx="16" ry="2.4" fill="#FF8A3D" opacity="0.9"/></g>`,
  bia: (x, y, word) => `<g transform="translate(${x} ${y})">
<g transform="rotate(-14)"><path d="M-30 -40h20l-2 40h-16Z" fill="#E8B04A" fill-opacity="0.9" stroke="#F3E3B5" stroke-width="1"/><path d="M-31 -46h22v7h-22Z" fill="#FFFFFF" rx="3"/></g>
<g transform="rotate(14)"><path d="M10 -40h20l-2 40h-16Z" fill="#E8B04A" fill-opacity="0.9" stroke="#F3E3B5" stroke-width="1"/><path d="M9 -46h22v7h-22Z" fill="#FFFFFF"/></g>
<path d="M-4 -62l-4 -8M4 -62l4 -8M0 -64v-9" stroke="#FFE18A" stroke-width="1.6" stroke-linecap="round"/>
${word ? `<text x="0" y="-80" text-anchor="middle" font-family="Newsreader" font-style="italic" font-size="18" fill="#FFE18A">${word}</text>` : ""}</g>`,
  traDa: (x, y) => `<g transform="translate(${x} ${y})">
${[-14, 12].map((dx) => `<g transform="translate(${dx} 0)"><path d="M-9 -30h18l-2 30h-14Z" fill="#E3B866" fill-opacity="0.55" stroke="#F3E3B5" stroke-width="1"/><rect x="-5" y="-22" width="6" height="6" rx="1.4" fill="#FFFFFF" fill-opacity="0.55"/><rect x="0" y="-14" width="5" height="5" rx="1.2" fill="#FFFFFF" fill-opacity="0.55"/></g>`).join("")}
<path d="M28 -3c4 -3 10 -3 14 0" fill="none" stroke="#C9D4CC" stroke-width="1"/>${[0, 1, 2, 3, 4].map((i) => `<ellipse cx="${30 + i * 3}" cy="${-4 - (i % 2) * 2}" rx="2" ry="1.2" fill="#3B433E" stroke="#C9D4CC" stroke-width="0.5"/>`).join("")}</g>`,
  che: (x, y) => `<g transform="translate(${x} ${y})">
<path d="M-11 -44h22l-2 44h-18Z" fill="#F4EFE6" fill-opacity="0.4" stroke="#F3E3B5" stroke-width="1"/><path d="M-10.6 -12h21.2l-.6 12h-20Z" fill="#7FA36F"/><path d="M-10.8 -24h21.6l-.6 12h-20.4Z" fill="#E3C46A"/><path d="M-11 -36h22l-.4 12h-21.2Z" fill="#F3EEE2"/>
<path d="M4 -58L-2 -20" stroke="#B9AE95" stroke-width="2.4" stroke-linecap="round"/></g>`,
};
// One vignette per page, morning by day and evening at night.
function daily(page) {
  const stoolCol = NIGHT ? "#2E6DB4" : "#C8352B";
  const cap = NIGHT ? "#A9B6AE" : "#56605A";
  const V = {
    hero: NIGHT ? [stool(470, 840, stoolCol), STILL.lau(470, 838), smallCap(420, 892, "lẩu, after work", cap)]
                : [stool(470, 840, stoolCol), STILL.phin(470, 838), smallCap(418, 892, "cà phê phin, first", cap)],
    journey: NIGHT ? [stool(1240, 826, stoolCol), STILL.traDa(1232, 824), smallCap(1186, 884, "trà đá on the corner", cap)]
                   : [stool(1240, 826, stoolCol), STILL.banhMi(1240, 820), smallCap(1192, 884, "bánh mì on the way", cap)],
    record: NIGHT ? [STILL.che(150, 822), smallCap(176, 818, "chè, while I write", "#5A5F55")]
                  : [STILL.suaDa(150, 822), smallCap(176, 818, "cà phê sữa đá, while I write", "#56605A")],
    contact: NIGHT ? [STILL.bia(350, 128, "Một, hai, ba, dzô!")] : [STILL.pho(350, 118)],
  };
  return (V[page] || []).join("");
}
const boards = {};

// ---------- hero ----------
// A clothesline strung from a bamboo pole (Việt Nam) to a pine (Carolina): the line is my route, and each tag is a chapter.
// Press a small tag and it turns over to the line I'd tell you there.
{
  const lineY = (x) => { const t = (x - 76) / (1330 - 76), u = 1 - t; return u * u * 150 + 2 * u * t * 262 + t * t * 136; };
  const bamboo = (() => {
    let s = "";
    for (let y = 900; y > 120; y -= 74) s += `<path d="M64 ${y}V${y - 70}M80 ${y}V${y - 70}"/><path d="M60 ${y - 72}Q72 ${y - 78} 84 ${y - 72}" stroke-width="2"/>`;
    const leaf = (x, y, a, L) => { const ex = x + Math.cos(a) * L, ey = y + Math.sin(a) * L, nx = -Math.sin(a) * L * 0.12, ny = Math.cos(a) * L * 0.12; return `<path d="M${f(x)} ${f(y)}Q${f((x + ex) / 2 + nx)} ${f((y + ey) / 2 + ny)} ${f(ex)} ${f(ey)}Q${f((x + ex) / 2 - nx)} ${f((y + ey) / 2 - ny)} ${f(x)} ${f(y)}Z"/>`; };
    const r = rng(19); let leaves = "";
    for (let i = 0; i < 16; i++) { const y = 120 + r() * 200, side = r() > 0.4 ? 1 : -1; leaves += leaf(72, y, (side > 0 ? 0.35 : Math.PI - 0.35) + (r() - 0.5) * 0.7, 46 + r() * 30); }
    return `<g fill="none" stroke="${C.moss}" stroke-width="1.3" stroke-linecap="round">${s}</g><g fill="rgba(70,96,58,0.18)" stroke="${C.moss}" stroke-width="1">${leaves}</g>`;
  })();
  const stops = [
    { x: 236, year: "2003", place: "Kiên Giang", art: rice(52, 84, 3, 20, 4, C.moss, 44, 26), line: "Where I start. Rice, rivers, and a lot of questions." },
    { x: 426, year: "Dec 2018", place: "Taylors, SC", art: pine(75, 84, 76, C.moss), line: "I started American high school three weeks after I landed." },
    { x: 616, year: "2021", place: "USC", art: palmetto(75, 84, 48, C.moss), line: "Chemical engineering first, then computer science." },
    { x: 806, year: "2025", place: "DoorDash", art: `<g fill="none" stroke="${C.moss}" stroke-width="1.2"><rect x="44" y="30" width="62" height="40" rx="3"/><path d="M34 76H116M58 44h14M58 54h26M90 44l6 5-6 5"/></g>`, line: "Now I write software for retail data." },
  ];
  const tagW = 152;
  const small = stops.map((s, i) => {
    const top = Math.round(lineY(s.x) + 14), rot = [-3, 2, -1.5, 2.5][i];
    return `<div style="position: absolute; left: ${s.x - tagW / 2}px; top: ${top}px; width: ${tagW}px; height: 190px; perspective: 900px; transform: rotate(${rot}deg); transform-origin: ${tagW / 2}px 0">
<div onClick="{{flip${i}}}" style="position: relative; width: 100%; height: 100%; transform-style: preserve-3d; transition: transform 480ms cubic-bezier(.2,.7,.2,1); transform: {{turn${i}}}; cursor: pointer">
<div style="position: absolute; inset: 0; backface-visibility: hidden; filter: drop-shadow(0 12px 16px rgba(30,40,35,0.16))"><div style="position: relative; height: 100%; background: ${C.paper}; background-image: ${GRAIN}; color: ${C.ink}; ${TAG_CLIP}; padding: 32px 14px 12px; box-sizing: border-box">
${hole(C.ground)}
<div style="font-family: 'Courier Prime', monospace; font-size: 12px; color: ${C.muted}">${s.year}</div>
<div style="font-size: 18px; font-weight: 600; margin-top: 2px">${s.place}</div>
<svg aria-hidden="true" width="124" height="88" viewBox="0 0 150 88" style="display: block; margin-top: 6px">${s.art}</svg>
</div></div>
<div style="position: absolute; inset: 0; backface-visibility: hidden; transform: rotateY(180deg); filter: drop-shadow(0 12px 16px rgba(30,40,35,0.16))"><div style="position: relative; height: 100%; background: ${C.back}; background-image: ${GRAIN}; color: ${C.ink}; ${TAG_CLIP}; padding: 32px 14px 12px; box-sizing: border-box; display: flex; flex-direction: column">
${hole(C.ground)}
<p style="margin: 0; font-family: 'Newsreader', serif; font-style: italic; font-size: 17px; line-height: 1.3">${s.line}</p>
<span style="margin-top: auto; font-size: 13px; font-weight: 600; text-decoration: underline; text-underline-offset: 4px">Read this part</span>
</div></div>
</div>
</div>`;
  }).join("\n");
  const strings = stops.map((s) => `<path d="M${s.x} ${f(lineY(s.x))}V${f(lineY(s.x) + 26)}" stroke="${C.twine}" stroke-width="1.3"/>`).join("");
  const rows = [
    ["Name", "Thien Le"], ["Native to", "Kiên Giang, VN <span style='color: #D4A21A'>★</span>"], ["Transplanted", "Taylors, South Carolina"],
    ["Habitat", "DoorDash, retail data"], ["Formerly", "Chef, family kitchen"], ["Companions", "Two cats, Moon and Mi"],
  ];
  const qr = QR_PATHS;
  const svg = `<svg aria-hidden="true" width="1440" height="900" viewBox="0 0 1440 900" style="position: absolute; inset: 0">
${bamboo}
<path d="M80 372Q96 380 102 396" fill="none" stroke="${C.twine}" stroke-width="1.2"/>
${nonLa(104, 444, 0.9)}
<g transform="translate(1356 900) scale(2.7)">${pine(0, 0, 300, C.moss)}</g>
<path d="M76 150Q703 374 1330 136" fill="none" stroke="${C.twine}" stroke-width="2"/>
${strings}
<path d="M1140 ${f(lineY(1140))}V${f(lineY(1150) + 22)}" stroke="${C.twine}" stroke-width="1.5"/>
${ripples(560, 872, 640, 3, C.water, 3)}
${buffalo(930, 790, 0.78, NIGHT ? "#0A1012" : "#3B433E")}
${rice(640, 890, 15, 34, 11, C.moss, 70, 70)}
${cat(160, 790, 0.9, C.lineGround, C.ground)}
${daily("hero")}
</svg>`;
  boards["NatHero.dc.html"] = doc("Outdoors — hero", frame(C.ground, C.fgGround, `${svg}
${nav(C.fgGround)}
${small}
<p style="position: absolute; left: 150px; top: 416px; margin: 0; font-family: 'Newsreader', serif; font-style: italic; font-size: 18px; color: ${C.mutedGround}">This line runs from a bamboo pole to a pine. Press a tag and I'll tell you that part.</p>
<div style="position: absolute; left: 150px; top: 458px; width: 780px">
<h1 style="margin: 0; font-size: 70px; line-height: 0.98; font-weight: 600; letter-spacing: -0.025em">Just a curious kid, and this is my youth.</h1>
<p style="margin: 22px 0 0; font-size: 20px; line-height: 1.5; color: ${C.mutedGround}; max-width: 40ch">I write software for retail data at DoorDash. Before that I was a chef in my family's restaurant. Come in, I'll show you around.</p>
<div style="display: flex; gap: 20px; align-items: center; margin-top: 26px">
<a href="#" style="display: inline-flex; align-items: center; height: 52px; padding: 0 26px; background: ${C.mossDeep}; color: ${C.onControl}; font-weight: 600; font-size: 17px; text-decoration: none; border-radius: 3px">Start with where I'm from</a>
<a href="#" style="font-size: 17px; text-underline-offset: 6px">Book a call with me</a>
</div>
</div>
<div style="position: absolute; left: 950px; top: ${Math.round(lineY(1150) + 16)}px; width: 380px; transform: rotate(2deg); transform-origin: 190px 0; filter: drop-shadow(0 18px 26px rgba(30,40,35,0.16))">
<div style="position: relative; background: ${C.paper}; background-image: ${GRAIN}; color: ${C.ink}; ${TAG_CLIP}; padding: 40px 24px 126px; font-family: 'Courier Prime', monospace; font-size: 13.5px; line-height: 1.75">
${hole(C.ground)}
<div style="display: flex; justify-content: space-between; font-weight: 700"><span>Field tag No. 001</span><span>That's me</span></div>
<div style="border-top: 1.5px dashed ${C.ink}; margin: 10px 0"></div>
<div style="display: grid; grid-template-columns: 104px 1fr">
${rows.map(([k, v]) => `<span style="color: ${C.muted}">${k}</span><span>${v}</span>`).join("\n")}
</div>
<div style="border-top: 1.5px dashed ${C.ink}; margin: 10px 0"></div>
<div style="display: grid; grid-template-columns: 104px 1fr; font-weight: 700"><span>Status</span><span>Still growing</span></div>
<a href="https://www.linkedin.com/in/thienle210303" aria-label="My LinkedIn, scan or click" style="position: absolute; left: 26px; bottom: 16px; display: flex; flex-direction: column; gap: 5px; text-decoration: none"><svg width="72" height="72" viewBox="-1 -1 31 31" shape-rendering="crispEdges" style="background: #FBFBF8">${qr}</svg><span style="font-size: 12px; color: ${C.muted}">My LinkedIn</span></a>
<div style="position: absolute; right: 24px; bottom: 40px; transform: rotate(-6deg); border: 2.5px solid #C8102E; color: #C8102E; padding: 4px 10px; font-weight: 700; font-size: 15px; letter-spacing: 0.04em; opacity: 0.9">PRACTICE MAKES AI.</div>
</div>
</div>
<p style="position: absolute; left: 304px; top: 852px; margin: 0; font-family: 'Newsreader', serif; font-style: italic; font-size: 16px; color: ${C.mutedGround}">Moon, off duty</p>`, [880, 120], 1),
  `state = { open: -1 };
renderVals() {
const v = {};
for (let i = 0; i < 4; i++) {
v['turn' + i] = this.state.open === i ? 'rotateY(180deg)' : 'rotateY(0deg)';
v['flip' + i] = () => this.setState({ open: this.state.open === i ? -1 : i });
}
return v;
}`);
}

// ---------- earth ----------
// Same lichen and moss as the other sections; Vietnam is one small flag on Kiên Giang's pin.
{
  const R = 250, cx = 360, cy = 540;
  const star = (x, y, r, fill) => { let d = ""; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.382 : r; d += (i ? "L" : "M") + f(x + rr * Math.cos(a)) + " " + f(y + rr * Math.sin(a)); } return `<path d="${d}Z" fill="${fill}"/>`; };
  const r = rng(77); let traces = "";
  for (let y = cy - R + 18; y < cy + R; y += 22) {
    const x0 = cx - R + r() * 60, jx = x0 + 60 + r() * 220, dy = (r() > 0.5 ? 1 : -1) * 11, x1 = jx + 40 + r() * 200;
    traces += `<path d="M${f(x0)} ${y}H${f(jx)}l11 ${dy}H${f(x1)}"/><circle cx="${f(x1)}" cy="${y + dy}" r="2.4" fill="rgba(29,35,33,0.16)" stroke="none"/>`;
  }
  const line = "rgba(70,96,58,0.45)";
  const svg = `<svg aria-hidden="true" width="1440" height="900" viewBox="0 0 1440 900" style="position: absolute; inset: 0">
<defs>
<radialGradient id="orb" cx="38%" cy="34%" r="75%"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#D9E0D6"/></radialGradient>
<clipPath id="g"><circle cx="${cx}" cy="${cy}" r="${R}"/></clipPath>
</defs>
<circle cx="${cx}" cy="${cy}" r="${R}" fill="url(#orb)"/>
<g clip-path="url(#g)">
<g fill="none" stroke="rgba(29,35,33,0.13)" stroke-width="1">${traces}</g>
${island(255, 445, 64, 5, 5, "#C5D3BA", line)}
${island(500, 640, 70, 5, 9, "#C5D3BA", line)}
<path d="M270 470C300 300 520 330 486 614" fill="none" stroke="${C.red}" stroke-width="1.8" stroke-dasharray="1 7" stroke-linecap="round"/>
${[0.22, 0.48, 0.74].map((t) => { const u = 1 - t, x = u*u*u*270 + 3*u*u*t*300 + 3*u*t*t*520 + t*t*t*486, y = u*u*u*470 + 3*u*u*t*300 + 3*u*t*t*330 + t*t*t*614; return `<rect x="${f(x - 3)}" y="${f(y - 3)}" width="6" height="6" fill="${C.ink}"/>`; }).join("")}
</g>
<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${C.ink}" stroke-width="1.2"/>
<path d="M270 470V420" stroke="${C.ink}" stroke-width="1.5"/>
<rect x="270" y="420" width="36" height="24" fill="#DA251D"/>
${star(288, 432.5, 7.5, "#FFDD00")}
<circle cx="270" cy="470" r="4" fill="${C.ink}"/>
<circle cx="486" cy="614" r="10" fill="none" stroke="${C.red}" stroke-width="1.5"/><circle cx="486" cy="614" r="4" fill="${C.red}"/>
<circle cx="520" cy="650" r="4" fill="${C.ink}"/>
<rect x="396" y="292" width="98" height="22" fill="${C.paper}" stroke="${C.hair}"/>
<text x="445" y="308" text-anchor="middle" font-family="Courier Prime" font-size="13" fill="${C.ink}">14,960 km</text>
<path d="M700 226Q1050 262 1400 218" fill="none" stroke="${C.twine}" stroke-width="2"/>
${ripples(980, 820, 460, 6, C.water, 21)}
${heron(1250, 618, 1, C.muted)}
</svg>`;
  const stops = [
    { d: "2003–2018", place: "Kiên Giang, Việt Nam", cap: "Where it starts.", art: rice(55, 128, 4, 22, 4, C.moss, 70, 40), rot: -2, top: 252, on: false },
    { d: "December 2018", place: "Taylors, South Carolina", cap: "Started American high school three weeks after I landed.", art: pine(80, 128, 112, C.moss), rot: 1.5, top: 262, on: true },
    { d: "2021–2025", place: "University of South Carolina", cap: "Chemical engineering first, then computer science.", art: palmetto(80, 128, 70, C.moss), rot: -1, top: 250, on: false },
  ];
  const tags = stops.map((s, i) => `<div style="position: absolute; left: ${720 + i * 230}px; top: ${s.top}px; width: 204px; transform: rotate(${s.rot}deg); transform-origin: 102px 0; filter: drop-shadow(0 16px 22px rgba(30,40,35,0.18))">
<div style="position: relative; background: ${C.paper}; color: ${C.ink}; ${TAG_CLIP}; padding: 38px 20px 22px; ${s.on ? `box-shadow: inset 0 0 0 2px ${C.red};` : ""}">
${hole(C.ground)}
<div style="display: flex; justify-content: space-between; font-family: 'Courier Prime', monospace; font-size: 13px; color: ${C.muted}"><span>Stop ${i + 1}</span><span>${s.d}</span></div>
<svg aria-hidden="true" width="160" height="134" viewBox="0 0 160 134" style="display: block; margin: 6px auto 0">${s.art}</svg>
<div style="font-size: 21px; font-weight: 600; line-height: 1.15; margin-top: 8px">${s.place}</div>
<p style="margin: 6px 0 0; font-size: 15px; line-height: 1.45; color: ${C.muted}">${s.cap}</p>
</div>
</div>`).join("\n");
  boards["NatEarth.dc.html"] = doc("Outdoors — origin", frame(C.ground, C.ink, `${svg}
<h2 style="position: absolute; left: 96px; top: 72px; margin: 0; font-size: 60px; font-weight: 600; letter-spacing: -0.02em">One crossing, three stops.</h2>
<p style="position: absolute; left: 96px; top: 154px; margin: 0; font-family: 'Newsreader', serif; font-style: italic; font-size: 21px; color: ${C.muted}">Press a stop and I'll turn the globe there.</p>
${tags}
<button type="button" style="position: absolute; left: 720px; top: 660px; height: 50px; padding: 0 24px; border: 1.5px solid ${C.ink}; border-radius: 3px; background: transparent; color: ${C.ink}; font: inherit; font-size: 16px; font-weight: 600">Replay the flight</button>`));
}

// ---------- journey ----------
{
  const limbs = [
    { p: [[290, 900], [270, 790], [322, 660], [305, 560]], w0: 66, w1: 40, twigs: 0 },
    { p: [[300, 584], [230, 540], [140, 522], [40, 474]], w0: 26, w1: 5, moss: 3 },
    { p: [[300, 566], [280, 462], [222, 382], [168, 300]], w0: 24, w1: 5, moss: 1 },
    { p: [[310, 562], [350, 462], [400, 382], [452, 296]], w0: 22, w1: 5 },
    { p: [[312, 578], [460, 470], [700, 362], [1000, 334]], w0: 30, w1: 8, twigs: 10, moss: 4 },
    { p: [[985, 335], [1120, 320], [1260, 302], [1450, 298]], w0: 9, w1: 3, twigs: 7, moss: 3 },
    { p: [[620, 420], [650, 350], [700, 292], [762, 236]], w0: 12, w1: 3, twigs: 5 },
    { p: [[1150, 316], [1180, 272], [1220, 242], [1282, 214]], w0: 6, w1: 2, twigs: 4 },
    { p: [[800, 350], [860, 372], [900, 400], [944, 432]], w0: 7, w1: 2, twigs: 4, moss: 1 },
  ];
  const yAt = (L, x) => { let lo = 0, hi = 1; for (let k = 0; k < 40; k++) { const m = (lo + hi) / 2; if (cubic(L.p, m)[0] < x) lo = m; else hi = m; } return cubic(L.p, lo)[1]; };
  const items = [
    ["17h → 3m", "DoorDash", "2025", "Reverse engineering scraper"],
    ["99.9%", "Wordification", "2024", "Speech QA pipeline, validated audio accuracy."],
    ["96%", "Schaeffler", "2024", "Throughput lift from custom Java in low-code."],
    ["3M+", "USC research", "2022", "Amazon and Kroger records, unattended for months."],
    ["200+", "USC teaching", "2023", "Students helped in open lab."],
  ];
  const xs = [520, 720, 920, 1120, 1320], drops = [8, 40, 96, 52, 84], rots = [-2.5, 1.5, -1, 2, -1.5];
  let strings = "", tags = "", tag0;
  items.forEach(([n, org, yr, line], i) => {
    const x = xs[i], ly = yAt(xs[i] < 990 ? limbs[4] : limbs[5], x), top = Math.round(ly + drops[i]);
    strings += `<path d="M${x} ${f(ly)}L${x} ${top + 18}" stroke="${C.twine}" stroke-width="1.4"/>`;
    const half = (num, yr, sub, desc) => `<div style="display: flex; align-items: baseline; justify-content: space-between"><span style="font-size: 30px; font-weight: 600; letter-spacing: -0.02em; line-height: 1; white-space: nowrap">${num}</span><span style="font-family: 'Courier Prime', monospace; font-size: 12.5px; color: ${C.muted}">${yr}</span></div>
<div style="font-family: 'Courier Prime', monospace; font-size: 11px; margin-top: 7px; white-space: nowrap; color: ${C.mossPaper}">${sub}</div>
<p style="margin: 6px 0 0; font-size: 14px; line-height: 1.38; color: ${C.muted}">${desc}</p>`;
    if (i === 0) {
      // DoorDash: one ticket, the 2025 result above a tear-off stub for 2026.
      tags += `<div style="position: absolute; left: ${x - 118}px; top: ${top}px; width: 210px; transform: rotate(${rots[i]}deg); transform-origin: 118px 18px; filter: drop-shadow(0 14px 20px rgba(30,40,35,0.18))">
<div style="position: relative; background: ${C.paper}; background-image: ${GRAIN}; color: ${C.ink}; ${TAG_CLIP}; padding: 34px 18px 18px">
${hole(C.ground)}
<div style="font-size: 15px; font-weight: 600; margin-bottom: 10px">DoorDash</div>
${half("17h → 3m", "2025", "3.9% → 0% error", "Reverse engineering scraper")}
<div style="position: relative; margin: 16px -18px 0; border-top: 1.5px dashed ${C.hair}"><span style="position: absolute; left: -7px; top: -7.5px; width: 14px; height: 14px; border-radius: 50%; background: ${C.ground}"></span><span style="position: absolute; right: -7px; top: -7.5px; width: 14px; height: 14px; border-radius: 50%; background: ${C.ground}"></span></div>
<div style="padding-top: 14px">${half("2 → 25", "2026", "onboarded merchants/month", "An agent-driven workflow that adapts to every merchant")}</div>
</div>
</div>`;
    } else {
    tags += `<div style="position: absolute; left: ${x - 88}px; top: ${top}px; width: 176px; transform: rotate(${rots[i]}deg); transform-origin: 88px 18px; filter: drop-shadow(0 14px 20px rgba(30,40,35,0.18))">
<div style="position: relative; background: ${C.paper}; background-image: ${GRAIN}; color: ${C.ink}; ${TAG_CLIP}; padding: 36px 18px 20px">
${hole(C.ground)}
<div style="font-size: 32px; font-weight: 600; letter-spacing: -0.02em; line-height: 1; white-space: nowrap">${n}</div>
<div style="display: flex; justify-content: space-between; margin-top: 12px; font-size: 15px; font-weight: 600"><span>${org}</span><span style="font-family: 'Courier Prime', monospace; font-weight: 400; color: ${C.muted}">${yr}</span></div>
<p style="margin: 6px 0 0; font-size: 14px; line-height: 1.42; color: ${C.muted}">${line}</p>
</div>
</div>`;
    }
    if (i === 0) tag0 = { x, top, rot: rots[i], h: 178 };
  });
  const svg = `<svg aria-hidden="true" width="1440" height="900" viewBox="0 0 1440 900" style="position: absolute; inset: 0">
${HOI_DEFS("#C8352B")}
${oak(limbs, 7, { twig: 46 })}
<path d="M152 512V546" stroke="${C.twine}" stroke-width="1.2"/>
${hoiAn(152, 552, "#C8352B", 1)}
<path d="M0 896H1440" stroke="${C.lineGround}" stroke-width="1"/>
${rice(330, 896, 7, 22, 31, C.moss, 26, 22)}
${daily("journey")}
${strings}
</svg>`;
  boards["NatJourney.dc.html"] = doc("Outdoors — the work", frame(C.ground, C.fgGround, `${svg}
<h2 style="position: absolute; left: 96px; top: 64px; margin: 0; font-size: 56px; font-weight: 600; letter-spacing: -0.02em">The work, as it grew.</h2>
<p style="position: absolute; left: 96px; top: 140px; margin: 0; font-family: 'Newsreader', serif; font-style: italic; font-size: 21px; color: ${C.mutedGround}">Every job I've had is a branch and every tool I used is a leaf. Each tag holds what I measured there.</p>
${tags}
<a href="#" style="position: absolute; left: 40px; top: 790px; display: inline-flex; align-items: center; height: 50px; padding: 0 24px; background: ${C.mossDeep}; color: ${C.onControl}; font-weight: 600; font-size: 16px; text-decoration: none; border-radius: 3px">Watch it grow</a>`));
}

// ---------- contact ----------
{
  const field = (label, extra = "") => `<label style="display: flex; flex-direction: column; gap: 5px; font-size: 14px; font-weight: 600${extra}">${label}<input style="height: 44px; border: 1.5px solid ${C.ink}; border-radius: 3px; padding: 0 12px; font: inherit; font-weight: 400; background: ${C.paper}"></label>`;
  const svg = `<svg aria-hidden="true" width="1440" height="900" viewBox="0 0 1440 900" style="position: absolute; inset: 0">
${fern(70, 905, 230, -78, 3, C.moss)}
${fern(150, 905, 170, -62, 8, C.moss, 20)}
${fern(30, 905, 150, -104, 13, C.moss, 18)}
${cat(300, 790, 0.82, C.lineGround, C.ground)}
${cat(420, 796, 0.74, C.lineGround, C.ground)}
${ripples(860, 840, 520, 4, C.water, 41)}
</svg>`;
  // The live site's business card, monogram watermark restored.
  const corner = (pos) => `<span style="position: absolute; ${pos}; width: 10px; height: 10px; border: 0 solid ${C.muted}"></span>`;
  const front = `<div onClick="{{flip}}" style="position: absolute; inset: 0; backface-visibility: hidden; background: ${C.paper}; padding: 12px; box-sizing: border-box; box-shadow: 0 22px 40px rgba(30,40,35,0.18); cursor: pointer; overflow: hidden">
<p aria-hidden="true" style="position: absolute; right: 22px; bottom: -34px; margin: 0; font-size: 210px; font-weight: 600; letter-spacing: -0.02em; line-height: 0.8; color: ${C.ink}; opacity: 0.07; pointer-events: none">TL</p>
<div style="position: relative; height: 100%; box-sizing: border-box; border: 1px solid ${C.hair}; padding: 26px 28px; display: flex; flex-direction: column">
${corner("left: -7px; top: -7px; border-left-width: 1px; border-top-width: 1px")}${corner("right: -7px; top: -7px; border-right-width: 1px; border-top-width: 1px")}${corner("left: -7px; bottom: -7px; border-left-width: 1px; border-bottom-width: 1px")}${corner("right: -7px; bottom: -7px; border-right-width: 1px; border-bottom-width: 1px")}
<div style="font-size: 26px; font-weight: 600">Thien Le</div>
<div style="font-family: 'Courier Prime', monospace; font-size: 14px; letter-spacing: 0.14em; color: ${C.muted}; margin-top: 4px">SOFTWARE ENGINEER</div>
<div style="font-size: 15px; color: ${C.muted}; margin-top: 6px">Taylors, South Carolina</div>
<p style="margin: 16px 0 0; font-family: 'Newsreader', serif; font-style: italic; font-size: 18px">“Unsolved is not the same as unsolvable.”</p>
<div style="position: relative; height: 1px; background: ${C.hair}; margin: 22px 0 18px"><span style="position: absolute; left: 50%; top: -4px; width: 7px; height: 7px; margin-left: -4px; transform: rotate(45deg); background: ${C.paper}; border: 1px solid ${C.hair}"></span></div>
<div style="display: flex; justify-content: space-between; align-items: center; font-family: 'Courier Prime', monospace; font-size: 15px"><a href="#" style="text-decoration: none">thienle210303@gmail.com</a><span aria-label="Copy email" style="display: inline-flex; width: 32px; height: 32px; align-items: center; justify-content: center; border: 1px solid ${C.hair}"><svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="${C.ink}" stroke-width="1.2"><rect x="4.5" y="4.5" width="8" height="8"/><path d="M9.5 2.5V1.5h-8v8h1"/></svg></span></div>
<div style="display: grid; grid-template-columns: 84px 1fr; row-gap: 12px; margin-top: 16px; font-family: 'Courier Prime', monospace; font-size: 15px"><span style="color: ${C.muted}">GitHub</span><a href="#" style="text-decoration: none">thienle210303</a><span style="color: ${C.muted}">LinkedIn</span><a href="#" style="text-decoration: none">in/thienle210303</a></div>
<div style="display: flex; align-items: center; gap: 20px; margin-top: auto; font-size: 15px"><a href="#" style="text-decoration: none">Résumé</a><a href="#" style="text-decoration: none">Save contact</a><button type="button" style="margin-left: auto; height: 44px; padding: 0 18px; border: 1px solid ${C.ink}; border-radius: 0; background: ${C.paper}; font: inherit; font-size: 15px; cursor: pointer">Let me reach you</button></div>
</div>
</div>`;
  const back = `<div style="position: absolute; inset: 0; backface-visibility: hidden; transform: rotateY(180deg); background: ${C.back}; padding: 14px; box-sizing: border-box; box-shadow: 0 22px 40px rgba(30,40,35,0.18)">
<div style="height: 100%; box-sizing: border-box; border: 1px solid ${C.ink}; padding: 26px 34px; display: flex; flex-direction: column; gap: 12px">
<p style="margin: 0; font-family: 'Newsreader', serif; font-style: italic; font-size: 26px">Leave a way to reach you</p>
${field("Name")}
<div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px">${field("Email")}${field("or phone")}</div>
<div style="display: flex; gap: 12px; margin-top: 4px">
<button type="button" style="height: 46px; padding: 0 26px; border: 0; border-radius: 3px; background: ${C.mossDeep}; color: ${C.onControl}; font: inherit; font-weight: 600; font-size: 15px">Send</button>
<button type="button" onClick="{{flip}}" style="height: 46px; padding: 0 22px; border: 1.5px solid ${C.ink}; border-radius: 3px; background: transparent; font: inherit; font-weight: 600; font-size: 15px; cursor: pointer">Back</button>
</div>
</div>
</div>`;
  boards["NatContact.dc.html"] = doc("Outdoors — say hi", frame(C.ground, C.ink, `${svg}
<h2 style="position: absolute; left: 96px; top: 72px; margin: 0; font-size: 64px; font-weight: 600; letter-spacing: -0.02em">Say hi.</h2>
<p style="position: absolute; left: 96px; top: 156px; margin: 0; font-family: 'Newsreader', serif; font-style: italic; font-size: 21px; color: ${C.muted}">Ask me something, or leave me a way to reach you.</p>
<div style="position: absolute; left: 96px; top: 216px; width: 540px; box-sizing: border-box; background: ${C.paper}; border: 1px solid ${C.hair}; border-radius: 3px; padding: 26px; display: flex; flex-direction: column; gap: 14px">
<p style="margin: 0; align-self: flex-end; background: ${C.mossDeep}; color: ${C.onControl}; padding: 10px 14px; border-radius: 3px; font-size: 16px">What are your cats called?</p>
<p style="margin: 0; font-size: 16px; line-height: 1.55">Moon and Mi. They're the two walking around this page.</p>
<div style="display: flex; flex-wrap: wrap; gap: 8px">
<button type="button" style="height: 40px; padding: 0 14px; border: 1px solid ${C.ink}; border-radius: 3px; background: transparent; font: inherit; font-size: 14px">What do you do at DoorDash?</button>
<button type="button" style="height: 40px; padding: 0 14px; border: 1px solid ${C.ink}; border-radius: 3px; background: transparent; font: inherit; font-size: 14px">Where are you from?</button>
</div>
<label for="q" style="font-size: 14px; font-weight: 600; margin-top: 4px">Your question</label>
<div style="display: flex; gap: 10px"><input id="q" placeholder="Where did you study?" style="flex: 1; height: 46px; border: 1.5px solid ${C.ink}; border-radius: 3px; padding: 0 14px; font: inherit; font-size: 16px"><button type="button" style="height: 46px; padding: 0 20px; border: 0; border-radius: 3px; background: ${C.ink}; color: ${C.card}; font: inherit; font-weight: 600">Ask</button></div>
</div>
<p style="position: absolute; left: 300px; top: 872px; margin: 0; font-family: 'Courier Prime', monospace; font-size: 13px; color: ${C.muted}">Two cats reviewed this code. Both approved.</p>
<div style="position: absolute; left: 820px; top: 200px; width: 470px; height: 480px; perspective: 1400px">
<div style="position: relative; width: 100%; height: 100%; transform-style: preserve-3d; transition: transform 520ms cubic-bezier(.2,.7,.2,1); transform: {{turn}}">
${front}
${back}
</div>
</div>
<p style="position: absolute; left: 820px; top: 708px; margin: 0; font-family: 'Newsreader', serif; font-style: italic; font-size: 19px; color: ${C.muted}">Press the card and it turns over.</p>`),
  `state = { flipped: false };
renderVals() {
return {
turn: this.state.flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
flip: (e) => { if (e && e.target && e.target.closest && e.target.closest('a')) return; this.setState({ flipped: !this.state.flipped }); }
};
}`);
}

// ---------- the whole record ----------
// Every career entry from src/content/portfolio.ts (newest first) plus the three certifications.
{
  const rows = [
    ["Oct 2025 – now", "Software Engineer", "DoorDash, Inc.", "Work"],
    ["May 2025", "Graduated, B.S. Computer Science", "University of South Carolina", "Milestone"],
    ["May 2025", "Automotive GenAI Capstone", "University of South Carolina", "Milestone"],
    ["May 2025", "LLM Reviewer Classification", "Coursework project", "Milestone"],
    ["May 2024 – May 2025", "Software Engineer", "Wordification by ScholarsTech LLC", "Work"],
    ["2024 – 2025", "Magellan Research Award, TRIO", "University of South Carolina", "Milestone"],
    ["May – Aug 2024", "Software Engineer Co-op", "Schaeffler Group", "Work"],
    ["Apr 2024", "Best Design, MentorHub", "CockyHacks, ACM@USC", "Milestone"],
    ["2024", "Webmaster", "ACM@USC", "Milestone"],
    ["Aug 2023 – May 2025", "Honors Teaching Assistant", "University of South Carolina", "Work"],
    ["Aug 2023 – May 2025", "Undergraduate Teaching Assistant", "University of South Carolina", "Work"],
    ["Apr 2023", "2nd Place, Food Route", "Code to Give Hackathon, Morgan Stanley", "Milestone"],
    ["Aug 2022 – May 2025", "Web Scraping Engineer", "University of South Carolina", "Work"],
  ];
  const kindColor = { Work: C.mossDeep, Study: "#2A5D6B", Milestone: C.red };
  const certs = [["Technology Academy", "AT&T", -2], ["Software Engineering", "JPMorgan", 1.5], ["Token Service Technology", "VISA", -1]];
  const chips = [["All", 20, true], ["Work", 7], ["Study", 4], ["Milestones", 9]].map(([l, n, on]) => `<span style="display: inline-flex; gap: 8px; align-items: center; height: 36px; padding: 0 14px; border: 1.5px solid ${C.ink}; border-radius: 18px; font-size: 14px; font-weight: 600; ${on ? `background: ${C.ink}; color: ${C.card};` : ""}">${l}<span style="font-family: 'Courier Prime', monospace; font-weight: 400">${n}</span></span>`).join("");
  const ledger = rows.map(([d, what, where, k]) => `<div style="display: grid; grid-template-columns: 150px 1fr 250px 84px; gap: 16px; align-items: baseline; height: 38px; line-height: 38px; border-bottom: 1px solid #DCE3E8; font-size: 15px; white-space: nowrap; overflow: hidden">
<span style="font-family: 'Courier Prime', monospace; font-size: 13px; color: ${C.muted}">${d}</span><span style="font-weight: 600; overflow: hidden; text-overflow: ellipsis">${what}</span><span style="color: ${C.muted}; overflow: hidden; text-overflow: ellipsis">${where}</span><span style="font-family: 'Courier Prime', monospace; font-size: 12px; color: ${kindColor[k]}">${k}</span>
</div>`).join("\n");
  const certTags = certs.map(([n, by, rot], i) => `<div style="position: absolute; left: 1060px; top: ${300 + i * 150}px; width: 270px; transform: rotate(${rot}deg); transform-origin: 0 50%; filter: drop-shadow(0 12px 18px rgba(30,40,35,0.16))">
<div style="position: relative; background: ${C.paper}; clip-path: polygon(22px 0, 100% 0, 100% 100%, 22px 100%, 0 50%); padding: 18px 20px 18px 44px">
<div style="position: absolute; left: 14px; top: 50%; width: 10px; height: 10px; margin-top: -5px; border-radius: 50%; background: ${C.ground}; box-shadow: inset 0 0 0 1.5px #B9AE95"></div>
<div style="font-family: 'Courier Prime', monospace; font-size: 13px; color: ${C.muted}">${by}</div>
<div style="font-size: 18px; font-weight: 600; margin-top: 4px">${n}</div>
</div>
</div>`).join("\n");
  const svg = `<svg aria-hidden="true" width="1440" height="900" viewBox="0 0 1440 900" style="position: absolute; inset: 0">
<path d="M1040 230V860" stroke="${C.twine}" stroke-width="2"/>
${[0, 1, 2].map((i) => `<path d="M1040 ${336 + i * 150}H1074" stroke="${C.twine}" stroke-width="1.4"/>`).join("")}
${fern(1380, 905, 160, -100, 5, C.moss, 18)}
</svg>`;
  boards["NatRecord.dc.html"] = doc("Outdoors — the whole record", frame(C.ground, C.ink, `${svg}
<h2 style="position: absolute; left: 96px; top: 64px; margin: 0; font-size: 56px; font-weight: 600; letter-spacing: -0.02em">The whole record.</h2>
<p style="position: absolute; left: 96px; top: 140px; margin: 0; font-family: 'Newsreader', serif; font-style: italic; font-size: 21px; color: ${C.muted}">Every job, class, award and certificate I have, newest first. The tree shows my highlights.</p>
<div style="position: absolute; left: 96px; top: 196px; display: flex; gap: 10px">${chips}</div>
<div style="position: absolute; left: 96px; top: 252px; width: 920px; box-sizing: border-box; background: ${C.paper}; box-shadow: 0 16px 30px rgba(30,40,35,0.12); padding: 10px 28px 18px 64px">
<div style="position: absolute; left: 44px; top: 0; bottom: 0; width: 1.5px; background: rgba(200,16,46,0.45)"></div>
<div style="display: grid; grid-template-columns: 150px 1fr 250px 84px; gap: 16px; height: 34px; line-height: 34px; border-bottom: 1.5px solid ${C.ink}; font-family: 'Courier Prime', monospace; font-size: 13px; color: ${C.muted}"><span>When</span><span>What</span><span>Where</span><span>Kind</span></div>
${ledger}
<div style="display: flex; justify-content: space-between; align-items: center; padding-top: 14px; font-size: 15px">
<a href="#" style="font-weight: 600; text-underline-offset: 5px">Show all 20</a>
<a href="#" style="font-weight: 600; text-underline-offset: 5px">Open the résumé</a>
</div>
</div>
<h3 style="position: absolute; left: 1060px; top: 230px; margin: 0; font-size: 22px; font-weight: 600">Certificates</h3>
${certTags}`));
}

// ---------- record, idea A: tree rings ----------
// One ring per year by start date; ring width grows with that year's entry count (2020 has none, so it is thin).
const YEARS = [
  [2018, [["High school", "Eastside High School", "Study"]]],
  [2019, [["Chef and server", "Fu of Kyoto", "Work"], ["Whatever I felt like learning", "No institution", "Study"]]],
  [2020, []],
  [2021, [["B.S. Computer Science", "University of South Carolina", "Study"], ["Chemical engineering", "University of South Carolina", "Study"], ["Dean's List", "University of South Carolina", "Milestone"]]],
  [2022, [["Web Scraping Engineer", "University of South Carolina", "Work"], ["Switched to computer science", "University of South Carolina", "Milestone"]]],
  [2023, [["Undergraduate Teaching Assistant", "University of South Carolina", "Work"], ["Honors Teaching Assistant", "University of South Carolina", "Work"], ["2nd Place, Food Route", "Code to Give Hackathon, Morgan Stanley", "Milestone", "star"]]],
  [2024, [["Software Engineer", "Wordification by ScholarsTech LLC", "Work"], ["Software Engineer Co-op", "Schaeffler Group", "Work"], ["Best Design, MentorHub", "CockyHacks, ACM@USC", "Milestone", "star"], ["Magellan Research Award, TRIO", "University of South Carolina", "Milestone", "star"], ["Webmaster", "ACM@USC", "Milestone"]]],
  [2025, [["Software Engineer", "DoorDash, Inc.", "Work", "star"], ["Graduated, B.S. Computer Science", "University of South Carolina", "Milestone", "star"], ["Automotive GenAI Capstone", "University of South Carolina", "Milestone"], ["LLM Reviewer Classification", "Coursework project", "Milestone"]]],
];
const KIND = { Work: NIGHT ? "#3F5E35" : C.mossDeep, Study: "#2A5D6B", Milestone: C.red };
const CERTS = [["AT&T", "Technology Academy"], ["JPMorgan", "Software Engineering"], ["VISA", "Token Service Technology"]];
function stamp(issuer, course, w, h, ground, art) {
  return `<div style="width: ${w}px; height: ${h}px; box-sizing: border-box; background-color: ${C.paper}; background-image: radial-gradient(circle, ${ground} 3.6px, transparent 4.1px); background-size: 13px 13px; background-position: -6.5px -6.5px; position: relative; filter: drop-shadow(0 8px 12px rgba(30,40,35,0.18))">
<div style="position: absolute; inset: 7px; background: ${C.paper}; border: 1px solid ${C.hair}; padding: 12px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden">
<svg aria-hidden="true" width="${w - 40}" height="${h - 110}" viewBox="0 0 ${w - 40} ${h - 110}" style="display: block">${art}</svg>
<div><div style="font-size: 22px; font-weight: 600; letter-spacing: -0.01em; line-height: 1">${issuer}</div><div style="font-size: 12px; line-height: 1.3; color: ${C.muted}; margin-top: 4px">${course}</div></div>
</div>
</div>`;
}
const stampArt = [
  (w, h) => rice(w / 2 - 22, h, 3, 22, 9, C.moss, h * 0.55, h * 0.3),
  (w, h) => pine(w / 2, h, h * 0.95, C.moss),
  (w, h) => fern(w / 2 + 8, h + 2, h * 0.95, -98, 17, C.moss, 12),
];
{
  const cx = 420, cy = 500, r = rng(5);
  let radius = 16, rings = "", dots = "", leaders = "", yearMarks = "";
  const featured = [];
  YEARS.forEach(([year, items], yi) => {
    const w = 14 + 9 * items.length, inner = radius, outer = radius + w;
    const ph = [r() * 6.28, r() * 6.28];
    const ringPath = (rad) => { let d = ""; for (let a = 0; a <= 360; a += 3) { const th = (a * Math.PI) / 180, rr = rad * (1 + 0.025 * Math.sin(3 * th + ph[0]) + 0.015 * Math.sin(7 * th + ph[1])); d += (a ? "L" : "M") + f(cx + rr * Math.cos(th)) + " " + f(cy + rr * Math.sin(th)); } return d + "Z"; };
    rings = `<path d="${ringPath(outer)}" fill="${yi % 2 ? "#E6D6B6" : "#EEE2C9"}" stroke="#B79C74" stroke-width="${year === 2024 ? 0 : 1.1}"/>` + rings;
    if (year === 2024) rings = `<path d="${ringPath(outer)}" fill="none" stroke="${C.red}" stroke-width="2.2"/>` + rings;
    const mid = (inner + outer) / 2;
    items.forEach(([title, org, kind, star], i) => {
      const a = star ? (-50 + featured.length * 22) * Math.PI / 180 : (110 + (i * 300) / Math.max(items.length, 1) + yi * 23) * Math.PI / 180;
      const x = cx + mid * Math.cos(a), y = cy + mid * Math.sin(a);
      dots += `<circle cx="${f(x)}" cy="${f(y)}" r="${star ? 6.5 : 4.5}" fill="${KIND[kind]}" stroke="${C.paper}" stroke-width="1.5"/>`;
      if (star) featured.push({ x, y, title, org, kind, year });
    });
    yearMarks += `<text x="${f(cx - mid)}" y="${cy + 4}" text-anchor="middle" font-family="Courier Prime" font-size="11" fill="${C.ink}" style="paint-order: stroke" stroke="${yi % 2 ? "#E6D6B6" : "#EEE2C9"}" stroke-width="3">${String(year).slice(2)}</text>`;
    radius = outer;
  });
  rings = `<circle cx="${cx}" cy="${cy}" r="${radius + 10}" fill="#6B5640"/><circle cx="${cx}" cy="${cy}" r="${radius + 4}" fill="#8A7154"/>` + rings + `<circle cx="${cx}" cy="${cy}" r="6" fill="#B79C74"/>`;
  // cracks, to read as cut wood
  rings += `<path d="M${cx + 30} ${cy - 8}L${cx + 90} ${cy - 26}L${cx + 120} ${cy - 22}M${cx - 40} ${cy + 30}L${cx - 96} ${cy + 70}" stroke="#A88C66" stroke-width="1.2" fill="none"/>`;
  const tagX = 840;
  featured.sort((p, q) => p.y - q.y).forEach((p, i) => { p.ty = 170 + i * 128; });
  let tags = "";
  featured.forEach((p) => {
    leaders += `<path d="M${f(p.x)} ${f(p.y)}C${f(p.x + 120)} ${f(p.y)} ${tagX - 120} ${p.ty + 44} ${tagX} ${p.ty + 44}" fill="none" stroke="${C.twine}" stroke-width="1.4"/>`;
    tags += `<div style="position: absolute; left: ${tagX}px; top: ${p.ty}px; width: 320px; filter: drop-shadow(0 10px 16px rgba(30,40,35,0.16))">
<div style="position: relative; background: ${C.paper}; clip-path: polygon(22px 0, 100% 0, 100% 100%, 22px 100%, 0 50%); padding: 14px 18px 14px 40px">
<div style="position: absolute; left: 12px; top: 50%; width: 10px; height: 10px; margin-top: -5px; border-radius: 50%; background: ${C.ground}; box-shadow: inset 0 0 0 1.5px #B9AE95"></div>
<div style="display: flex; justify-content: space-between; font-family: 'Courier Prime', monospace; font-size: 12px; color: ${KIND[p.kind]}"><span>${p.kind}</span><span style="color: ${C.muted}">${p.year}</span></div>
<div style="font-size: 18px; font-weight: 600; margin-top: 2px">${p.title}</div>
<div style="font-size: 14px; color: ${C.muted}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">${p.org}</div>
</div>
</div>`;
  });
  const legend = Object.entries(KIND).map(([k, c]) => `<span style="display: inline-flex; align-items: center; gap: 7px"><span style="width: 10px; height: 10px; border-radius: 50%; background: ${c}"></span>${k} ${YEARS.flatMap(([, it]) => it).filter((e) => e[2] === k).length}</span>`).join("");
  const stamps = CERTS.map(([iss, c], i) => `<div style="position: absolute; left: ${1196 + (i % 2) * 18}px; top: ${200 + i * 210}px; transform: rotate(${[-4, 3, -2][i]}deg)">${stamp(iss, c, 178, 196, C.ground, stampArt[i](138, 86))}</div>`).join("");
  boards["NatRecordRings.dc.html"] = doc("Record idea A — tree rings", frame(C.ground, C.ink, `<svg aria-hidden="true" width="1440" height="900" viewBox="0 0 1440 900" style="position: absolute; inset: 0">${rings}${dots}${yearMarks}${leaders}</svg>
<h2 style="position: absolute; left: 96px; top: 52px; margin: 0; font-size: 46px; font-weight: 600; letter-spacing: -0.02em">Every year, a ring.</h2>
<p style="position: absolute; left: 96px; top: 112px; margin: 0; font-family: 'Newsreader', serif; font-style: italic; font-size: 19px; color: ${C.muted}">My rings grow wider in the years I started more. Press one and I'll list that year.</p>
<div style="position: absolute; left: 96px; top: 846px; display: flex; gap: 22px; font-family: 'Courier Prime', monospace; font-size: 13px">${legend}</div>
${tags}
<div style="position: absolute; left: 840px; top: 812px; width: 320px; font-size: 14px; color: ${C.muted}">2024, the widest ring, is selected: five entries. <a href="#" style="color: ${C.ink}; font-weight: 600">List them</a></div>
<h3 style="position: absolute; left: 1196px; top: 150px; margin: 0; font-size: 20px; font-weight: 600">Certificates</h3>
${stamps}`));
}

// ---------- record, idea B: the field notebook ----------
{
  const pinned = [
    ["Work, 2025", "Software Engineer", "DoorDash, Inc.", -2.5],
    ["Award, 2024 – 2025", "Magellan Research Award, TRIO", "University of South Carolina", 2],
    ["Award, 2024", "Best Design, MentorHub", "CockyHacks, ACM@USC", 1.5],
    ["Award, 2023", "2nd Place, Food Route", "Code to Give Hackathon, Morgan Stanley", -1.5],
  ];
  const tape = (rot) => `<div style="position: absolute; left: 50%; top: -12px; width: 90px; height: 24px; margin-left: -45px; transform: rotate(${rot}deg); background: rgba(205,190,150,0.55)"></div>`;
  const cards = pinned.map(([k, t, o, rot], i) => `<div style="position: absolute; left: ${130 + (i % 2) * 290}px; top: ${250 + Math.floor(i / 2) * 250}px; width: 262px; transform: rotate(${rot}deg); background: ${C.card}; padding: 22px 20px 20px; box-shadow: 0 10px 18px rgba(30,40,35,0.14)">
${tape(-rot * 2)}
<div style="font-family: 'Courier Prime', monospace; font-size: 12px; color: ${k.startsWith("Award") ? C.red : C.mossDeep}">${k}</div>
<div style="font-size: 21px; font-weight: 600; line-height: 1.15; margin-top: 8px">${t}</div>
<div style="font-size: 14px; color: ${C.muted}; margin-top: 6px; line-height: 1.4">${o}</div>
</div>`).join("");
  const log = [...YEARS].reverse().map(([y, items]) => `<div style="display: grid; grid-template-columns: 62px 1fr; gap: 10px; padding: 7px 0; border-bottom: 1px solid #DCE3E8">
<span style="font-family: 'Courier Prime', monospace; font-weight: 700; font-size: 14px; color: ${C.red}">${y}</span>
<div>${items.length ? items.map(([t, o, k, star]) => `<div style="font-size: 14px; line-height: 1.55; white-space: nowrap; overflow: hidden; text-overflow: ellipsis"><span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: ${KIND[k]}; margin-right: 8px"></span>${star ? "<b>" : ""}${t}${star ? "</b>" : ""}<span style="color: ${C.muted}">, ${o}</span></div>`).join("") : `<div style="font-size: 14px; line-height: 1.55; color: ${C.muted}; font-style: italic">Nothing started this year.</div>`}</div>
</div>`).join("");
  const stamps = CERTS.map(([iss, c], i) => `<div style="position: absolute; left: ${1000 + i * 124}px; top: ${738 + [0, 14, 4][i]}px; transform: rotate(${[-7, 4, -3][i]}deg)">${stamp(iss, c, 132, 150, C.ground, stampArt[i](92, 40))}</div>`).join("");
  boards["NatRecordNotebook.dc.html"] = doc("Record idea B — field notebook", frame(C.ground, C.ink, `
<div style="position: absolute; left: 70px; top: 60px; width: 1300px; height: 780px; display: grid; grid-template-columns: 1fr 1fr; box-shadow: 0 24px 44px rgba(30,40,35,0.18)">
<div style="background: ${C.paper}; background-image: repeating-linear-gradient(transparent 0 31px, ${C.ruled} 31px 32px); box-shadow: inset -26px 0 30px -24px rgba(30,40,35,0.25)"></div>
<div style="background: ${C.paper}; box-shadow: inset 26px 0 30px -24px rgba(30,40,35,0.25)"></div>
</div>
<h2 style="position: absolute; left: 130px; top: 104px; margin: 0; font-size: 40px; font-weight: 600; letter-spacing: -0.02em">The best of it</h2>
<p style="position: absolute; left: 130px; top: 158px; margin: 0; font-family: 'Newsreader', serif; font-style: italic; font-size: 18px; color: ${C.muted}">My pinned ones first. Everything else is on the next page.</p>
${cards}
<div style="position: absolute; left: 760px; top: 100px; width: 560px">
<div style="display: flex; justify-content: space-between; align-items: baseline"><h3 style="margin: 0; font-size: 22px; font-weight: 600">Everything I've done, by year</h3><span style="font-family: 'Courier Prime', monospace; font-size: 13px; color: ${C.muted}">20 entries</span></div>
<div style="margin-top: 10px; border-top: 1.5px solid ${C.ink}">${log}</div>
</div>
<p style="position: absolute; left: 1000px; top: 716px; margin: 0; font-family: 'Newsreader', serif; font-style: italic; font-size: 18px">Certificates I've collected</p>
${stamps}`));
}

// ---------- contact idea: the postcard ----------
// My card clipped beside a postcard home, under a string of Hội An lanterns; the chat is a strip below.
{
  const star = (x, y, r, fill) => { let d = ""; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.382 : r; d += (i ? "L" : "M") + f(x + rr * Math.cos(a)) + " " + f(y + rr * Math.sin(a)); } return `<path d="${d}Z" fill="${fill}"/>`; };
  // Hội An silk lanterns: lit and glowing at night, quiet silk by day.
  const lantern = (x, y, col, sc) => {
    const glow = NIGHT ? `<ellipse cx="0" cy="26" rx="46" ry="52" fill="url(#lanternGlow)"/>` : "";
    const body = NIGHT ? `url(#lit-${col.slice(1)})` : col;
    return `<g transform="translate(${x} ${y}) scale(${sc})">${glow}
<path d="M0 -40V-6" stroke="${C.twine}" stroke-width="1.2"/>
<rect x="-7" y="-6" width="14" height="6" rx="1.5" fill="#6B5640"/>
<path d="M-15 0C-27 14 -27 38 -15 52H15C27 38 27 14 15 0Z" fill="${body}" ${NIGHT ? "" : 'opacity="0.92"'}/>
<path d="M-7 0C-12 16 -12 36 -7 52M7 0C12 16 12 36 7 52M0 0V52" stroke="rgba(60,30,20,0.28)" stroke-width="1" fill="none"/>
<rect x="-7" y="52" width="14" height="5" rx="1.5" fill="#6B5640"/>
<path d="M0 57V76M-2 76h4" stroke="${col}" stroke-width="1.6" stroke-linecap="round"/></g>`;
  };
  const lanternCols = ["#C8352B", "#E1A93A", "#C8352B", "#3F7A57", "#E1A93A", "#C8352B", "#3F7A57"];
  const lx = [690, 790, 880, 980, 1080, 1180, 1290], ly = [64, 92, 72, 98, 70, 94, 66];
  const lanterns = lanternCols.map((c, i) => lantern(lx[i], ly[i], c, i % 2 ? 0.9 : 1)).join("");
  const lanternDefs = `<defs><radialGradient id="lanternGlow"><stop offset="0" stop-color="#FFC768" stop-opacity="0.55"/><stop offset="1" stop-color="#FFC768" stop-opacity="0"/></radialGradient>
${["#C8352B", "#E1A93A", "#3F7A57"].map((c) => `<radialGradient id="lit-${c.slice(1)}" cx="50%" cy="45%" r="60%"><stop offset="0" stop-color="#FFE7A8"/><stop offset="0.55" stop-color="${c}"/><stop offset="1" stop-color="${c}" stop-opacity="0.85"/></radialGradient>`).join("")}</defs>`;
  const icon = {
    mail: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3"><rect x="1.5" y="3.5" width="13" height="9" rx="1"/><path d="M2 4.5l6 4.5 6-4.5"/></svg>`,
    gh: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="M5.5 4.5 2 8l3.5 3.5M10.5 4.5 14 8l-3.5 3.5"/></svg>`,
    li: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3"><rect x="1.5" y="1.5" width="13" height="13" rx="2"/><path d="M5 7v4.5M5 4.6v.1M8 11.5V8.8c0-1 .7-1.8 1.7-1.8s1.8.8 1.8 1.8v2.7"/></svg>`,
    doc: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M3 1.5h5.5L11 4v8.5H3z M8.5 1.5V4H11M5 7h4M5 9.5h4"/></svg>`,
    card: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="1.5" y="3" width="11" height="8" rx="1"/><circle cx="5" cy="6.5" r="1.3"/><path d="M3.3 9.5c.4-1 1-1.4 1.7-1.4s1.3.4 1.7 1.4M8 6h3M8 8h2.5"/></svg>`,
  };
  const chip = (ic, label) => `<a href="#" style="display: inline-flex; align-items: center; gap: 7px; height: 34px; padding: 0 13px; border: 1px solid ${C.hair}; border-radius: 17px; text-decoration: none; font-size: 14px; color: ${C.ink}; background: ${C.card}">${ic}${label}</a>`;
  const card = `<div style="position: relative; width: 430px; height: 450px; background: ${C.paper}; background-image: ${GRAIN}; color: ${C.ink}; padding: 12px; box-sizing: border-box; box-shadow: 0 1px 0 rgba(0,0,0,0.04), 0 22px 40px rgba(30,40,35,0.2); overflow: hidden">
<p aria-hidden="true" style="position: absolute; right: 22px; bottom: -34px; margin: 0; font-size: 210px; font-weight: 600; letter-spacing: -0.02em; line-height: 0.8; color: ${C.ink}; opacity: 0.06">TL</p>
<div style="position: relative; height: 100%; box-sizing: border-box; border: 1px solid ${C.hair}; padding: 26px 28px 22px; display: flex; flex-direction: column">
<div style="display: flex; justify-content: space-between; align-items: flex-start">
<div><div style="font-size: 30px; font-weight: 600; letter-spacing: -0.02em; line-height: 1">Thien Le</div>
<div style="font-family: 'Courier Prime', monospace; font-size: 12.5px; letter-spacing: 0.16em; color: ${C.muted}; margin-top: 8px">SOFTWARE ENGINEER</div></div>
<div aria-label="My seal: Thiện Lê" style="width: 58px; height: 66px; transform: rotate(-4deg); background: #B8322A; border-radius: 4px; box-shadow: inset 0 0 0 3px #B8322A, inset 0 0 0 4.5px #F3E6D0; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #F3E6D0; font-family: 'Newsreader', serif; font-style: italic; font-size: 19px; line-height: 1.05; opacity: 0.92"><span>Thiện</span><span>Lê</span></div>
</div>
<div style="display: flex; align-items: center; gap: 6px; font-size: 14px; color: ${C.muted}; margin-top: 12px"><svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M7 13s4.5-4.2 4.5-7.3A4.5 4.5 0 0 0 2.5 5.7C2.5 8.8 7 13 7 13Z"/><circle cx="7" cy="5.7" r="1.5"/></svg>Taylors, South Carolina</div>
<p style="margin: 16px 0 0; padding-left: 12px; border-left: 2px solid ${C.mossPaper}; font-family: 'Newsreader', serif; font-style: italic; font-size: 18px; line-height: 1.35">Unsolved is not the same as unsolvable.</p>
<div style="height: 1px; background: ${C.hair}; margin: 20px 0 14px"></div>
<div style="display: flex; flex-direction: column; gap: 11px; font-family: 'Courier Prime', monospace; font-size: 14.5px">
<div style="display: flex; align-items: center; gap: 10px"><span style="color: ${C.mossPaper}; display: inline-flex">${icon.mail}</span><span style="flex: 1">thienle210303@gmail.com</span><span aria-label="Copy email" style="display: inline-flex; width: 30px; height: 30px; align-items: center; justify-content: center; border: 1px solid ${C.hair}; border-radius: 15px"><svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="${C.ink}" stroke-width="1.2"><rect x="4.5" y="4.5" width="8" height="8" rx="1"/><path d="M9.5 2.5V1.5h-8v8h1"/></svg></span></div>
<div style="display: flex; align-items: center; gap: 10px"><span style="color: ${C.mossPaper}; display: inline-flex">${icon.gh}</span>github.com/thienle210303</div>
<div style="display: flex; align-items: center; gap: 10px"><span style="color: ${C.mossPaper}; display: inline-flex">${icon.li}</span>in/thienle210303</div>
</div>
<div style="display: flex; gap: 8px; margin-top: auto">${chip(icon.doc, "Résumé")}${chip(icon.card, "Save contact")}</div>
</div>
</div>`;
  const clip = `<svg aria-hidden="true" width="34" height="86" viewBox="0 0 34 86" style="position: absolute; left: 236px; top: -26px" fill="none" stroke="#8C949A" stroke-width="2.6" stroke-linecap="round"><path d="M10 70V16a7 7 0 0 1 14 0v58a10 10 0 0 1-20 0V22"/></svg>`;
  const scene = `<svg aria-hidden="true" width="340" height="440" viewBox="0 0 340 440">
<rect width="340" height="440" fill="${C.back}"/>
<circle cx="250" cy="120" r="34" fill="none" stroke="${C.red}" stroke-width="1.4"/>
<path d="M0 300Q170 286 340 300" stroke="${C.ink}" stroke-width="1" fill="none"/>
${pine(70, 300, 150, C.moss)}${pine(120, 300, 110, C.moss)}
${palmetto(290, 300, 90, C.moss)}
${ripples(10, 318, 320, 5, C.water, 7)}
${rice(20, 440, 11, 30, 3, C.moss, 60, 50)}
${heron(196, 214, 0.5, C.ink)}
</svg>`;
  const field = (label) => `<label style="display: flex; flex-direction: column; gap: 2px; font-family: 'Courier Prime', monospace; font-size: 12px; color: ${C.muted}">${label}<input style="width: 100%; min-width: 0; box-sizing: border-box; height: 34px; border: 0; border-bottom: 1.5px solid ${C.ink}; background: transparent; padding: 0 2px; font: inherit; font-size: 16px; color: ${C.ink}"></label>`;
  const postcard = `<div style="position: absolute; left: 610px; top: 196px; width: 740px; height: 470px; transform: rotate(1.2deg); background: ${C.paper}; background-image: ${GRAIN}; color: ${C.ink}; box-shadow: 0 26px 46px rgba(30,40,35,0.2); display: grid; grid-template-columns: 340px minmax(0, 1fr); padding: 15px; box-sizing: border-box; gap: 0">
<div style="position: relative; overflow: hidden">${scene}
<p style="position: absolute; left: 18px; top: 16px; margin: 0; font-family: 'Newsreader', serif; font-style: italic; font-size: 22px; line-height: 1.15; color: ${C.ink}">Greetings from<br><span style="font-family: 'Bricolage Grotesque', sans-serif; font-style: normal; font-weight: 600; font-size: 30px; letter-spacing: -0.02em">Taylors, SC</span></p>
</div>
<div style="position: relative; padding: 18px 8px 10px 30px; border-left: 1px solid ${C.hair}; margin-left: 14px; display: flex; flex-direction: column">
<div style="position: absolute; right: 6px; top: 6px; width: 76px; height: 92px; background-color: ${C.paper}; background-image: radial-gradient(circle, ${C.paper} 3px, transparent 3.5px); background-size: 11px 11px; filter: drop-shadow(0 2px 3px rgba(30,40,35,0.25))">
<div style="position: absolute; inset: 5px; background: #DA251D"><svg width="66" height="82" viewBox="0 0 66 82">${star(33, 38, 17, "#FFDD00")}</svg></div>
</div>
<svg aria-hidden="true" width="150" height="90" viewBox="0 0 150 90" style="position: absolute; right: 50px; top: 18px" fill="none" stroke="rgba(29,35,33,0.55)" stroke-width="1.3"><circle cx="56" cy="44" r="34"/><circle cx="56" cy="44" r="27"/><path d="M96 28q9 -6 18 0t18 0M96 44q9 -6 18 0t18 0M96 60q9 -6 18 0t18 0"/><text x="56" y="48" text-anchor="middle" font-family="Courier Prime" font-size="10" fill="rgba(29,35,33,0.7)" stroke="none">TAYLORS SC</text></svg>
<p style="margin: 112px 0 0; font-family: 'Newsreader', serif; font-style: italic; font-size: 24px">Leave a way to reach you.</p>
<p style="margin: 4px 0 0; font-size: 14px; color: ${C.muted}">No message needed. I'll write first.</p>
<div style="display: flex; flex-direction: column; gap: 14px; margin-top: 18px">
${field("Your name")}
<div style="display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 16px">${field("Email")}${field("or phone")}</div>
</div>
<button type="button" style="margin-top: auto; align-self: flex-start; height: 46px; padding: 0 22px; border: 0; border-radius: 3px; background: ${C.mossDeep}; color: ${C.onControl}; font: inherit; font-family: 'Bricolage Grotesque', sans-serif; font-weight: 600; font-size: 15px">Send the postcard</button>
</div>
</div>`;
  const qtag = (q) => `<button type="button" style="display: inline-flex; align-items: center; height: 32px; padding: 0 12px 0 22px; border: 0; background: ${C.card}; color: ${C.ink}; clip-path: polygon(10px 0, 100% 0, 100% 100%, 10px 100%, 0 50%); font: inherit; font-size: 13.5px; filter: drop-shadow(0 1px 0 ${C.hair}); position: relative">${q}</button>`;
  const chat = `<div style="position: absolute; left: 96px; top: 712px; width: 1254px; box-sizing: border-box; background: ${C.paper}; background-image: ${GRAIN}; color: ${C.ink}; border-radius: 4px; box-shadow: 0 14px 30px rgba(30,40,35,0.14); display: grid; grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr); overflow: hidden">
<div style="padding: 18px 26px 18px 26px; border-right: 1px dashed ${C.hair}">
<div style="display: flex; gap: 12px; align-items: baseline"><span style="font-size: 18px; font-weight: 600">Ask me</span><span style="font-family: 'Newsreader', serif; font-style: italic; font-size: 15px; color: ${C.muted}">I answer from what I've written here.</span></div>
<div style="display: grid; grid-template-columns: 74px 1fr; row-gap: 6px; margin-top: 12px; align-items: baseline">
<span style="font-family: 'Courier Prime', monospace; font-size: 12px; color: ${C.muted}">you asked</span><span style="font-size: 15px; font-weight: 600">What are your cats called?</span>
<span style="font-family: 'Courier Prime', monospace; font-size: 12px; color: ${C.mossPaper}">I said</span><span style="font-size: 15px; line-height: 1.45">Moon and Mi. They're the two walking around this page.<span style="font-family: 'Courier Prime', monospace; font-size: 11.5px; color: ${C.muted}; margin-left: 8px">from: companions</span></span>
</div>
</div>
<div style="padding: 18px 26px; display: flex; flex-direction: column; gap: 12px; background: ${C.back}">
<div style="display: flex; gap: 12px; align-items: flex-end">
<label style="flex: 1; display: flex; flex-direction: column; gap: 2px; font-family: 'Courier Prime', monospace; font-size: 12px; color: ${C.muted}">Your question<input placeholder="Ask anything about my work" style="height: 36px; border: 0; border-bottom: 1.5px solid ${C.ink}; background: transparent; padding: 0 2px; font: inherit; font-family: 'Bricolage Grotesque', sans-serif; font-size: 16px; color: ${C.ink}"></label>
<button type="button" style="height: 42px; padding: 0 22px; border: 0; border-radius: 21px; background: ${C.mossDeep}; color: ${C.onControl}; font: inherit; font-weight: 600; font-size: 15px">Ask</button>
</div>
<div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center"><span style="font-family: 'Newsreader', serif; font-style: italic; font-size: 14px; color: ${C.muted}; margin-right: 2px">or try</span>${["What do you do at DoorDash?", "Where are you from?", "What have you measured?"].map(qtag).join("")}</div>
</div>
</div>`;
  const svg = `<svg aria-hidden="true" width="1440" height="900" viewBox="0 0 1440 900" style="position: absolute; inset: 0">
${lanternDefs}
<path d="M640 34Q980 86 1380 30" fill="none" stroke="${C.twine}" stroke-width="1.6"/>
${lanterns}
</svg>`;
  boards["NatContactPostcard.dc.html"] = doc("Contact idea — the postcard", frame(C.ground, C.fgGround, `${svg}
<svg aria-hidden="true" width="1440" height="900" viewBox="0 0 1440 900" style="position: absolute; inset: 0; pointer-events: none">${daily("contact")}</svg>
<p style="position: absolute; left: 98px; top: 44px; margin: 0; font-family: 'Newsreader', serif; font-style: italic; font-size: 24px; color: ${NIGHT ? "#E8B65A" : "#B8322A"}">Xin chào,</p>
<svg aria-hidden="true" width="1440" height="900" viewBox="0 0 1440 900" style="position: absolute; inset: 0; pointer-events: none">${hoaMai(640, 40, 1.1)}${hoaMai(1430, 30, 1.05, -1)}${banhTet(1230, 690, 0.7)}${smallCap(1000, 696, "bánh tét and hoa mai, for Tết", C.mutedGround)}</svg>
<h2 style="position: absolute; left: 96px; top: 70px; margin: 0; font-size: 64px; font-weight: 600; letter-spacing: -0.02em">say hi.</h2>
<p style="position: absolute; left: 96px; top: 150px; margin: 0; font-family: 'Newsreader', serif; font-style: italic; font-size: 21px; color: ${C.mutedGround}">Take my card, or send me a postcard and I'll reach you.</p>
<div style="position: absolute; left: 110px; top: 216px; transform: rotate(-2.5deg)">${card}${clip}</div>
${postcard}
${chat}`, [500, 96], 4));
}

// ---------- record, chosen: notebook with the rings pressed into the left page ----------
{
  const cx = 255, cy = 440, r = rng(5);
  let radius = 7, rings = "", dots = "", marks = "";
  const featured = [];
  YEARS.forEach(([year, items], yi) => {
    const w = 4.5 + 3.6 * items.length, inner = radius, outer = radius + w;
    const ph = [r() * 6.28, r() * 6.28];
    const ringPath = (rad) => { let d = ""; for (let a = 0; a <= 360; a += 3) { const th = (a * Math.PI) / 180, rr = rad * (1 + 0.025 * Math.sin(3 * th + ph[0]) + 0.015 * Math.sin(7 * th + ph[1])); d += (a ? "L" : "M") + f(cx + rr * Math.cos(th)) + " " + f(cy + rr * Math.sin(th)); } return d + "Z"; };
    rings = `<path d="${ringPath(outer)}" fill="${yi % 2 ? "#E6D6B6" : "#EEE2C9"}" stroke="#B79C74" stroke-width="0.9"/>` + rings;
    const mid = (inner + outer) / 2;
    items.forEach(([title, org, kind, star], i) => {
      if (star) { featured.push({ mid, title, org, kind, year }); return; }
      const a = (110 + (i * 300) / items.length + yi * 23) * Math.PI / 180;
      dots += `<circle cx="${f(cx + mid * Math.cos(a))}" cy="${f(cy + mid * Math.sin(a))}" r="3.4" fill="${KIND[kind]}" stroke="${C.paper}" stroke-width="1.2"/>`;
    });
    marks += `<text x="${f(cx - mid)}" y="${cy + 3.5}" text-anchor="middle" font-family="Courier Prime" font-size="9.5" fill="${C.ink}" style="paint-order: stroke" stroke="${yi % 2 ? "#E6D6B6" : "#EEE2C9"}" stroke-width="3">${String(year).slice(2)}</text>`;
    radius = outer;
  });
  rings = `<circle cx="${cx}" cy="${cy}" r="${radius + 7}" fill="#6B5640"/><circle cx="${cx}" cy="${cy}" r="${radius + 3}" fill="#8A7154"/>` + rings + `<circle cx="${cx}" cy="${cy}" r="4" fill="#B79C74"/>`;
  // the pressed cards, one per featured dot, taped on the right half of the left page
  const tape = (rot) => `<div style="position: absolute; left: 50%; top: -10px; width: 70px; height: 20px; margin-left: -35px; transform: rotate(${rot}deg); background: rgba(205,190,150,0.6)"></div>`;
  // Pressed where they fit: two down the right of the slice, three across the bottom, each a little askew.
  const slots = [
    { x: 432, y: 214, rot: -3, at: "left" }, { x: 470, y: 392, rot: 2.5, at: "left" },
    { x: 104, y: 604, rot: -2, at: "top" }, { x: 312, y: 628, rot: 1.5, at: "top" }, { x: 512, y: 596, rot: -1, at: "top" },
  ];
  const cardW = 196, label = { Work: "Work", Study: "Study", Milestone: "Award" };
  featured.sort((p, q) => q.year - p.year);
  let strings = "", cards = "";
  featured.forEach((p, i) => {
    const sl = slots[i], ax = sl.at === "left" ? sl.x : sl.x + cardW / 2, ay = sl.at === "left" ? sl.y + 46 : sl.y;
    const ang = Math.atan2(ay - cy, ax - cx), dx = cx + p.mid * Math.cos(ang), dy = cy + p.mid * Math.sin(ang);
    dots += `<circle cx="${f(dx)}" cy="${f(dy)}" r="5" fill="${KIND[p.kind]}" stroke="${C.paper}" stroke-width="1.2"/>`;
    const c1 = sl.at === "left" ? `${f(ax - 70)} ${f(ay)}` : `${f(ax)} ${f(ay - 60)}`;
    strings += `<path d="M${f(dx)} ${f(dy)}C${f(dx + (ax - dx) * 0.35)} ${f(dy + (ay - dy) * 0.1)} ${c1} ${f(ax)} ${f(ay)}" fill="none" stroke="${C.twine}" stroke-width="1.2"/>`;
    cards += `<div style="position: absolute; left: ${sl.x}px; top: ${sl.y}px; width: ${cardW}px; box-sizing: border-box; transform: rotate(${sl.rot}deg); background: ${C.card}; padding: 16px 15px 14px; box-shadow: 0 8px 14px rgba(30,40,35,0.14)">
${tape(-sl.rot * 2)}
<div style="display: flex; justify-content: space-between; font-family: 'Courier Prime', monospace; font-size: 12px"><span style="color: ${KIND[p.kind]}">${p.title.startsWith("Graduated") ? "Milestone" : label[p.kind]}</span><span style="color: ${C.muted}">${p.year}</span></div>
<div style="font-size: 16px; font-weight: 600; line-height: 1.2; margin-top: 4px">${p.title}</div>
<div style="font-size: 13px; color: ${C.muted}; margin-top: 3px; line-height: 1.3">${p.org}</div>
</div>`;
  });
  const legend = Object.entries(KIND).map(([k, c]) => `<span style="display: inline-flex; align-items: center; gap: 6px"><span style="width: 8px; height: 8px; border-radius: 50%; background: ${c}"></span>${k}</span>`).join("");
  const log = [...YEARS].reverse().map(([y, items]) => `<div style="display: grid; grid-template-columns: 62px 1fr; gap: 10px; padding: 7px 0; border-bottom: 1px solid #DCE3E8">
<span style="font-family: 'Courier Prime', monospace; font-weight: 700; font-size: 14px; color: ${C.red}">${y}</span>
<div>${items.length ? items.map(([t, o, k, star]) => `<div style="font-size: 14px; line-height: 1.55; white-space: nowrap; overflow: hidden; text-overflow: ellipsis"><span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: ${KIND[k]}; margin-right: 8px"></span>${star ? "<b>" : ""}${t}${star ? "</b>" : ""}<span style="color: ${C.muted}">, ${o}</span></div>`).join("") : `<div style="font-size: 14px; line-height: 1.55; color: ${C.muted}; font-style: italic">Nothing started this year.</div>`}</div>
</div>`).join("");
  const stamps = CERTS.map(([iss, c], i) => `<div style="position: absolute; left: ${1000 + i * 124}px; top: ${738 + [0, 14, 4][i]}px; transform: rotate(${[-7, 4, -3][i]}deg)">${stamp(iss, c, 132, 150, C.ground, stampArt[i](92, 40))}</div>`).join("");
  boards["NatRecordFinal.dc.html"] = doc("Record — notebook with rings", frame(C.ground, C.ink, `
<div style="position: absolute; left: 70px; top: 60px; width: 1300px; height: 780px; display: grid; grid-template-columns: 1fr 1fr; box-shadow: 0 24px 44px rgba(30,40,35,0.18)">
<div style="background: ${C.paper}; background-image: repeating-linear-gradient(transparent 0 31px, ${C.ruled} 31px 32px); box-shadow: inset -26px 0 30px -24px rgba(30,40,35,0.25)"></div>
<div style="background: ${C.paper}; box-shadow: inset 26px 0 30px -24px rgba(30,40,35,0.25)"></div>
</div>
<svg aria-hidden="true" width="1440" height="900" viewBox="0 0 1440 900" style="position: absolute; inset: 0; pointer-events: none">${daily("record")}</svg>
<svg aria-hidden="true" width="1440" height="900" viewBox="0 0 1440 900" style="position: absolute; inset: 0">${rings}${dots}${strings}</svg>
<svg aria-hidden="true" width="200" height="200" viewBox="0 0 200 200" style="position: absolute; left: 520px; top: 70px">${pressedLotus(100, 80, 0.9)}</svg>
<div aria-hidden="true" style="position: absolute; left: 584px; top: 96px; width: 60px; height: 18px; transform: rotate(-14deg); background: rgba(205,190,150,0.55)"></div>
<h2 style="position: absolute; left: 112px; top: 96px; margin: 0; font-size: 38px; font-weight: 600; letter-spacing: -0.02em">Pressed, waiting to dry.</h2>
<p style="position: absolute; left: 112px; top: 148px; margin: 0; font-family: 'Newsreader', serif; font-style: italic; font-size: 18px; color: ${C.muted}">My best ones, pressed between the pages. Give them a few years.</p>
${cards}
<div style="position: absolute; left: 112px; top: 196px; width: 290px; font-size: 13px; line-height: 1.45; color: ${C.muted}">A tree slice: 2018 at the heart, 2025 at the bark. Wider rings, busier years.</div>
<div style="position: absolute; left: 112px; top: 262px; display: flex; gap: 16px; font-family: 'Courier Prime', monospace; font-size: 12px">${legend}</div>
<div style="position: absolute; left: 760px; top: 100px; width: 560px">
<div style="display: flex; justify-content: space-between; align-items: baseline"><h3 style="margin: 0; font-size: 22px; font-weight: 600">Everything I've done, by year</h3><span style="font-family: 'Courier Prime', monospace; font-size: 13px; color: ${C.muted}">20 entries</span></div>
<div style="margin-top: 10px; border-top: 1.5px solid ${C.ink}">${log}</div>
</div>
<p style="position: absolute; left: 1000px; top: 716px; margin: 0; font-family: 'Newsreader', serif; font-style: italic; font-size: 18px">Certificates I've collected</p>
${stamps}`));
}

// ---------- hero, phone (390 wide): the line hangs down the page ----------
// The clothesline runs from a bamboo pole across, then drops down the middle;
// the four tags hang off it left, right, left, right, and my field tag hangs at the bottom,
// above the rice, the buffalo and the morning (or evening) stool.
{
  const W = 390, H = 1800;
  const sky = (() => {
    if (NIGHT) {
      const r = rng(9); let s = "";
      for (let i = 0; i < 36; i++) s += `<circle cx="${f(r() * W)}" cy="${f(60 + r() * 80)}" r="${[0.8, 1, 1.3][Math.floor(r() * 3)]}" fill="#E8EEDF" opacity="${f(0.35 + r() * 0.55)}"/>`;
      for (let i = 0; i < 14; i++) s += `<circle cx="${f(20 + r() * 350)}" cy="${f(1380 + r() * 300)}" r="${f(1.5 + r())}" fill="#FFE18A" filter="url(#mglow)" opacity="${f(0.6 + r() * 0.4)}"/>`;
      return `<defs><filter id="mglow" x="-200%" y="-200%" width="500%" height="500%"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter><radialGradient id="mhalo"><stop offset="0" stop-color="#F6EFD5" stop-opacity="0.35"/><stop offset="1" stop-color="#F6EFD5" stop-opacity="0"/></radialGradient></defs>${s}<circle cx="336" cy="112" r="70" fill="url(#mhalo)"/><circle cx="336" cy="112" r="20" fill="#F3EBD2"/><circle cx="342" cy="108" r="3.4" fill="#E4DBBE"/><circle cx="330" cy="117" r="2.4" fill="#E4DBBE"/>`;
    }
    const r = rng(11); let s = "";
    for (let i = 0; i < 2; i++) { const cx = 150 + i * 150, cy = 100 + i * 20, w = 70; s += `<g opacity="0.7" filter="url(#msoft)"><ellipse cx="${cx}" cy="${cy}" rx="${w}" ry="${f(w * 0.16)}" fill="#FFFFFF"/><ellipse cx="${cx - 20}" cy="${cy - 6}" rx="${f(w * 0.45)}" ry="${f(w * 0.15)}" fill="#FFFFFF"/></g>`; }
    for (let i = 0; i < 3; i++) { const bx = 200 + r() * 120, by = 80 + r() * 40; s += `<path d="M${f(bx)} ${f(by)}q5 -4 10 0q5 -4 10 0" fill="none" stroke="#56605A" stroke-width="1.1" stroke-linecap="round" opacity="0.7"/>`; }
    for (let i = 0; i < 10; i++) { const sx = 20 + r() * 350, sy = 1400 + r() * 260; let fl = ""; for (let k = 0; k < 7; k++) { const a = (k * Math.PI * 2) / 7; fl += `M${f(sx)} ${f(sy)}l${f(Math.cos(a) * 4)} ${f(Math.sin(a) * 4)}`; } s += `<path d="${fl}M${f(sx)} ${f(sy)}l-2 7" fill="none" stroke="#7D867E" stroke-width="0.7" opacity="0.6"/>`; }
    return `<defs><filter id="msoft" x="-30%" y="-80%" width="160%" height="260%"><feGaussianBlur stdDeviation="4"/></filter><radialGradient id="msun"><stop offset="0" stop-color="#FFE9A8" stop-opacity="0.55"/><stop offset="1" stop-color="#FFE9A8" stop-opacity="0"/></radialGradient></defs><circle cx="336" cy="112" r="90" fill="url(#msun)"/><circle cx="336" cy="112" r="22" fill="#F7E3A6"/>${s}`;
  })();
  // the line: from the bamboo (right) across to the middle, then down
  const lineX = 195, topY = 560, endY = 1150;
  const line = `M372 520 Q290 556 ${lineX} ${topY} Q${lineX - 6} ${(topY + endY) / 2} ${lineX} ${endY}`;
  const bamboo = (() => { let s = ""; for (let y = 1000; y > 470; y -= 54) s += `<path d="M366 ${y}V${y - 50}M378 ${y}V${y - 50}"/><path d="M362 ${y - 52}Q372 ${y - 57} 382 ${y - 52}" stroke-width="2"/>`;
    const r = rng(23); let lv = ""; for (let i = 0; i < 9; i++) { const y = 480 + r() * 120, a = Math.PI - 0.4 + (r() - 0.5) * 0.8, L = 30 + r() * 22, ex = 372 + Math.cos(a) * L, ey = y + Math.sin(a) * L; lv += `<path d="M372 ${f(y)}Q${f((372 + ex) / 2)} ${f((y + ey) / 2 - 6)} ${f(ex)} ${f(ey)}Q${f((372 + ex) / 2)} ${f((y + ey) / 2 + 6)} 372 ${f(y)}Z"/>`; }
    return `<g fill="none" stroke="${C.moss}" stroke-width="1.2" stroke-linecap="round">${s}</g><g fill="rgba(70,96,58,0.18)" stroke="${C.moss}" stroke-width="0.9">${lv}</g>`; })();
  const tagW = 150;
  const chapters = [
    { year: "2003", place: "Kiên Giang", art: rice(52, 84, 3, 20, 4, C.moss, 44, 26), side: -1, y: 600 },
    { year: "Dec 2018", place: "Taylors", art: pine(75, 84, 76, C.moss), side: 1, y: 700 },
    { year: "2021", place: "USC", art: palmetto(75, 84, 48, C.moss), side: -1, y: 830 },
    { year: "2025", place: "DoorDash", art: `<g fill="none" stroke="${C.moss}" stroke-width="1.2"><rect x="44" y="30" width="62" height="40" rx="3"/><path d="M34 76H116M58 44h14M58 54h26M90 44l6 5-6 5"/></g>`, side: 1, y: 930 },
  ];
  let strings = "", tags = "";
  chapters.forEach((c, i) => {
    const tx = c.side < 0 ? lineX - 22 - tagW : lineX + 22, attachX = c.side < 0 ? tx + tagW : tx;
    strings += `<path d="M${lineX} ${c.y + 10}L${attachX + (c.side < 0 ? -18 : 18)} ${c.y + 30}" stroke="${C.twine}" stroke-width="1.3"/><rect x="${attachX + (c.side < 0 ? -22 : 14)}" y="${c.y + 18}" width="8" height="22" rx="2" fill="#C4AE85" stroke="#A08B62" stroke-width="0.8"/>`;
    tags += `<div style="position: absolute; left: ${tx}px; top: ${c.y + 20}px; width: ${tagW}px; transform: rotate(${[-2.5, 2, -1.5, 2.5][i]}deg); filter: drop-shadow(0 10px 14px rgba(30,40,35,0.16))">
<div style="position: relative; background: ${C.paper}; background-image: ${GRAIN}; color: ${C.ink}; ${TAG_CLIP}; padding: 30px 13px 10px">
${hole(C.ground)}
<div style="font-family: 'Courier Prime', monospace; font-size: 11.5px; color: ${C.muted}">${c.year}</div>
<div style="font-size: 17px; font-weight: 600; margin-top: 2px">${c.place}</div>
<svg aria-hidden="true" width="124" height="74" viewBox="0 8 150 88" style="display: block; margin-top: 4px">${c.art}</svg>
</div></div>`;
  });
  const rows = [["Name", "Thien Le"], ["Native to", "<span style=\"font-family: 'Bricolage Grotesque', sans-serif\">Kiên Giang, Việt Nam</span> <span style='color: #D4A21A'>★</span>"], ["Transplanted", "Taylors, South Carolina"], ["Habitat", "DoorDash, retail data"], ["Formerly", "Chef, family kitchen"], ["Companions", "Two cats, Moon and Mi"]];
  const field = `<div style="position: absolute; left: 20px; top: ${endY + 16}px; width: 350px; transform: rotate(1.2deg); filter: drop-shadow(0 16px 22px rgba(30,40,35,0.18))">
<div style="position: relative; background: ${C.paper}; background-image: ${GRAIN}; color: ${C.ink}; ${TAG_CLIP}; padding: 38px 20px 116px; font-family: 'Courier Prime', monospace; font-size: 12.5px; line-height: 1.7">
${hole(C.ground)}
<div style="display: flex; justify-content: space-between; font-weight: 700"><span>Field tag No. 001</span><span>That's me</span></div>
<div style="border-top: 1.5px dashed ${C.ink}; margin: 8px 0"></div>
<div style="display: grid; grid-template-columns: 96px 1fr">${rows.map(([k, v]) => `<span style="color: ${C.muted}">${k}</span><span>${v}</span>`).join("")}</div>
<div style="border-top: 1.5px dashed ${C.ink}; margin: 8px 0"></div>
<div style="display: grid; grid-template-columns: 96px 1fr; font-weight: 700"><span>Status</span><span>Still growing</span></div>
<a href="https://www.linkedin.com/in/thienle210303" style="position: absolute; left: 20px; bottom: 14px; display: flex; flex-direction: column; gap: 4px; text-decoration: none"><svg width="68" height="68" viewBox="-1 -1 31 31" shape-rendering="crispEdges" style="background: #FBFBF8">${QR_PATHS}</svg><span style="font-size: 11px; color: ${C.muted}">My LinkedIn</span></a>
<div style="position: absolute; right: 18px; bottom: 34px; transform: rotate(-6deg); border: 2.5px solid #C8102E; color: #C8102E; padding: 3px 9px; font-weight: 700; font-size: 13.5px; letter-spacing: 0.04em; opacity: 0.9">PRACTICE MAKES AI.</div>
</div></div>`;
  const ground = `<path d="M0 1780H${W}" stroke="${C.lineGround}" stroke-width="1"/>
${ripples(120, 1770, 270, 2, C.water, 5)}
${buffalo(200, 1690, 0.6, NIGHT ? "#0A1012" : "#3B433E")}
${rice(118, 1782, 6, 28, 13, C.moss, 60, 50)}
${cat(18, 1612, 0.6, C.lineGround, C.ground)}
${NIGHT ? `${stool(330, 1640, "#2E6DB4", 0.8)}${STILL.lau(330, 1638)}` : `${stool(330, 1640, "#C8352B", 0.8)}${STILL.phin(330, 1638)}`}`;
  const svg = `<svg aria-hidden="true" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="position: absolute; inset: 0">
${sky}
${bamboo}
<path d="M396 470Q372 478 362 496" fill="none" stroke="${C.twine}" stroke-width="1.1"/>
${nonLa(372, 548, 0.5)}
<path d="${line}" fill="none" stroke="${C.twine}" stroke-width="2"/>
${strings}
${ground}
</svg>`;
  boards["NatHeroPhone.dc.html"] = doc("Outdoors — hero on a phone", `<div style="width: ${W}px; height: ${H}px; box-sizing: border-box; background: ${GROUND}; color: ${C.fgGround}; font-family: 'Bricolage Grotesque', sans-serif; position: relative; overflow: hidden">
${svg}
<div style="position: absolute; left: 0; right: 0; top: 0; height: 56px; display: flex; align-items: center; justify-content: space-between; padding: 0 20px; font-size: 15px"><span style="font-weight: 600; font-size: 17px">Thien Le</span><span aria-label="Menu" style="display: inline-flex; width: 38px; height: 38px; align-items: center; justify-content: center; border: 1px solid ${C.hair}; border-radius: 3px"><svg width="16" height="12" viewBox="0 0 16 12" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M0 1h16M0 6h16M0 11h16"/></svg></span></div>
<div style="position: absolute; left: 20px; right: 20px; top: 150px">
<h1 style="margin: 0; font-size: 44px; line-height: 1; font-weight: 600; letter-spacing: -0.025em; max-width: 9.5ch">Just a curious kid, and this is my youth.</h1>
<p style="margin: 18px 0 0; font-size: 17px; line-height: 1.5; color: ${C.mutedGround}">I write software for retail data at DoorDash. Before that I was a chef in my family's restaurant. Come in, I'll show you around.</p>
<div style="display: flex; flex-direction: column; gap: 10px; margin-top: 22px; align-items: flex-start">
<a href="#" style="display: inline-flex; align-items: center; height: 50px; padding: 0 22px; background: ${C.mossDeep}; color: ${C.onControl}; font-weight: 600; font-size: 16px; text-decoration: none; border-radius: 3px">Start with where I'm from</a>
<a href="#" style="font-size: 16px; text-underline-offset: 5px; padding: 6px 0">Book a call with me</a>
</div>
</div>
<p style="position: absolute; left: 20px; top: 1060px; margin: 0; width: 140px; font-family: 'Newsreader', serif; font-style: italic; font-size: 15px; line-height: 1.3; color: ${C.mutedGround}">Press a tag and I'll tell you that part.</p>
${tags}
${field}
<p style="position: absolute; left: 22px; top: 1676px; margin: 0; font-family: 'Newsreader', serif; font-style: italic; font-size: 13px; color: ${C.mutedGround}">Moon, off duty</p>
<p style="position: absolute; right: 14px; top: 1684px; margin: 0; font-family: 'Newsreader', serif; font-style: italic; font-size: 13px; color: ${C.mutedGround}">${NIGHT ? "lẩu, after work" : "cà phê phin, first"}</p>
</div>`);
}

const NIGHT_BOARDS = TET ? ["NatContactPostcard.dc.html"] : ["NatHeroPhone.dc.html", "NatHero.dc.html", "NatJourney.dc.html", "NatRecordFinal.dc.html", "NatContactPostcard.dc.html"];
for (const [name, html] of Object.entries(boards)) {
  if ((NIGHT || TET) && !NIGHT_BOARDS.includes(name)) continue;
  const out = TET ? name.replace(".dc.html", NIGHT ? "TetNight.dc.html" : "Tet.dc.html") : NIGHT ? name.replace(".dc.html", "Night.dc.html") : name;
  fs.writeFileSync(path.join(OUT, out), NIGHT ? html.replace("<title>", "<title>Night — ") : html);
}
console.log(NIGHT ? "night boards written" : "day boards written");
