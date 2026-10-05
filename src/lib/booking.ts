/**
 * The owner's scheduling link, or `undefined` when there is not a usable one.
 * Usable means it starts with `https://`: an unset variable, an empty one, a
 * scheme-less typo like `cal.com/x` (which a browser would resolve as a
 * relative path on this site) and `http:` or `javascript:` values all come
 * back as `undefined`, and the caller renders nothing for `undefined`.
 */
export function validBookingUrl(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed?.startsWith("https://") ? trimmed : undefined;
}
