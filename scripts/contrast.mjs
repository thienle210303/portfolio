/**
 * Regenerates docs/contrast.md and fails the run if any pairing the design can
 * produce drops below WCAG AA (4.5:1).
 *
 * Tokens are parsed out of the `@theme` block in globals.css rather than
 * duplicated here, so this cannot quietly measure a palette the site no longer
 * ships. The pairing table below is the part a human maintains: it encodes
 * which foreground is actually drawn on which ground, which no amount of CSS
 * parsing can infer.
 *
 * Run with `pnpm contrast`.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const CSS = join(root, "src/app/globals.css");
const OUT = join(root, "docs/contrast.md");

/* ------------------------------------------------------------------ colour -- */

const channels = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
const linear = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

function luminance(hex) {
  const [r, g, b] = channels(hex).map(linear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/* ------------------------------------------------------------------ tokens -- */

// Only the first @theme block holds the raw palette; the two `@theme inline`
// blocks that follow hold aliases and fonts, which have no literal values to
// measure.
const css = readFileSync(CSS, "utf8");
const themeBlock = css.slice(css.indexOf("@theme {"), css.indexOf("}", css.indexOf("@theme {")));

const T = {};
for (const [, name, value] of themeBlock.matchAll(/--color-([a-z-]+):\s*(#[0-9a-f]{6});/g)) {
  T[name] = value;
}

const token = (name) => {
  const value = T[name];
  if (!value) throw new Error(`--color-${name} is no longer defined in globals.css`);
  return value;
};

/* ---------------------------------------------------------------- pairings -- */

const PAIRINGS = [
  ["Day", "quiet", "paper", "ink", "body text"],
  ["Day", "quiet", "paper", "slate", "secondary text"],
  ["Day", "quiet", "paper", "slate-soft", "eyebrows, counts, sources"],
  ["Day", "quiet", "paper", "blue", "links, rail labels, metrics"],
  ["Day", "quiet", "paper-deep", "ink", "body text, deep sections"],
  ["Day", "quiet", "paper-deep", "slate-soft", "eyebrows, deep sections"],
  ["Day", "quiet", "paper-deep", "blue", "links, deep sections"],
  ["Day", "quiet", "card", "ink", "code panel, cards"],
  ["Day", "quiet", "card", "slate-soft", "code comments"],
  ["Day", "quiet", "card", "blue", "code strings"],
  ["Day", "quiet", "blue", "paper", "primary button label"],
  ["Day", "loud", "ink", "paper", "contrast-chapter text"],
  ["Day", "loud", "ink", "mist", "contrast-chapter secondary"],
  ["Day", "loud", "ink", "mist-soft", "contrast-chapter eyebrows"],
  ["Day", "loud", "ink", "blue-bright", "contrast-chapter accent"],
  ["Day", "loud", "blue-bright", "ink", "primary button, contrast chapter"],
  ["Night", "quiet", "night", "paper", "body text"],
  ["Night", "quiet", "night", "mist", "secondary text"],
  ["Night", "quiet", "night", "mist-soft", "eyebrows, counts, sources"],
  ["Night", "quiet", "night", "blue-bright", "links, rail labels, metrics"],
  ["Night", "quiet", "night-deep", "paper", "body text, deep sections"],
  ["Night", "quiet", "night-deep", "mist-soft", "eyebrows, deep sections"],
  ["Night", "quiet", "night-card", "paper", "code panel, cards"],
  ["Night", "quiet", "night-card", "mist-soft", "code comments"],
  ["Night", "quiet", "night-card", "blue-bright", "code strings"],
  ["Night", "quiet", "blue-bright", "ink", "primary button label"],
  ["Night", "loud", "night-card", "paper", "contrast-chapter text"],
  ["Night", "loud", "night-card", "mist", "contrast-chapter secondary"],
  ["Night", "loud", "night-card", "blue-bright", "contrast-chapter accent"],
  ["Night", "loud", "night-raised", "paper", "raised panel text"],
  ["Night", "loud", "night-raised", "mist", "raised panel secondary"],
];

const AA = 4.5;
const AAA = 7;

const measured = PAIRINGS.map(([theme, scope, bg, fg, use]) => {
  const value = ratio(token(bg), token(fg));
  return { theme, scope, bg, fg, use, value };
});

const failures = measured.filter((row) => row.value < AA);
const lowest = measured.reduce((a, b) => (a.value <= b.value ? a : b));

/* -------------------------------------------------------------------- doc -- */

const rows = measured
  .map(
    (r) =>
      `| ${r.theme} | ${r.scope} | \`${token(r.bg)}\` | \`${token(r.fg)}\` | ${r.use} | ` +
      `${r.value.toFixed(2)}:1 | ${r.value >= AAA ? "AAA" : "AA"} |`,
  )
  .join("\n");

writeFileSync(
  OUT,
  `# Contrast — Blueprint palette

Every foreground/background pairing the design can actually produce, with its
measured WCAG 2.x contrast ratio. **AA (4.5:1) is the floor for all of them**,
including the ones carrying small mono text — eyebrows, rail labels, metric
sources — because at those sizes AA large-text (3:1) does not apply.

Generated by \`pnpm contrast\`. Do not edit by hand: re-run it after changing
any token in the \`@theme\` block of \`src/app/globals.css\`. The script exits
non-zero if any pairing drops below 4.5:1, so this file cannot go stale
silently.

Lowest pairing in the current palette: **${lowest.value.toFixed(2)}:1**
(${lowest.theme}, \`${token(lowest.fg)}\` on \`${token(lowest.bg)}\` — ${lowest.use}).

## How to read the scope column

- **quiet** — \`tone="base"\` and \`tone="deep"\` sections, i.e. most of the page.
- **loud** — \`tone="contrast"\` sections (Contact and Closing). In day this
  inverts to an ink ground; in night it deepens to a raised panel rather than
  flashing white. See the theme block in \`globals.css\` for why.

| Theme | Scope | Background | Foreground | Used for | Ratio | Level |
|---|---|---|---|---|---|---|
${rows}

## Known tight spots

Two pairings sit closest to the floor and are the ones to re-check first if a
token moves:

- **\`--color-slate-soft\` on \`--color-paper-deep\`** (day, eyebrows in \`deep\`
  sections). This token was originally \`#5f6b72\`, which measured 4.79:1 against
  the *base* ground and passed, but 4.44:1 against the half-step-darker \`deep\`
  ground and did not. A tertiary tone must be checked against
  \`--color-paper-deep\`, never only against \`--color-paper\`.
- **\`--color-mist-soft\` on \`--color-night-card\`** (night, code comments). This
  is why night's \`--l-fg-subtle\` collapses onto \`--color-mist\` instead: on the
  raised surface \`--color-night-raised\`, \`--color-mist-soft\` measures 4.23:1
  and would fail.
`,
);

if (failures.length > 0) {
  console.error(`✗ ${failures.length} pairing(s) below AA (${AA}:1):\n`);
  for (const f of failures) {
    console.error(
      `  ${f.theme}/${f.scope}  ${token(f.fg)} on ${token(f.bg)}  ` +
        `${f.value.toFixed(2)}:1  — ${f.use}`,
    );
  }
  process.exit(1);
}

console.log(
  `✓ ${measured.length} pairings, all >= AA. Lowest ${lowest.value.toFixed(2)}:1 ` +
    `(${lowest.theme}, ${lowest.use}). Wrote docs/contrast.md`,
);
