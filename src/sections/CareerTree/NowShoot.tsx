import type { CSSProperties } from "react";
import { Drawing } from "@/components/scenery/Drawing";
import { ExternalLink } from "@/components/ui/ExternalLink";
import { now } from "@/content/portfolio";
import { cn } from "@/lib/cn";
import { NOW_ID, nowHeading } from "@/lib/now";

/**
 * Where each tag hangs from the shoot in the board's frame (from 1280), from
 * the trunk out to the tip: `x` is its string's x, `top` its top, `drop` the
 * string from the shoot to the tag's top. `shootSpots()` in
 * `scripts/draw-scenery.mjs` worked out once (`tests/sections/NowShoot.test.tsx`
 * holds them to it). Board units, like the highlight tags' (`TAG_SPOTS`).
 */
export const NOW_SPOTS = [
  { x: 868, top: -91, drop: 22.4, tilt: -2 },
  { x: 1018, top: -164, drop: 39.5, tilt: 1.5 },
  { x: 1168, top: -211, drop: 30.1, tilt: -1 },
  { x: 1318, top: -206, drop: 51.7, tilt: 2 },
] as const;

/** A tag is this many board units wide; its string is under its middle. */
export const NOW_TAG_W = 140;

/** The punched hole in its ring, as on `Tag`. */
function Hole({ className }: { readonly className?: string }) {
  return (
    <span aria-hidden="true" data-now-hole="" className={className}>
      <span className="absolute top-[5px] left-1/2 size-[22px] -translate-x-1/2 rounded-full bg-[color-mix(in_srgb,var(--twine)_14%,var(--surface))] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--twine)_45%,transparent)]" />
      <span className="absolute top-[10px] left-1/2 size-3 -translate-x-1/2 rounded-full bg-(--hole) shadow-[inset_0_0_0_1.5px_var(--twine)]" />
    </span>
  );
}

/**
 * What I am doing now (round 26): new growth on the oak, its tags with no
 * figure on them, because nothing there is measured yet (the caption says
 * so). The field tag's status links here (`#now`).
 *
 * One DOM, three compositions (globals.css, "Journey: new growth"):
 *  - from 1280 a young shoot (`oak-shoot`, painted by --scene-moss) grows on
 *    from the tip of a limb up into the sky beside the title, and each item is
 *    a small tag of its own on a string from it, placed in board units; the
 *    board's frame moves down to make the room;
 *  - below 1280 the four share one tag, hung like a highlight tag from a green
 *    bough of its own at the top of the trunk, above the DoorDash ticket.
 * It sits in `HangingTags`, before the highlights' list, so the trunk runs on
 * past it. Nothing here places anything: the classes below are type and
 * colour only.
 */
export default function NowShoot() {
  return (
    <div data-now="" id={NOW_ID}>
      <span aria-hidden="true" data-shoot="" className="no-print pointer-events-none">
        <Drawing name="oak-shoot" className="absolute inset-0 text-[color:var(--scene-moss)]" />
      </span>
      <span aria-hidden="true" data-now-bough="" className="no-print pointer-events-none">
        <Drawing name="oak-bough" className="absolute inset-0 text-[color:var(--scene-moss)] [mask-size:100%_100%]" />
        <Drawing name="oak-bough-leaves" className="absolute inset-0 text-accent [mask-size:100%_100%]" />
      </span>
      <div data-now-paper="">
        <Hole />
        <div data-now-head="">
          <h3 className="font-mono text-[length:var(--step--2)] font-bold tracking-(--tracking-caps) text-fg-muted uppercase">
            {nowHeading()}
          </h3>
          <p className="font-serif text-[length:var(--step-0)] italic text-fg-muted">{now.note}</p>
        </div>
        <ul role="list" aria-label={now.label}>
          {now.items.map((item, i) => {
            const spot = NOW_SPOTS[i];
            return (
              <li
                key={item.id}
                style={
                  spot
                    ? ({
                        "--x": spot.x - NOW_TAG_W / 2,
                        "--y": spot.top,
                        "--w": NOW_TAG_W,
                        "--drop": spot.drop,
                        "--tilt": `${spot.tilt}deg`,
                      } as CSSProperties)
                    : undefined
                }
              >
                <div data-now-tag="" data-paper="">
                  <Hole />
                  <p data-now-title="">
                    <span className="font-semibold">{item.name}</span>
                    <span className="font-mono text-[length:var(--step--2)] font-bold tracking-(--tracking-caps) text-fg-muted uppercase">
                      {item.status}
                    </span>
                  </p>
                  <p className={cn("text-[length:var(--step--1)] leading-snug text-fg-muted")}>{item.line}</p>
                  {item.link ? (
                    <ExternalLink href={item.link.href} data-now-link="" className="text-[length:var(--step--1)] text-accent underline underline-offset-3">
                      {item.link.label}
                      <span aria-hidden="true"> ↗</span>
                    </ExternalLink>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
