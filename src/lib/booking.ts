/**
 * The owner's scheduling link, or `undefined` when there is not a usable one.
 * Usable means `https://` followed by a host: an unset variable, an empty one,
 * a scheme-less typo like `cal.com/x` (which a browser would resolve as a
 * relative path on this site), `http:` or `javascript:` values, and a bare
 * `https://` or one followed straight by a path, query or fragment all come
 * back as `undefined`, and the caller renders nothing for `undefined`.
 *
 * The host is checked on the raw text rather than only through `new URL()`,
 * because the URL parser repairs `https:///path` into a link to a host named
 * `path` — a guess, not what was configured.
 */
const HTTPS_WITH_HOST = /^https:\/\/[^/?#\s]+/;

export function validBookingUrl(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed || !HTTPS_WITH_HOST.test(trimmed)) return undefined;
  try {
    return new URL(trimmed).hostname ? trimmed : undefined;
  } catch {
    return undefined;
  }
}
