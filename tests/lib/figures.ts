/** Digit runs in a string, commas stripped: "1,529" -> "1529", "99.9%" -> "99.9". */
export const figures = (s: string) =>
  (s.match(/\d[\d,]*(?:\.\d+)?/g) ?? []).map((n) => n.replace(/,/g, ""));
