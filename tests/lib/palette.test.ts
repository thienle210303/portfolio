import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(process.cwd(), "src");
const CSS = readFileSync(join(SRC, "app/globals.css"), "utf8").replace(/\r\n/g, "\n");

// Same slice scripts/contrast.mjs takes: the first `@theme {` block only.
const start = CSS.indexOf("@theme {");
const themeBlock = CSS.slice(start, CSS.indexOf("}", start));
const tokens: Record<string, string> = {};
for (const [, name, value] of themeBlock.matchAll(/--color-([a-z-]+):\s*(#[0-9a-f]{6});/g)) {
  tokens[name] = value;
}

// Body of the first rule at or after `from` whose selector (text before `{`)
// matches, with any run of whitespace in `selector` matching any other.
function rule(selector: string, from = 0): string {
  const source = selector
    .trim()
    .split(/\s+/)
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("\\s+");
  const re = new RegExp(`(^|[\\s;}])${source}\\s*\\{`, "g");
  re.lastIndex = Math.max(0, from - 1); // room for the separator before a selector at `from`
  const match = re.exec(CSS);
  expect(match, `rule "${selector}" not found`).not.toBeNull();
  const open = match!.index + match![0].length - 1;
  let depth = 1;
  let i = open + 1;
  while (depth > 0) {
    if (CSS[i] === "{") depth++;
    else if (CSS[i] === "}") depth--;
    i++;
  }
  return CSS.slice(open + 1, i - 1);
}

const decls = (body: string) =>
  new Set(
    body
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .split(";")
      .map((d) => d.trim().replace(/\s+/g, " "))
      .filter(Boolean),
  );

const PAPER_NIGHT = ':root[data-theme="night"] :is(.bg-surface, [data-paper])';
const PAPER_TWIN = ':root:not([data-theme="day"]) :is(.bg-surface, [data-paper])';

const DAY = {
  lichen: "#e4e8e0",
  "lichen-deep": "#dfe3da",
  paper: "#fbfbf8",
  ink: "#1d2321",
  muted: "#56605a",
  moss: "#46603a",
  "moss-deep": "#1f3a30",
  hairline: "#c9d0c8",
  red: "#c8102e",
  "morning-high": "#dce6e2",
  morning: "#e4eae1",
  "morning-low": "#ecece2",
};

const NIGHT = {
  dusk: "#142024",
  "dusk-deep": "#0d1416",
  "dusk-raised": "#1e2c30",
  "dusk-ink": "#e6ece7",
  "dusk-muted": "#a9b6ae",
  "dusk-moss": "#86aa76",
  "dusk-control": "#a8c99a",
  "dusk-label": "#10181a",
  "dusk-hairline": "#3a4844",
  "dusk-red": "#ff7a85",
  lantern: "#ede7d8",
  "lantern-raised": "#f3eee2",
  "lantern-muted": "#5a5f55",
  "lantern-rule": "#d3ccb9",
  "dusk-high": "#1f3237",
};

describe("the outdoors palette", () => {
  it("day palette is the spec's", () => {
    for (const [name, hex] of Object.entries(DAY)) expect(tokens[name], name).toBe(hex);
  });

  it("night palette is the owner's moonlit set", () => {
    for (const [name, hex] of Object.entries(NIGHT)) expect(tokens[name], name).toBe(hex);
  });

  it("accent-strong is gone", () => {
    expect(CSS).not.toMatch(/--accent-strong/);
    expect(CSS).not.toMatch(/--color-accent-strong/);
  });

  it("no Blueprint token survives", () => {
    const gone = [
      "blue", "blue-deep", "blue-bright", "slate", "slate-soft", "mist", "mist-soft",
      "night", "night-card", "night-raised", "line", "line-night", "card", "paper-deep",
    ];
    for (const name of gone) expect(tokens, name).not.toHaveProperty(name);
  });

  it("registers control and mark as Tailwind colours", () => {
    const inline = rule("@theme inline");
    expect(inline).toContain("--color-control: var(--control)");
    expect(inline).toContain("--color-mark: var(--mark)");
  });

  it("every tone scope sets control and mark", () => {
    for (const body of [rule(":root,\n  .tone-base,\n  .tone-deep"), rule(".tone-contrast")]) {
      expect(body).toContain("--control:");
      expect(body).toContain("--mark:");
    }
  });

  it("the no-JS night block matches the stamped one", () => {
    const stamped = decls(rule(':root[data-theme="night"]'));
    const media = CSS.indexOf("@media (prefers-color-scheme: dark)", CSS.indexOf(':root[data-theme="night"]'));
    const twin = decls(rule(':root:not([data-theme="day"])', media));
    expect(stamped.size).toBeGreaterThan(10);
    expect(twin).toEqual(stamped);
    const paper = decls(rule(PAPER_NIGHT));
    expect(paper.size).toBeGreaterThan(0);
    expect(decls(rule(PAPER_TWIN, media))).toEqual(paper);
  });

  const DAY_SKY =
    "linear-gradient(180deg, var(--color-morning-high) 0%, var(--color-morning) 45%, var(--color-morning-low) 100%)";
  const NIGHT_SKY =
    "linear-gradient(180deg, var(--color-dusk-high) 0%, var(--color-dusk) 50%, var(--color-dusk-deep) 100%)";
  // The day `:root` block is the one that sets `color-scheme: light`.
  const dayRoot = () => rule(":root", CSS.lastIndexOf(":root {", CSS.indexOf("color-scheme: light")));

  it("each theme defines its sky once, from palette tokens", () => {
    expect(CSS.match(/--sky:/g)).toHaveLength(3); // day, stamped night, no-JS twin
    expect(dayRoot()).toContain(`--sky: ${DAY_SKY}`);
    for (const sel of [':root[data-theme="night"]', ':root:not([data-theme="day"])']) {
      expect(rule(sel)).toContain(`--sky: ${NIGHT_SKY}`);
    }
  });

  it("the sky is painted fixed on body in both themes", () => {
    const body = rule(":root body, .sky-fill");
    expect(body).toContain("background-image: var(--sky)");
    expect(body).toContain("background-attachment: fixed");
    // Theme-keyed body rules would split the two themes' backdrops apart again.
    expect(CSS).not.toMatch(/data-theme="(day|night)"\]\)?\s+body\s*\{/);
  });

  it("quiet sections let the sky through in both themes; loud keeps its ground", () => {
    expect(rule(".section-ground:not(.tone-contrast)")).toContain("background-color: transparent");
    expect(rule(".section-ground")).toContain("background-color: var(--ground)");
    expect(CSS).not.toMatch(/data-theme="(day|night)"\]\)?\s+\.section-ground/);
  });

  it("night paper repoints fg, on cards and on the companion over one", () => {
    const media = CSS.indexOf("@media (prefers-color-scheme: dark)", CSS.indexOf(':root[data-theme="night"]'));
    for (const body of [rule(PAPER_NIGHT), rule(PAPER_TWIN, media)]) {
      expect(body).toContain("--ground:");
      expect(body).toContain("--fg:");
      expect(body).toContain("--fg-muted:");
    }
  });

  it("scene tokens are the board's", () => {
    const scene = {
      twine: "#8b7b5e", "dusk-twine": "#b3a27f", gold: "#d4a21a",
      water: "#9fb3ae", "dusk-water": "#3f5a5a",
      buffalo: "#3b433e",
      // Round 21 phase 8: the board's near-black was lost on the night sky.
      "dusk-buffalo": "#56665f",
    };
    for (const [name, hex] of Object.entries(scene)) expect(tokens[name], name).toBe(hex);
  });

  it("every theme scope sets the scene aliases", () => {
    const night = CSS.indexOf(':root[data-theme="night"]');
    const media = CSS.indexOf("@media (prefers-color-scheme: dark)", night);
    const aliases = [
      "--twine:", "--gold:", "--scene-water:", "--scene-buffalo:",
      "--art-sky:", "--art-vignette:", "--show-day:", "--show-night:",
    ];
    for (const body of [dayRoot(), rule(':root[data-theme="night"]'), rule(':root:not([data-theme="day"])', media)]) {
      for (const a of aliases) expect(body, a).toContain(a);
    }
  });

  it("bark and moss are the board's", () => {
    expect(tokens["dusk-bark"]).toBe("#070c0d");
    expect(tokens["spanish-moss"]).toBe("#8c9a86");
  });

  it("every theme scope sets the Journey's aliases", () => {
    const night = CSS.indexOf(':root[data-theme="night"]');
    const media = CSS.indexOf("@media (prefers-color-scheme: dark)", night);
    const aliases = ["--scene-bark:", "--scene-moss:", "--art-lantern:", "--art-journey-vignette:"];
    for (const body of [dayRoot(), rule(':root[data-theme="night"]'), rule(':root:not([data-theme="day"])', media)]) {
      for (const a of aliases) expect(body, a).toContain(a);
    }
  });

  it("blueprint-grid is gone", () => {
    expect(CSS).not.toContain("blueprint-grid");
    expect(readFileSync(join(SRC, "app/layout.tsx"), "utf8")).not.toContain("blueprint-grid");
  });

  it("the header shares the body's sky", () => {
    const re = /([^{}]*:root body[^{}]*)\{/;
    const selector = re.exec(CSS)?.[1] ?? "";
    expect(selector).toContain(".sky-fill");
  });

  it("no component reads a raw palette token", () => {
    const names = Object.keys(tokens);
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const path = join(dir, entry);
        if (statSync(path).isDirectory()) walk(path);
        else if (path !== join(SRC, "app/globals.css")) {
          const text = readFileSync(path, "utf8");
          for (const n of names) {
            if (text.includes(`var(--color-${n})`)) offenders.push(`${path}: ${n}`);
          }
        }
      }
    };
    walk(SRC);
    expect(offenders).toEqual([]);
  });
});
