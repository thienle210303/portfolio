import type { CSSProperties, ReactNode } from "react";

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
}

/**
 * The <h2> pattern used by every section except the hero (the hero owns
 * the page's single <h1> directly and must not use this component).
 * Display serif at --step-4, with an optional lead paragraph in the muted
 * tone at --step-1.
 *
 * `text-balance` on the h2 (Workstream 3, P4) rather than the newer
 * `text-wrap: pretty` this file's sibling paragraphs get by default — a
 * short display headline reads better with every line carrying roughly
 * equal visual weight than with just its last line kept from being a lone
 * orphan word, which is what `pretty` optimises for instead.
 */
export function SectionHeading({ id, children, lead, reveal = true }: SectionHeadingProps) {
  return (
    <>
      <h2
        id={id}
        className="max-w-[74ch] text-balance font-display text-[length:var(--step-4)] leading-[1.05] tracking-(--tracking-display) text-[color:var(--fg)]"
        {...(reveal ? { "data-ink": "" } : {})}
        style={reveal ? ({ "--ink-delay": "60ms" } as CSSProperties) : undefined}
      >
        {children}
      </h2>
      {lead ? (
        <p
          className="prose-measure mt-4 text-[length:var(--step-1)] leading-relaxed text-[color:var(--fg-muted)]"
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
