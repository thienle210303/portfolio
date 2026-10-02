import type { ReactNode } from "react";
import type { CatIcon } from "./companion-dialogue";

/**
 * The little picture beside a meow: one line drawing per `CatIcon`, drawn by
 * hand in a 12×12 box so it sits on the bubble's single line of text.
 *
 * The same ink discipline as the cats themselves (`STROKE` in
 * CompanionCat.tsx), at a weight scaled to the smaller box: `currentColor`
 * only, never a fill, never a hue of its own — so the icon is whatever ink
 * the bubble is, follows theme and tone with it, and is never a spot of blue
 * decoration. `aria-hidden` and wordless: the bubble it sits in is already
 * `aria-hidden` decoration, and the meow beside it is the only text there.
 *
 * Inline SVG rather than an icon font or a package — the site carries
 * neither, and twelve tiny paths cost less than the request for one.
 */
const GLYPHS: Record<CatIcon, ReactNode> = {
  // A ball, two strands wound across it, and the loose end trailing off.
  yarn: (
    <>
      <circle cx="5.5" cy="5.5" r="4" />
      <path d="M2.2 3.8C4.4 5.4 6.8 5.2 8.8 3.2M2.6 7.6C4.6 5.8 7 6.2 8.6 8.4" />
      <path d="M8.3 8.3C9.4 9.7 10.4 10.3 11.3 10.6" />
    </>
  ),
  // Body, forked tail, one eye.
  fish: (
    <>
      <path d="M1.5 6C3.4 3.1 6.8 3.1 8.6 6C6.8 8.9 3.4 8.9 1.5 6Z" />
      <path d="M8.6 6L11 3.8V8.2Z" />
      <circle cx="3.9" cy="5.6" r="0.35" />
    </>
  ),
  // Two wing loops either side of a body, and the feelers.
  moth: (
    <>
      <path d="M6 3.4V10" />
      <path d="M6 4.6C3.6 1.6 0.9 3 1.8 5.8C2.5 7.6 4.8 7.4 6 6.2" />
      <path d="M6 4.6C8.4 1.6 11.1 3 10.2 5.8C9.5 7.6 7.2 7.4 6 6.2" />
      <path d="M6 3.4L4.8 1.6M6 3.4L7.2 1.6" />
    </>
  ),
  // The pad, and four toes over it.
  paw: (
    <>
      <path d="M3.4 9.2C3.4 7.3 4.6 6.3 6 6.3C7.4 6.3 8.6 7.3 8.6 9.2C8.6 10.6 3.4 10.6 3.4 9.2Z" />
      <circle cx="2.3" cy="5.4" r="0.95" />
      <circle cx="4.6" cy="3.3" r="0.95" />
      <circle cx="7.4" cy="3.3" r="0.95" />
      <circle cx="9.7" cy="5.4" r="0.95" />
    </>
  ),
  // Three z's, each smaller and higher than the last.
  zzz: <path d="M1 7.6H4.2L1 10.8H4.2M5.2 4.3H7.8L5.2 6.9H7.8M8.8 1.2H10.8L8.8 3.2H10.8" />,
  heart: (
    <path d="M6 10.4C2.2 7.6 1.2 5.6 1.2 4.1C1.2 2.6 2.3 1.6 3.6 1.6C4.6 1.6 5.4 2.2 6 3.2C6.6 2.2 7.4 1.6 8.4 1.6C9.7 1.6 10.8 2.6 10.8 4.1C10.8 5.6 9.8 7.6 6 10.4Z" />
  ),
  // A four-point star, its sides drawn in toward the middle.
  sparkle: <path d="M6 1Q6.6 5.4 11 6Q6.6 6.6 6 11Q5.4 6.6 1 6Q5.4 5.4 6 1Z" />,
  // A blade and its midrib, out of one stalk.
  leaf: (
    <>
      <path d="M1.8 10.2C1.8 5.2 5 2 10.6 1.4C10.1 7 6.9 10.2 1.8 10.2Z" />
      <path d="M1.8 10.2L7.6 4.4" />
    </>
  ),
  // The outline, one meridian and the equator.
  globe: (
    <>
      <circle cx="6" cy="6" r="4.6" />
      <path d="M6 1.4C3.7 3.4 3.7 8.6 6 10.6C8.3 8.6 8.3 3.4 6 1.4Z" />
      <path d="M1.4 6H10.6" />
    </>
  ),
  // An envelope and its flap.
  mail: (
    <>
      <rect x="1.2" y="2.6" width="9.6" height="6.8" rx="0.8" />
      <path d="M1.6 3.2L6 6.8L10.4 3.2" />
    </>
  ),
  // The hook, and the dot under it.
  question: (
    <>
      <path d="M3.8 4C3.8 2.6 4.8 1.5 6 1.5C7.3 1.5 8.2 2.5 8.2 3.7C8.2 5.4 6 5.6 6 7.6" />
      <circle cx="6" cy="10" r="0.5" />
    </>
  ),
  // A stem forking twice — the Journey's own tree, at the size of a letter.
  branch: (
    <>
      <path d="M6 11V1.4" />
      <path d="M6 7.4L2.6 4.2M6 5L9.4 2.6" />
    </>
  ),
};

export function CatGlyph({ name }: { readonly name: CatIcon }) {
  return (
    <svg
      viewBox="0 0 12 12"
      width={12}
      height={12}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.25}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className="shrink-0"
    >
      {GLYPHS[name]}
    </svg>
  );
}
