import type { CSSProperties } from "react";
import { cn } from "@/lib/cn";

export const INK_DRAWINGS = [
  "bamboo",
  "bamboo-phone",
  "pine",
  "rice-field",
  "ripples",
  "buffalo",
  "tag-rice",
  "tag-pine",
  "tag-palmetto",
  "tag-laptop",
  "oak",
  "oak-leaves",
  "oak-moss",
  "oak-trunk",
  "oak-trunk-leaves",
  "oak-trunk-moss",
  "oak-roots",
  "oak-bough",
  "oak-bough-leaves",
  "journey-rice",
  // Contact
  "postmark",
  // Record
  "stamp-bank",
  "stamp-card",
  "stamp-code",
  "stamp-cart",
  "diary-selftaught",
  "diary-cap",
  "diary-podium",
] as const;
export type InkDrawing = (typeof INK_DRAWINGS)[number];

/** Drawings that keep their own colours. */
export const ART_DRAWINGS = [
  "non-la",
  // Contact
  "lanterns-day",
  "lanterns-night",
  "postcard-scene",
  "flag-stamp",
  "pho",
  "bia",
  "banh-tet",
  "paper-clip",
  // Record
  "pressed-lotus",
] as const;
export type ArtDrawing = (typeof ART_DRAWINGS)[number];

const ART: ReadonlySet<string> = new Set(ART_DRAWINGS);

/**
 * A committed scenery SVG from `public/scenery/`. Ink drawings are masks
 * coloured by the caller's `text-*` class; art drawings keep their own colours.
 */
export function Drawing({
  name,
  className,
}: {
  readonly name: InkDrawing | ArtDrawing;
  readonly className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      data-scenery={name}
      className={cn(ART.has(name) ? "scene-art" : "scene-ink", "block", className)}
      style={{ "--art": `url(/scenery/${name}.svg)` } as CSSProperties}
    />
  );
}
