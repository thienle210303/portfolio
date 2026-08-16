"use client";

/**
 * The margin creature: a fox, in silhouette, about 34px tall.
 *
 * ## Why a silhouette
 *
 * At this size an outline drawing turns to mud — the strokes converge and it
 * reads as a smudge rather than an animal. A filled silhouette stays crisp at
 * any size and sits correctly alongside Instrument Serif and hairline rules:
 * it is a printer's ornament, not a cartoon. The single eye is punched out
 * with an SVG mask rather than painted, so it shows the section behind it and
 * needs no knowledge of the current background colour.
 *
 * ## Why it always faces right
 *
 * It lives in the left gutter, so the text is always to its right and the
 * pointer effectively always is too. Facing the content means it never needs
 * to flip, which removes the one piece of state that would have made it
 * twitchy. It reads as attending to the page rather than to itself.
 *
 * Colour comes entirely from `--fg` / `--fg-subtle`, so the `.on-light` class
 * toggled by `useLaneTone` flips it against light sections with no palette
 * of its own.
 */

/** Unique per document — there is exactly one creature, so a constant is fine. */
const EYE_MASK_ID = "guide-fox-eye-mask";

export function GuideCreature() {
  return (
    <svg
      viewBox="0 0 40 44"
      className="guide-fox"
      role="presentation"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        {/*
          White keeps, black cuts. The eye is therefore a real hole rather
          than a dot painted in a guessed background colour — which matters
          because this element floats over both ink and paper sections.
        */}
        <mask id={EYE_MASK_ID}>
          <rect x="0" y="0" width="40" height="44" fill="#fff" />
          <circle cx="31.6" cy="17.4" r="1.15" fill="#000" />
        </mask>
      </defs>

      {/* Tail first, so the body overlaps its root rather than the reverse. */}
      <path
        className="guide-fox-tail"
        d="M13 28C7.5 26.5 3 21.5 4 13.5C4.4 9.6 7 7.4 9 8.6C6.8 12.2 7.4 20 11 23.4C12.6 24.9 13.6 26.4 13 28Z"
      />

      {/*
        Legs sit behind the body so the joins never show. Two groups, offset
        in the walk cycle, which at this scale is the only leg animation that
        actually registers — anything more detailed is invisible.
      */}
      <g className="guide-fox-legs guide-fox-legs--far">
        <rect x="14.2" y="27" width="2.2" height="13" rx="1.1" />
        <rect x="23.2" y="27" width="2.2" height="13" rx="1.1" />
      </g>
      <g className="guide-fox-legs guide-fox-legs--near">
        <rect x="17.6" y="27" width="2.2" height="13" rx="1.1" />
        <rect x="26.4" y="27" width="2.2" height="13" rx="1.1" />
      </g>

      <path
        className="guide-fox-body"
        d="M12 24.5C12 21.2 15.6 19.4 20.4 19.4C24.6 19.4 27.6 20.6 29 22.8L29 28.4C26.4 30.8 22.4 31.8 18.4 31.8C14.4 31.8 12 29.2 12 24.5Z"
      />

      {/*
        The head is the only part that responds to the pointer. It rotates
        about the neck joint, clamped to ±14° by the motion hook, which is
        enough to read as "it looked at you" and little enough that it never
        looks dislocated.
      */}
      <g className="guide-fox-head" mask={`url(#${EYE_MASK_ID})`}>
        <path d="M25.6 14.6L24.6 7.2L30.4 11.6Z" />
        <path d="M30.6 12.4L32.6 5.8L35.8 12.8Z" />
        <path d="M24.5 22.5C23.4 17.4 25.4 12.8 29.2 12.8C32.6 12.8 34.8 15.2 35.4 18.2L39.2 19.8L35.4 21.4C34.4 24.6 31.4 26.2 28.4 25.6C26.2 25.1 25 24 24.5 22.5Z" />
      </g>
    </svg>
  );
}

export default GuideCreature;
