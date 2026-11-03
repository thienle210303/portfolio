import type { CSSProperties } from "react";
import { Drawing } from "@/components/scenery/Drawing";
import { cn } from "@/lib/cn";
import { Ufo } from "./Weather";

const art = (name: string) => ({ "--art": `var(${name})` }) as CSSProperties;

/**
 * The Journey's scenery behind the stage, out of the accessibility tree, as the
 * board (NatJourney) draws it. From 1280 every piece stands in the board's
 * 1440×900 frame, whose left edge is the section's `--fx` and whose y 0 is the
 * section's top. The sky is the hero's file (already cached), shifted 300px so
 * its sun would sit at the board's x 1180; a mask takes the disc out (one sun
 * or moon on screen at a time). Past the frame the oak fades out.
 *
 * `data-oak` is what "Watch it grow" opens out from its trunk's foot, and
 * `data-grow-late` marks what comes last, the lantern (globals.css, "Watch
 * it grow").
 *
 * Below 1280 only the sky is here, pinned like the hero's phone sky (its disc,
 * masked out, 40px in from the right edge); the crown, its lantern and the branch the tags
 * hang from are in the stage itself (`CareerTree.tsx`, `HangingTags.tsx`).
 */
export default function OakScenery() {
  return (
    <div
      aria-hidden="true"
      data-scenery="journey"
      className="no-print pointer-events-none absolute inset-x-0 top-0 -z-10 h-[900px]"
    >
      {/* From 1280 one tile, starting 300px into the frame: `--fx` as a
          background offset is `min(50%, 100% + 16px)` (a % here is of the
          width minus the 1440px image). Left of it is the plain sky: wrapping
          the tile round would bring a second sun in at wide screens. */}
      {/* Without its sun or moon: the hero's is still on screen as the Journey
          comes up, and on a phone this one sat behind the heading. The mask
          cuts the disc and its halo out where each position puts them. */}
      <span
        className="scene-art absolute inset-x-0 top-0 h-[900px] bg-[size:1440px_auto] bg-[position:right_-520px_top_-80px] [mask-image:radial-gradient(circle_at_calc(100%-40px)_40px,transparent_160px,black_176px)] xl:bg-[position:calc(min(50%,100%+16px)+300px)_0] xl:[mask-image:radial-gradient(circle_at_calc(var(--fx)+1180px)_120px,transparent_160px,black_176px)]"
        style={art("--art-sky")}
      />
      {/* The limbs run off the frame's edges; past 1440 the frame's edges are
          on screen, so the oak fades out there instead of stopping square. The
          last tag's string meets the limb at x 1320, clear of the fade. */}
      <div data-oak="" className="absolute top-[120px] left-(--fx) hidden h-[780px] w-[1440px] [mask-image:linear-gradient(to_right,transparent,black_48px,black_calc(100%-96px),transparent)] xl:block">
        <Drawing name="oak-leaves" className="absolute inset-0 text-accent" />
        <Drawing name="oak-moss" className="absolute inset-0 text-[color:var(--scene-moss)]" />
        <Drawing name="oak" className="absolute inset-0 text-[color:var(--scene-bark)]" />
      </div>
      <span
        data-grow-late=""
        className="scene-art absolute top-[510px] left-[calc(var(--fx)+104px)] hidden h-[122px] w-[96px] xl:block"
        style={art("--art-lantern")}
      />
      {/* The last beat's cameo hovers over the lantern (the lantern's centre is
          board x 152; the saucer is 130 wide). */}
      <Ufo className="wx-ufo-board top-[400px] left-[calc(var(--fx)+87px)] h-[70px] w-[130px]" />
      <Drawing
        name="journey-rice"
        className="absolute top-[776px] left-[calc(var(--fx)+236px)] hidden h-[124px] w-[320px] text-accent xl:block"
      />
    </div>
  );
}

/**
 * Below 1280: the oak's crown over the stage (board y 120–640), its lantern
 * where the board hangs it. It is at least 900px wide (globals.css), so the
 * tree is never a twig on a phone, and placed so its trunk carries straight
 * on into the one the tags hang from; below 640 it is mirrored, the trunk at
 * the right edge.
 */
export function OakCrown({ className }: { readonly className?: string }) {
  const layer = "absolute inset-0 [mask-position:top] [mask-size:100%_auto]";
  return (
    <div
      aria-hidden="true"
      data-crown=""
      className={cn("no-print pointer-events-none relative aspect-[1440/520] xl:hidden", className)}
    >
      <Drawing name="oak-leaves" className={cn(layer, "text-accent")} />
      <Drawing name="oak-moss" className={cn(layer, "text-[color:var(--scene-moss)]")} />
      <Drawing name="oak" className={cn(layer, "text-[color:var(--scene-bark)]")} />
      {/* Mirrored on a phone (globals.css), the board's lantern limb runs off
          the edge; there it hangs from the long limb, where that limb crosses
          board y 510. */}
      <span data-grow-late="" className="scene-art absolute top-[75%] left-[7.2%] max-sm:left-[25.8%] aspect-[96/122] w-[6.7%]" style={art("--art-lantern")} />
      {/* The same cameo, over the lantern as it hangs here. */}
      <Ufo className="wx-ufo-crown top-[52%] left-[6.05%] aspect-[130/70] w-[9.03%] max-sm:left-[24.65%]" />
    </div>
  );
}
