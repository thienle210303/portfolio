"use client";

/**
 * The margin creatures: Thien's two cats, padding down the gutter in single
 * file. Both a little fat.
 *
 * Drawn from photographs of the actual animals, which is why the two are not
 * mirror images of each other:
 *
 *  - **The grey one** (cat-fancy "blue") is solid grey with white patches on
 *    the underside, amber eyes, and *grey* paws.
 *  - **The tabby** is a grey-brown mackerel with near-black stripes, a heavily
 *    ringed tail, green eyes, a white chin, and white paws.
 *
 * The white-gloved feet therefore belong to the tabby only. Giving both cats
 * gloves was the first reading of the brief, but the photos are unambiguous:
 * the grey one's feet are the same grey as the rest of him.
 *
 * ## Why silhouettes with flat fills
 *
 * At this size an outline drawing turns to mud: the strokes converge and it
 * reads as a smudge rather than an animal. Filled shapes stay crisp at any size
 * and sit correctly alongside Instrument Serif and hairline rules.
 *
 * ## Why they always face right
 *
 * They live in the left gutter, so the text is always to their right and the
 * pointer effectively always is too. Facing the content means they never need to
 * flip, which removes the one piece of state that would have made them twitchy.
 *
 * ## About the colour
 *
 * These are the only coloured things on this site, and the palette rule in
 * globals.css ("the exact ten tokens, no other colour is allowed") is
 * deliberately not amended to admit them: the cat fills are scoped to
 * `.guide-lane` rather than registered in `@theme`, because they are
 * *illustration*, not part of the design system. Nothing else can reach them and
 * no UI chrome inherits them. Both body colours clear the 3:1 non-text contrast
 * floor against `--color-ink` **and** `--color-paper` at the resting opacity, so
 * they stay legible on either background with no tone flip. globals.css carries
 * the measured ratios.
 */

/** The tail, as its own constant so its clip path and the drawn shape cannot
 *  drift apart — the tail rings depend on them being identical. */
const TAIL =
  "M8.5 18C4.5 17.5 1.8 14 2.4 9.2C2.7 6.2 4.6 4.8 6.1 5.7C4.3 8.4 5 14 8.2 15.6C9.7 16.4 9.9 17.4 8.5 18Z";

/** Likewise the body: markings are clipped to it rather than hand-fitted. */
const BODY =
  "M7.5 15.5C7.5 9.5 12.4 6.2 18.6 6.2C25.2 6.2 30 9.6 30 15.5C30 21 25.2 24.5 18.6 24.5C12 24.5 7.5 21 7.5 15.5Z";

interface CatProps {
  /** Placement inside the shared viewBox. */
  readonly transform: string;
  readonly variant: "grey" | "tabby";
}

/**
 * One cat, drawn in a local ~38×30 box facing right.
 *
 * Three things about these coordinates are load-bearing, all of them lessons
 * from looking at earlier drafts at 10× magnification:
 *
 *  - **Ears are part of the head outline**, not triangles laid on top of a
 *    circle. Separate ear shapes leave the dome curving down between them, and
 *    that valley plus two points reads as a crown, not as ears.
 *  - **Legs extend below the body's bottom edge**, and the paws overlap the
 *    legs. With the legs fully hidden behind the belly, the paws floated as
 *    four unattached pills.
 *  - **The head overlaps the body by ~3 units.** Any less and it looks pasted
 *    on; there is no neck to bridge a gap at this scale.
 *
 * Markings (stripes, tail rings, white patches) are drawn inside `clipPath`s
 * built from the very same body and tail paths that get painted. That is what
 * lets a stripe be a plain rectangle that still follows the animal's contour —
 * hand-fitting them to the curve was both fiddly and prone to poking out past
 * the silhouette. Body and tail get separate clips, because the tail rotates.
 *
 * Paint order matters: tail behind everything, then the far pair of legs, then
 * the body over their tops, then markings, then the near pair in front of the
 * belly, then the head.
 *
 * ## The two animation wrappers
 *
 * A cat can be walking *and* waiting at the same time — the visitor scrolls
 * while the model downloads — and one element cannot carry both transforms. So
 * `guide-cat-pose` owns the settled "working" crouch and `guide-cat-bob` owns
 * the walk-cycle squash, one animation each.
 *
 * Neither may live on the outer `.guide-cat`: that element carries its placement
 * as an SVG `transform` *presentation attribute*, and any CSS transform would
 * override it outright, stacking both cats at the origin.
 */
function Cat({ transform, variant }: CatProps) {
  const tabby = variant === "tabby";
  // One cat of each variant exists, so per-variant constants are unique enough.
  // Body and tail get *separate* clips because the tail rotates and the body
  // does not — see the tail group below.
  const bodyClipId = `guide-cat-body-clip-${variant}`;
  const tailClipId = `guide-cat-tail-clip-${variant}`;

  return (
    <g transform={transform} className={`guide-cat guide-cat--${variant}`}>
      <defs>
        <clipPath id={bodyClipId}>
          <path d={BODY} />
        </clipPath>
        <clipPath id={tailClipId}>
          <path d={TAIL} />
        </clipPath>
      </defs>

      <g className="guide-cat-pose">
        <g className="guide-cat-bob">
          {/*
            The tail and its rings rotate together as one group.

            The rings must be clipped by a path *inside* this group, not by the
            shared body clip: `userSpaceOnUse` resolves a clip in the coordinate
            system of the element referencing it, so a clip referenced from out
            here would stay put while the tail swung away from it — which is
            exactly what happened on the first attempt, rings hanging in the air
            beside a flicking tail.
          */}
          <g className="guide-cat-tail">
            <path d={TAIL} />
            {tabby ? (
              <g className="guide-cat-stripe" clipPath={`url(#${tailClipId})`}>
                {/* Kept inside the tail's own bounding box so the group's box —
                    and therefore the `fill-box` pivot below — stays the tail's. */}
                <rect x="2.6" y="7.2" width="8" height="1.7" rx="0.85" />
                <rect x="2.6" y="10.6" width="8" height="1.7" rx="0.85" />
                <rect x="2.6" y="14" width="8" height="1.7" rx="0.85" />
              </g>
            ) : null}
          </g>

          <g className="guide-cat-legs guide-cat-legs--far">
            <rect x="10.7" y="20" width="3.6" height="7.2" rx="1.8" />
            <rect x="21.2" y="20" width="3.6" height="7.2" rx="1.8" />
            {/* Paws: white on the tabby, plain grey on the grey one. */}
            <rect
              className={tabby ? "guide-cat-white" : undefined}
              x="10.2"
              y="26"
              width="4.6"
              height="3.4"
              rx="1.7"
            />
            <rect
              className={tabby ? "guide-cat-white" : undefined}
              x="20.7"
              y="26"
              width="4.6"
              height="3.4"
              rx="1.7"
            />
          </g>

          {/* Deliberately wide and low — these cats are a little fat. */}
          <path d={BODY} />

          <g clipPath={`url(#${bodyClipId})`}>
            {tabby ? (
              <g className="guide-cat-stripe">
                {/*
                  Mackerel stripes: vertical bars from the spine down the flank.
                  They start above the body's top edge and are trimmed by the
                  clip, so each one ends exactly on the contour.
                */}
                <rect x="11.2" y="4" width="1.9" height="11" rx="0.95" />
                <rect x="14.4" y="4" width="1.9" height="12" rx="0.95" />
                <rect x="17.6" y="4" width="1.9" height="12.5" rx="0.95" />
                <rect x="20.8" y="4" width="1.9" height="12" rx="0.95" />
                <rect x="24" y="4" width="1.9" height="10.5" rx="0.95" />
              </g>
            ) : (
              <g className="guide-cat-white">
                {/*
                  Two white patches along the underside.

                  Their x-positions land in the gaps *between* the near pair of
                  legs, which are painted after this group and would otherwise
                  hide them — the first attempt put the chest patch directly
                  behind the front leg and almost nothing showed. They also run
                  off the bottom of the silhouette, so the clip trims them
                  against the contour and they read as belly markings rather than
                  as spots floating on the flank.
                */}
                <ellipse cx="22" cy="23" rx="3" ry="2.4" />
                <ellipse cx="12.8" cy="22.4" rx="2" ry="1.8" />
              </g>
            )}
          </g>

          <g className="guide-cat-legs guide-cat-legs--near">
            <rect x="15.2" y="20" width="3.6" height="7.2" rx="1.8" />
            <rect x="25.2" y="20" width="3.6" height="7.2" rx="1.8" />
            <rect
              className={tabby ? "guide-cat-white" : undefined}
              x="14.7"
              y="26"
              width="4.6"
              height="3.4"
              rx="1.7"
            />
            <rect
              className={tabby ? "guide-cat-white" : undefined}
              x="24.7"
              y="26"
              width="4.6"
              height="3.4"
              rx="1.7"
            />
          </g>

          {/*
            The only part that responds to the pointer. It rotates about the
            neck, clamped to ±14° by the motion hook — enough to read as "it
            looked at you", little enough that it never looks dislocated.
            Everything inside rotates with it, which is why the chin patch sits
            within the head outline rather than being clipped to the body above.
          */}
          <g className="guide-cat-head">
            <path d="M26.9 13.2C26.9 10.6 27.4 8.8 28.2 7.6L27.8 2.6L32.2 6.6L35.8 3L37.6 8.2C38.6 9.4 39.2 10.9 39.2 12.5C39.2 15.9 36.4 18.7 33 18.7C29.5 18.7 26.9 16 26.9 13.2Z" />
            {/* A small white chin, not a cheek blob — the photographs show a
                patch under the muzzle, and at this size anything larger takes
                over the whole face. */}
            {tabby ? (
              <ellipse className="guide-cat-white" cx="34.6" cy="17.4" rx="1.5" ry="1.1" />
            ) : null}
            {/*
              Painted rather than punched out with a mask: a light iris on a
              mid-tone body reads as an eye on either background, whereas a hole
              would show the page through and invert between sections. Tinted
              pale green for the tabby and pale amber for the grey one — the real
              eye colours, lightened until they clear 3:1 against their own coat,
              since a saturated iris at this size just goes muddy.
            */}
            <ellipse className="guide-cat-eye" cx="34.6" cy="11.4" rx="1.5" ry="1.65" />
          </g>
        </g>
      </g>
    </g>
  );
}

export function GuideCreature() {
  return (
    <svg
      viewBox="0 0 45 62"
      className="guide-cats"
      role="presentation"
      aria-hidden="true"
      focusable="false"
    >
      {/*
        Stacked rather than side by side. The lane is only as wide as `--gutter`
        (51px at the narrowest width it renders at), which cannot hold two cats
        abreast at a size where paws and stripes are still legible. In file, each
        gets the full width — and two cats walking down a margin together is the
        better picture anyway. The x-offset keeps them from looking like one
        sprite stamped twice.
      */}
      <Cat variant="grey" transform="translate(0 0)" />
      <Cat variant="tabby" transform="translate(5 31)" />
    </svg>
  );
}

export default GuideCreature;
