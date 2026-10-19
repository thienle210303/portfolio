/**
 * The hero's scenery, behind everything and out of the accessibility tree.
 * Positions are the board's (NatHero), measured from the section's bottom
 * left. The bamboo, nón lá and pine need the board's own 1440: any narrower
 * and the content column runs into the pole and the hat. The clothesline
 * shows from 1024; its top is `--line-top` below the section's padding, the
 * same offset the chapter tags' row starts at, so their strings meet it.
 *
 * `data-moon-off-duty` is a stable hook: Phase 7's surprise reads it.
 */
import type { CSSProperties } from "react";
import { companions, hero } from "@/content/portfolio";
import { Drawing } from "@/components/scenery/Drawing";

export default function Scenery() {
  return (
    <div aria-hidden="true" data-scenery="hero" className="pointer-events-none absolute inset-0 -z-10">
      <span
        className="scene-art absolute inset-x-0 top-0 h-[900px] bg-top bg-[size:max(100%,1440px)_auto]"
        style={{ "--art": "var(--art-sky)" } as CSSProperties}
      />

      {/* Keep the curve in step with ChapterTags' DROPS: x is linear in t
          because the control point sits midway between the ends. */}
      <svg
        viewBox="0 0 1440 140"
        preserveAspectRatio="none"
        className="absolute inset-x-0 top-[calc(var(--section-y)+var(--line-top))] hidden h-[140px] w-full lg:block"
      >
        <path
          d="M76 14Q703 126 1330 0"
          fill="none"
          stroke="var(--twine)"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      <Drawing name="bamboo" className="absolute bottom-0 left-0 h-[790px] w-[170px] text-accent max-[1440px]:hidden" />
      <Drawing name="non-la" className="absolute bottom-[400px] left-[44px] h-[130px] w-[120px] max-[1440px]:hidden" />
      <Drawing name="pine" className="absolute right-0 bottom-0 h-[820px] w-[180px] text-accent max-[1440px]:hidden" />
      <Drawing
        name="ripples"
        className="absolute bottom-[10px] left-[38.9%] h-[30px] w-[660px] text-[color:var(--scene-water)] max-xl:hidden"
      />
      {/* Before the rice, so the stalks draw over it. */}
      <Drawing
        name="buffalo"
        className="absolute right-[2%] bottom-[20px] h-[59px] w-[110px] text-[color:var(--scene-buffalo)] lg:right-auto lg:bottom-[30px] lg:left-[60%] lg:h-[80px] lg:w-[150px] xl:left-[62.8%]"
      />
      <Drawing
        name="rice-field"
        className="absolute inset-x-0 bottom-0 h-[120px] text-accent lg:right-auto lg:left-[calc(38%-50px)] lg:h-[160px] lg:w-[670px] xl:left-[38.2%]"
      />

      <span
        className="scene-art absolute bottom-[12px] left-[40%] h-[96px] w-[72px] lg:bottom-[16px] lg:left-[29.2%] lg:h-[134px] lg:w-[100px]"
        style={{ "--art": "var(--art-vignette)" } as CSSProperties}
      />
      <div className="absolute bottom-0 left-[38%] font-serif text-[length:var(--step--1)] leading-none italic text-fg-muted lg:bottom-[4px] lg:left-[29%]">
        <p className="day-only">{hero.vignette.morning}</p>
        <p className="night-only">{hero.vignette.evening}</p>
      </div>

      <span
        data-moon-off-duty=""
        className="absolute bottom-8 left-4 flex flex-col items-start gap-1 lg:bottom-[19px] lg:left-[11.1%] lg:flex-row lg:items-end lg:gap-2"
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
