/**
 * The three layout breakpoints, as media-query strings for `matchMedia`
 * (round 25; design/system/README.md §1). They are the same three Tailwind's
 * `sm:` / `lg:` / `xl:` prefixes and the `@media` rules in globals.css use,
 * and they are in rem everywhere, so a script and a stylesheet can never
 * disagree about which band the window is in.
 *
 *   phone  < 40rem ≤ tablet < 64rem ≤ laptop < 80rem ≤ desktop
 */
export const BAND = {
  /** Tablet and up: 640px at the default font size. */
  tablet: "(width >= 40rem)",
  /** Laptop and up: 1024px. The desktop header; the Diary's spread. */
  laptop: "(width >= 64rem)",
  /** Desktop: 1280px. The Journey's board. */
  desktop: "(width >= 80rem)",
} as const;
