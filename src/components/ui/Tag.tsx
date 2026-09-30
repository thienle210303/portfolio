import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface TagProps {
  readonly children: ReactNode;
  readonly className?: string;
}

/**
 * A small, non-interactive token — a technology, a stage, a category.
 *
 * Not uppercase, and not boxed: almost every value is a proper noun, and
 * "Playwright" is the way that word is spelled where "PLAYWRIGHT" is not. The
 * hairline box gave way to a soft surface fill — still visibly a discrete
 * token, one line lighter.
 *
 * It used to render about sixty times across the résumé, the timeline, the
 * case studies and the skills grid, which made it the densest source of
 * objects on the page. Those four consumers are now `.token-run` in
 * globals.css, which sets a technology list as one divided line instead of a
 * row of chips. What is left here is the case a run cannot serve: a lone
 * token with no neighbours — the timeline's "Work"/"Education" type label —
 * where there is nothing to divide and the value really is a discrete object.
 * One consumer is the honest count; do not reach for this for a list.
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
