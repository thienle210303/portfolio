"use client";

import { useId } from "react";
import { cn } from "@/lib/cn";
import type { ContactIntent } from "@/types/portfolio";

/**
 * The four `contactIntents` as a real radio group. Deliberately built from
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
 *
 * Each radio is named by its label alone and described by its description,
 * rather than named by the whole wrapping `<label>`'s text. A screen reader
 * then announces "I have a career opportunity, radio button" first and the
 * longer line after it, instead of running both together as one name.
 *
 * Choosing is how the form starts: there is no draft, no field and no send
 * button until one is chosen (see ContactForm). The section's lead already
 * says what choosing does, so the legend only asks the question.
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
  const idPrefix = useId();
  return (
    <fieldset className="m-0 border-0 p-0">
      <legend id={legendId} className="mb-4 text-[length:var(--step-0)] font-medium text-fg">
        What brings you here?
      </legend>
      <div className="grid gap-3 sm:grid-cols-2">
        {intents.map((intent) => {
          const checked = intent.id === selectedId;
          const labelId = `${idPrefix}-${intent.id}-label`;
          const descriptionId = `${idPrefix}-${intent.id}-description`;
          return (
            <label
              key={intent.id}
              className={cn(
                "flex min-h-11 cursor-pointer flex-col gap-1.5 border p-4 transition-colors duration-150",
                checked ? "border-fg bg-surface" : "border-rule hover:border-fg-muted"
              )}
            >
              <span className="flex items-center gap-3">
                <input
                  type="radio"
                  name={groupName}
                  value={intent.id}
                  checked={checked}
                  onChange={() => onSelect(intent)}
                  aria-labelledby={labelId}
                  aria-describedby={descriptionId}
                  className="h-4 w-4 shrink-0 accent-[color:var(--accent)]"
                />
                <span id={labelId} className="text-[length:var(--step-0)] font-medium text-fg">
                  {intent.label}
                </span>
              </span>
              <span id={descriptionId} className="pl-7 text-[length:var(--step--1)] text-fg-muted">
                {intent.description}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
