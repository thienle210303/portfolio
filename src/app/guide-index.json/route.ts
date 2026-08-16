import { buildGuideIndex } from "@/lib/guide/buildIndex";

/**
 * The guide's search index, served as a static file at `/guide-index.json`.
 *
 * `force-static` is the whole point: Next prerenders this at build time, so
 * `buildGuideIndex()` — and therefore every module under `src/content/**` it
 * imports — runs on the build machine and never reaches the client bundle or
 * a request path. The browser sees a plain cacheable JSON file, fetched only
 * when a visitor first opens the guide.
 *
 * Doing it this way rather than with a script in `scripts/` avoids needing a
 * TypeScript loader to read the content modules: the framework already knows
 * how to compile them.
 */
export const dynamic = "force-static";

export function GET() {
  return Response.json(buildGuideIndex(), {
    headers: {
      // Immutable would be wrong — the file's URL never changes but its
      // contents do, on every content edit. A day of freshness with
      // revalidation is the right trade for a progressive enhancement.
      "Cache-Control": "public, max-age=86400, must-revalidate",
    },
  });
}
