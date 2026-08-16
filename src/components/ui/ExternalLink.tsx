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
 */
export function ExternalLink({ href, children, ...rest }: ExternalLinkProps) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" {...rest}>
      {children}
      <VisuallyHidden> (opens in a new tab)</VisuallyHidden>
    </a>
  );
}
