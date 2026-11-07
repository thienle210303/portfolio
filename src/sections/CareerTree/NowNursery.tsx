import type { CSSProperties } from "react";
import { Drawing } from "@/components/scenery/Drawing";
import { ExternalLink } from "@/components/ui/ExternalLink";
import { now } from "@/content/portfolio";
import { NOW_ID } from "@/lib/now";

/**
 * The nursery's numbers, from `NURSERY` in `scripts/draw-scenery.mjs`: the
 * drawing's box, and for each seedling its x and the top of the marker stick
 * beside it (`tests/sections/NowNursery.test.tsx` holds them to it). A marker
 * stands on its stick 11 units right of its seedling.
 */
export const NURSERY_BOX = [480, 210] as const;
export const NURSERY_STICKS = [
  { x: 62, stick: 92 },
  { x: 174, stick: 96 },
  { x: 286, stick: 114 },
  { x: 398, stick: 124 },
] as const;
const STICK_OFFSET = 12.7;

/** A long name may break on the narrowest phones: a soft hyphen after its
 *  fifth letter ("Wordi-fication"), shown only if it breaks there. */
const breakable = (name: string) => (/^\S{12,}$/.test(name) ? `${name.slice(0, 5)}\u00AD${name.slice(5)}` : name);

/** Each marker's turn, and its stamp's: no two alike. */
const TURNS = [
  { marker: -4, stamp: 2 },
  { marker: 3, stamp: -1.5 },
  { marker: -2, stamp: 1 },
  { marker: 5, stamp: -2.5 },
] as const;

/**
 * What I am doing now (round 27, Thien's B2): four seedlings in a nursery
 * crate at the oak's foot, oldest nearest the trunk and each smaller than the
 * last, a marker on a stick beside each with its status stamped, its name and
 * a few words. No caption, no date, no figure: a seedling says "new", and
 * nothing on it is measured yet. The field tag's status links here (`#now`).
 *
 * One box at every width, its markers placed in percentages of it, so it is
 * the same drawing on the board (from 1280, in board units at the oak's foot)
 * and on a phone (globals.css, "Journey: the nursery").
 */
export default function NowNursery() {
  const [w, h] = NURSERY_BOX;
  return (
    <div data-nursery="" id={NOW_ID}>
      <span aria-hidden="true" className="no-print pointer-events-none absolute inset-0">
        <Drawing name="nursery-sprouts" className="absolute inset-0 text-[color:var(--scene-moss)]" />
        <Drawing name="nursery" className="absolute inset-0 text-[color:var(--twine)]" />
      </span>
      <ul role="list" aria-label={now.label}>
        {now.items.map((item, i) => {
          const spot = NURSERY_STICKS[i];
          const turn = TURNS[i % TURNS.length]!;
          if (!spot) return null;
          return (
            <li
              key={item.id}
              style={
                {
                  "--mx": `${((spot.x + STICK_OFFSET) / w) * 100}%`,
                  "--my": `${((h - spot.stick) / h) * 100}%`,
                  "--tilt": `${turn.marker}deg`,
                } as CSSProperties
              }
            >
              <div data-manila="" data-marker="" style={{ "--kraft": "10%" } as CSSProperties}>
                <span data-date="" style={{ "--turn": `${turn.stamp}deg` } as CSSProperties}>
                  {item.status}
                </span>
                <span data-marker-name="">{breakable(item.name)}</span>
                <span data-marker-line="">{item.line}</span>
                {item.link ? (
                  <ExternalLink href={item.link.href} data-marker-link="">
                    <span className="sr-only">{item.name} </span>
                    {item.link.label}
                    <span aria-hidden="true"> ↗</span>
                  </ExternalLink>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
