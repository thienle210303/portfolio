/**
 * The hero's scenery, behind everything and out of the accessibility tree.
 * Positions are the board's (NatHero), measured from the section's bottom.
 * From 1280 the content column is a centred 1120px, so the ground pieces and
 * the sky stand in a centred 1440 frame (`50% ± n px`) and keep the board's
 * relation to the words at any width. From 1024 to 1279 they take the %
 * positions; below 1024 the ground is the phone board's (NatHeroPhone):
 * Moon at the left in her võng, the buffalo in the paddy between them about
 * the middle (`50%`-based), the stool and its caption at the right (`right-4`).
 *
 * The clothesline shows from 1024, at most 1920 wide and centred; its top is
 * `--line-top` below the section's padding, the same offset the chapter tags'
 * row starts at, so their strings meet it. The bamboo and pine stand at its two
 * ends (`--lx`, `--lw`) from 1024, hung from the line rather than stood on the
 * ground: the hero is taller below 1280, and the drawings run on past the
 * board's ground so the section's bottom clips them. Below 1440 the left
 * gutter is narrower than the line's inset, so the bamboo steps left to clear
 * the text by 20px (`--bx`) and a short length of twine ties it to the line.
 * Below 1440 the nón lá is the phone's (0.56×), its crown on the knot where
 * the twine meets the bamboo: the board's spot hangs over the hint and the
 * headline in a narrower gutter. The pine's trunk stands at the line's end or
 * 14px clear of my field tag's right edge, whichever is further right (`--tr`),
 * tied to the line by twine; below ~1440 the tag would otherwise hang in front
 * of the trunk, and the window's edge crops the pine instead.
 *
 * `data-moon-off-duty` is a stable hook: Phase 7's surprise reads it, and
 * sits beside the `data-moon-art` drawing inside it.
 */
import type { CSSProperties } from "react";
import { companions, hero } from "@/content/portfolio";
import { Drawing } from "@/components/scenery/Drawing";

// From 1024 the buffalo stands where the paddy's drawing leaves her a bare
// strip: x 327 of it (see PADDY below), so 263px into its box from 1024 to
// 1279, where the box starts 64 units into the drawing.
const BUFFALO =
  "absolute bottom-[30px] left-[calc(50%-46px)] h-[50px] w-[120px] text-[color:var(--scene-buffalo)] max-[359px]:h-[38px] max-[359px]:w-[91px] lg:bottom-[30px] lg:left-[calc(max(29%,11.1%+230px)+423px)] lg:h-[80px] lg:w-[192px] xl:left-[calc(50%+185px)]";

// The mud she turns behind the plough: her own box, moved half its width on,
// so it follows the share at every size she is drawn at.
const WAKE = `${BUFFALO} translate-x-1/2`;

// The paddy (round 24). Below 1024 the phone board, 840 × 150 at one unit a
// pixel, its x 420 on the buffalo's middle (50% + 14px), standing 24px up so
// the two captions sit under the field, not on it: text over the rice fails
// AA contrast. Under 360 she shrinks to 0.76 and the board with her, about
// her feet. From 1024 the wide board, 750 × 190, starts 4px past the stool's
// caption (whose left edge is `max(29%, 11.1% + 230px)`) and shows from x 64
// to the window's edge; from 1280 it is whole, at frame x 578 to 1328, clear
// of the pine's trunk. Both ends fade (`.paddy` in globals.css).
const PADDY_PHONE =
  "paddy absolute right-24 bottom-6 left-24 h-[150px] [--paddy-fade:24px] [--paddy-at:calc(50%_+_14px)_0] [--paddy-size:840px_150px] lg:hidden max-[359px]:bottom-[25.5px] max-[359px]:h-[114px] max-[359px]:[--paddy-at:50%_0] max-[359px]:[--paddy-size:auto_100%]";
const PADDY_WIDE =
  "paddy absolute bottom-0 hidden h-[190px] [--paddy-size:750px_190px] lg:block lg:left-[calc(max(29%,11.1%+230px)+160px)] lg:w-[min(100%-max(29%,11.1%+230px)-160px,686px)] lg:[--paddy-at:-64px_0] xl:left-[calc(50%-142px)] xl:w-[750px] xl:[--paddy-at:0_0]";

export default function Scenery() {
  return (
    <div
      aria-hidden="true"
      data-scenery="hero"
      className="pointer-events-none absolute inset-0 -z-10"
      // The clothesline's width and left edge; % resolves where each is used.
      style={
        {
          "--lw": "min(100%, 1920px)",
          "--lx": "calc((100% - var(--lw)) / 2)",
          // The line's left end (x 76 of 1440), and the bamboo's stem: 4px
          // inside that end, or 20px clear of the content column's left edge.
          "--l0": "calc(var(--lx) + var(--lw) * 0.052778)",
          "--bx": "min(var(--l0) - 4px, (100% - min(100%, 1120px + 2 * var(--gutter))) / 2 + var(--gutter) - 20px)",
          // The line's right end (x 1330 of 1440), and the pine's trunk: there,
          // or 14px right of my field tag, which runs 16px short of the
          // content column's right edge plus its gutter (Hero.tsx).
          "--le": "calc(var(--lx) + var(--lw) * 0.923611)",
          "--tr": "max(var(--le) + 26px, 100% - (100% - min(100%, 1120px + 2 * var(--gutter))) / 2 - 2px)",
        } as CSSProperties
      }
    >
      {/* The sun/moon is drawn at (880, 120) of the sky's 1440 width. Centred,
          that lands on the headline below 1024, so there the sky is pinned to
          the right instead: the disc sits 40px in from the right edge, 40px
          down, clear of the text column. Under 360 "curious" runs under it, so
          there it drops beside the headline's shorter lines. */}
      <span
        className="scene-art absolute inset-x-0 top-0 h-[900px] bg-top bg-[size:1440px_auto] max-lg:bg-[position:right_-520px_top_-80px] max-[359px]:bg-[position:right_-540px_top_-10px]!"
        style={{ "--art": "var(--art-sky)" } as CSSProperties}
      />

      {/* Keep the curve in step with ChapterTags' DROPS: x is linear in t
          because the control point sits midway between the ends. */}
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
        className="absolute top-[calc(var(--section-y)+var(--line-top)+241px)] left-[calc(var(--l0)-36px)] hidden h-[130px] w-[120px] lg:block max-[1440px]:top-[calc(var(--section-y)+var(--line-top))] max-[1440px]:left-[calc(var(--bx)-33px)] max-[1440px]:h-[72px] max-[1440px]:w-[67px]"
      />
      {/* Twine from the line's end to the pine, where the two part. */}
      <span className="absolute top-[calc(var(--section-y)+var(--line-top))] left-(--le) hidden h-0.5 w-[calc(var(--tr)-var(--le))] bg-(--twine) lg:block" />
      <Drawing
        name="pine"
        className="absolute top-[calc(var(--section-y)+var(--line-top)-49px)] bottom-0 left-[calc(var(--tr)-96px)] hidden w-[180px] text-accent [mask-position:top] [mask-size:100%_auto] lg:block"
      />
      {/* Below 1024 the sky's low band again (seeds by day, fireflies by
          night) just above the ground; the top of the sky is behind the tags. */}
      <span
        className="scene-art absolute inset-x-0 bottom-[90px] h-[260px] bg-[position:right_bottom_-40px] bg-[size:1440px_auto] lg:hidden"
        style={{ "--art": "var(--art-sky)" } as CSSProperties}
      />
      {/* Round 24: the paddy's water first (the flooded plots, the
          clumps' reflections, light on the water), then the rice over it. */}
      <Drawing name="paddy-phone-water" className={`${PADDY_PHONE} text-[color:var(--scene-water)]`} />
      <Drawing name="paddy-water" className={`${PADDY_WIDE} text-[color:var(--scene-water)]`} />
      {/* Round 23: she ploughs by day, in the plot nothing is planted in yet,
          the mud turning behind the plough. Below 1024 she stands between
          Moon and the stool and shrinks under 360 so the three do not touch. */}
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
          night, so its box is wider than it was. */}
      <span
        data-scenery="vignette"
        className="scene-art absolute right-4 bottom-[18px] h-[82px] w-[95px] lg:right-auto lg:bottom-[16px] lg:left-[max(29.2%,11.1%+232px)] lg:h-[114px] lg:w-[133px] xl:left-[calc(50%-300px)]"
        style={{ "--art": "var(--art-vignette)" } as CSSProperties}
      />
      <div className="absolute right-4 bottom-0 font-serif text-[length:var(--step--2)] leading-none italic text-fg-muted lg:right-auto lg:bottom-[4px] lg:left-[max(29%,11.1%+230px)] lg:text-[length:var(--step--1)] xl:left-[calc(50%-302px)]">
        <p className="day-only">{hero.vignette.morning}</p>
        <p className="night-only">{hero.vignette.evening}</p>
      </div>

      {/* Moon in a võng, her girlfriend's cat: awake-ish by day, asleep at
          night (`--art-offduty`). The wrapper keeps the stable hook; the cats
          visit the drawing (`data-moon-art`), not the caption. */}
      <span
        data-moon-off-duty=""
        className="absolute bottom-0 left-4 flex flex-col items-start gap-1 lg:bottom-[19px] lg:left-[11.1%] lg:flex-row xl:left-[calc(50%-560px)] lg:items-end lg:gap-2"
      >
        <span
          data-moon-art=""
          className="scene-art block h-[52px] w-[93px] lg:h-[66px] lg:w-[118px]"
          style={{ "--art": "var(--art-offduty)" } as CSSProperties}
        />
        <span className="pb-1 font-serif text-[length:var(--step--1)] italic text-fg-muted">
          {`${companions[0].name}, ${hero.offDuty}`}
        </span>
      </span>
    </div>
  );
}
