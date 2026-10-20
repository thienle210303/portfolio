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
  "oak-branch",
  "oak-branch-moss",
  "journey-rice",
] as const;
export type InkDrawing = (typeof INK_DRAWINGS)[number];

/**
 * A committed scenery SVG from `public/scenery/`. Ink drawings are masks
 * coloured by the caller's `text-*` class; `non-la` keeps its own colours.
 */
export function Drawing({
  name,
  className,
}: {
  readonly name: InkDrawing | "non-la";
  readonly className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      data-scenery={name}
      className={cn(name === "non-la" ? "scene-art" : "scene-ink", "block", className)}
      style={{ "--art": `url(/scenery/${name}.svg)` } as CSSProperties}
    />
  );
}
