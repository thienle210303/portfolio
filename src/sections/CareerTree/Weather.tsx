import type { CSSProperties } from "react";
import { cn } from "@/lib/cn";

/**
 * The weather "Watch it grow" plays over the oak (round 23). Server-rendered,
 * `aria-hidden`, `pointer-events: none`, and `display: none` until `#tree`
 * carries `data-growing`; the caption (an aria-live line in `GrowOak`) is what
 * says the weather aloud.
 *
 * Nothing here knows a year. `GrowOak` stamps `data-weather="<weather>"` on
 * `#tree` for each beat (computed by `weatherFor`, `src/lib/origin-story.ts`)
 * and globals.css ("Watch it grow, with weather") shows the pieces that
 * weather needs, with CSS animation alone: gradients for the beam, masks from
 * `public/scenery/` (drawn by `scripts/draw-scenery.mjs`) for the plane, the
 * saucer, the clouds, the leaves, the bolt, the rain and the snow.
 *
 * The sky pieces live in a window the height of the screen that sticks to the
 * top while the section is on it, so a phone (where the section is two
 * thousand pixels tall) sees the weather too. The UFO is not in the window:
 * it is placed against the lantern, in `OakScenery` and `OakCrown`.
 */
const ink = (name: string) => ({ "--art": `url(/scenery/${name}.svg)` }) as CSSProperties;

const LEAVES = [0, 1, 2, 3, 4, 5, 6, 7, 8];

export default function Weather() {
  return (
    <div
      aria-hidden="true"
      data-weather-layer=""
      className="no-print pointer-events-none absolute inset-0 -z-[9] overflow-clip"
    >
      <div className="wx-window sticky top-0 h-svh w-full">
        <span data-w="sun" className="wx-sun" />
        <span data-w="dark" className="wx-dark" />
        <span data-w="cloud" className="wx-cloud wx-cloud-a" />
        <span data-w="cloud" className="wx-cloud wx-cloud-b" />
        <span data-w="cloud" className="wx-cloud wx-cloud-c" />
        <span data-w="rain" className="wx-rain wx-rain-a" style={ink("rain")} />
        <span data-w="rain" className="wx-rain wx-rain-b" style={ink("rain")} />
        <span data-w="snow" className="wx-snow wx-snow-a" style={ink("snow")} />
        <span data-w="snow" className="wx-snow wx-snow-b" style={ink("snow")} />
        <span data-w="drift" className="wx-drift" />
        <span data-w="flood" className="wx-flood" />
        <span data-w="flash" className="wx-flash" />
        <span data-w="bolt" className="wx-bolt" style={ink("bolt")} />
        {LEAVES.map((i) => (
          <span key={i} data-w="leaf" className="wx-leaf" style={{ ...ink("leaf"), "--i": i } as CSSProperties} />
        ))}
        <span data-w="plane" className="wx-plane" style={ink("plane")} />
      </div>
    </div>
  );
}

/**
 * The last beat's cameo: a saucer that glides in over the lantern, beams it,
 * and zips off. The wrapper is sized by the caller (`className`), everything
 * inside is a share of it, so the same drawing sits on the board (1440 wide)
 * and on the crown below 1280.
 */
export function Ufo({ className }: { readonly className?: string }) {
  return (
    <span aria-hidden="true" data-ufo="" className={cn("wx-ufo-wrap pointer-events-none absolute", className)}>
      <span className="wx-glow" />
      <span className="wx-beam" />
      <span className="wx-ufo" style={ink("ufo")} />
    </span>
  );
}
