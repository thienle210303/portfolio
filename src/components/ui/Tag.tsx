import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Tag paper: cut corners and a punched hole in a reinforcing ring, as on a
 * real shipping tag (round 22: the plain hole read as a sticker). Never put the paper on a
 * focusable element. A focusable inside it keeps its whole ring (2px + 3px
 * offset) only if it sits at least 5px from every edge and below the 22px
 * corner cut.
 */
export function Tag({ children, className }: { readonly children: ReactNode; readonly className?: string }) {
  return (
    <div className={cn("tag-cut relative bg-surface text-fg", className)}>
      <span
        aria-hidden="true"
        className="absolute top-[5px] left-1/2 size-[26px] -translate-x-1/2 rounded-full bg-[color-mix(in_srgb,var(--twine)_14%,var(--surface))] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--twine)_45%,transparent)]"
      />
      <span
        aria-hidden="true"
        className="absolute top-3 left-1/2 size-3 -translate-x-1/2 rounded-full bg-(--hole) shadow-[inset_0_0_0_1.5px_var(--twine)]"
      />
      {children}
    </div>
  );
}
