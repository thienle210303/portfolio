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
 * measuring anything. The transition is neutralised globally under
 * `prefers-reduced-motion` (globals.css), so nothing extra is needed here
 * for that.
 *
 * The region carries `data-print-expand` so the print stylesheet can force
 * it fully open regardless of on-screen state (globals.css `@media print`).
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
        <div className="overflow-hidden">
          <div className="pt-2">{children}</div>
        </div>
      </div>
    </div>
  );
}
