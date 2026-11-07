import type { CSSProperties } from "react";
import { Drawing } from "@/components/scenery/Drawing";
import { Tag } from "@/components/ui/Tag";
import { journey } from "@/content/portfolio";
import { cn } from "@/lib/cn";
import { buildTickets, type ResolvedHighlight } from "@/lib/highlights";
import NhiSwing from "./NhiSwing";
import NowShoot from "./NowShoot";

const TICKETS = buildTickets();

/**
 * Where the board (NatJourney) hangs each tag, in its 1440×900 frame: `top` is
 * the tag's top, `string` the twine from the limb to the hole's centre (18px
 * down), `tilt` its turn about the hole. These are `journeySpots()` in
 * `scripts/draw-scenery.mjs` worked out once (`tests/sections/HangingTags.test.tsx`
 * holds them to it). The ticket's hole is centred, so it hangs 13px right of
 * the board's ticket, whose hole and string disagree.
 *
 * They are board units, not pixels (round 25): the board is 1440 units wide
 * whatever its width on screen, so at 1280 a tag is 11% narrower and at 1920
 * a sixth wider, while the paper's own measures (its hole 18px down, its
 * padding, its type) stay as they are. The second tag turns the same way as
 * the ticket beside it (it turned toward it, and their corners met: 7 units
 * between them is 6px at 1280, less than two papers swinging together close).
 */
export const TAG_SPOTS = [
  { left: 415, top: 467, string: 26.3, tilt: -2.5, width: 210 },
  { left: 632, top: 426, string: 58, tilt: -1.5, width: 176 },
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

/** A hyphenated word stays whole ("low-code" never breaks to "low- / code."); the text is unchanged. */
function Label({ text }: { readonly text: string }) {
  return text.split(/(\w+-\w+)/).map((part, i) =>
    i % 2 ? (
      <span key={i} data-whole-word="" className="whitespace-nowrap">
        {part}
      </span>
    ) : (
      part
    ),
  );
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
      <span className={cn("mt-1.5 block", muted)}>
        <Label text={h.label} />
      </span>
    </>
  );
}

/** The trunk's layers, masked from the top: it is cut at the stage's height. */
const TRUNK = "absolute inset-0 [mask-position:top] [mask-size:100%_auto]";

/** A quarter of a punched notch at one corner; the paper's clip cuts it. */
const notch = "absolute size-3.5 rounded-full bg-(--hole)";

/**
 * The tags that hang from the Journey's oak, one per ticket, in board order.
 * Each paper is wrapped by its link, so the focus ring sits on the `<a>` and
 * is never cut by the paper's corners. The DoorDash ticket is two papers
 * joined at a perforation: the 2025 result links to its row, the 2026 stub to
 * the case study it came from (owner, 2026-10-20), which renders in that row.
 *
 * From 1280 each tag stands where the board hangs it, in a frame of 1440
 * board units whose left edge is the section's `--fx`; the strings are drawn
 * in globals.css (`[data-hanging-tags]`). Below 1280 it is one tree (round
 * 22): the crown's own trunk carries on down past the tags to its roots, and
 * each tag hangs by a string from a leafy bough of its own. The trunk stands
 * near the right edge on a phone, the tags in one column; from 640 it stands
 * in the middle and the boughs leave it in pairs, a tag each side (round 25).
 * globals.css lays all of it out: nothing here places a tag.
 *
 * Bé Nhi's swing (`NhiSwing`) hangs here too, so below 1280 the trunk runs
 * on past her to its roots; from 640 hers is the last bough on the right,
 * beside the fifth tag.
 *
 * `data-year` is the year the tag drops in when "Watch it grow" plays
 * (`GrowOak.tsx`): its first half's, so the DoorDash ticket comes with 2025.
 */
export default function HangingTags({ className }: { readonly className?: string }) {
  return (
    <div data-hanging-tags="" className={className}>
      <div aria-hidden="true" data-trunk="" className="no-print pointer-events-none absolute xl:hidden">
        <Drawing name="oak-trunk-moss" className={cn(TRUNK, "text-[color:var(--scene-moss)]")} />
        <Drawing name="oak-trunk" className={cn(TRUNK, "text-[color:var(--scene-bark)]")} />
        <Drawing name="oak-trunk-leaves" className={cn(TRUNK, "text-accent")} />
        <Drawing name="oak-roots" className="absolute inset-x-0 bottom-0 aspect-[240/156] text-[color:var(--scene-bark)]" />
      </div>
      {/* What I am doing now (round 26): from 1280 on a shoot above the board,
          below it the first tag down the trunk. Before the highlights, so the
          trunk runs on past it. */}
      <NowShoot />
      <ul role="list" aria-label={journey.tagsLabel}>
        {TICKETS.map((ticket, i) => {
          const spot = TAG_SPOTS[i];
          const [first, stub] = ticket.halves;
          return (
            <li
              key={ticket.entryId}
              data-year={first.year}
              style={
                {
                  // Board units, and the share of the string that grows with
                  // the board: the rest of it is the 18px down to the hole.
                  "--x": spot.left,
                  "--y": spot.top,
                  "--w": spot.width,
                  "--drop": Math.round((spot.string - 18) * 10) / 10,
                  "--tilt": `${spot.tilt}deg`,
                } as CSSProperties
              }
            >
              <span aria-hidden="true" data-bough="" className="no-print pointer-events-none absolute xl:hidden">
                <Drawing name="oak-bough" className="absolute inset-0 text-[color:var(--scene-bark)] [mask-size:100%_100%]" />
                <Drawing name="oak-bough-leaves" className="absolute inset-0 text-accent [mask-size:100%_100%]" />
              </span>
              <div className="origin-[50%_18px]">
                {stub ? (
                  <>
                    <a href={ticket.href} className="block">
                      <Tag className="px-[18px] pt-12 pb-5">
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
                      <div data-stub="" className="relative overflow-hidden bg-surface px-[18px] pt-3.5 pb-7 text-fg">
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
                    <Tag className="px-[18px] pt-13 pb-8">
                      <span className="block font-display text-[length:var(--step-4)] font-semibold leading-none tracking-(--tracking-display) xl:whitespace-nowrap">
                        <Value value={first.value} />
                      </span>
                      <span className="mt-3 flex flex-wrap items-baseline justify-between gap-x-2 text-[length:var(--step--1)] font-semibold">
                        <span>{ticket.name}</span>
                        <span className={year}>{first.year}</span>
                      </span>
                      <span className={cn("mt-1.5 block", muted)}>
                        <Label text={first.label} />
                      </span>
                    </Tag>
                  </a>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {/* Bé Nhi's swing: from 1280 on the oak's left limb, below it on a
          bough of its own under the last tag (globals.css). */}
      <NhiSwing copy={journey.swing} />
    </div>
  );
}
