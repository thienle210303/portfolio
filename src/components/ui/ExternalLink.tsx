import type { AnchorHTMLAttributes, ReactNode } from "react";
import { VisuallyHidden } from "@/components/ui/VisuallyHidden";

interface ExternalLinkProps
  extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "target" | "rel"> {
  readonly href: string;
  readonly children: ReactNode;
}

/**
 * A link that always opens in a new tab: `target="_blank"` +
 * `rel="noopener noreferrer"`, plus a visually hidden "(opens in a new
 * tab)" notice so the behaviour is announced to assistive technology too
 * (SPEC §2 — never information by sight alone). `Button` reuses this
 * directly for its external-href case rather than duplicating the notice.
 *
 * The `{" "}` before `VisuallyHidden` is load-bearing, not decorative: an
 * accessible name is computed by walking sibling nodes and concatenating
 * each one's own contribution, and any leading/trailing whitespace *inside*
 * an element gets trimmed when that element's own contribution is computed
 * in isolation — a space at the start of VisuallyHidden's text does not
 * survive that. A separate text-node sibling does (verified against
 * dom-accessibility-api, the engine @testing-library and real screen
 * readers agree with): without it the computed name runs the two together
 * as e.g. "Visit(opens in a new tab)".
 */
export function ExternalLink({ href, children, ...rest }: ExternalLinkProps) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" {...rest}>
      {children}
      {" "}
      <VisuallyHidden>(opens in a new tab)</VisuallyHidden>
    </a>
  );
}

export default ExternalLink;
