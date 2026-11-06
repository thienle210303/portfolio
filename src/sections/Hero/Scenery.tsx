/**
 * The hero's scenery, behind everything and out of the accessibility tree.
 * Positions are the board's (NatHero), measured from the section's bottom.
 * From 1280 the content column is a centred 1120px, so the ground pieces and
 * the sky stand in a centred 1440 frame (`50% ± n px`) and keep the board's
 * relation to the words at any width. From 1024 to 1279 they take the %
 * positions.
 *
 * Below 1024 (round 25) the clothesline, its poles and the nón lá are the
 * yard's (Yard.tsx), not this file's: they are laid out with the tags. What
 * is here is the sky and the ground the poles stand in, one band at the
 * section's foot (`--ground`, the section's bottom padding). On a phone:
 * Moon in her võng at the left and the stool at the right, each just inside
 * its pole, the paddy behind them from pole to pole with the buffalo in its
 * middle. On a tablet: Moon, then the stool, then the paddy out to the pine.
 * The three pieces shrink together on the narrowest phones (`--buf-w` and
 * the two widths beside it are shares of the room between the poles), so
 * nothing overlaps at 320 and nothing changes at a breakpoint of its own.
 *
 * From 1024 the clothesline is this file's, at most 1920 wide and centred;
 * its top is `--line-top` below the section's padding, the same offset the
 * chapter tags' row starts at, and `.hero-yard` in globals.css works each
 * string out from this curve. The bamboo and pine stand at its two ends
 * (`--lx`, `--lw`), hung from the line rather than stood on the ground: the
 * hero is taller below 1280, and the drawings run on past the board's ground
 * so the section's bottom clips them. Below 1440 the left gutter is narrower
 * than the line's inset, so the bamboo steps left to clear the text by 20px
 * (`--bx`) and a short length of twine ties it to the line. Below 1440 the
 * nón lá is the phone's (0.56×), its crown on the knot where the twine meets
 * the bamboo, and never nearer the window's edge than 4px. The pine's trunk
 * stands at the line's end or 14px clear of my field tag's right edge (the
 * shell's), whichever is further right (`--tr`), tied to the line by twine;
 * where that leaves less than the pine's half-width to the window's edge
 * (below 1440) the pine is drawn smaller to fit (`--pw`), so the window never
 * crops it.
 *
 * `data-moon-off-duty` is a stable hook: Phase 7's surprise reads it, and
 * sits beside the `data-moon-art` drawing inside it.
 */
import type { CSSProperties } from "react";
import { companions, hero } from "@/content/portfolio";
import { Drawing } from "@/components/scenery/Drawing";

// The buffalo. Below 1024 she stands on the paddy's middle (`--buf-x`), at
// `--buf-w` wide, 0.05 of that above the paddy's foot. From 1024 she stands
// where the wide paddy leaves her a bare strip: x 327 of it (see PADDY in the
// script), so 263px into its box from 1024 to 1279, where the box starts 64
// units into the drawing.
const BUFFALO =
  "absolute bottom-[calc(28px+var(--buf-w)*0.05)] left-[calc(var(--buf-x)-var(--buf-w)/2)] aspect-[12/5] w-(--buf-w) text-[color:var(--scene-buffalo)] lg:bottom-[30px] lg:left-[calc(max(29%,11.1%+230px)+423px)] lg:aspect-auto lg:h-[80px] lg:w-[192px] xl:left-[calc(50%+185px)]";

// The mud she turns behind the plough: her own box, moved half its width on,
// so it follows the share at every size she is drawn at.
const WAKE = `${BUFFALO} translate-x-1/2`;

// The paddy (round 24). Below 1024 the phone board, 840 × 150 at one unit a
// pixel when the buffalo is her full 120px (it is drawn seven buffaloes
// wide, so it scales with her), standing 28px up so the two captions sit
// under the field, not on it: text over the rice fails AA contrast. Its
// middle, the bare strip she stands in, is on the box's middle plus
// `--paddy-dx`; the box runs pole to pole on a phone and from the stool to
// the pine on a tablet. From 1024 the wide board, 750 × 190, starts 4px past
// the stool's caption (whose left edge is `max(29%, 11.1% + 230px)`) and
// shows from x 64 to the window's edge; from 1280 it is whole, at frame x 578
// to 1328, clear of the pine's trunk. Both ends fade (`.paddy` in
// globals.css).
const PADDY_PHONE =
  "paddy absolute bottom-7 left-(--pad-l) right-(--pad-r) h-[calc(var(--buf-w)*1.25)] [--paddy-fade:24px] [--paddy-at:calc(50%_+_var(--paddy-dx))_0] [--paddy-size:calc(var(--buf-w)*7)_100%] lg:hidden";
const PADDY_WIDE =
  "paddy absolute bottom-0 hidden h-[190px] [--paddy-size:750px_190px] lg:block lg:left-[calc(max(29%,11.1%+230px)+160px)] lg:w-[min(100%-max(29%,11.1%+230px)-160px,686px)] lg:[--paddy-at:-64px_0] xl:left-[calc(50%-142px)] xl:w-[750px] xl:[--paddy-at:0_0]";

// The bank grass: a 420 × 30 strip that tiles along the section's foot,
// fading at both ends like the paddy (it borrows `.paddy`'s mask).
const GRASS =
  "paddy absolute bottom-0 hidden h-[30px] text-accent [--paddy-fade:20px] [--paddy-size:420px_30px] [mask-repeat:repeat-x,no-repeat]";

// The ground below 1024, as custom properties so the pieces agree. `--room`
// is what lies between the two poles' inner edges on a phone (each stands
// 14px in and is 12px wide); Moon, the buffalo and the stool take 0.28, 0.36
// and 0.29 of it up to their own sizes, which they reach at 375. On a tablet
// they are full size: Moon and the stool at the left, the paddy from the
// stool to the pine with the buffalo on its middle.
const GROUND =
  "[--room:calc(100cqw-42px)] [--buf-w:min(120px,var(--room)*0.3614)] [--pad-l:calc(var(--gutter)-6px)] [--pad-r:calc(var(--gutter)-6px)] [--paddy-dx:2px] [--buf-x:calc(50%+var(--paddy-dx))] sm:[--buf-w:120px] sm:[--pad-l:calc(var(--gutter)+290px)] sm:[--pad-r:calc(var(--gutter)-8px)] sm:[--paddy-dx:0px] sm:[--buf-x:calc(50%+149px)]";

export default function Scenery() {
  return (
    <div
      aria-hidden="true"
      data-scenery="hero"
      className={`pointer-events-none absolute inset-0 -z-10 ${GROUND}`}
      // The clothesline's width and left edge. The section is the container, so
      // `100cqw` is its width wherever a length is used (a `%` in `top` is not).
      style={
        {
          "--lw": "min(100cqw, 1920px)",
          "--lx": "calc((100cqw - var(--lw)) / 2)",
          // The shell's content edges: the words' left and my field tag's right.
          "--shell-l": "calc((100cqw - min(100cqw, 1120px + 2 * var(--gutter))) / 2 + var(--gutter))",
          // The line's left end (x 76 of 1440), and the bamboo's stem: 4px
          // inside that end, or 20px clear of the content column's left edge.
          "--l0": "calc(var(--lx) + var(--lw) * 0.052778)",
          "--bx": "min(var(--l0) - 4px, var(--shell-l) - 20px)",
          // The line's right end (x 1330 of 1440), and the pine's trunk: there,
          // or 14px right of my field tag, whose right edge is the shell's.
          "--le": "calc(var(--lx) + var(--lw) * 0.923611)",
          "--tr": "max(var(--le) + 26px, 100cqw - var(--shell-l) + 14px)",
          // The pine's box: 180 wide with the trunk 96 in, so 84 to its right.
          // Smaller where the window's edge is nearer the trunk than that.
          "--pw": "min(180px, (100cqw - var(--tr)) * 2.142857)",
        } as CSSProperties
      }
    >
      {/* The sun/moon is drawn at (880, 120) of the sky's 1440 width. Centred,
          that lands on the headline below 1024, so there the sky is pinned to
          the right instead. On a phone the disc sits 40px in from the right
          edge, 40px down, clear of the text column (under 360 "curious" runs
          under it, so there it drops beside the headline's shorter lines).
          On a tablet the top of the hero is the first pass and its tags, so
          the disc stands over the line's sag, right of its middle and above
          the strings. */}
      <span
        className="scene-art absolute inset-x-0 top-0 h-[900px] bg-top bg-[size:1440px_auto] max-lg:bg-[position:right_-520px_top_-80px] max-[359px]:bg-[position:right_-540px_top_-10px]! sm:max-lg:h-[380px] sm:max-lg:bg-[position:var(--sky-at)]"
        style={{ "--art": "var(--art-sky)" } as CSSProperties}
      />

      {/* `.hero-yard` in globals.css works the strings out from this curve:
          x is linear in t because the control point sits midway between the
          ends, so change the two together. */}
      <svg
        viewBox="0 0 1440 140"
        preserveAspectRatio="none"
        className="absolute top-[calc(var(--section-y)+var(--line-top))] left-(--lx) hidden h-[140px] w-(--lw) lg:block"
      >
        <path
          d="M76 14Q703 126 1330 0"
          fill="none"
          stroke="var(--twine)"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {/* Twine from the bamboo to the line's start, where the two part. */}
      <span className="absolute top-[calc(var(--section-y)+var(--line-top)+13px)] left-(--bx) hidden h-0.5 w-[calc(var(--l0)-var(--bx))] bg-(--twine) lg:max-[1440px]:block" />

      {/* The line starts at x 76 and ends at x 1330 of its 1440 viewBox. The
          poles' tops sit where the board puts them against the line. */}
      <Drawing
        name="bamboo"
        className="absolute top-[calc(var(--section-y)+var(--line-top)-19px)] bottom-0 left-[calc(var(--bx)-72px)] hidden w-[140px] text-accent [mask-position:top] [mask-size:100%_auto] lg:block"
      />
      <Drawing
        name="non-la"
        className="absolute top-[calc(var(--section-y)+var(--line-top)+241px)] left-[calc(var(--l0)-36px)] hidden h-[130px] w-[120px] lg:block max-[1440px]:top-[calc(var(--section-y)+var(--line-top))] max-[1440px]:left-[max(4px,var(--bx)-33px)] max-[1440px]:h-[72px] max-[1440px]:w-[67px]"
      />
      {/* Twine from the line's end to the pine, where the two part. */}
      <span className="absolute top-[calc(var(--section-y)+var(--line-top))] left-(--le) hidden h-0.5 w-[calc(var(--tr)-var(--le))] bg-(--twine) lg:block" />
      {/* The line ties on 49 units down the pine's 180-wide drawing. */}
      <Drawing
        name="pine"
        className="absolute top-[calc(var(--section-y)+var(--line-top)-var(--pw)*0.2722)] bottom-0 left-[calc(var(--tr)-var(--pw)*0.5333)] hidden w-(--pw) text-accent [mask-position:top] [mask-size:100%_auto] lg:block"
      />
      {/* On a phone the sky's low band again (seeds by day, fireflies by
          night) just above the ground; the top of the sky is behind the tags.
          Not on a tablet, where my words stand at that height. */}
      <span
        className="scene-art absolute inset-x-0 bottom-[90px] h-[260px] bg-[position:right_bottom_-40px] bg-[size:1440px_auto] sm:hidden"
        style={{ "--art": "var(--art-sky)" } as CSSProperties}
      />
      {/* From 1024 the ground carries on past the paddy's ends as bank grass:
          from the window's left edge to Moon, and from 1280, where the paddy
          is a whole board short of the window's edge, from its end to the
          right edge. The bamboo and the pine stand in it. */}
      <Drawing name="bank-grass" className={`${GRASS} lg:block lg:left-0 lg:w-[11.1%] xl:w-[calc(50%-560px)]`} />
      <Drawing name="bank-grass" className={`${GRASS} xl:right-0 xl:left-[calc(50%+568px)] xl:block`} />
      {/* Round 24: the paddy's water first (the flooded plots, the
          clumps' reflections, light on the water), then the rice over it. */}
      <Drawing name="paddy-phone-water" className={`${PADDY_PHONE} text-[color:var(--scene-water)]`} />
      <Drawing name="paddy-water" className={`${PADDY_WIDE} text-[color:var(--scene-water)]`} />
      {/* Round 23: she ploughs by day, in the plot nothing is planted in yet,
          the mud turning behind the plough. Below 1024 she stands on the
          paddy's middle, between Moon and the stool on a phone. */}
      <Drawing name="paddy-wake" className={`day-only [display:var(--show-day)]! ${WAKE}`} />
      <Drawing
        name="buffalo-plow"
        className={`day-only [display:var(--show-day)]! ${BUFFALO}`}
      />
      <Drawing name="paddy-phone" className={`${PADDY_PHONE} text-accent`} />
      <Drawing name="paddy" className={`${PADDY_WIDE} text-accent`} />

      {/* At night she lies down in the water, in front of the rice so the
          dusk sky does not swallow her. */}
      <Drawing
        name="buffalo-sleep"
        className={`night-only [display:var(--show-night)]! ${BUFFALO}`}
      />

      {/* Below ~1180 29% would put the stool on Moon's caption; it keeps
          clear of her instead. Round 23: it is a long low stool now, with
          the phin and a plate of cơm tấm by day and the lẩu and a bia at
          night, so its box is wider than it was. Below 1024 it stands just
          inside the right-hand pole on a phone and beside Moon on a tablet. */}
      <span
        data-scenery="vignette"
        className="scene-art absolute right-[26px] bottom-[18px] aspect-[128/110] w-[min(95px,var(--room)*0.2861)] sm:right-auto sm:left-[calc(var(--gutter)+172px)] sm:w-[95px] lg:bottom-[16px] lg:left-[max(29.2%,11.1%+232px)] lg:aspect-auto lg:h-[114px] lg:w-[133px] xl:left-[calc(50%-300px)]"
        style={{ "--art": "var(--art-vignette)" } as CSSProperties}
      />
      <div className="absolute right-[26px] bottom-0 font-serif text-[length:var(--step--2)] leading-none italic text-fg-muted sm:right-auto sm:left-[calc(var(--gutter)+172px)] lg:bottom-[4px] lg:left-[max(29%,11.1%+230px)] lg:text-[length:var(--step--1)] xl:left-[calc(50%-302px)]">
        <p className="day-only">{hero.vignette.morning}</p>
        <p className="night-only">{hero.vignette.evening}</p>
      </div>

      {/* Moon in a võng, her girlfriend's cat: awake-ish by day, asleep at
          night (`--art-offduty`). The wrapper keeps the stable hook; the cats
          visit the drawing (`data-moon-art`), not the caption. */}
      <span
        data-moon-off-duty=""
        className="absolute bottom-0 left-[26px] flex flex-col items-start gap-1 sm:left-[calc(var(--gutter)+24px)] lg:bottom-[19px] lg:left-[11.1%] lg:flex-row xl:left-[calc(50%-560px)] lg:items-end lg:gap-2"
      >
        <span
          data-moon-art=""
          className="scene-art block aspect-[93/52] w-[min(93px,var(--room)*0.28)] sm:w-[93px] lg:aspect-auto lg:h-[66px] lg:w-[118px]"
          style={{ "--art": "var(--art-offduty)" } as CSSProperties}
        />
        <span className="pb-1 font-serif text-[length:var(--step--1)] italic text-fg-muted">
          {`${companions[0].name}, ${hero.offDuty}`}
        </span>
      </span>
    </div>
  );
}
