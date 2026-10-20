import type { CSSProperties } from "react";
import { Drawing } from "@/components/scenery/Drawing";
import { Tag } from "@/components/ui/Tag";
import { journey } from "@/content/portfolio";
import { cn } from "@/lib/cn";
import { buildTickets, type ResolvedHighlight } from "@/lib/highlights";

const TICKETS = buildTickets();

/**
 * Where the board (NatJourney) hangs each tag, in its 1440×900 frame: `top` is
 * the tag's top, `string` the twine from the limb to the hole's centre (18px
 * down), `tilt` its turn about the hole. These are `journeySpots()` in
 * `scripts/draw-scenery.mjs` worked out once (`tests/sections/HangingTags.test.tsx`
 * holds them to it). The ticket's hole is centred, so it hangs 13px right of
 * the board's ticket, whose hole and string disagree.
 */
export const TAG_SPOTS = [
  { left: 415, top: 467, string: 26.3, tilt: -2.5, width: 210 },
  { left: 632, top: 426, string: 58, tilt: 1.5, width: 176 },
  { left: 832, top: 440, string: 114.5, tilt: -1, width: 176 },
  { left: 1032, top: 372, string: 70, tilt: 2, width: 176 },
  { left: 1232, top: 387, string: 101.9, tilt: -1.5, width: 176 },
] as const;

/** "17h → 3m": the arrow is decoration; a screen reader hears "to". */
function Value({ value }: { readonly value: string }) {
  return value.split(" → ").map((part, i) => (
    <span key={i}>
      {i > 0 && (
        <>
          <span aria-hidden="true"> → </span>
          <span className="sr-only"> to </span>
        </>
      )}
      {part}
    </span>
  ));
}

const muted = "text-[length:var(--step--1)] leading-snug text-fg-muted";
const year = "font-mono font-normal text-[length:var(--step--2)] text-fg-muted";

/** One half of the DoorDash ticket: value and year on one line, then what was measured. */
function Half({ h }: { readonly h: ResolvedHighlight }) {
  return (
    <>
      <span className="flex flex-wrap items-baseline justify-between gap-x-2">
        <span className="font-display text-[length:var(--step-3)] font-semibold leading-none tracking-(--tracking-display) xl:whitespace-nowrap">
          <Value value={h.value} />
        </span>
        <span className={year}>{h.year}</span>
      </span>
      {h.measure ? (
        <span className="mt-2 block font-mono text-[length:var(--step--2)] text-accent">
          <Value value={h.measure} />
        </span>
      ) : null}
      <span className={cn("mt-1.5 block", muted)}>{h.label}</span>
    </>
  );
}

/** A quarter of a punched notch at one corner; the paper's clip cuts it. */
const notch = "absolute size-3.5 rounded-full bg-(--hole)";

/**
 * The tags that hang from the Journey's oak, one per ticket, in board order.
 * Each paper is wrapped by its link, so the focus ring sits on the `<a>` and
 * is never cut by the paper's corners. The DoorDash ticket is two papers
 * joined at a perforation: the 2025 result links to its row, the 2026 stub to
 * the case study it came from (owner, 2026-10-20), which renders in that row.
 *
 * From 1280 each tag stands where the board hangs it, in a 1440 frame whose
 * left edge is the section's `--fx`; the strings are drawn in globals.css
 * (`[data-hanging-tags]`). Below 1280 the same list hangs from a branch that
 * drops from the crown above it, each tag from its own twig: down the right
 * edge in one column on a phone, down the middle with the tags either side
 * from 640 (the hero's phone line does the same). globals.css lays that out.
 */
export default function HangingTags({ className }: { readonly className?: string }) {
  return (
    <div data-hanging-tags="" className={cn("relative xl:static", className)}>
      <div
        aria-hidden="true"
        data-branch=""
        className="no-print pointer-events-none absolute bottom-0 xl:hidden"
      >
        <Drawing
          name="oak-branch"
          className="absolute inset-0 text-[color:var(--scene-bark)] [mask-position:top] [mask-size:100%_auto]"
        />
      </div>
      <ul
        role="list"
        aria-label={journey.tagsLabel}
        className="relative flex flex-col gap-y-10 pt-[26px] xl:static xl:block xl:p-0"
      >
        {TICKETS.map((ticket, i) => {
          const spot = TAG_SPOTS[i];
          const [first, stub] = ticket.halves;
          return (
            <li
              key={ticket.entryId}
              className="relative xl:absolute xl:top-(--y) xl:left-[calc(var(--fx)+var(--x))] xl:w-(--w)"
              style={
                {
                  "--x": `${spot.left}px`,
                  "--y": `${spot.top}px`,
                  "--string": `${spot.string}px`,
                  "--tilt": `${spot.tilt}deg`,
                  "--w": `${spot.width}px`,
                } as CSSProperties
              }
            >
              <div className="origin-[50%_18px] rotate-(--tilt)">
                {stub ? (
                  <>
                    <a href={ticket.href} className="block">
                      <Tag className="px-[18px] pt-[34px] pb-4">
                        <span className="mb-2.5 block font-semibold">{ticket.name}</span>
                        <Half h={first} />
                        {/* Clipped by their own box, so they never count as overflow. */}
                        <span aria-hidden="true" className="absolute inset-0 overflow-hidden">
                          <span className={cn(notch, "-bottom-[7px] -left-[7px]")} />
                          <span className={cn(notch, "-right-[7px] -bottom-[7px]")} />
                        </span>
                      </Tag>
                    </a>
                    <a href={stub.href} className="block">
                      <div data-stub="" className="relative overflow-hidden bg-surface px-[18px] pt-3.5 pb-[18px] text-fg">
                        <span data-perforation="" aria-hidden="true" className="absolute inset-0 overflow-hidden">
                          <span className="absolute inset-x-0 top-0 border-t-[1.5px] border-dashed border-rule" />
                          <span className={cn(notch, "-top-[7px] -left-[7px]")} />
                          <span className={cn(notch, "-top-[7px] -right-[7px]")} />
                        </span>
                        <span className="sr-only">{ticket.name}, </span>
                        <Half h={stub} />
                      </div>
                    </a>
                  </>
                ) : (
                  <a href={ticket.href} className="block">
                    <Tag className="px-[18px] pt-9 pb-5">
                      <span className="block font-display text-[length:var(--step-4)] font-semibold leading-none tracking-(--tracking-display) xl:whitespace-nowrap">
                        <Value value={first.value} />
                      </span>
                      <span className="mt-3 flex flex-wrap items-baseline justify-between gap-x-2 text-[length:var(--step--1)] font-semibold">
                        <span>{ticket.name}</span>
                        <span className={year}>{first.year}</span>
                      </span>
                      <span className={cn("mt-1.5 block", muted)}>{first.label}</span>
                    </Tag>
                  </a>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
