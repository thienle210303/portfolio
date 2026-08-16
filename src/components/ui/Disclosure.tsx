"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import { VisuallyHidden } from "@/components/ui/VisuallyHidden";

interface DisclosureProps {
  readonly id: string;
  readonly summary: ReactNode;
  readonly children: ReactNode;
  readonly defaultOpen?: boolean;
  /** Hidden text appended to the trigger's accessible name while collapsed. */
  readonly expandLabel?: string;
  /** Hidden text appended to the trigger's accessible name while expanded. */
  readonly collapseLabel?: string;
  readonly className?: string;
}

/**
 * Accessible expand/collapse (SPEC §2): a `<button aria-expanded
 * aria-controls>` plus a region, animated with the CSS grid-rows 0fr→1fr
 * technique so it can transition to an intrinsic height without JS
 * measuring anything.
 *
 * `grid-template-rows: 0fr` + `overflow-hidden` alone only clips content
 * *visually* — the children stay in the DOM, in the accessibility tree,
 * and reachable by Tab (SPEC §2 requires "in the DOM only when expanded,
 * or properly hidden" — clipped-but-present satisfies neither). A
 * collapsed case study with a focusable region inside it — e.g. a
 * CodeBlock's `<pre tabIndex={0}>` or a scrollable table — would leave a
 * keyboard user's focus stranded off-screen with nothing visible.
 *
 * The inner wrapper below fixes this with `visibility`, which removes the
 * subtree from both the tab order and the accessibility tree while
 * `grid-template-rows` still handles the actual height animation (so nothing
 * regresses to a fixed height or a hard jump). Its flip is asymmetric on
 * purpose: opening sets `visible` with zero delay, so content is reachable
 * the instant it starts growing into view; closing sets `invisible` with a
 * delay equal to the collapse duration, so nothing is torn out of view
 * mid-transition — it only leaves the tab order once it has actually
 * finished shrinking to nothing. That delay (`delay-200`) must stay equal
 * to the grid-rows transition's `duration-200` below, or the two will fall
 * out of sync. Under `prefers-reduced-motion`, globals.css forces both
 * `transition-duration` and `transition-delay` to ~0 `!important`, so the
 * height collapse and the visibility flip become instantaneous together
 * instead of leaving a lingering reachable-but-invisible window.
 *
 * The region carries `data-print-expand` so the print stylesheet can force
 * it fully open — including restoring `visibility: visible` on this inner
 * wrapper — regardless of on-screen state (globals.css `@media print`).
 */
export function Disclosure({
  id,
  summary,
  children,
  defaultOpen = false,
  expandLabel = "Read more",
  collapseLabel = "Show less",
  className,
}: DisclosureProps) {
  const [open, setOpen] = useState(defaultOpen);
  const triggerId = `${id}-trigger`;
  const panelId = `${id}-panel`;

  return (
    <div className={className}>
      <button
        type="button"
        id={triggerId}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="flex min-h-11 w-full items-center justify-between gap-4 py-2 text-left text-[color:var(--fg)]"
      >
        <span>{summary}</span>
        <ChevronDown
          aria-hidden="true"
          focusable="false"
          className={cn("h-4 w-4 shrink-0 transition-transform duration-200", open && "rotate-180")}
        />
        <VisuallyHidden>{open ? collapseLabel : expandLabel}</VisuallyHidden>
      </button>
      <div
        id={panelId}
        role="region"
        aria-labelledby={triggerId}
        data-print-expand=""
        className="grid transition-[grid-template-rows] duration-200 ease-out"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div
          className={cn(
            "overflow-hidden transition-[visibility] duration-0",
            open ? "visible delay-0" : "invisible delay-200",
          )}
        >
          <div className="pt-2">{children}</div>
        </div>
      </div>
    </div>
  );
}

export default Disclosure;
