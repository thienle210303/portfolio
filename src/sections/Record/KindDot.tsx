import { cn } from "@/lib/cn";
import type { CareerEntryType } from "@/types/portfolio";

/** The Record's colour for each kind of entry: `--kind-*` in globals.css.
 *  Written out so Tailwind sees each class whole. */
export const KIND_FILL: Record<CareerEntryType, string> = {
  work: "bg-(--kind-work) rounded-full",
  learning: "bg-(--kind-learning) rounded-[1px]",
  milestone: "bg-(--kind-milestone) rotate-45 rounded-[1px]",
};

/** A kind's mark: a colour and a shape (circle, square, diamond), so the kind
 *  never rests on colour alone (WCAG 1.4.1). Decoration to a screen reader,
 *  which hears the kind in words instead. */
export function KindDot({ kind, className }: { readonly kind: CareerEntryType; readonly className?: string }) {
  return <span aria-hidden="true" className={cn("inline-block size-2", KIND_FILL[kind], className)} />;
}
