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

// Body of the first rule whose selector (text before `{`) matches exactly.
function rule(selector: string, from = 0): string {
  const at = CSS.indexOf(`${selector} {`, from);
  expect(at, `rule "${selector}" not found`).toBeGreaterThanOrEqual(0);
  const open = CSS.indexOf("{", at);
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
};

describe("the outdoors palette", () => {
  it("day palette is the spec's", () => {
    for (const [name, hex] of Object.entries(DAY)) expect(tokens[name], name).toBe(hex);
  });

  it("night palette is the owner's moonlit set", () => {
    for (const [name, hex] of Object.entries(NIGHT)) expect(tokens[name], name).toBe(hex);
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
    for (const part of ["body", ".bg-surface"]) {
      const a = decls(rule(`:root[data-theme="night"] ${part}`));
      expect(a.size, part).toBeGreaterThan(0);
      expect(decls(rule(`:root:not([data-theme="day"]) ${part}`, media)), part).toEqual(a);
    }
  });

  it("the night sky paints on body even under .blueprint-grid", () => {
    const sky = "linear-gradient(180deg, #1f3237 0%, #142024 50%, #0d1416 100%)";
    const media = CSS.indexOf("@media (prefers-color-scheme: dark)", CSS.indexOf(".blueprint-grid {"));
    for (const body of [
      rule(':root[data-theme="night"] .blueprint-grid'),
      rule(':root:not([data-theme="day"]) .blueprint-grid', media),
    ]) {
      expect(body.replace(/\s+/g, " ")).toContain(sky);
      expect(body).toContain("--grid-line");
    }
  });

  it("night paper darkens the code scrim toward ink", () => {
    expect(rule(':root[data-theme="night"] .bg-surface')).toContain("--code-scrim: rgba(29, 35, 33, 0.18)");
  });

  it("night paper repoints fg", () => {
    const stamped = CSS.indexOf(':root[data-theme="night"] .bg-surface {');
    expect(stamped).toBeGreaterThanOrEqual(0);
    const media = CSS.indexOf("@media (prefers-color-scheme: dark)", stamped);
    const twin = CSS.indexOf(':root:not([data-theme="day"]) .bg-surface {', media);
    expect(twin).toBeGreaterThanOrEqual(0);
    for (const at of [stamped, twin]) {
      const body = rule(CSS.slice(at, CSS.indexOf("{", at)).trim(), at);
      expect(body).toContain("--fg:");
      expect(body).toContain("--fg-muted:");
    }
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
