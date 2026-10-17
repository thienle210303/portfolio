/** Digit runs in a string, commas stripped: "1,529" -> "1529", "99.9%" -> "99.9". */
export const figures = (s: string) =>
  (s.match(/\d[\d,]*(?:\.\d+)?/g) ?? []).map((n) => n.replace(/,/g, ""));

/**
 * Figures with their suffix form kept: "3M+", "96%", "99.9%", "200+",
 * "17 hours", "3 minutes". The highlight value's compact units are spelled
 * out first (17h -> 17 hours, 3m -> 3 minutes) so they must match the prose.
 */
export const figureTokens = (s: string) =>
  (
    s
      .replace(/(\d)h\b/g, "$1 hours")
      .replace(/(\d)m\b/g, "$1 minutes")
      .match(/\d[\d,]*(?:\.\d+)?(?:M\+|\+|%| hours?| minutes?)?/g) ?? []
  );

/** True when `token` appears in `source` as a whole figure, not inside a longer number. */
export const hasToken = (source: string, token: string) =>
  new RegExp(`(?<![\\d.,])${token.replace(/[.+]/g, "\\$&")}(?!\\d)`).test(source);
