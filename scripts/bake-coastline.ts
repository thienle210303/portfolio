/**
 * Bakes the globe's coastline coverage texture into `public/globe/coastline.png`,
 * so the browser decodes it off the main thread instead of GlobeCanvas
 * rasterising 8 MB on first entry. Run `pnpm bake:coastline` after changing
 * `coastline-data.ts` or `coastline-texture.ts`; `tests/lib/coastline-png.test.ts`
 * fails until the committed PNG matches.
 *
 * Runs on Node's own type stripping, hence the `.ts` extensions.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { COASTLINES } from "../src/sections/Worlds/coastline-data.ts";
import { bakeCoastlineTexture } from "../src/sections/Worlds/gl/coastline-texture.ts";
import { encodeRgba } from "./png.ts";

const { width, height, data } = bakeCoastlineTexture(COASTLINES, 2048, 1024);
const png = encodeRgba(width, height, data);
mkdirSync("public/globe", { recursive: true });
writeFileSync("public/globe/coastline.png", png);
console.log(`public/globe/coastline.png: ${width}x${height}, ${png.length} bytes`);
