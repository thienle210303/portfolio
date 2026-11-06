import type { CSSProperties } from "react";
import { Drawing } from "@/components/scenery/Drawing";
import { cn } from "@/lib/cn";
import { Ufo } from "./Weather";

const art = (name: string) => ({ "--art": `var(${name})` }) as CSSProperties;

/** Where a piece stands in the board's 1440×900 frame, in board units (globals.css, `[data-board]`). */
const at = (x: number, y: number, w: number, h: number) => ({ "--x": x, "--y": y, "--w": w, "--h": h }) as CSSProperties;

/**
 * The Journey's scenery behind the stage, out of the accessibility tree, as the
 * board (NatJourney) draws it. From 1280 every piece stands in the board's
 * 1440×900 frame, measured in board units (`--u`), whose left edge is the
 * section's `--fx` and whose top is `--by` (globals.css, "Journey, from
 * 1280"). The sky is the hero's file (already cached), shifted 300 units so
 * its sun would sit at the board's x 1180; a mask takes the disc out (one sun
 * or moon on screen at a time). Past the frame the oak fades out.
 *
 * `data-oak` is what "Watch it grow" opens out from its trunk's foot, and
 * `data-grow-late` marks what comes last, the lantern (globals.css, "Watch
 * it grow").
 *
 * Below 1280 only the sky is here, pinned like the hero's phone sky (its disc,
 * masked out, 40px in from the right edge); the crown, its lantern and the
 * trunk the tags hang from are in the stage itself (`CareerTree.tsx`,
 * `HangingTags.tsx`).
 */
export default function OakScenery() {
  return (
    <div aria-hidden="true" data-scenery="journey" className="no-print pointer-events-none absolute inset-x-0 top-0 -z-10">
      {/* Without its sun or moon: the hero's is still on screen as the Journey
          comes up, and on a phone this one sat behind the heading. The mask
          cuts the disc and its halo out where each position puts them. From
          1280 it is one tile, starting 300 units into the frame; left of it is
          the plain sky: wrapping the tile round would bring a second sun in at
          wide screens. */}
      <span data-journey-sky="" className="scene-art absolute inset-x-0 top-0" style={art("--art-sky")} />
      {/* The limbs run off the frame's edges; past 1680 the frame's edges are
          on screen, so the oak fades out there instead of stopping square. The
          last tag's string meets the limb at x 1320, clear of the fade. */}
      <div
        data-oak=""
        data-board=""
        style={at(0, 120, 1440, 780)}
        className="hidden [mask-image:linear-gradient(to_right,transparent,black_3.33%,black_93.33%,transparent)] xl:block"
      >
        <Drawing name="oak-leaves" className="absolute inset-0 text-accent" />
        <Drawing name="oak-moss" className="absolute inset-0 text-[color:var(--scene-moss)]" />
        <Drawing name="oak" className="absolute inset-0 text-[color:var(--scene-bark)]" />
      </div>
      <span
        data-grow-late=""
        data-board=""
        className="scene-art hidden xl:block"
        style={{ ...art("--art-lantern"), ...at(104, 510, 96, 122) }}
      />
      {/* The last beat's cameo hovers over the lantern (the lantern's centre is
          board x 152; the saucer is 130 wide). */}
      <Ufo board={at(87, 400, 130, 70)} className="wx-ufo-board" />
      <span data-board="" style={at(236, 776, 320, 124)} className="hidden xl:block">
        <Drawing name="journey-rice" className="absolute inset-0 text-accent" />
      </span>
    </div>
  );
}

/**
 * Below 1280: the oak's crown over the stage, its lantern hung from it.
 * globals.css sizes and places it, and names its three drawings, so one
 * element serves both bands:
 *  - below 640 it is the board's oak (board y 120–640), at least 900px wide so
 *    the tree is never a twig on a phone, mirrored, its trunk near the right
 *    edge; the board's lantern limb runs off that edge, so the lantern hangs
 *    from the long limb, where that limb crosses board y 510;
 *  - from 640 it is the crown drawn for this band (`oak-crown`, round 25):
 *    the same oak without the limb that climbed up and left, so the title
 *    stands there, its trunk in the middle of the stage.
 * Either way its trunk carries straight on into the one the tags hang from.
 */
export function OakCrown({ className }: { readonly className?: string }) {
  const layer = "scene-ink absolute inset-0 block [mask-position:top] [mask-size:100%_auto]";
  return (
    <div aria-hidden="true" data-crown="" className={cn("no-print pointer-events-none relative xl:hidden", className)}>
      <span data-scenery="oak-leaves" className={cn(layer, "text-accent")} />
      <span data-scenery="oak-moss" className={cn(layer, "text-[color:var(--scene-moss)]")} />
      <span data-scenery="oak" className={cn(layer, "text-[color:var(--scene-bark)]")} />
      <span data-grow-late="" data-crown-lantern="" className="scene-art absolute" style={art("--art-lantern")} />
      {/* The same cameo, over the lantern as it hangs here. */}
      <Ufo className="wx-ufo-crown" />
    </div>
  );
}
