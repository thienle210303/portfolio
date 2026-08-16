import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface TagProps {
  readonly children: ReactNode;
  readonly className?: string;
}

/** A small, non-interactive mono/uppercase chip with a hairline border.
 * Tone-adaptive (uses the semantic aliases) so it reads correctly on both
 * dark and `.on-light` sections. */
export function Tag({ children, className }: TagProps) {
  return (
    <span
      className={cn(
        "inline-flex min-h-[1.75rem] items-center gap-1 border border-[color:var(--rule-color)] px-2.5 py-1 font-mono text-[length:var(--step--1)] uppercase tracking-[0.08em] text-[color:var(--fg-muted)]",
        className,
      )}
    >
      {children}
    </span>
  );
}

export default Tag;
