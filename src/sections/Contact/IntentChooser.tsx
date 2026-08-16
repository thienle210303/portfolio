"use client";

import { cn } from "@/lib/cn";
import type { ContactIntent } from "@/types/portfolio";

/**
 * The five `contactIntents` as a real radio group. Deliberately built from
 * native `<input type="radio">` elements inside a `<fieldset>` rather than a
 * hand-rolled `role="radiogroup"` of `<div>`s: native radios already give us
 * correct arrow-key navigation, roving focus and screen-reader semantics for
 * free, satisfying SPEC.md's "a real fieldset + radio inputs" allowance
 * without reimplementing what the browser already does correctly.
 *
 * The input stays visible (not clipped off-screen) specifically so its own
 * native focus ring is never reduced to something too small to see —
 * clipping it would technically keep it in the tab order while defeating
 * "visibly focusable". The whole label is still the effective ≥44px tap
 * target, since a native label click/tap anywhere within it toggles the
 * input it wraps.
 */

interface IntentChooserProps {
  legendId: string;
  groupName: string;
  intents: readonly ContactIntent[];
  selectedId: string | null;
  onSelect: (intent: ContactIntent) => void;
}

export default function IntentChooser({
  legendId,
  groupName,
  intents,
  selectedId,
  onSelect,
}: IntentChooserProps) {
  return (
    <fieldset className="m-0 border-0 p-0">
      <legend id={legendId} className="mb-4 text-[length:var(--step-0)] font-medium text-paper">
        What brings you here? <span className="font-normal text-silver">(optional starting point)</span>
      </legend>
      <div className="grid gap-3 sm:grid-cols-2">
        {intents.map((intent) => {
          const checked = intent.id === selectedId;
          return (
            <label
              key={intent.id}
              className={cn(
                "flex min-h-11 cursor-pointer flex-col gap-1.5 border p-4 transition-colors duration-150",
                checked ? "border-paper bg-surface" : "border-hairline hover:border-muted"
              )}
            >
              <span className="flex items-center gap-3">
                <input
                  type="radio"
                  name={groupName}
                  value={intent.id}
                  checked={checked}
                  onChange={() => onSelect(intent)}
                  className="h-4 w-4 shrink-0 accent-paper"
                />
                <span className="text-[length:var(--step-0)] font-medium text-paper">{intent.label}</span>
              </span>
              <span className="pl-7 text-[length:var(--step--1)] text-muted">{intent.description}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
