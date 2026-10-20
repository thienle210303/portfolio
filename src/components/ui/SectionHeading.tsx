import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/cn";

interface SectionHeadingProps {
  /** Must match the `labelledBy` id passed to the enclosing <Section>. */
  readonly id: string;
  readonly children: ReactNode;
  readonly lead?: ReactNode;
  /**
   * Mirrors the enclosing `<Section>`'s own `reveal` prop (default `true`):
   * this component renders the h2/lead half of that section's four-part
   * ink settle (eyebrow/h2/lead/rail — see Section.tsx's own comment), and
   * has no way to see its parent's prop, so the caller passes it straight
   * through. Every non-hero `<Section>` on the page defaults to `reveal`
   * on, so every caller of this component can safely leave this alone too;
   * it exists only for the rare case a future section opts out.
   */
  readonly reveal?: boolean;
  /** `"chapter"`: the Journey's board-sized title (`--step-chapter`). */
  readonly size?: "section" | "chapter";
}

/**
 * The <h2> pattern used by every section except the hero (the hero owns
 * the page's single <h1> directly and must not use this component).
 * Display type (Bricolage 600) at --step-3 (24–28px, round 20 spec §2), or at
 * --step-chapter (32–56px) for the Journey's board-sized title, with
 * an optional lead paragraph in the muted tone at --step-1.
 *
 * `text-balance` on the h2 (Workstream 3, P4) rather than the newer
 * `text-wrap: pretty` this file's sibling paragraphs get by default — a
 * short display headline reads better with every line carrying roughly
 * equal visual weight than with just its last line kept from being a lone
 * orphan word, which is what `pretty` optimises for instead.
 */
export function SectionHeading({ id, children, lead, reveal = true, size = "section" }: SectionHeadingProps) {
  return (
    <>
      <h2
        id={id}
        className={cn(
          "max-w-[74ch] text-balance font-display font-semibold tracking-(--tracking-display) text-[color:var(--fg)]",
          size === "chapter"
            ? "text-[length:var(--step-chapter)] leading-[1.05]"
            : "text-[length:var(--step-3)] leading-[1.15]",
        )}
        {...(reveal ? { "data-ink": "" } : {})}
        style={reveal ? ({ "--ink-delay": "60ms" } as CSSProperties) : undefined}
      >
        {children}
      </h2>
      {lead ? (
        <p
          className={cn(
            "prose-measure mt-4 text-[length:var(--step-1)] leading-relaxed text-[color:var(--fg-muted)]",
            // The board sets the Journey's line on one row above the crown.
            size === "chapter" && "xl:max-w-none",
          )}
          {...(reveal ? { "data-ink": "" } : {})}
          style={reveal ? ({ "--ink-delay": "120ms" } as CSSProperties) : undefined}
        >
          {lead}
        </p>
      ) : null}
    </>
  );
}

export default SectionHeading;
