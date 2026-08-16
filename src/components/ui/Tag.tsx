import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface TagProps {
  readonly children: ReactNode;
  readonly className?: string;
}

/**
 * A small, non-interactive token — a technology, a stage, a category.
 *
 * Not uppercase, and no longer boxed. It is used about sixty times across the
 * lab, the résumé and the timeline, and almost every value is a proper noun:
 * "Playwright" is the way that word is spelled, "PLAYWRIGHT" is not. Sixty
 * hairline boxes was also the single densest source of rules on the page, so
 * the box gives way to a soft surface fill — still visibly a discrete token,
 * one line lighter each.
 *
 * Styled entirely through the semantic aliases, so it reads correctly in both
 * themes and in all three section tones without a branch.
 */
export function Tag({ children, className }: TagProps) {
  return (
    <span
      className={cn(
        "inline-flex min-h-[1.75rem] items-center gap-1 bg-[color:var(--surface)] px-2.5 py-1 font-mono text-[length:var(--step--1)] tracking-[0.01em] text-[color:var(--fg-muted)]",
        className,
      )}
    >
      {children}
    </span>
  );
}

export default Tag;
