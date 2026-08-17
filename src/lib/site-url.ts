/**
 * Where the site thinks it lives.
 *
 * This one string drives `metadataBase`, every canonical URL, the Open Graph
 * tags, the JSON-LD and the sitemap. Hard-coding it is fine while there is
 * exactly one deployment; it stops being fine the moment there are preview
 * deployments, because every preview then publishes canonical URLs and a
 * sitemap pointing at production. Search engines are told the preview *is*
 * production, and anyone reading a preview's metadata is told the same.
 *
 * So the value is resolved, in order, from:
 *
 *   1. an explicit `NEXT_PUBLIC_SITE_URL` — set this once in the host's
 *      project settings and it wins everywhere,
 *   2. the host's own per-deployment hostname, if it exposes one, so previews
 *      describe themselves rather than production,
 *   3. the production domain compiled in as the fallback.
 *
 * The reads must stay literal `process.env.NEXT_PUBLIC_*` member expressions
 * at the call site: that is the form Next substitutes at build time, and it is
 * why this function takes already-read strings instead of an env object.
 * Passing `process.env` here would resolve on the server and be `undefined` in
 * the browser bundle — the same page describing itself two different ways.
 */

/**
 * Normalise one candidate into an absolute origin, or reject it.
 *
 * Accepts `example.com`, `https://example.com` and `https://example.com/`
 * alike, because a hostname is what a hosting provider hands you and a URL is
 * what a human types. Returns `undefined` for anything unusable so the caller
 * can fall through to the next candidate rather than build a `new URL()` that
 * throws during the build.
 */
function normalize(candidate: string | undefined): string | undefined {
  const trimmed = candidate?.trim();
  if (!trimmed) return undefined;

  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  let parsed: URL;
  try {
    parsed = new URL(withScheme);
  } catch {
    return undefined;
  }

  if (!parsed.hostname) return undefined;

  // Origin only. A path, query or fragment here would be appended to every
  // canonical URL on the site.
  return parsed.origin;
}

export function resolveSiteUrl(
  explicit: string | undefined,
  deploymentHost: string | undefined,
  fallback: string,
): string {
  return normalize(explicit) ?? normalize(deploymentHost) ?? normalize(fallback) ?? fallback;
}
