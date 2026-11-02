import type { CSSProperties } from "react";
import { record } from "@/content/portfolio";
import { cn } from "@/lib/cn";
import {
  buildSlice,
  CARD_SLOTS,
  CARD_WIDTH,
  entryTitle,
  featuredEntries,
  KIND_WORD,
  KINDS,
  PAGE_FRAME,
  recordYearId,
  SLICE_CENTRE,
  startYear,
} from "@/lib/record";
import { journeyEntryAnchorId } from "@/sections/CareerTree/anchors";
import { KindDot } from "./KindDot";

const SLICE = buildSlice();
const FEATURED = featuredEntries();
const YEARS = SLICE.rings.map((r) => r.year);

/** The slice's own box, wobble and bark included (board coordinates). */
const R = Math.ceil(SLICE.radius * 1.045 + 8);
const BOX = { x: SLICE_CENTRE.x - R, y: SLICE_CENTRE.y - R, size: 2 * R };

/** Board coordinates as a share of the left page's frame. */
const pctX = (x: number) => `${(((x - PAGE_FRAME.x) / PAGE_FRAME.width) * 100).toFixed(2)}%`;
const pctY = (y: number) => `${(((y - PAGE_FRAME.y) / PAGE_FRAME.height) * 100).toFixed(2)}%`;
const pctW = (w: number) => `${((w / PAGE_FRAME.width) * 100).toFixed(2)}%`;

/** Placed in the frame from 528px of page width; in flow below. */
const PLACE = "@min-[33rem]:absolute @min-[33rem]:left-(--l) @min-[33rem]:top-(--t) @min-[33rem]:w-(--w)";

const DOT_FILL = {
  work: "fill-(--kind-work)",
  learning: "fill-(--kind-learning)",
  milestone: "fill-(--kind-milestone)",
} as const;

/**
 * The left page under its heading: the tree slice, its legend, and the five
 * pressed highlights, each tied to its dot by a string.
 *
 * From 528px of page width (a container query) this is the board: a frame in
 * board coordinates whose pieces are placed by percentage, so the strings
 * (one SVG in the same coordinates) always meet their cards. Narrower, on a
 * phone, the slice sits centred and the cards follow two to a row, without
 * strings.
 *
 * Each ring is a link to its year's chapter in the book (`#record-<year>`): a
 * plain fragment, so it works with JavaScript off. The rings are painted
 * outermost first, so each annulus is its own hit area. Each card links to
 * its entry's page. (It was sticky beside a long list until round 23; the
 * book has no long list.)
 */
export default function RecordPressed() {
  const caption = record.pressed.slice.replace("{first}", String(YEARS[0])).replace("{last}", String(YEARS.at(-1)));
  return (
    <div className="@container mt-5">
      <div data-pressed="" className="relative mx-auto max-w-[42rem] @min-[33rem]:aspect-[612/590]">
        <p
          className={cn("max-w-[20rem] text-[length:var(--step--1)] leading-snug text-fg-muted @min-[33rem]:max-w-none", PLACE)}
          style={{ "--l": pctX(112), "--t": pctY(196), "--w": pctW(290) } as CSSProperties}
        >
          {caption}
        </p>
        <ul
          role="list"
          aria-label="What the dots mean"
          className={cn("mt-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[length:var(--step--2)] text-fg @min-[33rem]:mt-0", PLACE)}
          style={{ "--l": pctX(112), "--t": pctY(262) } as CSSProperties}
        >
          {KINDS.map((kind) => (
            <li key={kind} className="inline-flex items-center gap-1.5">
              <KindDot kind={kind} />
              {KIND_WORD[kind]}
            </li>
          ))}
        </ul>

        <svg
          role="group"
          aria-label={`A tree slice, one ring per year from ${YEARS[0]} to ${YEARS.at(-1)}`}
          viewBox={`${BOX.x} ${BOX.y} ${BOX.size} ${BOX.size}`}
          className={cn("record-slice mx-auto mt-4 block aspect-square w-[min(100%,15rem)] @min-[33rem]:mt-0", PLACE)}
          style={{ "--l": pctX(BOX.x), "--t": pctY(BOX.y), "--w": pctW(BOX.size) } as CSSProperties}
        >
          <circle cx={SLICE_CENTRE.x} cy={SLICE_CENTRE.y} r={SLICE.radius + 7} className="fill-(--bark-outer)" />
          <circle cx={SLICE_CENTRE.x} cy={SLICE_CENTRE.y} r={SLICE.radius + 3} className="fill-(--bark-inner)" />
          {SLICE.rings.toReversed().map((ring) => {
            const yi = SLICE.rings.indexOf(ring);
            const name =
              ring.count === 0
                ? `${ring.year}: nothing started`
                : `${ring.year}: ${ring.count} ${ring.count === 1 ? "entry" : "entries"}`;
            return (
              <a key={ring.year} href={`#${recordYearId(ring.year)}`} aria-label={name} className="record-ring">
                <title>{name}</title>
                <path
                  d={ring.d}
                  strokeWidth={0.9}
                  className={cn(yi % 2 ? "fill-(--wood-late)" : "fill-(--wood-early)", "stroke-(--wood-line)")}
                />
              </a>
            );
          })}
          <g aria-hidden="true" className="pointer-events-none">
            <circle cx={SLICE_CENTRE.x} cy={SLICE_CENTRE.y} r={4} className="fill-(--wood-line)" />
            {SLICE.dots.map((dot) => (
              <circle
                key={dot.entryId}
                cx={dot.x}
                cy={dot.y}
                r={dot.featured ? 5 : 3.4}
                strokeWidth={1.2}
                className={cn(DOT_FILL[dot.kind], "stroke-(--surface)")}
              />
            ))}
          </g>
        </svg>

        <svg
          aria-hidden="true"
          viewBox={`${PAGE_FRAME.x} ${PAGE_FRAME.y} ${PAGE_FRAME.width} ${PAGE_FRAME.height}`}
          className="pointer-events-none absolute inset-0 hidden size-full @min-[33rem]:block"
        >
          {SLICE.strings.map((s) => (
            <path key={s.entryId} d={s.d} fill="none" strokeWidth={1.2} className="stroke-(--twine)" />
          ))}
        </svg>

        <ul
          role="list"
          aria-label="Pressed: my best ones"
          className="mt-8 grid grid-cols-2 gap-x-3 gap-y-7 @min-[33rem]:contents"
        >
          {FEATURED.map((entry, i) => {
            const slot = CARD_SLOTS[i];
            return (
              <li
                key={entry.id}
                className={cn("record-card relative min-w-0 rotate-(--rot) @max-[33rem]:odd:last:col-span-2 @max-[33rem]:odd:last:w-[calc(50%-0.375rem)] @max-[33rem]:odd:last:justify-self-center", PLACE)}
                style={
                  {
                    "--rot": `${slot.rot}deg`,
                    "--l": pctX(slot.x),
                    "--t": pctY(slot.y),
                    "--w": pctW(CARD_WIDTH),
                  } as CSSProperties
                }
              >
                <a href={`#${journeyEntryAnchorId(entry.id)}`} className="group block">
                  <span className="record-tape" aria-hidden="true" style={{ "--tape-rot": `${-slot.rot * 2}deg` } as CSSProperties} />
                  <span className="block bg-surface px-3 pt-4 pb-3.5 paper-lift sm:px-3.5">
                    <span className="flex flex-wrap items-center justify-between gap-x-2 font-mono text-[length:var(--step--2)] text-fg-muted">
                      <span className="inline-flex items-center gap-1.5">
                        <KindDot kind={entry.type} />
                        {KIND_WORD[entry.type]}
                      </span>
                      <span>{startYear(entry)}</span>
                    </span>
                    <span className="mt-1 block font-display text-[length:var(--step-0)] font-semibold leading-tight text-fg group-hover:underline">
                      {entryTitle(entry)}
                    </span>
                    <span className="mt-1 block text-[length:var(--step--1)] leading-snug text-fg-muted">
                      {entry.organization}
                    </span>
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
