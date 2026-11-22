import { readFile } from "node:fs/promises";
import { join } from "node:path";

/*
 * What the share card and the icons read when they are drawn, at build. They
 * are images (`next/og`, Satori), so none of this reaches a visitor's browser,
 * and none of the site's CSS applies: no custom properties, no masks. Each path
 * names its folder literally, so the build traces that folder and not the
 * whole project.
 */

/** A static TTF from `assets/fonts/`: Satori draws no variable-font axes. */
export const font = (file: string) => readFile(join(process.cwd(), "assets", "fonts", file));

/**
 * A `public/scenery` drawing as an image source. The site paints its
 * one-colour drawings with a CSS mask, which Satori can't, so here the ink is
 * set in the file: every black fill and stroke, and the root's fill for paths
 * that set none. Drawings already in colour pass `ink` as undefined.
 */
export async function drawing(name: string, ink?: string): Promise<string> {
  let svg = await readFile(join(process.cwd(), "public", "scenery", `${name}.svg`), "utf8");
  if (ink) svg = svg.replace(/(fill|stroke)="#000(?:000)?"/g, `$1="${ink}"`).replace("<svg ", `<svg fill="${ink}" `);
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}
