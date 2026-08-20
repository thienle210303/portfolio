"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/cn";

interface CopyButtonProps {
  readonly value: string;
  readonly label: string;
  readonly copiedLabel?: string;
  readonly className?: string;
  /**
   * `"default"` (the original, unchanged) renders the full bordered pill with
   * its visible label. `"icon"` renders the same control at icon size —
   * for a spot where the label text has nowhere to go (see `BusinessCard`,
   * which sits the copy control on the same line as the email it copies).
   * The accessible name is never dropped: it moves to `aria-label`, tracking
   * the same idle/copied/failed states the visible label would have shown,
   * so a screen reader still hears "Copy email address" and then "Copied!"
   * — it just never renders as visible text. The `role="status"` live
   * region below still fires too, exactly as it does in the default variant.
   */
  readonly variant?: "default" | "icon";
}

type CopyState = "idle" | "copied" | "failed";

const RESET_DELAY_MS = 2000;
const FAILURE_MESSAGE = "Copy failed — select the text manually";

/**
 * Copies `value` to the clipboard on click. `navigator.clipboard` is only
 * ever touched inside the click handler (never during render), so this is
 * SSR-safe. The feature check + try/catch mean a failure is never reported
 * as a success. Feedback is announced through a `role="status"
 * aria-live="polite"` region and mirrored in the button's own visible
 * label, resetting to idle after ~2s.
 */
export function CopyButton({
  value,
  label,
  copiedLabel = "Copied",
  className,
  variant = "default",
}: CopyButtonProps) {
  const [state, setState] = useState<CopyState>("idle");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  async function handleClick() {
    const clipboard = typeof navigator === "undefined" ? undefined : navigator.clipboard;

    if (!clipboard || typeof clipboard.writeText !== "function") {
      setState("failed");
    } else {
      try {
        await clipboard.writeText(value);
        setState("copied");
      } catch {
        setState("failed");
      }
    }

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setState("idle"), RESET_DELAY_MS);
  }

  const visibleLabel = state === "copied" ? copiedLabel : state === "failed" ? "Copy failed" : label;
  const announcement = state === "copied" ? copiedLabel : state === "failed" ? FAILURE_MESSAGE : "";

  if (variant === "icon") {
    return (
      <span className="inline-flex items-center">
        <button
          type="button"
          onClick={handleClick}
          aria-label={visibleLabel}
          className={cn(
            "inline-flex min-h-11 min-w-11 items-center justify-center border border-[color:var(--rule-color)] p-2.5 text-[color:var(--fg-muted)] transition-colors duration-200 hover:border-[color:var(--fg)] hover:text-[color:var(--fg)]",
            className,
          )}
        >
          {state === "copied" ? (
            <Check aria-hidden="true" focusable="false" className="h-4 w-4" />
          ) : (
            <Copy aria-hidden="true" focusable="false" className="h-4 w-4" />
          )}
        </button>
        <span role="status" aria-live="polite" className="sr-only">
          {announcement}
        </span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center">
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          "inline-flex min-h-11 items-center gap-2 border border-[color:var(--rule-color)] px-4 py-2 font-mono text-[length:var(--step--1)] uppercase tracking-[0.05em] text-[color:var(--fg-muted)] transition-colors duration-200 hover:border-[color:var(--fg)] hover:text-[color:var(--fg)]",
          className,
        )}
      >
        {state === "copied" ? (
          <Check aria-hidden="true" focusable="false" className="h-3.5 w-3.5" />
        ) : (
          <Copy aria-hidden="true" focusable="false" className="h-3.5 w-3.5" />
        )}
        {visibleLabel}
      </button>
      <span role="status" aria-live="polite" className="sr-only">
        {announcement}
      </span>
    </span>
  );
}

export default CopyButton;
