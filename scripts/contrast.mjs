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

// Quiet sections are transparent, so their text sits on the sky: each theme's
// top and bottom stop is measured (the middle stop lies between them).
const SKY = [
  ["Day", "morning-high", "top"],
  ["Day", "morning-low", "bottom"],
  ["Night", "dusk-high", "top"],
  ["Night", "dusk-deep", "bottom"],
];
const SKY_TEXT = {
  Day: [["ink", "body text"], ["muted", "secondary text"], ["moss", "links, rail labels, metrics"], ["red", "the single mark"]],
  Night: [["dusk-ink", "body text"], ["dusk-muted", "secondary text"], ["dusk-moss", "links, rail labels, metrics"], ["dusk-red", "the single mark"]],
};

const PAIRINGS = [
  ...SKY.flatMap(([theme, bg, stop]) =>
    SKY_TEXT[theme].map(([fg, use]) => [theme, "quiet", bg, fg, `${use}, sky ${stop}`]),
  ),
  ["Day", "quiet", "lichen", "ink", "body text"],
  ["Day", "quiet", "lichen", "muted", "secondary text"],
  ["Day", "quiet", "lichen", "moss", "links, rail labels, metrics"],
  ["Day", "quiet", "lichen", "red", "the single mark"],
  ["Day", "quiet", "lichen-deep", "ink", "body text, deep sections"],
  ["Day", "quiet", "lichen-deep", "muted", "secondary text, deep sections"],
  ["Day", "quiet", "lichen-deep", "moss", "links, rail labels, metrics, deep sections"],
  ["Day", "quiet", "lichen-deep", "red", "the single mark, deep sections"],
  ["Day", "quiet", "paper", "ink", "body text, cards"],
  ["Day", "quiet", "paper", "muted", "secondary text, cards"],
  ["Day", "quiet", "paper", "moss", "links, rail labels, metrics, cards"],
  ["Day", "quiet", "paper", "red", "the single mark, cards"],
  ["Day", "quiet", "moss-deep", "paper", "primary control label"],
  ["Day", "quiet", "moss", "paper", "primary control, hover"],
  ["Day", "loud", "ink", "paper", "contrast-chapter text"],
  ["Day", "loud", "ink", "dusk-muted", "contrast-chapter secondary"],
  ["Day", "loud", "ink", "dusk-moss", "contrast-chapter accent"],
  ["Day", "loud", "ink", "dusk-red", "contrast-chapter mark"],
  ["Day", "loud", "dusk-raised", "paper", "contrast-chapter surface text"],
  ["Day", "loud", "dusk-raised", "dusk-muted", "contrast-chapter surface secondary"],
  ["Day", "loud", "dusk-control", "dusk-label", "control label"],
  ["Day", "loud", "dusk-moss", "dusk", "control hover"],
  ["Night", "quiet", "dusk", "dusk-ink", "body text"],
  ["Night", "quiet", "dusk", "dusk-muted", "secondary text"],
  ["Night", "quiet", "dusk", "dusk-moss", "links, rail labels, metrics"],
  ["Night", "quiet", "dusk", "dusk-red", "the single mark"],
  ["Night", "quiet", "dusk-deep", "dusk-ink", "body text, deep sections"],
  ["Night", "quiet", "dusk-deep", "dusk-muted", "secondary text, deep sections"],
  ["Night", "quiet", "dusk-deep", "dusk-moss", "links, rail labels, metrics, deep sections"],
  ["Night", "quiet", "dusk-deep", "dusk-red", "the single mark, deep sections"],
  ["Night", "quiet", "lantern", "ink", "body text, paper surface"],
  ["Night", "quiet", "lantern", "lantern-muted", "secondary text, paper surface"],
  ["Night", "quiet", "lantern", "moss", "links, rail labels, metrics, paper surface"],
  ["Night", "quiet", "lantern", "red", "the single mark, paper surface"],
  ["Night", "quiet", "lantern-raised", "ink", "body text, raised paper surface"],
  ["Night", "quiet", "lantern-raised", "lantern-muted", "secondary text, raised paper surface"],
  ["Night", "quiet", "lantern-raised", "moss", "links, rail labels, metrics, raised paper surface"],
  ["Night", "quiet", "lantern-raised", "red", "the single mark, raised paper surface"],
  ["Night", "quiet", "dusk-control", "dusk-label", "primary control label"],
  ["Night", "quiet", "dusk-moss", "dusk-label", "primary control, hover"],
  ["Night", "loud", "dusk-raised", "dusk-ink", "body text, raised panel"],
  ["Night", "loud", "dusk-raised", "dusk-muted", "secondary text, raised panel"],
  ["Night", "loud", "dusk-raised", "dusk-moss", "links, rail labels, metrics, raised panel"],
  ["Night", "loud", "dusk-raised", "dusk-red", "the single mark, raised panel"],
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
  `# Contrast — outdoors palette

Every foreground/background pairing the design can actually produce, with its
measured WCAG 2.x contrast ratio. **AA (4.5:1) is the floor for all of them**,
including the ones carrying small mono text — eyebrows, rail labels, metric
sources — because at those sizes AA large-text (3:1) does not apply.

Twine, hairline and the scenery fills (gold, water, buffalo) never carry text and are not measured here.

Generated by \`pnpm contrast\`. Do not edit by hand: re-run it after changing
any token in the \`@theme\` block of \`src/app/globals.css\`. The script exits
non-zero if any pairing drops below 4.5:1, so this file cannot go stale
silently.

Lowest pairing in the current palette: **${lowest.value.toFixed(2)}:1**
(${lowest.theme}, \`${token(lowest.fg)}\` on \`${token(lowest.bg)}\` — ${lowest.use}).

## How to read the scope column

- **quiet** — \`tone="base"\` and \`tone="deep"\` sections, i.e. most of the page.
  They are transparent in both themes, so their text sits on the sky: the
  rows marked "sky top" / "sky bottom" are the stops that text is checked
  against. The flat lichen / dusk grounds still back the
  companion's cut-outs and anything else that fills with \`--ground\`.
- **loud** — \`tone="contrast"\` surfaces (the footer strip, the last contrast
  surface). In day this inverts to an ink ground; in night it deepens to a
  raised panel rather than flashing white. Night's light \`bg-surface\` paper
  (lantern) repoints the text aliases to ink, so it is measured under quiet.
  See the theme block in \`globals.css\` for why.

| Theme | Scope | Background | Foreground | Used for | Ratio | Level |
|---|---|---|---|---|---|---|
${rows}

## Known tight spots

Red is the first thing to re-check if a ground moves. Two pairings sit closest
to the floor:

- **\`--color-red\` on \`--color-lichen-deep\`** (day, the flat \`deep\` ground),
  4.52:1.
- **\`--color-red\` on \`--color-morning-high\`** (day, the mark on the sky's
  darkest stop), 4.61:1.

Quiet sections sit on the sky, so a text tone must be checked against both
stops of each theme's sky — in day the darkest is the top stop,
\`--color-morning-high\` — and against the flat grounds that still fill
cut-outs.
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
