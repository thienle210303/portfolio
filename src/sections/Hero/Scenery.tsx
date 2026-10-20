/**
 * The hero's scenery, behind everything and out of the accessibility tree.
 * Positions are the board's (NatHero), measured from the section's bottom.
 * From 1280 the content column is a centred 1120px, so the ground pieces and
 * the sky stand in a centred 1440 frame (`50% ± n px`) and keep the board's
 * relation to the words at any width. Below that they take the % positions.
 *
 * The clothesline shows from 1024, at most 1920 wide and centred; its top is
 * `--line-top` below the section's padding, the same offset the chapter tags'
 * row starts at, so their strings meet it. The bamboo and pine stand at its two
 * ends (`--lx`, `--lw`) from 1024, hung from the line rather than stood on the
 * ground: the hero is taller below 1280, and the drawings run on past the
 * board's ground so the section's bottom clips them. Below 1440 the left
 * gutter is narrower than the line's inset, so the bamboo steps left to clear
 * the text by 20px (`--bx`) and a short length of twine ties it to the line.
 * The pine stands behind my field tag there. The nón lá only from 1440: in a
 * narrower gutter it hangs over the hint and the headline.
 *
 * `data-moon-off-duty` is a stable hook: Phase 7's surprise reads it.
 */
import type { CSSProperties } from "react";
import { companions, hero } from "@/content/portfolio";
import { Drawing } from "@/components/scenery/Drawing";

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
        } as CSSProperties
      }
    >
      {/* The sun/moon is drawn at (880, 120) of the sky's 1440 width. Centred,
          that lands on the headline below 1024, so there the sky is pinned to
          the right instead: the disc sits 40px in from the right edge, 40px
          down, clear of the text column. */}
      <span
        className="scene-art absolute inset-x-0 top-0 h-[900px] bg-top bg-[size:1440px_auto] max-lg:bg-[position:right_-520px_top_-80px]"
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
        className="absolute top-[calc(var(--section-y)+var(--line-top)+241px)] left-[calc(var(--l0)-36px)] h-[130px] w-[120px] max-[1440px]:hidden"
      />
      <Drawing
        name="pine"
        className="absolute top-[calc(var(--section-y)+var(--line-top)-49px)] bottom-0 left-[calc(var(--lx)+var(--lw)*0.923611-70px)] hidden w-[180px] text-accent [mask-position:top] [mask-size:100%_auto] lg:block"
      />
      <Drawing
        name="ripples"
        className="absolute bottom-[10px] left-[calc(50%-160px)] h-[30px] w-[660px] text-[color:var(--scene-water)] max-xl:hidden"
      />
      {/* Before the rice, so the stalks draw over it. */}
      <Drawing
        name="buffalo"
        className="absolute right-[2%] bottom-[20px] h-[59px] w-[110px] text-[color:var(--scene-buffalo)] lg:right-auto lg:bottom-[30px] lg:left-[60%] lg:h-[80px] lg:w-[150px] xl:left-[calc(50%+185px)]"
      />
      {/* Below 1024 the rice stands 24px up, so the two captions sit under
          the stalks, not on them: text over the stalks fails AA contrast. */}
      <Drawing
        name="rice-field"
        className="absolute inset-x-0 bottom-6 h-[120px] text-accent lg:right-auto lg:bottom-0 lg:left-[45%] lg:h-[160px] lg:w-[655px] xl:left-[calc(50%-145px)]"
      />

      {/* Below ~1180 29% would put the stool on Moon's caption; it keeps
          clear of her instead. */}
      <span
        className="scene-art absolute bottom-[12px] left-[40%] h-[82px] w-[72px] lg:bottom-[16px] lg:left-[max(29.2%,11.1%+232px)] lg:h-[114px] lg:w-[100px] xl:left-[calc(50%-300px)]"
        style={{ "--art": "var(--art-vignette)" } as CSSProperties}
      />
      <div className="absolute bottom-0 left-[38%] font-serif text-[length:var(--step--1)] leading-none italic text-fg-muted lg:bottom-[4px] lg:left-[max(29%,11.1%+230px)] xl:left-[calc(50%-302px)]">
        <p className="day-only">{hero.vignette.morning}</p>
        <p className="night-only">{hero.vignette.evening}</p>
      </div>

      <span
        data-moon-off-duty=""
        className="absolute bottom-0 left-4 flex flex-col items-start gap-1 lg:bottom-[19px] lg:left-[11.1%] lg:flex-row xl:left-[calc(50%-560px)] lg:items-end lg:gap-2"
      >
        <svg
          viewBox="18 28 136 74"
          className="h-[52px] w-[96px] text-fg lg:h-[66px] lg:w-[121px]"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M150 74C152 96 112 101 70 96" />
          <path
            d="M22 70C22 42 60 28 96 32C130 36 152 54 150 72C148 88 122 93 90 93L44 93C30 93 22 84 22 70Z"
            fill="var(--ground)"
           
          />
          <path d="M60 52C76 46 98 46 116 54" strokeWidth="1" />
          <path d="M28 52L25 33L40 45M48 43L59 29L61 46" fill="var(--ground)" />
          <path
            d="M22 66C20 50 34 40 48 42C62 44 68 56 64 68C60 80 46 84 34 80C26 77 22 72 22 66Z"
            fill="var(--ground)"
           
          />
          <path d="M33 62q4 3 8 0M48 62q4 3 8 0M43 69l1 2l1 -2" />
          <path
            d="M30 70l-12 -2M30 73l-11 3M58 70l12 -2M58 73l11 3"
            strokeWidth="0.8"
           
          />
        </svg>
        <span className="pb-1 font-serif text-[length:var(--step--1)] italic text-fg-muted">
          {`${companions[0].name}, ${hero.offDuty}`}
        </span>
      </span>
    </div>
  );
}
