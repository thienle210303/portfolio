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
   * for a spot where the label text has nowhere to go — but keeps the
   * *visible* box itself at the full `min-h-11 min-w-11` (44px): the box
   * you see is the box you can click.
   *
   * `"compact"` is the density unlock referenced in round 4's feedback
   * note (docs/feedback-tracker.md): a visually smaller box (32px, `h-8
   * w-8`) with the accessible tap target still extended to 44px, via the
   * standard invisible-pseudo-element trick rather than by growing the
   * box itself. `::before` is absolutely positioned (out of flow, so it
   * costs the surrounding layout nothing) with an exact `-inset-[7px]` on
   * every side — see the inline comment where it's used for why 7px, not
   * the 6px "32+6+6=44" arithmetic would suggest at a glance — and it
   * renders with no border, fill or content: a pointer landing anywhere in
   * that halo still hits the button, but nothing about the card's flow or
   * spacing changes and nothing new is visible on screen. See
   * `BusinessCard`, the only current caller, for why the visual footprint
   * mattered enough to earn this.
   *
   * Both non-default variants sit the copy control where the label text
   * has nowhere to go. The accessible name is never dropped in either: it
   * moves to `aria-label`, tracking the same idle/copied/failed states the
   * visible label would have shown, so a screen reader still hears "Copy
   * email address" and then "Copied!" — it just never renders as visible
   * text. The `role="status"` live region below still fires too, exactly
   * as it does in the default variant.
   */
  readonly variant?: "default" | "icon" | "compact";
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
        // D3: a neutral event the companion listens for to cheer — nothing
        // here knows or cares that a cat is watching. See Companion.tsx.
        window.dispatchEvent(new CustomEvent("portfolio:copied"));
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
            "inline-flex min-h-11 min-w-11 items-center justify-center border border-[color:var(--rule-color)] p-2.5 text-[color:var(--fg-muted)] transition-colors duration-200 hover:border-[color:var(--fg)] hover:text-[color:var(--fg)] active:translate-y-px",
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

  if (variant === "compact") {
    return (
      <span className="inline-flex items-center">
        <button
          type="button"
          onClick={handleClick}
          aria-label={visibleLabel}
          className={cn(
            // 32px visible box (border-box, so the 1px border eats into it
            // on every side); the `::before` grows only the *hit area* to
            // 44px, out of flow, so the box you see never matches the box
            // you can click — see the `variant` doc comment above. Its
            // containing block is this button's *padding* box, per the CSS
            // spec for an absolutely-positioned child of a `position:
            // relative` ancestor — border-box sizing means that's 30px
            // (32px − 1px border × 2 sides), not the full 32px, so an inset
            // that reads "-6px a side" in the Tailwind spacing scale
            // (`-inset-1.5`) would only reach 30+6+6 = 42px, two short of
            // the target. `-inset-[7px]` is written as an exact pixel value
            // for exactly that reason: 30 + 7 + 7 = 44px, measured, not
            // assumed from the scale name.
            "relative inline-flex h-8 w-8 items-center justify-center border border-[color:var(--rule-color)] text-[color:var(--fg-muted)] transition-colors duration-200 before:absolute before:-inset-[7px] before:content-[''] hover:border-[color:var(--fg)] hover:text-[color:var(--fg)] active:translate-y-px",
            className,
          )}
        >
          {state === "copied" ? (
            <Check aria-hidden="true" focusable="false" className="h-3.5 w-3.5" />
          ) : (
            <Copy aria-hidden="true" focusable="false" className="h-3.5 w-3.5" />
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
          "inline-flex min-h-11 items-center gap-2 border border-[color:var(--rule-color)] px-4 py-2 font-mono text-[length:var(--step--1)] uppercase tracking-[0.05em] text-[color:var(--fg-muted)] transition-colors duration-200 hover:border-[color:var(--fg)] hover:text-[color:var(--fg)] active:translate-y-px",
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
