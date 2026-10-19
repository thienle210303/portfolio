import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Tag paper: cut corners and a punched hole. Put focusable things inside or
 * around it, never on it — the clip would cut their focus ring.
 */
export function Tag({ children, className }: { readonly children: ReactNode; readonly className?: string }) {
  return (
    <div className={cn("tag-cut relative bg-surface text-fg", className)}>
      <span
        aria-hidden="true"
        className="absolute top-3 left-1/2 size-3 -translate-x-1/2 rounded-full bg-ground shadow-[inset_0_0_0_1.5px_var(--twine)]"
      />
      {children}
    </div>
  );
}
