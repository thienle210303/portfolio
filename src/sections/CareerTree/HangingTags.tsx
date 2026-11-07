import type { CSSProperties, ReactNode } from "react";
import { Drawing } from "@/components/scenery/Drawing";
import { journey } from "@/content/portfolio";
import { cn } from "@/lib/cn";
import { buildTickets } from "@/lib/highlights";
import NhiSwing from "./NhiSwing";

const TICKETS = buildTickets();

/**
 * Where the board hangs each tag, in its 1440×900 frame: `top` is the tag's
 * top, `width` its width, `tilt` its turn about its eyelets, and `eyes` its
 * eyelets (round 27: one string or two, Thien's "mixed 1 strings and 2
 * strings"), each at a fraction of the width with the string's `drop` from
 * the limb to the tag's top; the 18px on down to the eyelet is the paper's
 * own. These are `journeySpots()` in `scripts/draw-scenery.mjs` worked out
 * once (`tests/sections/HangingTags.test.tsx` holds them to it).
 *
 * Board units, not pixels (round 25): the board is 1440 units wide whatever
 * its width on screen, so at 1280 a tag is 11% narrower and at 1920 a sixth
 * wider, while the paper's own measures (its eyelet 18px down, its padding,
 * its type) stay as they are.
 */
export const TAG_SPOTS = [
  { left: 414, top: 489, width: 212, tilt: 1, eyes: [{ at: 0.22, drop: 1.7 }, { at: 0.7, drop: 48.5 }] },
  { left: 638, top: 426, width: 164, tilt: 2.5, eyes: [{ at: 0.5, drop: 40 }] },
  { left: 829, top: 440, width: 182, tilt: -0.5, eyes: [{ at: 0.2, drop: 87.6 }, { at: 0.8, drop: 103.4 }] },
  { left: 1041, top: 372, width: 158, tilt: -3, eyes: [{ at: 0.5, drop: 52 }] },
  { left: 1235, top: 387, width: 170, tilt: 2, eyes: [{ at: 0.16, drop: 80 }, { at: 0.84, drop: 86.7 }] },
] as const;

/**
 * How each tag looks (round 27: "more random… a bit looks monotone"): its
 * paper, from manila (0) to kraft (100); where its year's date stamp sits
 * (`name`: beside the name, `figure`: beside the figure, `top`: above it,
 * `foot`: at the foot) and the stamp's turn; and how big its figure is.
 * Authored, not random, so every visitor sees the same oak.
 */
export const TAG_LOOKS = [
  { kraft: 80, year: "name", stamp: -3, figure: "md" },
  { kraft: 25, year: "foot", stamp: -6, figure: "lg" },
  { kraft: 95, year: "top", stamp: 4, figure: "lg" },
  { kraft: 55, year: "figure", stamp: -2, figure: "md" },
  { kraft: 15, year: "foot", stamp: 5, figure: "lg" },
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

/** A year as a small date stamp in the tag's ink, turned a little. */
function DateStamp({ year, turn }: { readonly year: string; readonly turn: number }) {
  return (
    <span data-date="" style={{ "--turn": `${turn}deg` } as CSSProperties}>
      {year}
    </span>
  );
}

/** A figure: "17h → 3m", large or a step smaller. */
function Figure({ value, size }: { readonly value: string; readonly size: "lg" | "md" }) {
  return (
    <span
      className={cn(
        "font-display font-semibold leading-none tracking-(--tracking-display) xl:whitespace-nowrap",
        size === "lg" ? "text-[length:var(--step-4)]" : "text-[length:var(--step-3)]",
      )}
    >
      <Value value={value} />
    </span>
  );
}

/** The manila paper: its tone, its corner cut (shallower with two eyelets),
 *  and an eyelet where each string ties on. */
function Manila({
  kraft,
  eyes,
  children,
}: {
  readonly kraft: number;
  readonly eyes: readonly { readonly at: number }[];
  readonly children: ReactNode;
}) {
  return (
    <div data-manila="" data-eyes={eyes.length} style={{ "--kraft": `${kraft}%` } as CSSProperties}>
      {eyes.map((eye) => (
        <span key={eye.at} aria-hidden="true" data-eyelet="" style={{ left: `${eye.at * 100}%` }} />
      ))}
      {children}
    </div>
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
      <ul role="list" aria-label={journey.tagsLabel}>
        {TICKETS.map((ticket, i) => {
          const spot = TAG_SPOTS[i];
          const look = TAG_LOOKS[i];
          const [first, stub] = ticket.halves;
          const [e1, e2] = spot.eyes;
          const stamp = <DateStamp year={first.year} turn={look.stamp} />;
          return (
            <li
              key={ticket.entryId}
              data-year={first.year}
              data-strings={spot.eyes.length}
              style={
                {
                  // Board units, and each string's share that grows with the
                  // board: the rest of it is the 18px down to its eyelet.
                  "--x": spot.left,
                  "--y": spot.top,
                  "--w": spot.width,
                  "--tilt": `${spot.tilt}deg`,
                  "--e1": `${e1.at * 100}%`,
                  "--d1": e1.drop,
                  "--e2": `${(e2 ?? e1).at * 100}%`,
                  "--d2": (e2 ?? e1).drop,
                } as CSSProperties
              }
            >
              <span aria-hidden="true" data-bough="" className="no-print pointer-events-none absolute xl:hidden">
                <Drawing name="oak-bough" className="absolute inset-0 text-[color:var(--scene-bark)] [mask-size:100%_100%]" />
                <Drawing name="oak-bough-leaves" className="absolute inset-0 text-accent [mask-size:100%_100%]" />
              </span>
              <div>
                {stub ? (
                  <>
                    <a href={ticket.href} className="block">
                      <Manila kraft={look.kraft} eyes={spot.eyes}>
                        <span className="flex items-center justify-between gap-2">
                          <span className="text-[length:var(--step--1)] font-semibold">{ticket.name}</span>
                          {stamp}
                        </span>
                        <span className="mt-2.5 block">
                          <Figure value={first.value} size={look.figure} />
                        </span>
                        {first.measure ? (
                          <span className="mt-2 block font-mono text-[length:var(--step--2)] text-accent">
                            <Value value={first.measure} />
                          </span>
                        ) : null}
                        <span className={cn("mt-1.5 block", muted)}>
                          <Label text={first.label} />
                        </span>
                        {/* Clipped by their own box, so they never count as overflow. */}
                        <span aria-hidden="true" className="absolute inset-0 overflow-hidden">
                          <span className={cn(notch, "-bottom-[7px] -left-[7px]")} />
                          <span className={cn(notch, "-right-[7px] -bottom-[7px]")} />
                        </span>
                      </Manila>
                    </a>
                    <a href={stub.href} className="block">
                      <div data-stub="" data-manila="" style={{ "--kraft": `${look.kraft}%` } as CSSProperties}>
                        <span data-perforation="" aria-hidden="true" className="absolute inset-0 overflow-hidden">
                          <span className="absolute inset-x-0 top-0 border-t-[1.5px] border-dashed border-rule" />
                          <span className={cn(notch, "-top-[7px] -left-[7px]")} />
                          <span className={cn(notch, "-top-[7px] -right-[7px]")} />
                        </span>
                        <span className="sr-only">{ticket.name}, </span>
                        <span className="flex items-center justify-between gap-2">
                          <Figure value={stub.value} size="md" />
                          <DateStamp year={stub.year} turn={3} />
                        </span>
                        {stub.measure ? (
                          <span className="mt-2 block font-mono text-[length:var(--step--2)] text-accent">
                            <Value value={stub.measure} />
                          </span>
                        ) : null}
                        <span className={cn("mt-1.5 block", muted)}>
                          <Label text={stub.label} />
                        </span>
                      </div>
                    </a>
                  </>
                ) : (
                  <a href={ticket.href} className="block">
                    <Manila kraft={look.kraft} eyes={spot.eyes}>
                      {look.year === "top" ? <span className="mb-2.5 block">{stamp}</span> : null}
                      {look.year === "figure" ? (
                        <span className="flex items-center justify-between gap-2">
                          <Figure value={first.value} size={look.figure} />
                          {stamp}
                        </span>
                      ) : (
                        <span className="block">
                          <Figure value={first.value} size={look.figure} />
                        </span>
                      )}
                      <span className="mt-3 block text-[length:var(--step--1)] font-semibold">{ticket.name}</span>
                      <span className={cn("mt-1 block", muted)}>
                        <Label text={first.label} />
                      </span>
                      {look.year === "foot" ? <span className="mt-3 block">{stamp}</span> : null}
                    </Manila>
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
