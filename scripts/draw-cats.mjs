/**
 * Draws the two live cats (and the police cat) once into committed SVG sprite
 * sheets under public/cats/ — page-mascot's method, drawn in the hero's line:
 * the sleeping pose is the hero's "Moon, off duty" drawing itself, and every
 * other pose is built from the same parts (a round head with tall pointed ears,
 * arc eyes, a tiny V nose, fine whiskers, a soft loaf of a body).
 *
 * Each file holds `<symbol>`s the page draws with `<use href="/cats/moon.svg#walk-3">`:
 *   look-0..8   sitting, the head turned to one of 3×3 directions
 *               (row = up/level/down, column = back/at you/forward)
 *   react-0..8  blink, yawn, purr, startle, stretch, groom, bat, sniff, sleep
 *   walk-0..7   one stride
 *   tail, tail-puff   the sitting tail, drawn apart so the page can sway it
 * and its root lays them out as the sheets, so opening the file shows them.
 *
 * Colour is the page's: ink is `currentColor`, the coat `var(--cat-coat)`, the
 * socks `var(--cat-sock)`, so the cats follow theme, tone and paper like every
 * other drawing. Fallbacks only matter when the file is opened on its own.
 *
 * Deterministic: the only randomness is the seeded jitter on Mi's stripes.
 * No newlines in the output (core.autocrlf would rewrite them).
 *
 * tests/lib/cats.test.ts fails until the files are re-drawn (`pnpm draw:cats`)
 * and committed.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

const W = 50;
const H = 42;
const f = (n) => Math.round(n * 10) / 10;
function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const COAT = 'fill="var(--cat-coat,#a9b0ad)"';
const SOCK = 'fill="var(--cat-sock,#eef0ec)"';
const INK = 'fill="currentColor"';
const FINE = 'stroke-width="0.7"';
const HAIR = 'stroke-width="0.5"';

/** The two coats. Moon is the blue cat: rounder, a solid coat, small ears.
 *  Mi is the grey tabby: slimmer, taller ears, a longer tail, mackerel
 *  stripes and white socks. */
const CATS = {
  moon: { head: 8.2, ear: 3.6, hip: 4, tailTip: [3.5, 25], tailW: 4.6, tabby: false, seed: 11 },
  mi: { head: 7.6, ear: 4.6, hip: 6.5, tailTip: [2.2, 20.5], tailW: 3.8, tabby: true, seed: 29 },
};

/* -------------------------------------------------------------- pieces -- */

/** A tube: an ink stroke with a narrower coat stroke down its middle, which
 *  is a filled tail without having to outline one. */
function tube(d, w) {
  return `<path d="${d}" stroke-width="${w}"/><path d="${d}" stroke="var(--cat-coat,#a9b0ad)" stroke-width="${f(w - 2.6)}"/>`;
}

function qAt(p0, c, p1, t) {
  const u = 1 - t;
  return [u * u * p0[0] + 2 * u * t * c[0] + t * t * p1[0], u * u * p0[1] + 2 * u * t * c[1] + t * t * p1[1]];
}

/** A tail from `root` to `tip` bending through `c`; rings for the tabby. */
function tail(cat, root, c, tip, w = cat.tailW) {
  const d = `M${f(root[0])} ${f(root[1])}Q${f(c[0])} ${f(c[1])} ${f(tip[0])} ${f(tip[1])}`;
  let s = tube(d, w);
  if (cat.tabby) {
    for (const t of [0.45, 0.65, 0.85]) {
      const [x, y] = qAt(root, c, tip, t);
      const [x2, y2] = qAt(root, c, tip, t + 0.02);
      const dx = x2 - x, dy = y2 - y, len = Math.hypot(dx, dy) || 1;
      const nx = (-dy / len) * (w / 2 - 0.3), ny = (dx / len) * (w / 2 - 0.3);
      s += `<path d="M${f(x - nx)} ${f(y - ny)}L${f(x + nx)} ${f(y + ny)}" ${FINE}/>`;
    }
  }
  return s;
}

/**
 * The head: ears, skull, face. (cx, cy) is the skull's centre; (dx, dy) in
 * -1..1 is where it looks — the skull moves a little, the face more, so the
 * turn reads at 50px. `eyes`: open | shut | happy | squeeze | wide.
 */
function head(cat, cx, cy, { dx = 0, dy = 0, eyes = "open", ears = "up", mouth = "shut", cap = false } = {}) {
  const r = cat.head;
  const hx = cx + dx * 0.9, hy = cy + dy * 0.7;
  const fx = hx + dx * 2.1, fy = hy + dy * 1.7;
  let s = "";
  if (!cap) {
    // Ears first, so the skull covers their roots. Back flat when startled.
    const e = cat.ear;
    const lean = dx * 0.7;
    const L = ears === "back"
      ? [[hx - r * 0.8, hy - r * 0.2], [hx - r - e * 0.55, hy - r * 0.75], [hx - r * 0.35, hy - r * 0.85]]
      : [[hx - r * 0.85, hy - r * 0.3], [hx - r * 0.72 + lean, hy - r - e], [hx - r * 0.12, hy - r * 0.92]];
    const R = ears === "back"
      ? [[hx + r * 0.35, hy - r * 0.85], [hx + r + e * 0.55, hy - r * 0.75], [hx + r * 0.8, hy - r * 0.2]]
      : [[hx + r * 0.12, hy - r * 0.92], [hx + r * 0.72 + lean, hy - r - e], [hx + r * 0.85, hy - r * 0.3]];
    for (const [a, b, c] of [L, R]) {
      s += `<path d="M${f(a[0])} ${f(a[1])}L${f(b[0])} ${f(b[1])}L${f(c[0])} ${f(c[1])}Z" ${COAT}/>`;
    }
  }
  // The skull: a little wider than tall, flatter on top, fuller in the cheeks.
  const w = r * 1.04;
  s += `<path d="M${f(hx - w)} ${f(hy + 0.6)}C${f(hx - w)} ${f(hy - r * 0.75)} ${f(hx - r * 0.55)} ${f(hy - r)} ${f(hx)} ${f(hy - r)}C${f(hx + r * 0.55)} ${f(hy - r)} ${f(hx + w)} ${f(hy - r * 0.75)} ${f(hx + w)} ${f(hy + 0.6)}C${f(hx + w)} ${f(hy + r * 0.8)} ${f(hx + r * 0.5)} ${f(hy + r * 0.95)} ${f(hx)} ${f(hy + r * 0.95)}C${f(hx - r * 0.5)} ${f(hy + r * 0.95)} ${f(hx - w)} ${f(hy + r * 0.8)} ${f(hx - w)} ${f(hy + 0.6)}Z" ${COAT}/>`;
  if (cat.tabby) {
    // The forehead's "M": three short bars.
    for (const k of [-1.6, 0, 1.6]) {
      s += `<path d="M${f(fx + k)} ${f(hy - r * 0.82)}l0 ${k === 0 ? 2.4 : 1.8}" ${FINE}/>`;
    }
  }
  if (cap) {
    // The police cap: a dark crown on a band, the peak thrown forward.
    s += `<path d="M${f(hx - r * 0.95)} ${f(hy - r * 0.55)}C${f(hx - r * 0.8)} ${f(hy - r * 1.75)} ${f(hx + r * 0.8)} ${f(hy - r * 1.75)} ${f(hx + r * 0.95)} ${f(hy - r * 0.55)}Z" ${INK}/>`;
    s += `<path d="M${f(hx + r * 0.6)} ${f(hy - r * 0.55)}l${f(r * 0.75)} 1.3"/>`;
  }
  // Eyes, 2.7 either side of the face's centre line.
  const ex = 2.75, ey = fy - 0.4;
  for (const side of [-1, 1]) {
    const x = fx + side * ex;
    if (eyes === "open") s += `<circle cx="${f(x)}" cy="${f(ey)}" r="1.05" ${INK} stroke="none"/>`;
    else if (eyes === "wide") s += `<circle cx="${f(x)}" cy="${f(ey)}" r="1.6" ${FINE}/><circle cx="${f(x)}" cy="${f(ey)}" r="0.6" ${INK} stroke="none"/>`;
    else if (eyes === "shut") s += `<path d="M${f(x - 1.3)} ${f(ey - 0.3)}q1.3 1.1 2.6 0" ${FINE}/>`;
    else if (eyes === "happy") s += `<path d="M${f(x - 1.3)} ${f(ey + 0.4)}q1.3 -1.2 2.6 0" ${FINE}/>`;
    else if (eyes === "squeeze") s += `<path d="M${f(x - side * 1.2)} ${f(ey - 0.8)}l${f(side * 1.4)} 0.8l${f(-side * 1.4)} 0.8" ${FINE}/>`;
  }
  // Nose, a tiny V, and the mouth.
  const ny = fy + 2.3;
  s += `<path d="M${f(fx - 0.8)} ${f(ny)}l0.8 0.9l0.8 -0.9" ${FINE}/>`;
  if (mouth === "open") s += `<ellipse cx="${f(fx)}" cy="${f(ny + 2.6)}" rx="1.5" ry="1.9" ${INK} stroke="none"/>`;
  // Whiskers, past the cheeks.
  for (const side of [-1, 1]) {
    const x = fx + side * 3.6;
    s += `<path d="M${f(x)} ${f(ny + 0.3)}l${f(side * 5.4)} -0.9M${f(x)} ${f(ny + 1.2)}l${f(side * 5.2)} 1" ${HAIR}/>`;
  }
  return s;
}

/** The seated body, facing right: haunch at the back, chest at the front. */
function sitBody(cat) {
  const h = cat.hip;
  return `<path d="M36 40L${f(14 + h * 0.2)} 40C${f(h)} 40 ${f(h + 0.6)} 27 ${f(14.5)} 24C19.5 22.4 22.5 18.5 27 18C34 17.6 37.6 25 36.6 31.5C36.3 34 36 37 36 40Z" ${COAT}/>` +
    // The fold of the hind leg.
    `<path d="M${f(14 + h * 0.15)} 40C${f(12 + h * 0.2)} 33 18 29.5 24 31.5" ${FINE}/>`;
}

function stripes(cat, marks) {
  if (!cat.tabby) return "";
  const r = rng(cat.seed);
  return marks.map(([x, y, dx, dy]) => `<path d="M${f(x + (r() - 0.5) * 0.4)} ${f(y)}l${f(dx)} ${f(dy)}" ${FINE}/>`).join("");
}

const SIT_STRIPES = [[13.5, 26.5, 1.6, 3.6], [17, 24, 1.4, 3.8], [20.8, 22, 1, 3.6], [24.5, 20.5, 0.6, 3]];

/** A foot: Mi's are white socks, Moon's are as grey as the rest of him, so
 *  his leg just ends in a short rounded toe. */
function paw(cat, x, y, rx = 1.6) {
  return cat.tabby
    ? `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(rx)}" ry="1" ${SOCK} ${FINE}/>`
    : `<path d="M${f(x - rx * 0.6)} ${f(y + 0.2)}h${f(rx * 1.2)}"/>`;
}

/** Front legs of a sitting cat: the far one, then the near one. */
function forelegs(cat, near = "down") {
  let s = `<path d="M30.5 29V38.6"/>` + paw(cat, 31, 39.1);
  if (near === "down") s += `<path d="M34.6 29V38.6"/>` + paw(cat, 35.2, 39.1);
  else if (near === "groom") s += `<path d="M34.4 30C37.6 29 38 25.5 36.6 22.6"/>` + paw(cat, 36.4, 22, 1.8);
  else if (near === "bat") s += `<path d="M34 29.5C38 28.6 41.5 28 44.6 27.6"/>` + paw(cat, 45.4, 27.6, 1.9);
  return s;
}

const HEAD_SIT = [31.8, 13.6];

function sit(cat, opts = {}, near = "down") {
  const [cx, cy] = opts.at ?? HEAD_SIT;
  return sitBody(cat) + stripes(cat, SIT_STRIPES) + forelegs(cat, near) + head(cat, cx, cy, opts);
}

/** The sitting tail, apart from the body so the page can sway it about its
 *  root (11, 38). The body is drawn over its root. */
function sitTail(cat, puff = false) {
  const [tx, ty] = cat.tailTip;
  return puff
    ? tail(cat, [11, 38], [1.5, 34], [tx + 1.5, ty - 4], cat.tailW + 2.4)
    : tail(cat, [11, 38], [1, 37], [tx, ty]);
}

/** Down-dog: rump up, chest low, forelegs reaching along the ground. */
function stretch(cat) {
  const [tx, ty] = cat.tailTip;
  return tail(cat, [9, 24], [3, 21], [tx + 2, ty - 8]) +
    `<path d="M12.5 31L11.6 39.2M17.4 32L17.8 39.2"/>` + paw(cat, 11.4, 39.3) + paw(cat, 18, 39.3) +
    `<path d="M9 26C8 20.5 12 19 16 19.4C22 20 26 25.5 32 28.5C35.5 30.2 36 34 33 35.6C28.5 37.5 20 36 15 33.5C11 31.6 9.4 29.5 9 26Z" ${COAT}/>` +
    stripes(cat, [[13, 20.2, 0.6, 3.6], [17, 20.6, 0.4, 3.8], [21, 22.4, -0.2, 3.6]]) +
    `<path d="M31 35C35 37 40 38.4 45 38.8M28 34.6C32 37 37 39 42 39.4"/>` + paw(cat, 45.8, 39, 1.9) + paw(cat, 42.6, 39.4, 1.9) +
    head(cat, 38.5, 27.5, { dx: 1, dy: 0.4, eyes: "shut" });
}

/** Asleep: the hero's own "Moon, off duty", turned to face right and set into
 *  the cell. Same paths, same arcs — so a live cat lying down is the drawing
 *  in the rice. */
function sleep(cat) {
  const s = 0.34;
  const stroke = f(1.4 / s);
  const fine = f(0.7 / s);
  const coat = 'fill="var(--cat-coat,#a9b0ad)"';
  const marks = cat.tabby
    ? `<path d="M84 36L82 48M100 36L97 50M116 42L112 54M130 50L125 60M136 82L128 84M128 90L120 88" stroke-width="${fine}"/>`
    : "";
  return `<g transform="matrix(${-s} 0 0 ${s} 52.7 7.7)" stroke-width="${stroke}">` +
    `<path d="M150 74C152 96 112 101 70 96"/>` +
    `<path d="M22 70C22 42 60 28 96 32C130 36 152 54 150 72C148 88 122 93 90 93L44 93C30 93 22 84 22 70Z" ${coat}/>` +
    `<path d="M60 52C76 46 98 46 116 54" stroke-width="${fine}"/>` + marks +
    `<path d="M28 52L25 33L40 45M48 43L59 29L61 46" ${coat}/>` +
    `<path d="M22 66C20 50 34 40 48 42C62 44 68 56 64 68C60 80 46 84 34 80C26 77 22 72 22 66Z" ${coat}/>` +
    `<path d="M33 62q4 3 8 0M48 62q4 3 8 0M43 69l1 2l1 -2" stroke-width="${fine}"/>` +
    `<path d="M30 70l-12 -2M30 73l-11 3M58 70l12 -2M58 73l11 3" stroke-width="${f(0.5 / s)}"/>` +
    `</g>`;
}

/**
 * One frame of the walk, `k` of 8. A lateral-sequence gait (left hind, left
 * fore, right hind, right fore, a quarter apart): each foot swings ±3.6 and
 * lifts on the way forward, the body rides up half a pixel twice a stride,
 * the tail sways once.
 */
function walk(cat, k, cap = false) {
  const p = k / 8;
  const bob = -0.5 * Math.abs(Math.sin(2 * Math.PI * p));
  const leg = (hipX, off) => {
    const a = 2 * Math.PI * (p + off);
    const footX = hipX + 3.6 * Math.sin(a);
    const lift = 2 * Math.max(0, Math.cos(a));
    const footY = 39.2 - lift;
    const kneeX = (hipX + footX) / 2 + (lift > 0 ? 1.1 : 0);
    const kneeY = 34.5 + bob - lift * 0.5;
    const d = `M${f(hipX)} ${f(29 + bob)}L${f(kneeX)} ${f(kneeY)}L${f(footX)} ${f(footY - 0.6)}`;
    // Legs are tubes like the tail; the far pair is drawn behind the body.
    return tube(d, 3.4) + paw(cat, footX + 0.4, footY);
  };
  const sway = Math.sin(2 * Math.PI * p);
  const [tx, ty] = cat.tailTip;
  const b = f(bob);
  let s = tail(cat, [12.5, 26 + bob], [4, 25 + bob], [tx + 2 + sway * 1.4, ty - 2 + bob]);
  s += leg(18.5, 0.5) + leg(34.5, 0.75);
  s += `<g transform="translate(0 ${b})"><path d="M11.5 29C11.2 23 16 20 23 20C30 20 36.5 20.6 38.6 24.5C40.4 28 38 32.5 33 33C26 33.8 18 33.6 14.5 32.6C12.6 32 11.6 31 11.5 29Z" ${COAT}/>`;
  s += stripes(cat, [[16, 20.6, 0.4, 3.6], [20, 20.2, 0.3, 4], [24, 20.2, 0.2, 4], [28, 20.4, 0, 3.6], [32, 20.8, -0.2, 3.2]]);
  s += `</g>`;
  s += leg(15.5, 0) + leg(31.5, 0.25);
  s += head(cat, 38.6, 15.6 + bob, { dx: 1, dy: 0, cap });
  return s;
}

/* -------------------------------------------------------------- sheets -- */

const LOOK = [-1, 0, 1].flatMap((dy) => [-1, 0, 1].map((dx) => ({ dx, dy })));

/** The reactions, in sheet order. The renderer's `REACTIONS` names the same
 *  nine in the same order (tests/lib/cats.test.ts holds the two together). */
export const REACTIONS = ["blink", "yawn", "purr", "startle", "stretch", "groom", "bat", "sniff", "sleep"];

function reaction(cat, name) {
  switch (name) {
    case "blink": return sit(cat, { eyes: "shut" });
    case "yawn": return sit(cat, { dy: -1, eyes: "squeeze", mouth: "open" });
    case "purr": return sit(cat, { dy: 0.4, eyes: "happy" });
    case "startle": return sit(cat, { dy: -0.6, eyes: "wide", ears: "back" });
    case "stretch": return stretch(cat);
    case "groom": return sit(cat, { dx: 0.6, dy: 0.5, eyes: "shut" }, "groom");
    case "bat": return sit(cat, { dx: 1, dy: 0.5 }, "bat");
    case "sniff": return sit(cat, { at: [39.4, 29.2], dx: 1, dy: 1, eyes: "shut" });
    case "sleep": return sleep(cat);
    default: throw new Error(name);
  }
}

const SYMBOL_ATTRS = `viewBox="0 0 ${W} ${H}" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"`;

/**
 * Fewer elements, same drawing: consecutive stroke-only paths with the same
 * attributes become one path (their `d`s joined). Filled paths are left alone,
 * because a filled shape has to cover the strokes drawn before it. The page
 * puts every symbol in its DOM, so this is the sheet's node count.
 */
function merge(body) {
  const parts = body.match(/<path d="[^"]*"[^>]*\/>|<[^>]+>/g) ?? [];
  const out = [];
  for (const part of parts) {
    const m = part.match(/^<path d="([^"]*)"([^>]*)\/>$/);
    const prev = out.at(-1);
    const pm = prev?.match(/^<path d="([^"]*)"([^>]*)\/>$/);
    if (m && pm && m[2] === pm[2] && !/fill=/.test(m[2])) {
      out[out.length - 1] = `<path d="${pm[1]}${m[1]}"${m[2]}/>`;
    } else out.push(part);
  }
  return out.join("");
}

function sheet(frames, cols) {
  // The root shows the cells as sheets: rows of `cols`, 4px apart.
  const cells = frames.filter(([id]) => !id.startsWith("tail"));
  let uses = "";
  let x = 0, y = 0, col = 0, group = "", width = 0;
  for (const [id] of cells) {
    const g = id.replace(/-\d+$/, "");
    if (g !== group && group !== "") { x = 0; y += H + 12; col = 0; }
    else if (col === cols[g]) { x = 0; y += H + 4; col = 0; }
    group = g;
    const tailId = /^look|^react-[0-35-7]$/.test(id) ? (id === "react-3" ? "tail-puff" : "tail") : null;
    if (tailId && frames.some(([t]) => t === tailId)) uses += `<use href="#${tailId}" x="${x}" y="${y}" width="${W}" height="${H}"/>`;
    uses += `<use href="#${id}" x="${x}" y="${y}" width="${W}" height="${H}"/>`;
    x += W + 4; col += 1; width = Math.max(width, x - 4);
  }
  const height = y + H;
  const symbols = frames.map(([id, body]) => `<symbol id="${id}" ${SYMBOL_ATTRS}>${merge(body)}</symbol>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">${symbols}${uses}</svg>`;
}

/** @returns {Record<string, string>} */
export function drawCats() {
  /** @type {Record<string, string>} */
  const files = {};
  for (const [name, cat] of Object.entries(CATS)) {
    const frames = [
      ["tail", sitTail(cat)],
      ["tail-puff", sitTail(cat, true)],
      ...LOOK.map(({ dx, dy }, i) => [`look-${i}`, sit(cat, { dx, dy })]),
      ...REACTIONS.map((r, i) => [`react-${i}`, reaction(cat, r)]),
      ...Array.from({ length: 8 }, (_, k) => [`walk-${k}`, walk(cat, k)]),
    ];
    files[name] = sheet(frames, { look: 3, react: 3, walk: 8 });
  }
  // The police cat: Moon in a cap, and only what an escort does — walk, and
  // stand over them for a moment.
  const moon = CATS.moon;
  files.police = sheet(
    [
      ["tail", sitTail(moon)],
      ["look-4", sit(moon, { cap: true })],
      ...Array.from({ length: 8 }, (_, k) => [`walk-${k}`, walk(moon, k, true)]),
    ],
    { look: 1, walk: 8 },
  );
  return files;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const dir = fileURLToPath(new URL("../public/cats/", import.meta.url));
  mkdirSync(dir, { recursive: true });
  for (const [stem, svg] of Object.entries(drawCats())) {
    writeFileSync(`${dir}${stem}.svg`, svg);
    console.log(`${stem}.svg ${svg.length} B`);
  }
}
