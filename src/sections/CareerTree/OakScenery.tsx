import type { CSSProperties } from "react";
import { Drawing } from "@/components/scenery/Drawing";
import { cn } from "@/lib/cn";

const art = (name: string) => ({ "--art": `var(${name})` }) as CSSProperties;

/**
 * The Journey's scenery behind the stage, out of the accessibility tree, as the
 * board (NatJourney) draws it. From 1280 every piece stands in the board's
 * 1440×900 frame, whose left edge is the section's `--fx` and whose y 0 is the
 * section's top. The sky is the hero's file (already cached), shifted 300px so
 * its sun sits at the board's x 1180; past the frame the oak fades out.
 *
 * Below 1280 only the sky is here, pinned like the hero's phone sky (the sun
 * 40px in from the right edge); the crown, its lantern and the branch the tags
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
      <span
        className="scene-art absolute inset-x-0 top-0 h-[900px] bg-[size:1440px_auto] bg-[position:right_-520px_top_-80px] xl:bg-[position:calc(min(50%,100%+16px)+300px)_0]"
        style={art("--art-sky")}
      />
      {/* The limbs run off the frame's edges; past 1440 the frame's edges are
          on screen, so the oak fades out there instead of stopping square. The
          last tag's string meets the limb at x 1320, clear of the fade. */}
      <div className="absolute top-[120px] left-(--fx) hidden h-[780px] w-[1440px] [mask-image:linear-gradient(to_right,transparent,black_48px,black_calc(100%-96px),transparent)] xl:block">
        <Drawing name="oak-leaves" className="absolute inset-0 text-accent" />
        <Drawing name="oak-moss" className="absolute inset-0 text-[color:var(--scene-moss)]" />
        <Drawing name="oak" className="absolute inset-0 text-[color:var(--scene-bark)]" />
      </div>
      <span
        className="scene-art absolute top-[510px] left-[calc(var(--fx)+104px)] hidden h-[122px] w-[96px] xl:block"
        style={art("--art-lantern")}
      />
      <Drawing
        name="journey-rice"
        className="absolute top-[776px] left-[calc(var(--fx)+236px)] hidden h-[124px] w-[320px] text-accent xl:block"
      />
    </div>
  );
}

/**
 * Below 1280: the oak's crown across the top of the stage (board y 120–640),
 * its lantern where the board hangs it.
 */
export function OakCrown({ className }: { readonly className?: string }) {
  const layer = "absolute inset-0 [mask-position:top] [mask-size:100%_auto]";
  return (
    <div
      aria-hidden="true"
      data-crown=""
      className={cn("no-print pointer-events-none relative aspect-[1440/520] w-full xl:hidden", className)}
    >
      <Drawing name="oak-leaves" className={cn(layer, "text-accent")} />
      <Drawing name="oak-moss" className={cn(layer, "text-[color:var(--scene-moss)]")} />
      <Drawing name="oak" className={cn(layer, "text-[color:var(--scene-bark)]")} />
      <span className="scene-art absolute top-[75%] left-[7.2%] aspect-[96/122] w-[6.7%]" style={art("--art-lantern")} />
    </div>
  );
}
