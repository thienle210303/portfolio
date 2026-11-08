/**
 * Draws the hero's, the Journey's, Contact's and the Record's scenery once into committed SVGs under
 * public/scenery/.
 *
 * The source is the approved canvas boards' generator
 * (design/round-21-outdoors/v1/source/gen-nature.mjs): every helper below is ported from it verbatim, same seeds and
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
// ---- Con trâu (round 23) ----
// Two one-colour masks painted by --scene-buffalo, both in a 250 × 104 box with
// the ground at y 94 and the animal facing left. The body is a wash (group
// opacity, so overlaps never darken) with its line over it, and the horns are
// solid: they are what a water buffalo is recognised by, so they are the
// darkest thing in the drawing. By day she is working, yoked to a plough with
// the furrow turning behind her; at night she lies down, chin on the bank.
const BUF_BOX = "0 0 250 104";
const buffaloLine = (d, w = 1.5) => `<path d="${d}" stroke-width="${w}"/>`;
// The crescent: from the poll it sweeps back over the neck and hooks up at the tip.
// A horn is a thick crescent: out of the top of the skull it sweeps back and up
// in a wide C and the tip curls in. Ridges are lines near the base, in the
// body's own value so they stay quiet. The far horn shows its arc behind.
const buffaloHorn = (x, y, s = 1) => {
  const horn = `<path d="M0 4C14 14 40 12 54 -6C58 -12 58 -20 54 -26C52 -16 46 -8 38 -3C26 2 12 0 4 -8Q-4 -3 0 4Z" stroke-width="1" stroke-linejoin="round"/>`;
  // a few ridges near the base, a gap cut through the solid by a lighter stroke is not possible
  // in one colour, so none: the crescent stays clean.
  return `<g transform="translate(${x} ${y}) rotate(-16) scale(${s})" fill="${K}" stroke="${K}"><g transform="translate(-6 -10)" opacity="0.5">${horn}</g>${horn}</g>`;
};
function buffaloPlow() {
  const body = `<g fill="${K}" opacity="0.72">`
    // a heavy barrel, a slight hump, a straight back to the hip, and a short deep head with a square muzzle
    + `<path d="M92 33C80 34 70 38 62 42C56 42 46 44 38 48C33 50 30 54 30 60L30 70C30 75 34 77 40 76C48 75 54 72 58 68C66 68 74 70 82 70C90 71 100 72 112 72C130 74 150 72 164 68C172 66 177 60 177 52C177 44 168 38 152 36C130 34 108 31 92 33Z"/>`
    // four straight legs, hooves splayed (two nearer, two behind)
    + `<path d="M80 64L81 86L77 93L95 93L91 86L92 64Z"/>`
    + `<path d="M100 66L101 86L98 93L112 93L110 86L111 66Z"/>`
    + `<path d="M132 66L133 86L130 93L144 93L142 86L143 66Z"/>`
    + `<path d="M150 62L151 86L147 93L165 93L161 86L165 62Z"/>`
    // the ear, level out to the side just under the horn
    + `<path d="M58 46C68 40 80 44 84 50C74 54 64 52 58 50Z"/></g>`;
  const ink = `<g fill="none" stroke="${K}" stroke-linecap="round" stroke-linejoin="round">`
    + buffaloLine("M92 33C108 31 130 34 152 36C168 38 177 44 177 52C177 60 172 66 164 68", 1.7)
    + buffaloLine("M164 68C150 72 130 74 112 72C100 72 90 71 82 70C74 70 66 68 58 68C54 72 48 75 40 76C34 77 30 75 30 70L30 60C30 54 33 50 38 48C46 44 56 42 62 42C70 38 80 34 92 33", 1.7)
    // legs: straight sides, and the near pair set off from the far pair
    + buffaloLine("M80 66L81 86L77 93M92 66L91 86L95 93")
    + buffaloLine("M150 64L151 86L147 93M164 64L161 86L165 93")
    + buffaloLine("M100 72L101 86L98 93M111 72L110 86L112 93", 1.1)
    + buffaloLine("M132 72L133 86L130 93M143 72L142 86L144 93", 1.1)
    // shoulder, the bony hip, two ribs
    + buffaloLine("M96 40C102 48 102 58 96 66", 1)
    + buffaloLine("M152 40C144 48 144 56 150 62", 1)
    + buffaloLine("M118 50C122 56 122 64 118 71M132 50C136 56 136 64 132 72", 0.8)
    // ear, eye, nostril and mouth
    + buffaloLine("M58 46C68 40 80 44 84 50C74 54 64 52 58 50Z", 1.1)
    + `<circle cx="45" cy="55" r="1.8" fill="${K}" stroke="none"/>`
    + `<circle cx="34" cy="65" r="1.6" fill="${K}" stroke="none"/>`
    + buffaloLine("M31 72Q36 74 41 73", 1.1)
    // the thin tail and its tuft
    + buffaloLine("M177 48C185 52 188 62 185 74", 1.7)
    + `</g>`
    + `<path d="M184 72C180 80 182 88 186 87C190 86 190 78 186 72Z" fill="${K}"/>`
    + `<path d="M77 90h18v3h-18ZM98 90h14v3h-14ZM130 90h14v3h-14ZM147 90h18v3h-18Z" fill="${K}"/>`;
  // The yoke sits on the shoulders with its two pegs and a cord under the neck;
  // the trace runs back under the belly to the plough she drags.
  const yoke = `<g fill="none" stroke="${K}" stroke-linecap="round" stroke-linejoin="round">`
    + `<path d="M102 36L120 33" stroke-width="4.6"/>`
    + `<path d="M105 38L104 62M118 34L120 60" stroke-width="1.9"/>`
    + `<path d="M104 62Q112 68 120 60" stroke-width="1.5"/>`
    + `<path d="M120 60C146 82 174 82 204 76" stroke-width="1.2"/>`
    // the plough: beam, handle, share, and the soil it turns
    + `<path d="M204 76C210 82 214 88 215 93" stroke-width="2.6"/>`
    + `<path d="M215 93C222 84 228 68 232 52" stroke-width="2.4"/>`
    + `<path d="M227 52h13" stroke-width="2.4"/>`
    + `<path d="M203 94h17l-2 -5Z" fill="${K}" stroke-width="1"/>`
    + `<path d="M222 93q7 -5 14 0t14 0M226 98q7 -4 14 0t10 0" stroke-width="1.1"/>`
    // mud about her feet
    + `<path d="M62 97h14M104 98h18M150 97h16M180 98h12" stroke-width="1"/>`
    + `</g>`;
  return body + ink + buffaloHorn(56, 41, 0.85) + yoke;
}
function buffaloSleep() {
  const body = `<g fill="${K}" opacity="0.8">`
    + `<path d="M98 54C114 46 140 48 160 52C178 55 192 66 194 78C195 88 190 92 180 93L92 93C84 93 80 88 80 80C80 68 86 60 98 54Z"/>`
    // the same short, deep head, resting level on the bank
    + `<path d="M88 58C74 58 60 62 50 67C42 70 40 74 40 80L40 88C40 93 44 94 50 94C62 94 76 92 86 86Z"/>`
    + `<path d="M70 66C78 60 90 62 96 68C86 72 76 72 70 70Z"/></g>`;
  const ink = `<g fill="none" stroke="${K}" stroke-linecap="round" stroke-linejoin="round">`
    + buffaloLine("M98 54C114 46 140 48 160 52C178 55 192 66 194 78C195 88 190 92 180 93", 1.7)
    + buffaloLine("M88 58C74 58 60 62 50 67C42 70 40 74 40 80L40 88C40 93 44 94 50 94C62 94 76 92 86 86", 1.7)
    + buffaloLine("M92 93C84 93 80 88 80 80", 1.2)
    // the fore-leg folded under the chin, the haunch and hock behind
    + buffaloLine("M86 86C76 84 64 86 54 90", 1.3)
    + buffaloLine("M150 58C140 68 142 84 156 91", 1.1)
    + buffaloLine("M164 60C172 68 172 82 164 90", 0.9)
    // the closed eye, a nostril, the ear
    + buffaloLine("M60 76q5 4 10 0", 1.7)
    + `<circle cx="45" cy="82" r="1.6" fill="${K}" stroke="none"/>`
    + buffaloLine("M70 66C78 60 90 62 96 68C86 72 76 72 70 70Z", 1.1)
    // the tail curled on the bank
    + buffaloLine("M194 74C204 78 206 88 198 93", 1.8)
    + `</g>`
    + `<path d="M199 92C192 89 188 93 186 93C190 96 197 96 199 92Z" fill="${K}"/>`;
  const zs = `<g fill="none" stroke="${K}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">`
    + `<path d="M20 56h12l-12 13h12"/><path d="M38 30h16l-16 18h16"/></g>`;
  const mud = `<path d="M56 97h16M110 98h22M160 97h20" fill="none" stroke="${K}" stroke-width="1" stroke-linecap="round"/>`;
  return body + ink + buffaloHorn(80, 61, 0.9) + zs + mud;
}

// ---- Ruộng lúa: the hero's paddy (round 24) ----
// A Vietnamese paddy, not a meadow: flooded plots split by earthen dykes (bờ
// ruộng) that curve gently away, transplanted clumps (bụi lúa) in rows that
// close up and converge with distance, each standing in the water on its own
// broken reflection, and on the near bank a few ripe stalks whose ears (bông
// lúa) hang heavy. One perspective for the whole board: depth z is 1 at the
// near bank, a row sits at yH + span / z and a column at vpx + (x - vpx) / z,
// so the clumps shrink, the rows close up and the columns meet at the
// vanishing point. Two masks per board: the rice and its banks (painted like
// the hero's other plants) and the water. The plot the buffalo walks in is
// bare (she is ploughing it), and nothing is planted behind her, since she is
// drawn over the field at less than full ink. `paddy-wake` is the mud she
// turns, drawn in her own box so it follows the plough at every size.
export const PADDY = {
  // From 1024: one unit a pixel, the buffalo's 192 × 80 box at x 327, y 80.
  wide: {
    W: 750, H: 190, yH: 8, yN: 176, vpx: 420, seed: 24,
    h0: 17, dx: 44, fine: 9, tick: 4.2,
    dykes: [
      { z: 1.62, amp: 0.035, period: 620, ph: 0.6, tilt: 0.05, th: 0.05 },
      { z: 2.5, amp: 0.04, period: 540, ph: 2.1, tilt: -0.04, th: 0.05 },
      { z: 3.8, amp: 0.045, period: 480, ph: 4.2, tilt: 0.03, th: 0.055 },
      { z: 5.8, amp: 0.05, period: 420, ph: 1.2, tilt: -0.03, th: 0.06 },
    ],
    zFar: 9.5,
    // rows of clumps in each plot, near to far
    rows: [3, 2, 2, 2, 1],
    lateral: [{ xw: 300, w: 9 }, { xw: 780, w: 9 }, { xw: -260, w: 9 }],
    // plots of still water, nothing planted yet: [plot, from, to] across the field
    bare: [[0, 300, 780], [2, -260, 300], [3, 780, 2000]],
    clear: [[336, 88, 398, 162], [398, 100, 482, 162], [482, 112, 528, 162]],
    bank: { amp: 2.2, period: 520, ph: 1, grass: 22 },
    stalks: [
      { x: 152, h: 92, lean: 10, dir: 1, ear: 31 },
      { x: 178, h: 116, lean: 18, dir: 1, ear: 36 },
      { x: 206, h: 102, lean: 24, dir: 1, ear: 33 },
      { x: 238, h: 84, lean: 20, dir: 1, ear: 29 },
      { x: 632, h: 98, lean: -12, dir: -1, ear: 33 },
      { x: 662, h: 114, lean: -18, dir: -1, ear: 35 },
      { x: 694, h: 88, lean: -10, dir: -1, ear: 30 },
    ],
    grain: 1,
    // the hamlet's trees on the far edge, and its palms: [x, height, lean]
    trees: 6, palms: [[96, 21, -2], [118, 16, 3], [508, 19, 2], [612, 23, -3], [636, 17, 2]],
  },
  // Below 1024: the buffalo's 120 × 50 box at x 360, y 94, so her feet are in
  // the water just above the bank (the board stands 24px up, clear of the
  // captions). Under 360 the page shrinks the board with her.
  phone: {
    W: 840, H: 150, yH: 4, yN: 145, vpx: 430, seed: 25,
    h0: 13, dx: 30, fine: 7, tick: 3.6,
    dykes: [
      { z: 1.7, amp: 0.035, period: 520, ph: 0.9, tilt: 0.05, th: 0.06 },
      { z: 2.8, amp: 0.04, period: 460, ph: 2.6, tilt: -0.04, th: 0.06 },
      { z: 4.4, amp: 0.05, period: 400, ph: 4.4, tilt: 0.03, th: 0.065 },
    ],
    zFar: 7.5,
    rows: [2, 2, 2, 1],
    lateral: [{ xw: 330, w: 7 }, { xw: 600, w: 7 }, { xw: 30, w: 7 }, { xw: 880, w: 7 }],
    bare: [[0, 330, 600], [1, 880, 2000], [2, 30, 330]],
    clear: [[366, 98, 404, 147], [404, 106, 456, 147], [456, 112, 482, 147]],
    bank: { amp: 1.4, period: 420, ph: 0.4, grass: 18 },
    stalks: [
      { x: 322, h: 70, lean: 8, dir: 1, ear: 25 },
      { x: 340, h: 84, lean: 12, dir: 1, ear: 27 },
      { x: 355, h: 62, lean: 8, dir: 1, ear: 22 },
      { x: 520, h: 66, lean: -8, dir: -1, ear: 24 },
      { x: 538, h: 80, lean: -12, dir: -1, ear: 26 },
      { x: 196, h: 64, lean: 8, dir: 1, ear: 23 },
      { x: 214, h: 76, lean: 12, dir: 1, ear: 25 },
      { x: 664, h: 74, lean: -10, dir: -1, ear: 25 },
      { x: 684, h: 60, lean: -6, dir: -1, ear: 22 },
    ],
    grain: 0.9,
    trees: 5, palms: [[150, 16, -2], [262, 18, 2], [282, 13, -1], [560, 17, -2], [700, 15, 2], [716, 19, -2]],
  },
};
const pts = (a) => a.map(([x, y], i) => `${i ? "L" : "M"}${f(x)} ${f(y)}`).join("");
/** Shorter path data, same shapes: no space before a minus sign, no leading zero. */
const tidy = (text) => text.replace(/ d="([^"]*)"/g, (_, d) => ` d="${d.replace(/ -/g, "-").replace(/(^|[^\d.])0\./g, "$1.")}"`);
/** A transplanted clump: blades fanning up from one point, the outer ones bending out. */
function paddyClump(x, y, h, r) {
  const n = h > 15 ? 6 : 5;
  let d = `M${f(x)} ${f(y)}`, back = "";
  for (let k = 0; k < n; k++) {
    const a = (-1 + (2 * k) / (n - 1)) * 0.6 + (r() - 0.5) * 0.18;
    const L = h * (1 - 0.32 * Math.abs(a)) * (0.86 + r() * 0.28);
    const tx = f(Math.sin(a) * L * 1.25), ty = f(-Math.cos(a) * L);
    d += `${back}q${f(Math.sin(a) * L * 0.2)} ${f(-L * 0.78)} ${tx} ${ty}`;
    back = `m${-tx} ${-ty}`;
  }
  return d;
}
/** Smaller and further off: three or four straight blades. */
function paddySprig(x, y, h, r) {
  const n = h > 7 ? 4 : 3;
  let d = `M${f(x)} ${f(y)}`, back = "";
  for (let k = 0; k < n; k++) {
    const a = (-1 + (2 * k) / (n - 1)) * 0.5 + (r() - 0.5) * 0.14;
    const tx = f(Math.sin(a) * h * 1.1), ty = f(-Math.cos(a) * h * (1 - 0.25 * Math.abs(a)));
    d += `${back}l${tx} ${ty}`;
    back = `m${-tx} ${-ty}`;
  }
  return d;
}
/** A clump's reflection: the waterline it stands in, and its blades mirrored and broken. */
function paddyReflection(x, y, h, near) {
  const w = h * 0.34, L = h * 0.62;
  let d = `M${f(x - w)} ${f(y + 0.5)}h${f(2 * w)}`;
  const seg = (a, t0, t1) => {
    const sx = Math.sin(a) * 1.2, cy = Math.cos(a);
    d += `M${f(x + sx * L * t0)} ${f(y + 1 + cy * L * t0)}l${f(sx * L * (t1 - t0))} ${f(cy * L * (t1 - t0))}`;
  };
  if (near) { seg(0, 0.16, 0.46); seg(0, 0.6, 0.82); seg(-0.45, 0.2, 0.55); seg(0.45, 0.2, 0.55); }
  else seg(0, 0.2, 0.62);
  return d;
}
/** A leaf off a stalk: long and narrow, arching out and drooping at the tip. */
function riceLeaf(x, y, side, len, w) {
  const p = [[x, y], [x + side * len * 0.06, y - len * 0.62], [x + side * len * 0.34, y - len * 0.98], [x + side * len * 0.64, y - len * 0.8]];
  const n = [[x + side * w, y], [p[1][0] + side * w, p[1][1] + w * 0.4], [p[2][0] + side * w * 0.3, p[2][1] + w], p[3]];
  return `M${f(p[0][0])} ${f(p[0][1])}C${f(p[1][0])} ${f(p[1][1])} ${f(p[2][0])} ${f(p[2][1])} ${f(p[3][0])} ${f(p[3][1])}`
    + `C${f(n[2][0])} ${f(n[2][1])} ${f(n[1][0])} ${f(n[1][1])} ${f(n[0][0])} ${f(n[0][1])}Z`;
}
/**
 * A ripe stalk on the near bank: the stem, two leaves and a flag leaf, and the
 * ear arching over and hanging heavy, its grains along the rachis and two
 * branches beside it. Grains are short round-capped strokes, so the whole crop
 * of them is one path.
 */
function ripeStalk(s, y, r, g) {
  const top = [s.x + s.lean, y - s.h];
  let stem = `M${f(s.x)} ${f(y)}Q${f(s.x + s.lean * 0.1)} ${f(y - s.h * 0.55)} ${f(top[0])} ${f(top[1])}`;
  let leaves = riceLeaf(s.x, y - 2, -s.dir, s.h * (0.5 + r() * 0.2), 2.2 * g)
    + riceLeaf(s.x + s.lean * 0.05, y - s.h * 0.22, s.dir, s.h * (0.45 + r() * 0.2), 2 * g);
  // the flag leaf, up the stem and leaning away from the ear
  const fl = [s.x + s.lean * 0.45, y - s.h * 0.6];
  leaves += `M${f(fl[0])} ${f(fl[1])}q${f(-s.dir * 4 * g)} ${f(-s.h * 0.22)} ${f(-s.dir * 10 * g)} ${f(-s.h * 0.36)}q${f(s.dir * 2 * g)} ${f(s.h * 0.2)} ${f(s.dir * 12 * g)} ${f(s.h * 0.36)}Z`;
  const L = s.ear, dir = s.dir;
  const rachis = [top, [top[0] + dir * L * 0.06, top[1] - L * 0.2], [top[0] + dir * L * 0.4, top[1] - L * 0.22], [top[0] + dir * L * 0.52, top[1] + L * 0.72]];
  stem += `M${f(top[0])} ${f(top[1])}C${rachis.slice(1).map(([a, b]) => `${f(a)} ${f(b)}`).join(" ")}`;
  let grains = "";
  // A grain each `gap` along the curve, alternate sides, each pointing on
  // down the rachis and a little out, smaller toward the tip.
  const grainsOn = (p, t0, gap, off, size) => {
    let prev = cubic(p, t0), acc = gap * 0.6, k = 0;
    for (let i = 1; i <= 48; i++) {
      const t = t0 + ((1 - t0) * i) / 48, q = cubic(p, t);
      acc += Math.hypot(q[0] - prev[0], q[1] - prev[1]);
      prev = q;
      if (acc < gap) continue;
      acc = 0;
      const [dx, dy] = cubicD(p, t), len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len;
      const side = k++ % 2 ? 1 : -1, gl = size * (1 - 0.4 * ((t - t0) / (1 - t0)));
      const ang = Math.atan2(uy, ux) + side * 0.5;
      grains += `M${f(q[0] - uy * off * side)} ${f(q[1] + ux * off * side)}l${f(Math.cos(ang) * gl)} ${f(Math.sin(ang) * gl)}`;
    }
  };
  grainsOn(rachis, 0.4, 1.8 * g, 1.2 * g, 1.7 * g);
  // a branch off the top of the arch, hanging inside the rachis
  const [bx, by] = cubic(rachis, 0.5), end = cubic(rachis, 1);
  const branch = [[bx, by], [bx + dir * L * 0.08, by + L * 0.1], [end[0] - dir * L * 0.08, by + (end[1] - by) * 0.4], [end[0] - dir * L * 0.14, by + (end[1] - by) * 0.8]];
  stem += `M${f(bx)} ${f(by)}C${branch.slice(1).map(([a, c]) => `${f(a)} ${f(c)}`).join(" ")}`;
  grainsOn(branch, 0.3, 2 * g, 1.1 * g, 1.5 * g);
  return { stem, leaves, grains };
}
/**
 * The far edge of the fields: a line of trees round a hamlet, bush by bush,
 * with gaps, and here and there a coconut palm over them. Washed, since it is
 * far off; it also keeps the board from ending in a ruled line.
 */
function farTrees(c, yAt, r) {
  let bush = "", palm = "";
  for (let x = -8; x < c.W + 8;) {
    if (r() < 0.22) { x += 10 + r() * 26; continue; }
    const y = yAt(x) + 0.6, n = 2 + Math.floor(r() * 4);
    let d = `M${f(x)} ${f(y)}`, px = x;
    for (let i = 0; i < n; i++) {
      const w = 5 + r() * 7, h = 3 + r() * c.trees;
      d += `q${f(w * 0.1)} ${f(-h * 1.3)} ${f(w / 2)} ${f(-h)}t${f(w / 2)} ${f(h)}`;
      px += w;
    }
    bush += `${d}Z`;
    x = px + 2 + r() * 8;
  }
  for (const [x, h, lean] of c.palms) {
    const y = yAt(x) + 0.5, tx = x + lean, ty = y - h;
    palm += `M${f(x)} ${f(y)}q${f(lean * 0.2)} ${f(-h * 0.6)} ${f(lean)} ${f(-h)}`;
    for (const [dx, dy] of [[-7, 3], [-5, 5], [-2, 6], [3, 5], [6, 4], [8, 1], [-8, 0]]) {
      palm += `M${f(tx)} ${f(ty)}q${f(dx * 0.5)} ${f(-2.4)} ${f(dx)} ${f(dy)}`;
    }
  }
  return `<g opacity="0.42"><path d="${bush}" fill="${K}"/><path d="${palm}" fill="none" stroke="${K}" stroke-width="0.9" stroke-linecap="round"/></g>`;
}
function paddyBoard(c) {
  const r = rng(c.seed), span = c.yN - c.yH;
  const Y = (z) => c.yH + span / z;
  const X = (xw, z) => c.vpx + (xw - c.vpx) / z;
  const XW = (x, z) => c.vpx + (x - c.vpx) * z;
  const dykeZ = (d, x) => d.z * (1 + d.amp * Math.sin((x / d.period) * 2 * Math.PI + d.ph) + (d.tilt * (x - c.W / 2)) / c.W);
  const bankY = (x) => c.yN + c.bank.amp * Math.sin((x / c.bank.period) * 2 * Math.PI + c.bank.ph);
  const xs = []; for (let x = -12; x <= c.W + 12; x += 21) xs.push(x);
  if (xs[xs.length - 1] < c.W + 12) xs.push(c.W + 12);
  // The near bank's waterline counts as a dyke at depth 1 with no band.
  const near = { z: 1, amp: 0, period: 1, ph: 0, tilt: 0, th: 0 };
  const far = { z: c.zFar, amp: 0.02, period: 700, ph: 0.3, tilt: 0, th: 0 };
  const lines = [near, ...c.dykes, far];
  const hits = (x0, y0, x1, y1) => c.clear.some(([a, b, cc, d]) => x0 < cc && a < x1 && y0 < d && b < y1);

  // Water: one wash over every plot, from the far edge to the near bank.
  const water = { wash: pts([...xs.map((x) => [x, Y(dykeZ(far, x))]), ...xs.slice().reverse().map((x) => [x, bankY(x)])]) + "Z", lines: "", reflect: "", ticks: "" };
  const rice = { banks: "", edges: "", clumps: "", sprigs: "", ticks: "", grass: "" };

  // The dykes: a band of bank (its fill is washed) and the line where it meets the water.
  for (const d of c.dykes) {
    const lo = xs.map((x) => [x, Y(dykeZ(d, x))]), hi = xs.map((x) => [x, Y(dykeZ(d, x) * (1 + d.th))]);
    rice.banks += pts([...lo, ...hi.reverse()]) + "Z";
    rice.edges += `<path d="${pts(lo)}" stroke-width="${f(Math.max(0.6, 1.5 / Math.sqrt(d.z)))}"/>`;
  }
  // Dykes running away from me, narrowing to the vanishing point.
  for (const l of c.lateral) {
    const zs = []; for (let z = 1; z <= c.zFar * 1.001; z *= 1.16) zs.push(z);
    const a = zs.map((z) => [X(l.xw - l.w / 2, z), Y(z)]), b = zs.map((z) => [X(l.xw + l.w / 2, z), Y(z)]);
    rice.banks += pts([...a, ...b.reverse()]) + "Z";
    rice.edges += `<path d="${pts(zs.map((z) => [X(l.xw - l.w / 2, z), Y(z)]))}" stroke-width="0.7"/>`;
  }
  // The near bank, with grass along its top.
  rice.banks += pts([...xs.map((x) => [x, bankY(x)]), [c.W + 12, c.H + 2], [-12, c.H + 2]]) + "Z";
  rice.edges += `<path d="${pts(xs.map((x) => [x, bankY(x)]))}" stroke-width="1.3"/>`;
  for (let x = 4 + r() * 6; x < c.W - 2; x += c.bank.grass * (0.7 + r() * 0.6)) {
    const y = bankY(x) + 1 + r() * 3, h = 3 + r() * 4;
    rice.grass += `M${f(x - h * 0.5)} ${f(y - h * 0.8)}l${f(h * 0.5)} ${f(h * 0.8)}l${f(h * 0.4)} ${f(-h)}`;
  }

  // The rice, plot by plot, near to far.
  for (let p = 0; p < lines.length - 1; p++) {
    const a = lines[p], b = lines[p + 1];
    const bare = c.bare.filter(([bp]) => bp === p);
    const isBare = (xw) => bare.some(([, lo, hi]) => xw > lo && xw < hi);
    const n = c.rows[p];
    for (let k = 0; k < n; k++) {
      const u = 0.16 + (0.68 * (k + 0.5)) / n;
      const rowZ = (x) => { const za = dykeZ(a, x) * (1 + a.th), zb = dykeZ(b, x); return za + (zb - za) * u; };
      const zc = rowZ(c.W / 2), h = c.h0 / zc;
      if (h < c.tick) {
        // Too far to tell one clump from the next: a row of ticks, one per
        // column, broken where a plot lies bare.
        const per = c.dx / zc, th = h * 0.95, cuts = bare.map(([, lo, hi]) => [X(lo, zc), X(hi, zc)]);
        let from = -12;
        for (const [x0, x1] of [...cuts.sort((m, q) => m[0] - q[0]), [c.W + 12, c.W + 12]]) {
          if (x0 > from + 4) {
            const seg = xs.filter((x) => x > from && x < x0);
            const row = [[from, 0], ...seg.map((x) => [x, 0]), [Math.min(x0, c.W + 12), 0]].map(([x]) => [x, Y(rowZ(x)) - th / 2]);
            const off = (((from - X(0, zc)) % per) + per) % per;
            const dash = `stroke-dasharray="0.9 ${f(per - 0.9)}" stroke-dashoffset="${f(off)}"`;
            rice.ticks += `<path d="${pts(row)}" stroke-width="${f(th)}" ${dash}/>`;
            water.ticks += `<path d="${pts(row.map(([x, y]) => [x, y + th * 1.05]))}" stroke-width="${f(th * 0.5)}" ${dash}/>`;
          }
          from = Math.max(from, x1);
        }
        continue;
      }
      const xwL = XW(-10, zc), xwR = XW(c.W + 10, zc);
      for (let j = Math.ceil(xwL / c.dx); j * c.dx <= xwR; j++) {
        const xw = j * c.dx + (r() - 0.5) * c.dx * 0.16, hh = h * (0.85 + r() * 0.3), jit = (r() - 0.5) * 0.5;
        if (isBare(xw) || c.lateral.some((l) => Math.abs(xw - l.xw) < l.w * 1.2)) continue;
        const x = X(xw, zc), y = Y(rowZ(x)) + jit;
        if (x < -6 || x > c.W + 6 || hits(x - hh * 0.6, y - hh, x + hh * 0.6, y + 2)) continue;
        if (hh >= c.fine) rice.clumps += paddyClump(x, y, hh, r);
        else rice.sprigs += paddySprig(x, y, hh, r);
        water.reflect += paddyReflection(x, y, hh, hh >= c.fine);
      }
    }
    // Light on the water: on still water most of all.
    for (let i = 0; i < (p === 0 ? 18 : 9); i++) {
      const u = 0.1 + r() * 0.8, x = r() * c.W, zr = dykeZ(a, x) * (1 + a.th) + (dykeZ(b, x) - dykeZ(a, x) * (1 + a.th)) * u;
      const y = Y(zr), len = (10 + r() * 26) / zr;
      if (hits(x - 2, y - 2, x + len + 2, y + 2)) continue;
      water.lines += `M${f(x)} ${f(y)}h${f(len)}`;
    }
  }

  // Ripe stalks on the near bank.
  const ears = { stem: "", leaves: "", grains: "" };
  for (const s of c.stalks) {
    const e = ripeStalk(s, bankY(s.x) + 2, r, c.grain);
    ears.stem += e.stem; ears.leaves += e.leaves; ears.grains += e.grains;
  }

  return {
    rice: tidy(`<g fill="${K}" opacity="0.26"><path d="${rice.banks}"/></g>`
      + farTrees(c, (x) => Y(dykeZ(far, x)), rng(c.seed + 100))
      + `<g fill="none" stroke="${K}" stroke-linecap="round" stroke-linejoin="round">${rice.edges}`
      + `<path d="${rice.grass}" stroke-width="0.8"/>`
      + `<path d="${rice.clumps}" stroke-width="1.15"/><path d="${rice.sprigs}" stroke-width="0.85"/>`
      + `<g stroke-linecap="butt" opacity="0.75">${rice.ticks}</g>`
      + `<path d="${ears.stem}" stroke-width="1.25"/>`
      + `<path d="${ears.grains}" stroke-width="${f(1.7 * c.grain)}"/></g>`
      + `<path d="${ears.leaves}" fill="${K}"/>`),
    water: tidy(`<path d="${water.wash}" fill="${K}" opacity="0.32"/>`
      + `<g fill="none" stroke="${K}" stroke-linecap="round"><path d="${water.lines}" stroke-width="1"/>`
      + `<path d="${water.reflect}" stroke-width="0.9"/><g stroke-linecap="butt" opacity="0.8">${water.ticks}</g></g>`),
  };
}
/** The mud she turns behind the plough, in the buffalo's own coordinates, running on past her box. */
function paddyWake() {
  const r = rng(26); let ridges = "", rings = "";
  // turned mud ridges, trailing off behind the share
  for (let i = 0; i < 4; i++) {
    const y = 95 + i * 2.6, x0 = 222 + i * 4, len = 120 - i * 22;
    let d = `M${f(x0)} ${f(y)}`;
    for (let x = 0; x < len; x += 12) d += `q3 ${f(-1.4 - r() * 0.8)} 6 0t6 0`;
    ridges += `<path d="${d}" opacity="${f(0.95 - i * 0.18)}"/>`;
  }
  // ripples spreading from the share, flattened by the eye's low angle
  for (const [rx, o] of [[10, 0.9], [19, 0.6], [29, 0.35]]) {
    rings += `<path d="M${f(220 - rx)} ${f(96)}a${rx} ${f(rx * 0.22)} 0 0 0 ${2 * rx} 0" opacity="${o}"/>`;
  }
  return `<g fill="none" stroke="${K}" stroke-width="1" stroke-linecap="round">${ridges}${rings}</g>`;
}

// ---- Moon in a võng (round 23) ----
// Moon, the blue cat, in a Vietnamese hammock slung between two bamboo
// stakes: her head on the rim, a paw and the tail hanging over. By day her
// eyes are half open; at night they are shut and she snores. Art, not ink: the
// cat is a colour (the blue cat), and the page swaps the file by theme
// (`--art-offduty`), like the vignettes.
const VONG_BOX = "0 0 150 84";
function moonVong(night) {
  const C = night
    ? { fur: "#8FA3B3", shade: "#6B8092", line: "#1C2A30", ear: "#C99AA0", cord: "#A9A07F", band: "#D8CFB4", stripe: "#6C9C95", bam: "#4C6A55", bamLine: "#9DBE8E", iris: "#E4D48A", ground: "#5C7A74", z: "#E8EEDF" }
    : { fur: "#8CA0B0", shade: "#6F8393", line: "#2E3A44", ear: "#D9A7A7", cord: "#A88A52", band: "#F0E7CE", stripe: "#4F8C86", bam: "#B4C8A8", bamLine: "#3F5E35", iris: "#D8C468", ground: "#8FA39C", z: "#5B6B7E" };
  const q = (a, c, b, t) => (1 - t) * (1 - t) * a + 2 * t * (1 - t) * c + t * t * b;
  const topY = (t) => q(26, 84, 26, t), botY = (t) => q(30, 98, 30, t), xAt = (t) => 14 + 122 * t;
  // two bamboo stakes, each with a few nodes and a short leaf
  const stake = (x, dir) => `<path d="M${x - 3} 80L${x - 2.6} 14L${x + 3.4} 12L${x + 3} 80Z" fill="${C.bam}" stroke="${C.bamLine}" stroke-width="1.1" stroke-linejoin="round"/>`
    + [30, 50, 68].map((y) => `<path d="M${x - 3.6} ${y}Q${x} ${y - 2} ${x + 3.8} ${y}" fill="none" stroke="${C.bamLine}" stroke-width="1.5" stroke-linecap="round"/>`).join("")
    + `<path d="M${x + 0.2} 13Q${x + dir * 8} 4 ${x + dir * 16} 8Q${x + dir * 8} 12 ${x + 0.2} 13Z" fill="${C.bam}" stroke="${C.bamLine}" stroke-width="0.9" stroke-linejoin="round"/>`;
  // the mesh across the band, both ways, then its edges and the coloured stripe
  let mesh = "";
  for (let i = 0; i < 20; i++) {
    const t = i / 20, u = Math.min(1, t + 0.05);
    mesh += `M${f(xAt(t))} ${f(topY(t))}L${f(xAt(u))} ${f(botY(u))}M${f(xAt(u))} ${f(topY(u))}L${f(xAt(t))} ${f(botY(t))}`;
  }
  const band = `<path d="M14 26Q75 84 136 26L136 30Q75 98 14 30Z" fill="${C.band}"/>`
    + `<path d="M14 28Q75 91 136 28" fill="none" stroke="${C.stripe}" stroke-width="2.2"/>`
    + `<path d="${mesh}" fill="none" stroke="${C.cord}" stroke-width="0.6" stroke-opacity="0.85"/>`
    + `<path d="M14 26Q75 84 136 26M14 30Q75 98 136 30" fill="none" stroke="${C.cord}" stroke-width="1.3" stroke-linecap="round"/>`
    // the lashing where each end is tied to its stake
    + `<path d="M10.5 24h9M10.5 27h9M10.5 30h9M130.5 24h9M130.5 27h9M130.5 30h9" stroke="${C.cord}" stroke-width="1.4" stroke-linecap="round"/>`;
  const fur = `fill="${C.fur}" stroke="${C.line}" stroke-width="1.3" stroke-linejoin="round" stroke-linecap="round"`;
  // her body, behind the band: only the back of it shows above the rim
  const body = `<clipPath id="vongTop"><path d="M0 0H150V28L136 28Q75 91 14 28Z"/></clipPath><g clip-path="url(#vongTop)">`
    + `<path d="M38 48C40 36 56 30 74 31C92 32 106 38 108 52L108 70L38 70Z" ${fur}/>`
    + `<path d="M60 34C74 32 92 34 102 40" fill="none" stroke="${C.shade}" stroke-width="1" stroke-linecap="round"/>`
    + `<path d="M92 40C100 44 102 54 98 62" fill="none" stroke="${C.shade}" stroke-width="1" stroke-linecap="round"/></g>`;
  // her head on the rim, left; ears, then the face
  const eyes = night
    ? `<path d="M27.4 35q3 3.2 6 0M36 35q3 3.2 6 0" fill="none" stroke="${C.line}" stroke-width="1.4" stroke-linecap="round"/>`
    : `<path d="M27.4 35h6q-3 4.2 -6 0ZM36 35h6q-3 4.2 -6 0Z" fill="${C.iris}" stroke="${C.line}" stroke-width="1" stroke-linejoin="round"/><path d="M30.4 35.4v2.6M39 35.4v2.6" stroke="${C.line}" stroke-width="1.1" stroke-linecap="round"/>`;
  const head = `<path d="M22 38L23 23L32 29ZM44 38L45 23L36 29Z" ${fur}/>`
    + `<path d="M24.6 32L25 27.5L28.6 30ZM42.4 32L42 27.5L38.4 30Z" fill="${C.ear}" stroke="none"/>`
    + `<ellipse cx="34.5" cy="36" rx="13.5" ry="10" ${fur}/>`
    + eyes
    + `<path d="M33 40.4l1.5 1.4l1.5 -1.4Z" fill="${C.ear}" stroke="${C.line}" stroke-width="0.8" stroke-linejoin="round"/>`
    + `<path d="M34.5 41.8q-1.4 2 -3.4 1.6M34.5 41.8q1.4 2 3.4 1.6M26 40l-9 -1.4M26 42.2l-8 2M43 40l9 -1.4M43 42.2l8 2" fill="none" stroke="${C.line}" stroke-width="0.7" stroke-linecap="round"/>`;
  // a forepaw hanging over the front of the band, and the tail down the right
  const paw = `<path d="M48 49C47 56 47 62 48.5 66C50 69.500 54 69.500 55.500 66C57 62 56.500 56 56 50Z" ${fur}/><path d="M51 67.500v-3M54 67.500v-3" stroke="${C.line}" stroke-width="0.7" stroke-linecap="round"/>`;
  const tail = `<path d="M104 44C116 46 122 54 120 66" fill="none" stroke="${C.line}" stroke-width="5.8" stroke-linecap="round"/><path d="M104 44C116 46 122 54 120 66" fill="none" stroke="${C.fur}" stroke-width="3.8" stroke-linecap="round"/>`;
  const ground = `<path d="M2 81h24M44 82h66M118 81h30" fill="none" stroke="${C.ground}" stroke-width="1.2" stroke-linecap="round"/>`;
  const zz = night ? `<g fill="none" stroke="${C.z}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M56 18h8l-8 9h8"/><path d="M69 6h11l-11 12h11"/></g>` : "";
  return ground + stake(12, 1) + stake(138, -1) + body + head + band + paw + tail + zz;
}
// The poles run on below the board's ground (y 900): the hero is top-anchored
// to the clothesline and can be taller than the board, so the element clips
// whatever it does not need. The bamboo's extra nodes keep the 74px rhythm.
const BAMBOO_FOOT = 900 + 74 * 6;
// Round 25: the pine's bare trunk runs on a long way, so from 640 to 1023,
// where it stands in the ground at the yard's right edge, it reaches the
// paddy however tall the section is.
const PINE_FOOT = 2600;
/**
 * A bamboo culm, drawn as one would by hand (round 22: the two straight lines
 * per segment read as generated). Each internode is a washed body that tapers
 * a little going up, with a gentle lean; each node is a raised ring over the
 * scar its sheath left; a highlight runs down one side and a few fibre marks
 * sit above each node. `cx` is the stem's centre at the foot, `top` where the
 * last node is, `step` the node rhythm, `w0`/`w1` its width at foot and top.
 * Returns the outline and the wash apart, so the caller can wash it.
 */
function culm({ cx, top, foot, step, w0, w1, lean, seed, wobble = 0.5 }) {
  const r = rng(seed);
  const n = Math.round((foot - top) / step);
  let wash = "", ink = "", fine = "";
  const at = (y) => {
    const t = (foot - y) / (foot - top);
    return { x: cx + lean * t + Math.sin(t * 5.1) * wobble, w: w0 + (w1 - w0) * t };
  };
  for (let i = 0; i < n; i++) {
    const y0 = foot - i * step, y1 = y0 - step + 3;
    const a = at(y0), b = at(y1);
    const al = a.x - a.w / 2, ar = a.x + a.w / 2, bl = b.x - b.w / 2, br = b.x + b.w / 2;
    // The internode swells a hair under each node.
    wash += `<path d="M${f(al)} ${f(y0)}Q${f((al + bl) / 2 + 0.4)} ${f((y0 + y1) / 2)} ${f(bl - 0.3)} ${f(y1)}L${f(br + 0.3)} ${f(y1)}Q${f((ar + br) / 2 - 0.4)} ${f((y0 + y1) / 2)} ${f(ar)} ${f(y0)}Z"/>`;
    ink += `<path d="M${f(al)} ${f(y0)}Q${f((al + bl) / 2 + 0.4)} ${f((y0 + y1) / 2)} ${f(bl - 0.3)} ${f(y1)}M${f(ar)} ${f(y0)}Q${f((ar + br) / 2 - 0.4)} ${f((y0 + y1) / 2)} ${f(br + 0.3)} ${f(y1)}"/>`;
    // The node above: a raised ring, and the sheath's scar just under it.
    const yn = y1 - 1.5;
    ink += `<path d="M${f(bl - 1.4)} ${f(yn + 0.6)}Q${f(b.x)} ${f(yn - 2.6)} ${f(br + 1.4)} ${f(yn + 0.6)}" stroke-width="1.9"/>`;
    fine += `<path d="M${f(bl)} ${f(y1 + 1.6)}Q${f(b.x)} ${f(y1 - 0.2)} ${f(br)} ${f(y1 + 1.6)}"/>`;
    // A highlight down the lit side, broken short of both nodes.
    fine += `<path d="M${f(al + a.w * 0.28)} ${f(y0 - 6)}L${f(bl + b.w * 0.28)} ${f(y1 + 7)}" stroke-opacity="0.7"/>`;
    // Fibre marks above the node below.
    for (let k = 0; k < 2 + Math.floor(r() * 2); k++) {
      const fx = al + a.w * (0.45 + r() * 0.4), fy = y0 - 3 - r() * 5;
      fine += `<path d="M${f(fx)} ${f(fy)}l${f((r() - 0.5) * 0.4)} ${f(-2 - r() * 2)}"/>`;
    }
  }
  // The top node, where a shoot or the crown starts.
  const tip = foot - n * step + 3 - 1.5;
  return { wash, ink, fine, at, tip };
}

/** A bamboo leaf: long, pointed, drooping from `x,y` along `a`, with a midrib. */
function bambooLeaf(x, y, a, L) {
  const ex = x + Math.cos(a) * L, ey = y + Math.sin(a) * L;
  const nx = -Math.sin(a), ny = Math.cos(a), w = L * 0.13;
  const m1x = x + (ex - x) * 0.35, m1y = y + (ey - y) * 0.35;
  return {
    blade: `<path d="M${f(x)} ${f(y)}Q${f(m1x + nx * w)} ${f(m1y + ny * w)} ${f(ex)} ${f(ey)}Q${f(m1x - nx * w * 0.8)} ${f(m1y - ny * w * 0.8)} ${f(x)} ${f(y)}Z"/>`,
    rib: `<path d="M${f(x)} ${f(y)}Q${f(m1x + nx * w * 0.15)} ${f(m1y + ny * w * 0.15)} ${f(x + (ex - x) * 0.85)} ${f(y + (ey - y) * 0.85)}"/>`,
  };
}

/**
 * A twig off a node, and the leaves along and at its end: `dir` is -1 for
 * left. No two alike: the twig bends, the leaves come off at different points
 * and lengths, and they droop by different amounts (bamboo leaves hang).
 */
function bambooSpray(x, y, dir, len, count, L, r) {
  const rise = 0.25 + r() * 0.35;
  const tx = x + dir * len, ty = y - len * rise;
  const mx = x + dir * len * 0.55, my = y - len * rise * 0.9 - r() * 3;
  let twig = `<path d="M${f(x)} ${f(y)}Q${f(mx)} ${f(my)} ${f(tx)} ${f(ty)}"/>`;
  let blades = "", ribs = "";
  for (let i = 0; i < count; i++) {
    // Where on the twig this leaf comes off: the last ones at its tip.
    const t = count === 1 ? 1 : 0.45 + 0.55 * (i / (count - 1));
    const u = 1 - t;
    const lx = u * u * x + 2 * u * t * mx + t * t * tx, ly = u * u * y + 2 * u * t * my + t * t * ty;
    // Out and down: between nearly level and hanging, never up.
    const droop = 0.25 + r() * 1.05;
    const a = dir < 0 ? Math.PI - droop : droop;
    const leaf = bambooLeaf(lx, ly, a, L * (0.6 + r() * 0.7));
    blades += leaf.blade; ribs += leaf.rib;
  }
  return { twig, blades, ribs };
}

/** The culm's last node runs on into a new shoot, tapering to a point. */
function bambooShoot(c, color) {
  const top = c.tip, p = c.at(top);
  return `<path d="M${f(p.x - p.w * 0.3)} ${f(top - 3)}Q${f(p.x - 0.6)} ${f(top - 10)} ${f(p.x + 0.4)} ${f(top - 15)}Q${f(p.x + 0.8)} ${f(top - 9)} ${f(p.x + p.w * 0.3)} ${f(top - 3)}" fill="${color}" fill-opacity="0.14" stroke="${color}" stroke-width="1.1" stroke-linejoin="round"/>`;
}

/** The pieces of a pole put together: wash, line, fine line, then leaves. */
function bambooPole(color, leafFill, c, sprays) {
  let twigs = "", blades = "", ribs = "";
  for (const s of sprays) { twigs += s.twig; blades += s.blades; ribs += s.ribs; }
  return `<g fill="${color}" fill-opacity="0.14" stroke="none">${c.wash}</g>`
    + `<g fill="none" stroke="${color}" stroke-width="1.3" stroke-linecap="round">${c.ink}${twigs}</g>`
    + `<g fill="none" stroke="${color}" stroke-width="0.6" stroke-linecap="round">${c.fine}</g>`
    + `<g ${leafFill} stroke="${color}" stroke-width="0.9" stroke-linejoin="round">${blades}</g>`
    + `<g fill="none" stroke="${color}" stroke-width="0.5" stroke-linecap="round">${ribs}</g>`;
}

// The hero's bamboo pole; the board fills its leaves rgba(moss, 0.18).
function bamboo(color, leafFill) {
  const c = culm({ cx: 72, top: 128, foot: BAMBOO_FOOT, step: 74, w0: 17, w1: 13, lean: -1.5, seed: 19 });
  const r = rng(29), sprays = [];
  // The crown: sprays off the top nodes at their own heights, more to the
  // left (where the open sky is) than the right, where the line runs.
  const crown = [[-1, 4, 6], [1, 22, 4], [-1, 68, 5], [-1, 134, 4], [1, 108, 5], [1, 172, 3], [-1, 202, 3]];
  for (const [dir, dy, n] of crown) {
    const y = c.tip + dy, p = c.at(y);
    sprays.push(bambooSpray(p.x + dir * p.w / 2, y, dir, 14 + r() * 18, n, 34 + r() * 22, r));
  }
  // Lower down, a twig now and then, never two alike.
  // Round 25: the twig at y 436 goes left too. To the right it hung into the
  // hint's first words wherever the pole stands 20px from the text (1024).
  for (const [dir, y, n] of [[-1, 436, 2], [-1, 590, 3], [1, 742, 2]]) {
    const p = c.at(y);
    sprays.push(bambooSpray(p.x + dir * p.w / 2, y, dir, 8 + r() * 8, n, 22 + r() * 10, r));
  }
  return bambooShoot(c, color) + bambooPole(color, leafFill, c, sprays);
}
// ---- The yard's bamboo (round 25) ----
// Below 1024 the clothesline is strung between two things that stand in the
// ground, however tall the section is, so the pole is not one drawing but
// three: a crown, a length of stem that tiles down to the ground, and a tuft
// of grass at its foot. The stem is dead straight and one width (no lean, no
// wobble), and each piece is cut mid-internode, where a culm is only its two
// edges and a highlight, so the joins do not show. Sprigs come off its nodes
// where the page puts them. Everything is drawn with its leaves to the left;
// the left-hand pole is the mirror of it.
export const POLE = {
  step: 54, w: 12, tile: 4, crown: 4,
  // viewBoxes: x, y, width, height. The pole's centre is x 0 in all of them.
  crownBox: [-84, -236, 98, 209],
  stemBox: [-12, -4 * 54 - 27, 24, 4 * 54],
  sprigBox: [-40, -12, 42, 40],
  tuftBox: [-36, -30, 72, 34],
};
const poleCulm = (n, seed) => culm({ cx: 0, top: -n * POLE.step, foot: 0, step: POLE.step, w0: POLE.w, w1: POLE.w, lean: 0, seed, wobble: 0 });
/** `tile` internodes, from the middle of one to the middle of the next. */
function poleStem() {
  return bambooPole(K, `fill="${K}"`, poleCulm(POLE.tile + 1, 37), []);
}
/** The top `crown` internodes, the shoot and the leaves; `sprays` as the hero's. */
function poleCrown(seed, sprays) {
  const c = poleCulm(POLE.crown, seed);
  const r = rng(seed + 8), out = [];
  for (const [dir, dy, n] of sprays) {
    const y = c.tip + dy, p = c.at(y);
    out.push(bambooSpray(p.x + dir * p.w / 2, y, dir, dir > 0 ? 3 : 8 + r() * 12, n, dir > 0 ? 11 : 22 + r() * 14, r));
  }
  return bambooShoot(c, K) + bambooPole(K, `fill="${K}" fill-opacity="0.18"`, c, out);
}
/** A sprig off a node at 0,0, to the left. */
function poleSprig(seed, len, count, L) {
  const s = bambooSpray(0, 0, -1, len, count, L, rng(seed));
  return `<g fill="none" stroke="${K}" stroke-width="1.3" stroke-linecap="round">${s.twig}</g>`
    + `<g fill="${K}" fill-opacity="0.18" stroke="${K}" stroke-width="0.9" stroke-linejoin="round">${s.blades}</g>`
    + `<g fill="none" stroke="${K}" stroke-width="0.5" stroke-linecap="round">${s.ribs}</g>`;
}
/** Grass round the foot of a pole that stands at 0,0, and the ground it stands in. */
function poleTuft() {
  const r = rng(53);
  let blades = "", fine = "";
  for (let i = 0; i < 15; i++) {
    const side = i % 2 ? 1 : -1;
    const x = side * (2 + r() * 24), h = 9 + r() * 20 * (1 - Math.abs(x) / 34), lean = side * (2 + r() * 9);
    blades += `<path d="M${f(x)} 0Q${f(x + lean * 0.2)} ${f(-h * 0.62)} ${f(x + lean)} ${f(-h)}"/>`;
  }
  for (let i = 0; i < 7; i++) {
    const x = -30 + i * 9.6 + r() * 4;
    fine += `<path d="M${f(x)} ${f(1.6 + r() * 1.6)}h${f(3 + r() * 5)}"/>`;
  }
  return `<path d="M-9 0Q0 -3.4 9 0Z" fill="${K}" fill-opacity="0.18" stroke="none"/>`
    + `<g fill="none" stroke="${K}" stroke-width="1.1" stroke-linecap="round">${blades}</g>`
    + `<g fill="none" stroke="${K}" stroke-width="0.7" stroke-linecap="round">${fine}</g>`;
}
// From 1024 the paddy is one board in the middle of a wider window, so the
// ground carries on from its ends to the window's edges as a strip of bank
// grass that tiles: the bamboo and the pine stand in it, and at 1920 the
// section's foot is not bare. Nothing crosses the tile's edges.
export const GRASS = { W: 420, H: 30 };
function bankGrass() {
  const r = rng(71), ground = GRASS.H - 2;
  let blades = "", fine = "";
  for (let x = 10; x < GRASS.W - 14; x += 14 + r() * 30) {
    const n = 2 + Math.floor(r() * 4), h0 = 6 + r() * 14;
    for (let i = 0; i < n; i++) {
      const bx = x + (i - n / 2) * 2.2, h = h0 * (0.55 + r() * 0.6), lean = (r() - 0.5) * 9;
      blades += `<path d="M${f(bx)} ${ground}Q${f(bx + lean * 0.2)} ${f(ground - h * 0.62)} ${f(bx + lean)} ${f(ground - h)}"/>`;
    }
  }
  for (let x = 6; x < GRASS.W - 20; x += 18 + r() * 26) fine += `<path d="M${f(x)} ${f(ground + 0.4 + r())}h${f(5 + r() * 10)}"/>`;
  return `<g fill="none" stroke="${K}" stroke-width="1" stroke-linecap="round">${blades}</g>`
    + `<g fill="none" stroke="${K}" stroke-width="0.7" stroke-linecap="round">${fine}</g>`;
}
function poleFiles() {
  const box = (b) => b.join(" ");
  return {
    "bank-grass": svg(`0 0 ${GRASS.W} ${GRASS.H}`, bankGrass()),
    "bamboo-top": svg(box(POLE.crownBox), poleCrown(23, [[-1, 4, 5], [-1, 26, 4], [1, 14, 2], [-1, 60, 4], [-1, 98, 3]])),
    "bamboo-top-b": svg(box(POLE.crownBox), poleCrown(41, [[-1, 6, 4], [1, 20, 2], [-1, 38, 5], [-1, 84, 3], [-1, 118, 2]])),
    "bamboo-stem": svg(box(POLE.stemBox), poleStem()),
    "bamboo-sprig": svg(box(POLE.sprigBox), poleSprig(61, 9, 3, 20)),
    "bamboo-sprig-b": svg(box(POLE.sprigBox), poleSprig(67, 6, 2, 17)),
    "bamboo-tuft": svg(box(POLE.tuftBox), poleTuft()),
  };
}
// ---- end The yard's bamboo ----
// The DoorDash tag's laptop.
const laptop = (color) => `<g fill="none" stroke="${color}" stroke-width="1.2"><rect x="44" y="30" width="62" height="40" rx="3"/><path d="M34 76H116M58 44h14M58 54h26M90 44l6 5-6 5"/></g>`;

// Round 23: the Taylors tag is a Venus flytrap (it grows wild only in the
// Carolinas) and the USC tag an open book. Line work like the tags beside them.
// One trap, hinged at (0, 0) and pointing along -y: two lobes, each a half-oval
// whose free rim carries the teeth. Open, the lobes part like a mouth; shut,
// they lie together and the teeth lock along the seam. A wash gives each lobe
// body, the rim and its teeth are the line.
function flytrapTrap(x, y, angle, len, open, color) {
  const w = len * 0.36;
  const P = (side) => [[0, 0], [side * w * 1.3, -len * 0.08], [side * w * 1.3, -len * 0.92], [0, -len]];
  const at = (pts, t) => {
    const u = 1 - t;
    return [0, 1].map((i) => u * u * u * pts[0][i] + 3 * u * u * t * pts[1][i] + 3 * u * t * t * pts[2][i] + t * t * t * pts[3][i]);
  };
  const lobe = (side, spread) => {
    const pts = P(side);
    const rim = `M0 0C${f(pts[1][0])} ${f(pts[1][1])} ${f(pts[2][0])} ${f(pts[2][1])} 0 ${f(-len)}`;
    let teeth = "";
    for (let k = 1; k <= 9; k++) {
      const [bx, by] = at(pts, k / 10);
      // out along the rim's normal, leaning to the tip
      teeth += `M${f(bx)} ${f(by)}l${f(side * 2.7)} ${f(-1.4)}`;
    }
    return `<g transform="rotate(${side * spread})"><path d="${rim}Z" fill="${color}" fill-opacity="0.14" stroke="none"/><path d="${rim}" stroke-width="1.1"/><path d="${teeth}" stroke-width="0.8"/>`
      // the veins on the lobe, running out from the midrib
      + `<path d="M0 ${f(-len * 0.25)}Q${f(side * w * 0.5)} ${f(-len * 0.28)} ${f(side * w * 0.8)} ${f(-len * 0.42)}M0 ${f(-len * 0.5)}Q${f(side * w * 0.5)} ${f(-len * 0.53)} ${f(side * w * 0.85)} ${f(-len * 0.66)}" stroke-width="0.5"/></g>`;
  };
  const spread = open ? 34 : 3;
  let g = lobe(-1, spread) + lobe(1, spread);
  // the midrib, and the trigger hairs standing up inside an open trap
  g += `<path d="M0 0L0 ${f(-len * 0.9)}" stroke-width="0.9"/>`;
  if (open) g += `<path d="M${f(-len * 0.18)} ${f(-len * 0.5)}l-1.2 -3M${f(len * 0.18)} ${f(-len * 0.45)}l1.2 -3M0 ${f(-len * 0.62)}v-3" stroke-width="0.7"/>`;
  return `<g transform="translate(${x} ${y}) rotate(${angle})">${g}</g>`;
}
function flytrap(color) {
  // Each leaf: a winged stalk from the rosette's heart to its trap's hinge.
  const heart = [75, 86];
  const leaf = (hx, hy, angle, len, open, bow) => {
    const mx = (heart[0] + hx) / 2 + bow, my = (heart[1] + hy) / 2;
    const stalk = `<path d="M${heart[0] - 2} ${heart[1]}Q${f(mx - 2.5)} ${f(my)} ${hx - 1.5} ${hy}M${heart[0] + 2} ${heart[1]}Q${f(mx + 2.5)} ${f(my)} ${hx + 1.5} ${hy}"/>`;
    return stalk + flytrapTrap(hx, hy, angle, len, open, color);
  };
  let s = leaf(40, 58, -36, 30, true, -6) + leaf(112, 58, 30, 27, false, 6) + leaf(56, 70, -62, 18, false, -2) + leaf(95, 70, 58, 17, true, 2);
  // the flower stalk, thin and tall, and its cluster of small white flowers
  s += `<path d="M75 86C74 60 77 36 75 22" stroke-width="0.9"/>`;
  for (const [fx, fy] of [[75, 10], [67, 15], [83, 15], [71, 21], [79, 21]]) {
    s += `<circle cx="${fx}" cy="${fy}" r="3.2" stroke-width="0.8"/><circle cx="${fx}" cy="${fy}" r="0.9" fill="${color}" stroke="none"/>`;
  }
  s += `<path d="M75 22L71 21M75 22L79 21M75 22L67 15M75 22L83 15M75 22L75 10" stroke-width="0.6"/>`;
  return `<g fill="none" stroke="${color}" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">${s}</g>`;
}
function openBook(color) {
  let s = "";
  // the cover, wider than the pages, and the spine's dip
  s += `<path d="M14 66C40 60 62 64 75 74C88 64 110 60 136 66L136 72C110 66 88 70 75 80C62 70 40 66 14 72Z"/>`;
  s += `<path d="M14 66v6M136 66v6" stroke-width="1.2"/>`;
  // pages: each side is a stack, its top edge fanned over the one below
  for (let k = 0; k < 5; k++) {
    const dy = k * 1.9;
    s += `<path d="M75 ${f(70 - dy)}C62 ${f(58 - dy)} 38 ${f(56 - dy)} 20 ${f(60 - dy)}M75 ${f(70 - dy)}C88 ${f(58 - dy)} 112 ${f(56 - dy)} 130 ${f(60 - dy)}" stroke-width="${k === 0 ? 1.2 : 0.8}"/>`;
  }
  // the two open pages, fanned up from the gutter, and lines of text on them
  s += `<path d="M75 60C62 46 38 42 20 46L20 56M75 60C88 46 112 42 130 46L130 56" stroke-width="1.1"/>`;
  s += `<path d="M75 60L75 30" stroke-width="0.9"/>`;
  s += `<path d="M75 30C62 18 40 16 24 22L22 46M75 30C88 18 110 16 126 22L128 46" stroke-width="1.1"/>`;
  for (let k = 0; k < 4; k++) {
    const y = 26 + k * 5.4;
    s += `<path d="M30 ${f(y + 1)}C42 ${f(y - 2)} 56 ${f(y + 1)} 69 ${f(y + 7)}M81 ${f(y + 7)}C94 ${f(y + 1)} 108 ${f(y - 2)} 120 ${f(y + 1)}" stroke-width="0.6"/>`;
  }
  // the ribbon: out of the gutter, over the foot of the page, ends cut in a V
  s += `<path d="M78 42C80 54 82 70 80 82L84 78L88 83C87 72 85 58 82 42Z" stroke-width="1"/>`;
  return `<g fill="none" stroke="${color}" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">${s}</g>`;
}

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

// Round 23: the hero's two stools hold a meal now, so the seat is a long
// low one (a plastic bench stool) with room for a drink and a plate side by side.
const STOOL_BOX = "406 774 128 110";
function stoolLong(x, y, col) {
  return `<g transform="translate(${x} ${y})">`
    + `<path d="M-50 0h100l-3 9h-94Z" fill="${col}"/><path d="M-42 9l-6 30h8l4 -22h72l4 22h8l-6 -30Z" fill="${col}"/>`
    + `<path d="M-34 17h68" stroke="rgba(0,0,0,0.18)" stroke-width="3"/><path d="M-48 1h96" stroke="rgba(255,255,255,0.35)" stroke-width="1.5"/></g>`;
}
const scaled = (x, y, sc, body) => `<g transform="translate(${x} ${y}) scale(${sc})">${body}</g>`;
// Cơm tấm: broken rice, a grilled pork chop, a fried egg, and cucumber and tomato.
function comTam(x, y) {
  const r = rng(23);
  let grains = "";
  for (let i = 0; i < 14; i++) {
    const gx = 0 + r() * 20, gy = -4 - r() * 11;
    grains += `M${f(gx)} ${f(gy)}l${f(1.6 + r())} ${f((r() - 0.5) * 1.4)}`;
  }
  const slice = (cx, cy, rim, flesh, edge) => `<ellipse cx="${cx}" cy="${cy}" rx="5" ry="2.4" fill="${rim}" stroke="${edge}" stroke-width="0.8"/><ellipse cx="${cx}" cy="${cy}" rx="3" ry="1.3" fill="${flesh}"/>`;
  return `<g transform="translate(${x} ${y})">`
    + `<path d="M-9 2.5h18l-2 3h-14Z" fill="#E7E1D3" stroke="#8C949A" stroke-width="0.8"/>`
    + `<ellipse cx="0" cy="-1" rx="25" ry="6.5" fill="#F7F3EA" stroke="#8C949A" stroke-width="1"/><ellipse cx="0" cy="-1.6" rx="19" ry="4.2" fill="#EFEAE0"/>`
    + slice(-15, -8, "#8DB36A", "#D6E6BA", "#4F7A3A") + slice(-8, -11, "#8DB36A", "#D6E6BA", "#4F7A3A")
    + slice(20, -9, "#E0584A", "#F4B1A6", "#A02F25") + slice(14, -12, "#E0584A", "#F4B1A6", "#A02F25")
    + `<path d="M-8 -3C-7 -17 4 -20 10 -19C17 -17 20 -9 19 -3Z" fill="#FFFDF6" stroke="#A9A190" stroke-width="0.9"/>`
    + `<path d="${grains}" fill="none" stroke="#C9C2AE" stroke-width="0.8" stroke-linecap="round"/>`
    + `<g transform="translate(-14 0)"><path d="M-9 -1C-11 -6 -6 -9 -1 -7C4 -9 8 -5 6 -1C4 2 -2 3 -6 2C-8 2 -9 1 -9 -1Z" fill="#FFFDF4" stroke="#C9C2B0" stroke-width="0.9"/><circle cx="-1" cy="-4" r="3.2" fill="#F0B429" stroke="#C98A12" stroke-width="0.6"/></g>`
    + `<g transform="translate(8 0) rotate(-8)"><rect x="-11" y="-5" width="22" height="10" rx="3.5" fill="#9A5A2E" stroke="#5E3318" stroke-width="1"/><path d="M-6 -4.5l2 9M0 -5l2 10M6 -4.5l2 9" stroke="#4A2812" stroke-width="1.2" stroke-linecap="round"/><path d="M-11 -1h-3" stroke="#E8DCC2" stroke-width="2.6" stroke-linecap="round"/></g>`
    + `</g>`;
}
// Bia: a bottle with its label, and a glass of it over ice, foam on top.
function biaPair(x, y) {
  const bottle = `<path d="M-6 0v-24q0 -5 2.5 -8v-12h7v12q2.5 3 2.5 8v24Z" fill="#7A4A1F" stroke="#3A2410" stroke-width="1"/><rect x="-6" y="-22" width="12" height="11" fill="#F3E9C9"/><path d="M-6 -17h12" stroke="#C8352B" stroke-width="1.5"/><rect x="-3.5" y="-47" width="7" height="3" rx="1" fill="#E1A93A"/><path d="M-3 -40v14" stroke="#F0C27A" stroke-width="1" stroke-linecap="round" stroke-opacity="0.6"/>`;
  const glass = `<g transform="translate(17 0)"><path d="M-8 0L-10 -27H10L8 0Z" fill="#E8B04A" fill-opacity="0.92" stroke="#F3E3B5" stroke-width="1"/>`
    + `<path d="M-10.5 -27h21v-3c-4 -4 -8 1 -11 -2c-3 3 -7 -2 -10 2Z" fill="#FFFFFF"/>`
    + `<g fill="#EAF6F8" fill-opacity="0.85" stroke="#9FC9D2" stroke-width="0.7"><rect x="-6" y="-24" width="6" height="6" rx="1" transform="rotate(14 -3 -21)"/><rect x="1" y="-20" width="6" height="6" rx="1" transform="rotate(-12 4 -17)"/><rect x="-5" y="-13" width="5.5" height="5.5" rx="1" transform="rotate(-8 -2 -10)"/></g>`
    + `<path d="M-6 -4L-7 -10" stroke="#FFF1C9" stroke-width="1" stroke-linecap="round" stroke-opacity="0.6"/></g>`;
  return `<g transform="translate(${x} ${y})">${bottle}${glass}</g>`;
}

/**
 * Sky coordinates the hero's words cover at 1440 (the sky is drawn at 1440 and
 * centred, like the content). No seed or firefly lands in it; the random draws
 * still happen, so everything else stays where the board put it.
 */
export const SKY_CLEAR = { x0: 120, x1: 860, y0: 400, y1: 800 };
const clear = (x, y) => x >= SKY_CLEAR.x0 && x <= SKY_CLEAR.x1 && y >= SKY_CLEAR.y0 && y <= SKY_CLEAR.y1;

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
      // Below 1024 the sky is pinned right and only x < 920 shows, behind the
      // headline at y 34 to 221 whatever the phone. Birds there move east of it.
      const bx0 = 720 + r() * 600, by = 40 + r() * 90, sc = 0.6 + r() * 0.6;
      const bx = bx0 < 920 ? bx0 + 200 : bx0;
      birds += `<path d="M${f(bx)} ${f(by)}q${f(6 * sc)} ${f(-5 * sc)} ${f(12 * sc)} 0q${f(6 * sc)} ${f(-5 * sc)} ${f(12 * sc)} 0" fill="none" stroke="#56605A" stroke-width="1.2" stroke-linecap="round" opacity="0.7"/>`;
    }
    for (let i = 0; i < 18; i++) {
      const sx = 80 + r() * 1300, sy = 520 + r() * 340, a0 = r() * 6.28;
      let fl = "";
      for (let k = 0; k < 7; k++) { const a = a0 + (k * Math.PI * 2) / 7; fl += `M${f(sx)} ${f(sy)}l${f(Math.cos(a) * 5)} ${f(Math.sin(a) * 5)}`; }
      const op = f(0.45 + r() * 0.4);
      if (clear(sx, sy)) continue;
      seeds += `<g opacity="${op}"><path d="${fl}M${f(sx)} ${f(sy)}l${f(-3)} ${f(9)}" fill="none" stroke="#7D867E" stroke-width="0.8" stroke-linecap="round"/><circle cx="${f(sx - 3)}" cy="${f(sy + 9)}" r="1.1" fill="#7D867E"/></g>`;
    }
    const [mx, my] = moon;
    return `<defs><filter id="soft" x="-30%" y="-80%" width="160%" height="260%"><feGaussianBlur stdDeviation="6"/></filter>`
      + `<radialGradient id="sunhalo"><stop offset="0" stop-color="#FFE9A8" stop-opacity="0.55"/><stop offset="1" stop-color="#FFE9A8" stop-opacity="0"/></radialGradient></defs>`
      + `<circle cx="${mx}" cy="${my}" r="150" fill="url(#sunhalo)"/><circle cx="${mx}" cy="${my}" r="32" fill="#F7E3A6"/>`
      + `${clouds}${birds}${seeds}`;
  }
  const r = rng(seed); let stars = "", flies = "";
  for (let i = 0; i < 70; i++) stars += `<circle cx="${f(r() * 1440)}" cy="${f(r() * 360)}" r="${[0.8, 1, 1.3][Math.floor(r() * 3)]}" fill="#E8EEDF" opacity="${f(0.35 + r() * 0.55)}"/>`;
  for (let i = 0; i < 22; i++) {
    const x = 80 + r() * 1300, y = 520 + r() * 360, rad = f(1.6 + r()), op = f(0.6 + r() * 0.4);
    if (!clear(x, y)) flies += `<circle cx="${f(x)}" cy="${f(y)}" r="${rad}" fill="#FFE18A" filter="url(#glow)" opacity="${op}"/>`;
  }
  const [mx, my] = moon;
  return `<defs><filter id="glow" x="-200%" y="-200%" width="500%" height="500%"><feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`
    + `<radialGradient id="halo"><stop offset="0" stop-color="#F6EFD5" stop-opacity="0.35"/><stop offset="1" stop-color="#F6EFD5" stop-opacity="0"/></radialGradient></defs>`
    + `${stars}<circle cx="${mx}" cy="${my}" r="110" fill="url(#halo)"/><circle cx="${mx}" cy="${my}" r="30" fill="#F3EBD2"/><circle cx="${mx + 9}" cy="${my - 6}" r="5" fill="#E4DBBE"/><circle cx="${mx - 10}" cy="${my + 8}" r="3.5" fill="#E4DBBE"/>`
    + flies;
}

const svg = (viewBox, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${body}</svg>`;
const K = "#000";

// ---- Contact drawings ----
// The contact board's pieces (NatContactPostcard), ported from the generator
// with the same seeds and rounding. Text the board drew inside them (the
// postmark's "TAYLORS SC", "Một, hai, ba, dzô!") is HTML on the page instead.
const heron = (x, y, s, stroke) => `<g transform="translate(${x} ${y}) scale(${s})" fill="none" stroke="${stroke}" stroke-width="${f(1.5 / s)}" stroke-linecap="round" stroke-linejoin="round">`
  + `<path d="M40 90C55 70 95 70 105 92C112 108 90 122 62 120C48 119 36 108 40 90Z"/>`
  + `<path d="M58 96C70 92 86 94 98 102M54 104C66 101 80 103 90 110" stroke-width="${f(0.8 / s)}"/>`
  + `<path d="M62 120L34 134M66 121L42 138"/>`
  + `<path d="M97 80C102 56 82 46 88 28C92 16 104 12 112 18"/>`
  + `<path d="M112 18C116 13 125 15 125 22C123 26 116 27 112 24"/>`
  + `<path d="M124 19L152 25L123 25M110 15L96 10"/>`
  + `<path d="M70 120L72 200M82 118L88 200M72 200l-11 4M72 200l11 3M88 200l-9 4M88 200l13 2"/>`
  + `</g>`;
// Hội An silk lanterns: quiet silk by day, lit and glowing at night.
const LANTERN_COLS = ["#C8352B", "#E1A93A", "#C8352B", "#3F7A57", "#E1A93A", "#C8352B", "#3F7A57"];
const LANTERN_X = [690, 790, 880, 980, 1080, 1180, 1290];
const LANTERN_Y = [64, 92, 72, 98, 70, 94, 66];
// Round 28: by day they are unlit paper (lantern cream on twine ribs), so the
// screen's reds are the flag stamp and my seal only; at night they are lit.
const DAY_PAPER = "#EDE7D8", DAY_RIB = "#B79C74";
function lantern(night, twine, x, y, col, sc) {
  const glow = night ? `<ellipse cx="0" cy="26" rx="46" ry="52" fill="url(#lanternGlow)"/>` : "";
  const body = night ? `url(#lit-${col.slice(1)})` : DAY_PAPER;
  const tassel = night ? col : twine;
  return `<g transform="translate(${x} ${y}) scale(${sc})">${glow}`
    + `<path d="M0 -40V-6" stroke="${twine}" stroke-width="1.2"/>`
    + `<rect x="-7" y="-6" width="14" height="6" rx="1.5" fill="#6B5640"/>`
    + `<path d="M-15 0C-27 14 -27 38 -15 52H15C27 38 27 14 15 0Z" fill="${body}"${night ? "" : ` stroke="${DAY_RIB}" stroke-width="1.3"`}/>`
    + `<path d="M-7 0C-12 16 -12 36 -7 52M7 0C12 16 12 36 7 52M0 0V52" stroke="${night ? "rgba(60,30,20,0.28)" : DAY_RIB}" stroke-width="1" fill="none"/>`
    + `<rect x="-7" y="52" width="14" height="5" rx="1.5" fill="#6B5640"/>`
    + `<path d="M0 57V76M-2 76h4" stroke="${tassel}" stroke-width="1.6" stroke-linecap="round"/></g>`;
}
// Hoa mai (yellow apricot blossom), for Tết.
function hoaMai(x, y, sc, flip = 1) {
  const r = rng(Math.round(x)); let fl = "";
  for (let i = 0; i < 7; i++) {
    const fx = 20 + i * 22 + r() * 8, fy = -10 - Math.sin(i) * 14 + r() * 10;
    let pet = ""; for (let k = 0; k < 5; k++) { const a = (k * 72 * Math.PI) / 180; pet += `<ellipse cx="${f(fx + Math.cos(a) * 5)}" cy="${f(fy + Math.sin(a) * 5)}" rx="4.4" ry="3.2" transform="rotate(${k * 72} ${f(fx + Math.cos(a) * 5)} ${f(fy + Math.sin(a) * 5)})" fill="#F2C230"/>`; }
    fl += pet + `<circle cx="${f(fx)}" cy="${f(fy)}" r="2" fill="#C2701E"/>`;
  }
  return `<g transform="translate(${x} ${y}) scale(${sc * flip} ${sc})"><path d="M0 0C40 -10 90 -30 170 -20" fill="none" stroke="#6B5640" stroke-width="3" stroke-linecap="round"/><path d="M60 -16l14 -18M110 -22l10 -16" stroke="#6B5640" stroke-width="2" stroke-linecap="round"/>${fl}</g>`;
}
// The string, its lanterns and the two hoa mai branches at its ends.
function lanternString(night) {
  const twine = night ? "#B3A27F" : "#8B7B5E";
  const defs = night
    ? `<defs><radialGradient id="lanternGlow"><stop offset="0" stop-color="#FFC768" stop-opacity="0.55"/><stop offset="1" stop-color="#FFC768" stop-opacity="0"/></radialGradient>`
      + ["#C8352B", "#E1A93A", "#3F7A57"].map((c) => `<radialGradient id="lit-${c.slice(1)}" cx="50%" cy="45%" r="60%"><stop offset="0" stop-color="#FFE7A8"/><stop offset="0.55" stop-color="${c}"/><stop offset="1" stop-color="${c}" stop-opacity="0.85"/></radialGradient>`).join("")
      + `</defs>`
    : "";
  return defs + `<path d="M640 34Q980 86 1380 30" fill="none" stroke="${twine}" stroke-width="1.6"/>`
    + LANTERN_COLS.map((c, i) => lantern(night, twine, LANTERN_X[i], LANTERN_Y[i], c, i % 2 ? 0.9 : 1)).join("")
    + hoaMai(640, 40, 1.1) + hoaMai(1430, 30, 1.05, -1);
}
// The postcard's picture of Taylors. It sits on paper, which keeps its day
// colours at night (the paper scope in globals.css), so one file serves both.
function postcardScene() {
  // Round 28: the sun is the hero's morning sun (a pale gold disc in a halo),
  // not an empty red ring; the flag stamp is the card's one red.
  return `<circle cx="250" cy="120" r="58" fill="#F6E7B0" fill-opacity="0.35"/><circle cx="250" cy="120" r="34" fill="#F2DC93"/>`
    + `<path d="M0 300Q170 286 340 300" stroke="#1D2321" stroke-width="1" fill="none"/>`
    + pine(70, 300, 150, "#46603A") + pine(120, 300, 110, "#46603A")
    + palmetto(290, 300, 90, "#46603A")
    + ripples(10, 318, 320, 5, "#9FB3AE", 7)
    + rice(20, 440, 11, 30, 3, "#46603A", 60, 50)
    + heron(196, 214, 0.5, "#1D2321");
}
const star = (x, y, r, fill) => { let d = ""; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.382 : r; d += (i ? "L" : "M") + f(x + rr * Math.cos(a)) + " " + f(y + rr * Math.sin(a)); } return `<path d="${d}Z" fill="${fill}"/>`; };
// The Vietnam-flag stamp: perforated paper with the flag inset 5px. The board
// only implied the perforation; here the holes are cut.
function flagStamp() {
  let holes = "";
  for (let x = 0; x <= 77; x += 11) holes += `<circle cx="${x}" cy="0" r="3"/><circle cx="${x}" cy="92" r="3"/>`;
  for (let y = 11.5; y < 92; y += 11.5) holes += `<circle cx="0" cy="${y}" r="3"/><circle cx="77" cy="${y}" r="3"/>`;
  return `<defs><mask id="perf"><rect width="77" height="92" fill="#fff"/><g fill="#000">${holes}</g></mask></defs>`
    + `<rect width="77" height="92" fill="#FBFBF8" mask="url(#perf)"/><rect x="5.5" y="5" width="66" height="82" fill="#DA251D"/>${star(38.5, 43, 17, "#FFDD00")}`;
}
const postmark = (c) => `<g fill="none" stroke="${c}" stroke-width="1.3"><circle cx="56" cy="44" r="34"/><circle cx="56" cy="44" r="27"/><path d="M96 28q9 -6 18 0t18 0M96 44q9 -6 18 0t18 0M96 60q9 -6 18 0t18 0"/></g>`;
// A bowl of phở beside "say hi." in the morning; two beers in the evening.
const pho = `<g transform="scale(0.55)">${[0, 1, 2].map((i) => `<path d="M${-14 + i * 14} -16q-6 -10 0 -20t0 -20" fill="none" stroke="#9AA39C" stroke-width="2" stroke-linecap="round" opacity="0.7"/>`).join("")}`
  + `<path d="M-46 0A46 26 0 0 0 46 0Z" fill="#F4EFE6" stroke="#5B6B7E" stroke-width="1.4"/><path d="M-40 10Q0 22 40 10" fill="none" stroke="#3A5A8C" stroke-width="1.6"/>`
  + `<ellipse cx="0" cy="0" rx="46" ry="9" fill="#D9A55A" stroke="#5B6B7E" stroke-width="1.2"/><circle cx="-12" cy="-3" r="2.6" fill="#5E8A4A"/><circle cx="10" cy="-3" r="2.4" fill="#5E8A4A"/>`
  + `<path d="M-8 -28L56 8M-2 -32L62 4" stroke="#8A6E3A" stroke-width="2.4" stroke-linecap="round"/></g>`;
const bia = `<g transform="rotate(-14)"><path d="M-30 -40h20l-2 40h-16Z" fill="#E8B04A" fill-opacity="0.9" stroke="#F3E3B5" stroke-width="1"/><path d="M-31 -46h22v7h-22Z" fill="#FFFFFF"/></g>`
  + `<g transform="rotate(14)"><path d="M10 -40h20l-2 40h-16Z" fill="#E8B04A" fill-opacity="0.9" stroke="#F3E3B5" stroke-width="1"/><path d="M9 -46h22v7h-22Z" fill="#FFFFFF"/></g>`
  + `<path d="M-4 -62l-4 -8M4 -62l4 -8M0 -64v-9" stroke="#FFE18A" stroke-width="1.6" stroke-linecap="round"/>`;
const banhTet = `<rect x="-70" y="-22" width="120" height="44" rx="20" fill="#5E8A4A" stroke="#3F5E35" stroke-width="1.4"/>`
  + `<path d="M-50 -22v44M-20 -22v44M10 -22v44M36 -21v42" stroke="#C7B27A" stroke-width="2.2"/>`
  + `<path d="M-62 -14q40 6 106 0M-62 14q40 -6 106 0" fill="none" stroke="#3F5E35" stroke-width="0.9"/>`
  + `<ellipse cx="70" cy="0" rx="20" ry="22" fill="#F3EEE2" stroke="#3F5E35" stroke-width="3"/>`
  + `<ellipse cx="70" cy="0" rx="11" ry="12" fill="#E3C46A"/><ellipse cx="70" cy="0" rx="5" ry="5.5" fill="#C98B7A"/>`;
const paperClip = `<path d="M10 70V16a7 7 0 0 1 14 0v58a10 10 0 0 1-20 0V22" fill="none" stroke="#8C949A" stroke-width="2.6" stroke-linecap="round"/>`;

// ---- The SENT stamp's wear (round 24) ----
// A one-colour mask for the rubber stamp inked on the postcard: opaque
// everywhere except pinholes and a few dropouts. The holes crowd the rim (where
// a worn stamp loses its ink first) and a few patches (uneven pressure), and
// are sparse across the middle so the words stay whole. The page lays it over
// the stamp's own box at 100% 100%, so the speck size follows the stamp. One
// even-odd path: a hole is a small polygon wound inside the sheet, and none
// overlaps another (a second hole on the first would fill it again).
const STAMP_WEAR_BOX = [200, 124];
function stampWear() {
  const [W, H] = STAMP_WEAR_BOX, r = rng(2401);
  const patches = Array.from({ length: 4 }, () => ({ x: r() * W, y: r() * H, rad: 16 + r() * 14 }));
  const holes = [];
  let d = `M0 0H${W}V${H}H0Z`;
  const fits = (x, y, rad) => holes.every((h) => Math.hypot(h.x - x, h.y - y) > h.rad + rad + 0.8);
  const hole = (x, y, rad, sides = 4) => {
    // An irregular little polygon, written as relative steps to keep the file small.
    const pts = Array.from({ length: sides }, (_, k) => {
      const a = ((k + r() * 0.5) / sides) * Math.PI * 2, rr = rad * (0.65 + r() * 0.7);
      return [x + Math.cos(a) * rr, y + Math.sin(a) * rr];
    });
    let out = `M${f(pts[0][0])} ${f(pts[0][1])}`;
    for (let k = 1; k < sides; k++) out += `l${f(pts[k][0] - pts[k - 1][0])} ${f(pts[k][1] - pts[k - 1][1])}`;
    return `${out}Z`;
  };
  // pinholes, thickest at the rim and in the pressure patches
  for (let i = 0; i < 3200 && holes.length < 340; i++) {
    const x = r() * W, y = r() * H;
    const rim = Math.exp(-Math.min(x, W - x, y, H - y) / 8);
    const patch = Math.max(0, ...patches.map((p) => 1 - Math.hypot(x - p.x, y - p.y) / p.rad));
    if (r() > 0.012 + 0.5 * rim + 0.32 * patch) continue;
    const rad = 0.45 + r() * (0.7 + 1.5 * rim);
    if (!fits(x, y, rad)) continue;
    holes.push({ x, y, rad });
    d += hole(x, y, rad);
  }
  // a few larger dropouts, only on the rim, where the ink skipped
  for (let i = 0; i < 400 && holes.length < 352; i++) {
    const side = Math.floor(r() * 4), t = r();
    const [x, y] = [[t * W, 2.5], [t * W, H - 2.5], [2.5, t * H], [W - 2.5, t * H]][side];
    const rad = 2.4 + r() * 2.6;
    if (!fits(x, y, rad)) continue;
    holes.push({ x, y, rad });
    d += hole(x, y, rad, 5);
  }
  return `<path fill="${K}" fill-rule="evenodd" d="${d}"/>`;
}

/** Contact's files. Their names are listed in tests/lib/scenery.test.ts. */
function contactDrawings() {
  return {
    "lanterns-day": svg("626 -12 812 192", lanternString(false)),
    "lanterns-night": svg("626 -12 812 192", lanternString(true)),
    "postcard-scene": svg("0 0 340 440", postcardScene()),
    "flag-stamp": svg("0 0 77 92", flagStamp()),
    postmark: svg("20 8 120 72", postmark(K)),
    pho: svg("-27 -33 63 48", pho),
    bia: svg("-42 -76 84 82", bia),
    "banh-tet": svg("-72 -24 164 48", banhTet),
    "paper-clip": svg("0 0 34 86", paperClip),
    // `none`: the page stretches it over the stamp's box, whatever its shape, so
    // the sheet must reach every edge instead of being letterboxed.
    "stamp-wear": svg(`0 0 ${STAMP_WEAR_BOX[0]} ${STAMP_WEAR_BOX[1]}`, stampWear()).replace("<svg ", `<svg preserveAspectRatio="none" `),
  };
}

// ---- Journey drawings ----
// The board's NatJourney: the live oak (three one-colour layers, so day ink and
// night silhouette are one file each), its Hội An lantern, the rice at the
// trunk and the stool's still life. Ported verbatim from the generator's
// `// ---------- journey ----------` block and its helpers.
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
function twigs(x, y, ang, len, w, depth, r, out) {
  const ex = x + Math.cos(ang) * len, ey = y + Math.sin(ang) * len;
  const bend = (r() - 0.5) * len * 0.3;
  out.lines += `<path d="M${f(x)} ${f(y)}Q${f((x+ex)/2 - Math.sin(ang)*bend)} ${f((y+ey)/2 + Math.cos(ang)*bend)} ${f(ex)} ${f(ey)}" stroke-width="${f(w)}"/>`;
  if (depth > 0) {
    const n = r() > 0.4 ? 2 : 3;
    for (let i = 0; i < n; i++) twigs(ex, ey, ang + (r() - 0.5) * 1.3, len * (0.6 + r() * 0.15), w * 0.62, depth - 1, r, out);
  } else {
    for (let i = 0; i < (out.per ?? 7); i++) {
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
/** The board's `oak()` with its three layers apart: the same draws in the same order. */
function oakLayers(limbs, seed, cfg, color) {
  const r = rng(seed), out = { lines: "", leaves: "", per: cfg.per };
  let body = "", mossS = "";
  for (const L of limbs) {
    body += taper(L.p, L.w0, L.w1, color);
    if (L.twigs === 0) continue;
    for (let i = 0; i < (L.twigs ?? 7); i++) {
      const t = 0.25 + (0.75 * (i + r() * 0.6)) / (L.twigs ?? 7);
      const [x, y] = cubic(L.p, Math.min(t, 1)), [dx, dy] = cubicD(L.p, Math.min(t, 1));
      const base = Math.atan2(dy, dx);
      const side = L.up ? 1 : r() > 0.3 ? -1 : 1; // mostly upward (`up`: every one, on a limb that runs left)
      const ang = base + side * (0.5 + r() * 0.7);
      const w = (L.w0 + (L.w1 - L.w0) * t) * 0.35;
      twigs(x, y, ang, cfg.twig * (0.7 + r() * 0.5), Math.max(w, 1.4), 2, r, out);
    }
    for (let i = 0; i < (L.moss ?? 0); i++) {
      const [x, y] = cubic(L.p, 0.2 + r() * 0.75);
      mossS += moss(x, y + L.w1 / 2, 40 + r() * 70, r);
    }
  }
  return {
    leaves: `<g fill="${color}" fill-opacity="0.5">${out.leaves}</g>`,
    moss: `<g fill="none" stroke="${color}" stroke-width="0.9" stroke-linejoin="round">${mossS}</g>`,
    bark: body + `<g fill="none" stroke="${color}" stroke-linecap="round">${out.lines}</g>`,
  };
}
const OAK_LIMBS = [
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
// Not on the board: below 1280 the oak is one tree (round 22). The crown is
// drawn 900px wide there (k = 900/1440), and this trunk continues its own:
// the crown's trunk crosses its cut at board y 640 at x 307, 46.5 wide,
// leaning right going up (dx/dy 0.075), so the trunk's top is 46.5k = 29.1
// wide at x 120 of a 240 box, leaning the same way. Below its first 640 units
// it runs straight down, so it can be cut at any height (it is masked from
// the top) and still meet its roots, a file of their own masked at the
// stage's foot. Each tag hangs from a bough of its own, stretched from the
// trunk to the tag's string (`preserveAspectRatio="none"`): its tip is at
// (2, 11), where the string ties on. The straight run laps 8 units over the
// leaning one (round 25): butted end to end, the two showed a hairline across
// the trunk where they met.
const NARROW_TRUNK_TOP = f(46.5 * (900 / 1440));
const OAK_TRUNK = [
  { p: [[120, 2400], [120, 1800], [120, 1200], [120, 632]], w0: 34, w1: 34, twigs: 9, moss: 5 },
  { p: [[120, 640], [120, 420], [100, 265], [120, 0]], w0: 34, w1: NARROW_TRUNK_TOP, twigs: 4, moss: 2 },
];
const OAK_ROOTS = [
  { p: [[120, 0], [120, 60], [119, 100], [120, 150]], w0: 34, w1: 62, twigs: 0 },
  { p: [[110, 92], [82, 126], [44, 140], [4, 150]], w0: 24, w1: 3, twigs: 0 },
  { p: [[130, 88], [160, 122], [198, 138], [238, 148]], w0: 24, w1: 3, twigs: 0 },
  { p: [[104, 118], [92, 138], [74, 148], [52, 153]], w0: 13, w1: 2, twigs: 0 },
  { p: [[138, 120], [150, 140], [170, 149], [190, 154]], w0: 13, w1: 2, twigs: 0 },
];
// Round 25: from 640 to 1279 the title stands top-left beside the crown and the
// boughs leave the trunk in pairs, so that band has a crown of its own. It is
// the board's oak (same trunk, same long limb, same fork at x 307) without
// the limb that climbed up and left, where the title is now: an upright limb
// stands in for it, and the lantern's limb leaves the trunk lower and stops
// short of the box's left edge, so no sprig is cut by it. Its box runs to
// board y 680; the trunk below still joins at y 640 (x 307), as it does under
// the board's crown. Five leaves a sprig, not seven: it is drawn at two
// thirds of the board's size.
const CROWN_LANTERN_LIMB = { p: [[302, 622], [236, 584], [158, 566], [84, 532]], w0: 24, w1: 5, twigs: 5, moss: 2, up: true };
const OAK_CROWN = [
  OAK_LIMBS[0],
  CROWN_LANTERN_LIMB,
  { p: [[304, 566], [298, 480], [326, 376], [366, 250]], w0: 24, w1: 5, moss: 1 },
  { p: [[312, 562], [356, 468], [420, 396], [486, 316]], w0: 22, w1: 5 },
  OAK_LIMBS[4],
  { ...OAK_LIMBS[5], twigs: 5 },
  OAK_LIMBS[6],
  { ...OAK_LIMBS[7], twigs: 3 },
  OAK_LIMBS[8],
];
const OAK_BOUGH = [{ p: [[200, 30], [140, 8], [60, 2], [2, 11]], w0: 13, w1: 2, twigs: 4 }];
const stretched = (viewBox, body) => svg(viewBox, body).replace("<svg ", '<svg preserveAspectRatio="none" ');
const yAt = (L, x) => { let lo = 0, hi = 1; for (let k = 0; k < 40; k++) { const m = (lo + hi) / 2; if (cubic(L.p, m)[0] < x) lo = m; else hi = m; } return cubic(L.p, lo)[1]; };
const TAG_XS = [520, 720, 920, 1120, 1320], TAG_DROPS = [30, 40, 96, 52, 84];

const CROWN_SEED = 73, CROWN_BOX = "0 120 1440 560";

/**
 * The 640 to 1279 crown, for the page and the tests: its box, the trunk's foot
 * (where the trunk below joins it, as under the board's crown), and where the
 * lantern's string leaves its limb, at the board's x 152.
 */
export function crownSpots() {
  const limb = CROWN_LANTERN_LIMB.p;
  let lo = 0, hi = 1;
  for (let k = 0; k < 40; k++) { const m = (lo + hi) / 2; if (cubic(limb, m)[0] > 152) lo = m; else hi = m; }
  return { box: [0, 120, 1440, 560], foot: [307, 640], lantern: [152, f(cubic(limb, lo)[1])] };
}

// Round 27: each tag its own width, and one string or two (Thien: "mixed 1
// strings and 2 strings"), at these fractions of its width. Nothing repeats.
const TAG_WIDTHS = [212, 164, 182, 158, 170];
const TAG_EYES = [[0.22, 0.7], [0.5], [0.2, 0.8], [0.5], [0.16, 0.84]];
const limbY = (x) => yAt(x < 990 ? OAK_LIMBS[4] : OAK_LIMBS[5], x);

/**
 * Where the board hangs each tag: `ly` is the limb's y above the tag's middle,
 * `top` the tag's top, `width` its width, and `eyes` its eyelets: each one's
 * fraction of the width and the limb's y above it, where its string ties on.
 */
export function journeySpots() {
  return TAG_XS.map((x, i) => {
    const ly = limbY(x), w = TAG_WIDTHS[i];
    const eyes = TAG_EYES[i].map((e) => ({ e, ly: f(limbY(x - w / 2 + e * w)) }));
    return { x, ly: f(ly), top: Math.round(ly + TAG_DROPS[i]), width: w, eyes };
  });
}

// Round 27 (Thien's B2): what I am doing now is four seedlings in a nursery
// crate at the oak's foot, oldest nearest the trunk and each smaller than the
// last, a marker stick beside each. Two masks in one 480×210 box: the crate and
// its sticks (`nursery`, painted by --twine) and the seedlings
// (`nursery-sprouts`, --scene-moss). The markers are the page's own paper,
// standing on the sticks' tops (NURSERY.plants[i].stick), so the page places
// them from these numbers.
export const NURSERY = {
  box: [480, 210],
  crate: { x: 16, top: 160, w: 448, h: 48 },
  plants: [
    { x: 62, h: 62, stick: 92 },
    { x: 174, h: 50, stick: 96 },
    { x: 286, h: 36, stick: 114 },
    { x: 398, h: 20, stick: 124 },
  ],
};
function nurseryFiles() {
  const { box, crate, plants } = NURSERY;
  const r = rng(41);
  // The crate: three boards and two posts, gaps between the boards.
  let wood = "";
  const boards = 3, gap = 3, bh = (crate.h - gap * (boards - 1)) / boards;
  for (let i = 0; i < boards; i++) wood += `<rect x="${crate.x}" y="${f(crate.top + i * (bh + gap))}" width="${crate.w}" height="${f(bh)}" rx="1.5"/>`;
  for (const x of [crate.x, crate.x + crate.w - 9]) wood += `<rect x="${x}" y="${crate.top - 4}" width="9" height="${crate.h + 4}" rx="1.5"/>`;
  // Each marker's stick, beside its seedling, from the marker's foot into the soil.
  for (const p of plants) wood += `<rect x="${p.x + 11}" y="${p.stick - 12}" width="3.4" height="${crate.top + 8 - p.stick + 12}" rx="1"/>`;
  // The seedlings: a stem, and pairs of leaves, fewer and smaller the younger.
  let sprouts = "";
  plants.forEach((p, i) => {
    const top = crate.top - p.h, size = 10 - i * 1.4;
    sprouts += `<path d="M${p.x} ${crate.top + 2}C${f(p.x - 2)} ${f(crate.top - p.h * 0.5)} ${f(p.x + 2)} ${f(top + 6)} ${p.x} ${top}" fill="none" stroke="${K}" stroke-width="${f(2.4 - i * 0.3)}" stroke-linecap="round"/>`;
    const pairs = Math.max(1, Math.round(p.h / 18));
    for (let k = 0; k < pairs; k++) {
      const y = top + 4 + k * 15, s2 = size * (1 - k * 0.12), a = 26 + r() * 10;
      sprouts += `<ellipse cx="${f(p.x - s2 * 0.85)}" cy="${f(y)}" rx="${f(s2)}" ry="${f(s2 * 0.42)}" transform="rotate(${f(-a)} ${f(p.x - s2 * 0.85)} ${f(y)})"/>`;
      sprouts += `<ellipse cx="${f(p.x + s2 * 0.85)}" cy="${f(y - 3)}" rx="${f(s2)}" ry="${f(s2 * 0.42)}" transform="rotate(${f(a)} ${f(p.x + s2 * 0.85)} ${f(y - 3)})"/>`;
    }
  });
  const vb = `0 0 ${box[0]} ${box[1]}`;
  return { nursery: svg(vb, `<g fill="${K}">${wood}</g>`), "nursery-sprouts": svg(vb, `<g fill="${K}">${sprouts}</g>`) };
}

// One Hội An silk lantern; lit at night.
function hoiAn(x, y, col, sc, night) {
  const lit = night ? `<ellipse cx="0" cy="26" rx="46" ry="52" fill="url(#hoiGlow)"/>` : "";
  return `<g transform="translate(${x} ${y}) scale(${sc})">${lit}`
    + `<rect x="-7" y="-6" width="14" height="6" rx="1.5" fill="#6B5640"/>`
    + `<path d="M-15 0C-27 14 -27 38 -15 52H15C27 38 27 14 15 0Z" fill="${night ? "url(#hoiLit)" : col}"/>`
    + `<path d="M-7 0C-12 16 -12 36 -7 52M7 0C12 16 12 36 7 52M0 0V52" stroke="rgba(60,30,20,0.28)" stroke-width="1" fill="none"/>`
    + `<rect x="-7" y="52" width="14" height="5" rx="1.5" fill="#6B5640"/>`
    + `<path d="M0 57V76" stroke="${col}" stroke-width="1.6" stroke-linecap="round"/></g>`;
}
const HOI_DEFS = (col) => `<defs><radialGradient id="hoiGlow"><stop offset="0" stop-color="#FFC768" stop-opacity="0.55"/><stop offset="1" stop-color="#FFC768" stop-opacity="0"/></radialGradient><radialGradient id="hoiLit" cx="50%" cy="45%" r="60%"><stop offset="0" stop-color="#FFE7A8"/><stop offset="0.55" stop-color="${col}"/><stop offset="1" stop-color="${col}" stop-opacity="0.85"/></radialGradient></defs>`;
// The Journey's still life: bánh mì by day, trà đá by night.
const JOURNEY_STILL = {
  banhMi: (x, y) => `<g transform="translate(${x} ${y}) rotate(-8)">`
    + `<path d="M-38 -6C-36 -18 30 -20 40 -8C44 -2 40 6 30 8L-30 8C-40 6 -40 0 -38 -6Z" fill="#D9A55A" stroke="#8A5E2A" stroke-width="1.2"/>`
    + `<path d="M-24 -10l6 10M-8 -12l6 10M8 -12l6 10M24 -10l5 9" stroke="#F3DCA6" stroke-width="2" stroke-linecap="round"/>`
    + `<path d="M-30 2l-8 10h40l6-10" fill="#EFE7D2" stroke="#B9AE95" stroke-width="1"/><path d="M-6 0q4 -4 8 0" stroke="#5E8A4A" stroke-width="2.4" fill="none"/></g>`,
  traDa: (x, y) => `<g transform="translate(${x} ${y})">`
    + [-14, 12].map((dx) => `<g transform="translate(${dx} 0)"><path d="M-9 -30h18l-2 30h-14Z" fill="#E3B866" fill-opacity="0.55" stroke="#F3E3B5" stroke-width="1"/><rect x="-5" y="-22" width="6" height="6" rx="1.4" fill="#FFFFFF" fill-opacity="0.55"/><rect x="0" y="-14" width="5" height="5" rx="1.2" fill="#FFFFFF" fill-opacity="0.55"/></g>`).join("")
    + `<path d="M28 -3c4 -3 10 -3 14 0" fill="none" stroke="#C9D4CC" stroke-width="1"/>${[0, 1, 2, 3, 4].map((i) => `<ellipse cx="${30 + i * 3}" cy="${-4 - (i % 2) * 2}" rx="2" ry="1.2" fill="#3B433E" stroke="#C9D4CC" stroke-width="0.5"/>`).join("")}</g>`,
};

function journeyFiles() {
  const oak = oakLayers(OAK_LIMBS, 7, { twig: 46 }, K);
  const trunk = oakLayers(OAK_TRUNK, 13, { twig: 30 }, K);
  const roots = oakLayers(OAK_ROOTS, 17, { twig: 0 }, K);
  const bough = oakLayers(OAK_BOUGH, 23, { twig: 15 }, K);
  const crown = oakLayers(OAK_CROWN, CROWN_SEED, { twig: 46, per: 5 }, K);
  const OAK_BOX = "0 120 1440 780", TRUNK_BOX = "0 0 240 2400", BOUGH_BOX = "0 -30 200 70", LANTERN_BOX = "104 510 96 122", STILL_BOX = "1196 780 92 90";
  return {
    oak: svg(OAK_BOX, oak.bark),
    "oak-leaves": svg(OAK_BOX, oak.leaves),
    "oak-moss": svg(OAK_BOX, oak.moss),
    "oak-crown": svg(CROWN_BOX, crown.bark),
    "oak-crown-leaves": svg(CROWN_BOX, crown.leaves),
    "oak-crown-moss": svg(CROWN_BOX, crown.moss),
    "oak-trunk": svg(TRUNK_BOX, trunk.bark),
    "oak-trunk-leaves": svg(TRUNK_BOX, trunk.leaves),
    "oak-trunk-moss": svg(TRUNK_BOX, trunk.moss),
    "oak-roots": svg("0 0 240 156", roots.bark),
    "oak-bough": stretched(BOUGH_BOX, bough.bark),
    "oak-bough-leaves": stretched(BOUGH_BOX, bough.leaves),
    "journey-rice": svg("236 776 320 124", rice(330, 896, 7, 22, 31, K, 26, 22)),
    "lantern-day": svg(LANTERN_BOX, `<path d="M152 512V546" stroke="#8b7b5e" stroke-width="1.2"/>` + hoiAn(152, 552, "#C8352B", 1, false)),
    "lantern-night": svg(LANTERN_BOX, HOI_DEFS("#C8352B") + `<path d="M152 512V546" stroke="#b3a27f" stroke-width="1.2"/>` + hoiAn(152, 552, "#C8352B", 1, true)),
    "journey-morning": svg(STILL_BOX, stool(1240, 826, "#C8352B") + JOURNEY_STILL.banhMi(1240, 820)),
    "journey-evening": svg(STILL_BOX, stool(1240, 826, "#2E6DB4") + JOURNEY_STILL.traDa(1232, 824)),
  };
}
// ---- end Journey drawings ----

// ---- Record drawings ----
// The board's NatRecordFinal: the pressed lotus taped beside the left page's
// title, the cà phê sữa đá (day) and chè (night) on the desk, and the stamps'
// line drawings. Ported verbatim from the generator (`pressedLotus`, `fern`,
// `STILL.suaDa`, `STILL.che`, `stampArt`). The ring slice is not here: it is
// computed from content (src/lib/record.ts).
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
function pressedLotus(x, y, sc) {
  const petal = (a, len, w) => { const r = (a * Math.PI) / 180, ex = Math.cos(r) * len, ey = Math.sin(r) * len, nx = -Math.sin(r) * w, ny = Math.cos(r) * w;
    return `<path d="M0 0Q${f(ex / 2 + nx)} ${f(ey / 2 + ny)} ${f(ex)} ${f(ey)}Q${f(ex / 2 - nx)} ${f(ey / 2 - ny)} 0 0Z" fill="#E8A7B0" fill-opacity="0.75" stroke="#B5606F" stroke-width="0.9"/>`; };
  let petals = "";
  [[-150, 40, 13], [-120, 48, 14], [-90, 52, 14], [-60, 48, 14], [-30, 40, 13], [-105, 34, 10], [-75, 34, 10]].forEach(([a, l, w]) => { petals += petal(a, l, w); });
  return `<g transform="translate(${x} ${y}) scale(${sc}) rotate(-12)">`
    + `<path d="M0 4Q-6 60 4 120" fill="none" stroke="#5E7A4A" stroke-width="2"/>`
    + `<path d="M2 70Q40 54 62 72Q40 92 2 78Z" fill="#9DB384" fill-opacity="0.7" stroke="#5E7A4A" stroke-width="0.9"/>`
    + `${petals}<circle cx="0" cy="-10" r="6" fill="#E3C46A" stroke="#A88A3A" stroke-width="0.8"/></g>`;
}
const RECORD_STILL = {
  suaDa: (x, y) => `<g transform="translate(${x} ${y})">`
    + `<path d="M-11 -40h22l-2 40h-18Z" fill="#F4EFE6" fill-opacity="0.55" stroke="${INK2}" stroke-width="1"/><path d="M-10.4 -26h20.8l-1.4 26h-18Z" fill="#9A6A44"/>`
    + `<rect x="-6" y="-24" width="7" height="7" rx="1.5" fill="#FFFFFF" fill-opacity="0.6"/><rect x="2" y="-18" width="6" height="6" rx="1.5" fill="#FFFFFF" fill-opacity="0.6"/>`
    + `<path d="M3 -52L-1 -14" stroke="#C8352B" stroke-width="2.4" stroke-linecap="round"/></g>`,
  che: (x, y) => `<g transform="translate(${x} ${y})">`
    + `<path d="M-11 -44h22l-2 44h-18Z" fill="#F4EFE6" fill-opacity="0.4" stroke="#F3E3B5" stroke-width="1"/><path d="M-10.6 -12h21.2l-.6 12h-20Z" fill="#7FA36F"/><path d="M-10.8 -24h21.6l-.6 12h-20.4Z" fill="#E3C46A"/><path d="M-11 -36h22l-.4 12h-21.2Z" fill="#F3EEE2"/>`
    + `<path d="M4 -58L-2 -20" stroke="#B9AE95" stroke-width="2.4" stroke-linecap="round"/></g>`,
};
// Round 23: the Diary. Each certificate's stamp is a drawing of what it was
// about, never the issuer's logo (a bank's columns, a card with a key, code
// brackets and a gear, a cart), and three small pictures for the pages that
// have no number to chart (what I taught myself, the degree, a podium).
// Plain line work in one colour, like the rest of the ink files.
const line = (body, sw = 1.2) =>
  `<g fill="none" stroke="${K}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${body}</g>`;
function gear(cx, cy, teeth, R, r, hole) {
  let d = "";
  for (let i = 0; i < teeth; i++) {
    const a = (i * 2 * Math.PI) / teeth;
    for (const [da, rad] of [[-0.3, r], [-0.17, R], [0.17, R], [0.3, r]]) {
      d += (d ? "L" : "M") + f(cx + Math.cos(a + da) * rad) + " " + f(cy + Math.sin(a + da) * rad);
    }
  }
  return `<path d="${d}Z"/><circle cx="${cx}" cy="${cy}" r="${hole}"/>`;
}
const STAMP_ART = {
  // JPMorgan: a bank's façade, pediment over four columns on steps.
  bank: () =>
    line(
      `<path d="M20 13L46 3L72 13Z"/><circle cx="46" cy="9.5" r="1.7"/><path d="M22 16.5H70"/>`
        + [27, 39, 51, 63].map((x) => `<rect x="${x - 3}" y="19" width="6" height="12"/>`).join("")
        + `<path d="M18 33.5H74M14 37H78"/>`,
    ),
  // Visa: a card with a stripe and digits, and the key to its token.
  card: () =>
    line(
      `<rect x="5" y="6" width="52" height="30" rx="4"/><path d="M12 28h8M24 28h8M36 28h8"/>`
        + `<circle cx="68" cy="27" r="6"/><circle cx="68" cy="27" r="2"/><path d="M74 27H88M81 27v5M86 27v4"/>`,
    )
    + `<rect x="5" y="12" width="52" height="6" fill="${K}"/>`,
  // HKUST: code in its brackets around a gear.
  code: () => line(`<path d="M30 8L14 20L30 32M62 8L78 20L62 32"/>${gear(46, 20, 8, 9.5, 7, 3)}`),
  // Walmart: a shopping cart.
  cart: () =>
    line(
      `<path d="M5 6H12L21 28H62"/><path d="M15 12H74L68 25H21Z"/><path d="M17.5 18.5H71"/>`
        + [28, 41, 54, 66].map((x) => `<path d="M${x} 12V25"/>`).join("")
        + `<circle cx="30" cy="33.5" r="3"/><circle cx="58" cy="33.5" r="3"/>`,
    ),
};
const DIARY_ART = {
  // Plants, a planted aquarium, trading, and money with a sprout on it.
  selftaught: () => {
    const plant = `<g transform="translate(33 36)">`
      + line(`<path d="M-12 8H12L9 28H-9Z"/><path d="M-14 8H14"/>`) + fern(0, 8, 36, -98, 3, K, 9) + fern(0, 8, 26, -58, 5, K, 8) + `</g>`;
    const tank = `<g transform="translate(97 36)">`
      + line(
        `<path d="M-22 -14H22V26H-22Z"/><path d="M-22 -6q5.5 -3 11 0t11 0t11 0t11 0"/>`
          + [-18, -12, -6, 0, 6, 12, 18].map((x) => `<circle cx="${x}" cy="22.5" r="1"/>`).join("")
          + `<path d="M-14 23q-5 -11 1 -22M-9 23q4 -10 -1 -16"/><path d="M-13 12q-5 -2 -6 -6M-12 6q5 -1 6 -5"/>`
          + `<ellipse cx="5" cy="10" rx="7" ry="4"/><path d="M-2 10L-8 5V15Z"/><circle cx="9" cy="9" r="0.9"/>`
          + `<circle cx="14" cy="1" r="1.3"/><circle cx="16" cy="-4" r="1"/>`,
      )
      + `</g>`;
    const candles = `<g transform="translate(33 106)">`
      + line(
        `<path d="M-22 -26V26H24"/>`
          + `<rect x="-14" y="-4" width="4" height="12"/><path d="M-12 -10V14"/>`
          + `<rect x="-4" y="-14" width="4" height="14"/><path d="M-2 -20V4"/>`
          + `<rect x="6" y="-18" width="4" height="12"/><path d="M8 -24V-2"/>`,
      )
      + `<path d="M-18 14L-6 2L6 -10L20 -22" fill="none" stroke="${K}" stroke-width="1.2" stroke-linecap="round" stroke-dasharray="2 3"/></g>`;
    const coin = (y) => `<path d="M-14 ${y}v4a14 4.5 0 0 0 28 0v-4"/><ellipse cx="0" cy="${y}" rx="14" ry="4.5"/>`;
    const money = `<g transform="translate(97 106)">`
      + line(coin(20) + coin(13) + coin(6) + `<path d="M0 1V-14M0 -8q-8 -2 -10 -10q8 0 10 10M0 -13q8 -2 10 -10q-8 0 -10 10"/>`)
      + `</g>`;
    return plant + tank + candles + money;
  },
  // A mortarboard with its tassel.
  cap: () =>
    line(
      `<path d="M60 14L108 33L60 52L12 33Z"/><path d="M32 43V58Q60 72 88 58V43"/><circle cx="60" cy="33" r="2"/>`
        + `<path d="M60 33L100 36V58"/><path d="M100 58L97 68H103Z"/>`,
    ),
  // Second place: the lower step with its medal, the winner's with a cup.
  podium: () =>
    line(
      `<path d="M10 44H50V72H10Z"/><path d="M50 30H90V72H50Z"/><path d="M90 52H130V72H90Z"/><path d="M4 72H136"/>`
        + `<path d="M24 12L30 24L36 12"/><circle cx="30" cy="31" r="6"/><circle cx="30" cy="31" r="2.5"/>`
        + `<path d="M62 12H78V20Q78 28 70 28Q62 28 62 20Z"/><path d="M62 14Q55 14 56 20Q57 24 62 23M78 14Q85 14 84 20Q83 24 78 23"/>`,
    ),
};
function recordFiles() {
  const STAMP_BOX = "0 0 92 40";
  return {
    "pressed-lotus": svg("40 10 136 170", pressedLotus(100, 80, 0.9)),
    "record-morning": svg("134 760 36 66", RECORD_STILL.suaDa(150, 822)),
    "record-evening": svg("134 760 36 66", RECORD_STILL.che(150, 822)),
    "stamp-bank": svg(STAMP_BOX, STAMP_ART.bank()),
    "stamp-card": svg(STAMP_BOX, STAMP_ART.card()),
    "stamp-code": svg(STAMP_BOX, STAMP_ART.code()),
    "stamp-cart": svg(STAMP_BOX, STAMP_ART.cart()),
    "diary-selftaught": svg("0 0 130 142", DIARY_ART.selftaught()),
    "diary-cap": svg("0 0 120 80", DIARY_ART.cap()),
    "diary-podium": svg("0 0 140 80", DIARY_ART.podium()),
  };
}
// ---- end Record drawings ----

// ---- The Diary as a book (round 24) ----
// The book's own materials, as one-colour masks the page paints with aliases:
// the paper's grain (a tile of fibre and speckle, so a page reads as paper and
// not as a flat fill), the cover's cloth (a basket weave, tiled over the
// boards) and the ribbon's tail, hanging out of the book's foot with a twist
// and a swallowtail cut. The grain is noise, so it is drawn by the SVG's own
// turbulence with stitched edges, which tiles without a seam and is the same
// on every draw.
function diaryGrain() {
  // Speckle: the top of a fine noise. Fibre: a stretched noise, faint.
  const fx = `<filter id="g" x="0" y="0" width="1" height="1" color-interpolation-filters="sRGB">`
    + `<feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" stitchTiles="stitch" result="s"/>`
    + `<feColorMatrix in="s" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 7 0 0 0 -4.1" result="sa"/>`
    + `<feTurbulence type="fractalNoise" baseFrequency="0.012 0.42" numOctaves="2" seed="3" stitchTiles="stitch" result="f"/>`
    + `<feColorMatrix in="f" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 2.2 0 0 0 -1.05" result="fa"/>`
    + `<feComposite in="sa" in2="fa" operator="arithmetic" k2="1" k3="0.5"/></filter>`;
  return svg("0 0 180 180", `<defs>${fx}</defs><rect width="180" height="180" fill="${K}" filter="url(#g)"/>`);
}
function diaryCloth() {
  // Basket weave: each thread passes over two and under two.
  const over = `<path d="M0 1.5H3M3 4.5H6"/>`;
  const under = `<path d="M4.5 0V3M1.5 3V6" stroke-opacity="0.55"/>`;
  return svg("0 0 6 6", `<g fill="none" stroke="${K}" stroke-width="1.1" stroke-linecap="butt">${over}${under}</g>`);
}
function diaryRibbon() {
  // Out of the book's foot, a turn of the cloth, and a swallowtail.
  const edge = (s) => `M${f(1 + s)} 0C${f(1.6 + s)} 30 ${f(5.4 + s)} 52 ${f(4.2 + s)} 82C${f(3.6 + s)} 98 ${f(2 + s)} 108 ${f(2.6 + s)} 120`;
  const left = edge(0);
  const body = `${left}L${f(8.4)} ${f(113)}L${f(14.2)} 122`
    + `C${f(13.6)} 108 ${f(15.4)} 98 ${f(16)} 82C${f(17.2)} 52 ${f(13.4)} 30 ${f(12.8)} 0Z`;
  // The fold where it turns, a little darker in the cloth.
  const fold = `<path d="M4.6 54C8 58 11.6 58 15 54" fill="none" stroke="${K}" stroke-width="0.8" stroke-opacity="0.35"/>`;
  return svg("0 0 18 124", `<path d="${body}" fill="${K}"/>${fold}`);
}
function diaryFiles() {
  return {
    "diary-grain": diaryGrain(),
    "diary-cloth": diaryCloth(),
    "diary-ribbon": diaryRibbon(),
  };
}
// ---- end Diary book drawings ----

// ---- Weather drawings (round 23) ----
// "Watch it grow" plays a different weather over the oak for each year
// (src/lib/origin-story.ts, `weatherFor`); these are the shapes CSS cannot make
// out of gradients. All one-colour masks, painted by an alias. A hole (a
// window, a light, a midrib) is an evenodd subpath, so the sky shows through.
function weatherFiles() {
  const circle = (cx, cy, r) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${r * 2} 0a${r} ${r} 0 1 0 ${-r * 2} 0Z`;
  // An airliner, nose right: fuselage with a row of windows, two swept wings,
  // a fin and an engine.
  let windows = "";
  for (let x = 96; x <= 156; x += 10) windows += circle(x, 31, 2.4);
  const plane = `<path fill-rule="evenodd" fill="${K}" d="M6 30C6 24 30 22 70 22L140 22C160 22 176 28 176 32C176 37 160 42 140 42L40 42C18 42 6 38 6 30Z${windows}"/>`
    + `<path fill="${K}" d="M12 26L4 4h18l26 20Z"/>`
    + `<path fill="${K}" d="M96 38L64 62h20l44-24Z"/>`
    + `<path fill="${K}" d="M100 24L78 8h14l32 16Z"/>`
    + `<ellipse fill="${K}" cx="94" cy="49" rx="9" ry="4"/>`;
  // A flying saucer: a glass dome with a little pilot, a disc with a row of
  // lights, three legs.
  let lights = "";
  for (const x of [24, 44, 65, 86, 106]) lights += circle(x, 46, 3.2);
  const ufo = `<path fill-rule="evenodd" fill="${K}" d="M38 34C38 6 92 6 92 34ZM46 34C46 14 84 14 84 34Z"/>`
    + `<path fill="${K}" d="${circle(65, 26, 5.4)}M60 32c0-3 10-3 10 0Z"/><path fill="none" stroke="${K}" stroke-width="1.6" stroke-linecap="round" d="M62 21l-3-5M68 21l3-5"/>`
    + `<path fill-rule="evenodd" fill="${K}" d="M4 44C4 34 30 32 65 32C100 32 126 34 126 44C126 54 100 58 65 58C30 58 4 54 4 44Z${lights}"/>`
    + `<path fill="none" stroke="${K}" stroke-width="3" stroke-linecap="round" d="M40 56l-6 12M90 56l6 12M65 58v10"/>`;
  // An oak leaf: four rounded lobes a side, a stem, the midrib a hole.
  const lobes = [[50, 18], [38, 21], [26, 18], [14, 11]];
  let outline = "M22 63V56";
  for (const [y, w] of lobes) outline += `Q${22 + w * 0.6} ${y + 8} ${22 + w} ${y}Q${22 + w * 0.6} ${y - 7} 25 ${y - 6}`;
  outline += "L22 2";
  for (const [y, w] of [...lobes].reverse()) outline += `L19 ${y - 6}Q${22 - w * 0.6} ${y - 7} ${22 - w} ${y}Q${22 - w * 0.6} ${y + 8} 22 ${y + 6}`;
  const leaf = `<path fill-rule="evenodd" fill="${K}" d="${outline}ZM21.2 12h1.6v42h-1.6Z"/>`;
  // A cloud, drawn as a hand would: the outline of heaped puffs on a flat base,
  // traced twice with a wobble (a line, and a wash inside it), and a few curls
  // inside. Two files, so the page can paint a pale wash and a firmer line.
  const puffs = [[34, 70, 20], [62, 52, 26], [102, 40, 32], [146, 50, 26], [178, 64, 22], [196, 76, 13]];
  const BASE = 90, C0 = [110, 72];
  const trace = (seed, wobble) => {
    const cr = rng(seed);
    const pts = [];
    for (let a = 0; a < 360; a += 4) {
      const dx = Math.cos((a * Math.PI) / 180), dy = Math.sin((a * Math.PI) / 180);
      let far = 0;
      for (const [cx, cy, r] of puffs) {
        const b = dx * (cx - C0[0]) + dy * (cy - C0[1]);
        const c = (cx - C0[0]) ** 2 + (cy - C0[1]) ** 2 - r * r;
        const disc = b * b - c;
        if (disc >= 0) far = Math.max(far, b + Math.sqrt(disc));
      }
      if (far === 0) continue;
      pts.push([f(C0[0] + dx * far + (cr() - 0.5) * wobble), f(Math.min(BASE, C0[1] + dy * far) + (cr() - 0.5) * wobble)]);
    }
    return "M" + pts.map((q) => q.join(" ")).join("L") + "Z";
  };
  const curls = puffs.slice(0, 4).map(([cx, cy, r]) => `M${f(cx - r * 0.45)} ${f(cy + r * 0.35)}A${f(r * 0.6)} ${f(r * 0.6)} 0 0 1 ${f(cx + r * 0.15)} ${f(cy + r * 0.05)}`).join("");
  const cloud = `<path fill="${K}" d="${trace(41, 0.4)}"/>`;
  const cloudLine = `<g fill="none" stroke="${K}" stroke-linecap="round" stroke-linejoin="round"><path stroke-width="2.2" d="${trace(41, 0.4)}"/><path stroke-width="1.1" d="${trace(77, 2.2)}"/><path stroke-width="1.2" d="${curls}"/></g>`;
  const bolt = `<path fill="${K}" d="M26 2L6 58H20L10 118L40 40H25L38 2Z"/>`;
  // Two seamless tiles the CSS scrolls down a mask: slanted rain streaks and
  // snowflakes (dots, and now and then a six-armed flake). Seeded, so the draw
  // is deterministic. Nothing touches a tile's edge, so it wraps cleanly.
  const rr = rng(23);
  let streaks = "";
  for (let i = 0; i < 34; i++) {
    const x = 14 + rr() * 172, y = 12 + rr() * 150, len = 12 + rr() * 14;
    streaks += `M${f(x)} ${f(y)}l${f(-len * 0.22)} ${f(len)}`;
  }
  const rain = `<path fill="none" stroke="${K}" stroke-width="1.6" stroke-linecap="round" d="${streaks}"/>`;
  const sr = rng(7);
  let dots = "", stars = "";
  for (let i = 0; i < 30; i++) dots += circle(f(12 + sr() * 216), f(12 + sr() * 216), f(1.4 + sr() * 1.9));
  for (let i = 0; i < 6; i++) {
    const x = 20 + sr() * 200, y = 20 + sr() * 200;
    for (const a of [0, 60, 120]) {
      const dx = Math.cos((a * Math.PI) / 180) * 5.5, dy = Math.sin((a * Math.PI) / 180) * 5.5;
      stars += `M${f(x - dx)} ${f(y - dy)}L${f(x + dx)} ${f(y + dy)}`;
    }
  }
  const snow = `<path fill="${K}" d="${dots}"/><path fill="none" stroke="${K}" stroke-width="1.1" stroke-linecap="round" d="${stars}"/>`;
  return {
    rain: svg("0 0 200 200", rain),
    snow: svg("0 0 240 240", snow),
    plane: svg("0 0 180 64", plane),
    ufo: svg("0 0 130 70", ufo),
    leaf: svg("0 0 44 64", leaf),
    cloud: svg("0 0 220 100", cloud),
    "cloud-line": svg("0 0 220 100", cloudLine),
    bolt: svg("0 0 44 120", bolt),
  };
}
// ---- end Weather drawings ----

// ---- Header drawings (round 23, builder E) ----
// The paper strip's torn lower edge (a tile, so the strip can be any width),
// the ink swash drawn under the current section, and the sun and crescent moon
// that are the theme switch. All one-colour masks painted by an alias.
function navTorn() {
  // Black above a ragged line 3-9px down a 240px tile; the line starts and ends
  // at the same height so the tile repeats without a seam.
  const r = rng(23), W = 240, H = 10, pts = [];
  for (let x = 0; x <= W; x += 5) pts.push([x, 5.4 + (r() - 0.5) * 5 + Math.sin(x / 19) * 1.4]);
  pts[pts.length - 1][1] = pts[0][1];
  let d = `M0 0H${W}V${f(pts[pts.length - 1][1])}`;
  for (let i = pts.length - 2; i >= 0; i--) d += `L${f(pts[i][0])} ${f(pts[i][1])}`;
  return svg(`0 0 ${W} ${H}`, `<path d="${d}Z" fill="${K}"/>`);
}
function navSwash() {
  // One brush stroke, heavier at the start and dry at the tail, stretched to
  // the label's width (the page sizes it to the label with a mask).
  return svg(
    "0 0 120 12",
    `<path d="M3 7.6C16 4.4 34 3.2 56 4.2C80 5.2 100 3.4 117 4.6C109 5.8 98 6.6 84 6.8C64 7.2 40 8.8 24 9.4C14 9.7 7 9.3 3 7.6Z" fill="${K}"/>`
      + `<path d="M30 10.6C48 10 70 10.4 92 8.8" fill="none" stroke="${K}" stroke-width="0.9" stroke-linecap="round" stroke-dasharray="14 5 6 4"/>`,
  );
}
function navSun() {
  // A sun as one would draw it in the margin: a lopsided disc, eight rays that
  // are not the same length.
  const r = rng(5);
  let rays = "";
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4 + (r() - 0.5) * 0.18, r0 = 11.5 + r(), r1 = r0 + 4.2 + r() * 3.4;
    const bend = (r() - 0.5) * 1.6;
    rays += `<path d="M${f(20 + Math.cos(a) * r0)} ${f(20 + Math.sin(a) * r0)}Q${f(20 + Math.cos(a) * (r0 + r1) / 2 - Math.sin(a) * bend)} ${f(20 + Math.sin(a) * (r0 + r1) / 2 + Math.cos(a) * bend)} ${f(20 + Math.cos(a) * r1)} ${f(20 + Math.sin(a) * r1)}"/>`;
  }
  return svg(
    "0 0 40 40",
    `<g fill="none" stroke="${K}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">`
      + `<path d="M20 12.4C24.4 12.2 28 15.6 27.8 20.2C27.6 24.6 24.2 27.8 19.8 27.6C15.4 27.4 12.2 24 12.4 19.6C12.6 15.6 16 12.6 20.4 12.5"/>${rays}</g>`,
  );
}
function navMoon() {
  // A crescent with a small star above its horn.
  return svg(
    "0 0 40 40",
    `<path d="M26.6 7.2C17.4 8 11 15.2 11.6 23.6C12.2 31.4 18.8 36.8 26.4 36C30.2 35.6 33.4 33.8 35.6 31.2C25.8 32.4 18.6 25.6 19.6 17.4C20 13.2 22.6 9.6 26.6 7.2Z" fill="${K}"/>`
      + `<path d="M31.5 8.5v6M28.5 11.5h6" fill="none" stroke="${K}" stroke-width="2" stroke-linecap="round"/>`,
  );
}
function navFiles() {
  return {
    "nav-torn": navTorn(),
    "nav-swash": navSwash(),
    "nav-sun": navSun(),
    "nav-moon": navMoon(),
  };
}
// ---- end Header drawings ----

/** @returns {Record<string, string>} file stem → SVG text */
export function drawScenery() {
  const paddy = paddyBoard(PADDY.wide), paddyPhone = paddyBoard(PADDY.phone);
  return {
    bamboo: svg(`0 110 140 ${BAMBOO_FOOT - 110}`, bamboo(K, `fill="${K}" fill-opacity="0.18"`)),
    ...poleFiles(),
    pine: svg(`1260 80 180 ${PINE_FOOT - 80}`, `<g transform="translate(1356 900) scale(2.7)">${pine(0, 0, 300, K)}</g><path d="M1356 900V${PINE_FOOT}" fill="none" stroke="${K}" stroke-width="4.32"/>`),
    paddy: svg(`0 0 ${PADDY.wide.W} ${PADDY.wide.H}`, paddy.rice),
    "paddy-water": svg(`0 0 ${PADDY.wide.W} ${PADDY.wide.H}`, paddy.water),
    "paddy-phone": svg(`0 0 ${PADDY.phone.W} ${PADDY.phone.H}`, paddyPhone.rice),
    "paddy-phone-water": svg(`0 0 ${PADDY.phone.W} ${PADDY.phone.H}`, paddyPhone.water),
    "paddy-wake": svg("125 0 250 104", paddyWake()),
    "buffalo-plow": svg(BUF_BOX, buffaloPlow()),
    "buffalo-sleep": svg(BUF_BOX, buffaloSleep()),
    "offduty-day": svg(VONG_BOX, moonVong(false)),
    "offduty-night": svg(VONG_BOX, moonVong(true)),
    "tag-rice": svg("0 0 150 88", rice(52, 84, 3, 20, 4, K, 44, 26)),
    "tag-flytrap": svg("0 0 150 88", flytrap(K)),
    "tag-book": svg("0 0 150 88", openBook(K)),
    "tag-laptop": svg("0 0 150 88", laptop(K)),
    // Round 28: the wooden clothespin that pins two chapters straight to the
    // line: two legs in a lighter ink with a little grain, and the spring in
    // full ink at y 17–22.5, which the page puts on the line, so the line
    // seems to pass through the jaw. Painted by --twine.
    clothespin: svg(
      "0 0 16 50",
      `<path d="M2 1.5Q2 0 3.5 0H7.4V50H4Q2.6 50 2.4 48.4Z" fill="${K}" fill-opacity="0.62"/>`
        + `<path d="M8.6 0H12.5Q14 0 14 1.5L13.6 48.4Q13.4 50 12 50H8.6Z" fill="${K}" fill-opacity="0.5"/>`
        + `<path d="M3.6 6.5V12M12.4 30V44" fill="none" stroke="${K}" stroke-opacity="0.35" stroke-width="0.8" stroke-linecap="round"/>`
        + `<rect x="1" y="17" width="14" height="5.5" rx="1.6" fill="${K}"/>`
    ),
    "non-la": svg("44 370 120 130", `<path d="M80 372Q96 380 102 396" fill="none" stroke="#8b7b5e" stroke-width="1.2"/>${nonLa(104, 444, 0.9)}`),
    "sky-day": svg("0 0 1440 900", skyLayer(false, [880, 120], 1)),
    "sky-night": svg("0 0 1440 900", skyLayer(true, [880, 120], 1)),
    morning: svg(STOOL_BOX, stoolLong(470, 840, "#C8352B") + scaled(440, 838, 1.1, STILL.phin(0, 0)) + scaled(493, 838, 1.1, comTam(0, 0))),
    evening: svg(STOOL_BOX, stoolLong(470, 840, "#2E6DB4") + scaled(446, 838, 0.95, STILL.lau(0, 0)) + scaled(490, 838, 1.1, biaPair(0, 0))),
    ...navFiles(),
    ...contactDrawings(),
    ...journeyFiles(),
    ...nurseryFiles(),
    ...recordFiles(),
    ...diaryFiles(),
    ...weatherFiles(),
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
