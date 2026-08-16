"use client";

import { useRef, type KeyboardEvent } from "react";
import { cn } from "@/lib/cn";

export interface FilterOption {
  readonly id: string;
  readonly label: string;
  readonly count: number;
}

interface FilterGroupProps {
  readonly label: string;
  readonly options: readonly FilterOption[];
  readonly value: string;
  readonly onChange: (id: string) => void;
  readonly idPrefix: string;
  readonly className?: string;
}

/**
 * `role="radiogroup"` filter chips (SPEC §2): full arrow-key navigation
 * (wrapping at both ends), `aria-checked`, and each chip renders its own
 * result count in a <span> so selection is never colour-only — reinforced
 * further by a filled-vs-hollow dot that doesn't rely on colour either.
 *
 * This component only owns the chip selector; it has no visibility into
 * how many results the current selection actually matches, so announcing
 * the filtered result count via a polite live region (SPEC §2) is the
 * consuming section's responsibility — see Agent 1A's report.
 */
export function FilterGroup({ label, options, value, onChange, idPrefix, className }: FilterGroupProps) {
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  function focusAndSelect(index: number) {
    const option = options[index];
    if (!option) return;
    onChange(option.id);
    buttonRefs.current[index]?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        event.preventDefault();
        focusAndSelect((index + 1) % options.length);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        event.preventDefault();
        focusAndSelect((index - 1 + options.length) % options.length);
        break;
      case "Home":
        event.preventDefault();
        focusAndSelect(0);
        break;
      case "End":
        event.preventDefault();
        focusAndSelect(options.length - 1);
        break;
      default:
        break;
    }
  }

  return (
    <div role="radiogroup" aria-label={label} className={cn("flex flex-wrap gap-2", className)}>
      {options.map((option, index) => {
        const checked = option.id === value;
        return (
          <button
            key={option.id}
            ref={(node) => {
              buttonRefs.current[index] = node;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            id={`${idPrefix}-${option.id}`}
            tabIndex={checked ? 0 : -1}
            onClick={() => onChange(option.id)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={cn(
              "inline-flex min-h-11 items-center gap-2 border px-4 py-2 font-mono text-[length:var(--step--1)] uppercase tracking-[0.05em] transition-colors duration-200",
              checked
                ? "border-[color:var(--fg)] text-[color:var(--fg)]"
                : "border-[color:var(--rule-color)] text-[color:var(--fg-muted)] hover:border-[color:var(--fg-muted)] hover:text-[color:var(--fg)]",
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "h-1.5 w-1.5 shrink-0 rounded-full border",
                checked
                  ? "border-[color:var(--fg)] bg-[color:var(--fg)]"
                  : "border-[color:var(--fg-muted)] bg-transparent",
              )}
            />
            <span>{option.label}</span>
            <span className="text-[color:var(--fg-subtle)]">{option.count}</span>
          </button>
        );
      })}
    </div>
  );
}

export default FilterGroup;
