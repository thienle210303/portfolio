import type { ElementType, ReactNode } from "react";

interface VisuallyHiddenProps {
  readonly children: ReactNode;
  /** Element to render as. Defaults to `span`; pass `"p"` for block content
   * such as CodeBlock's hidden summary. */
  readonly as?: ElementType;
  readonly id?: string;
  readonly className?: string;
}

/** Renders content that is present for assistive technology only, via the
 * standard clip-rect `.sr-only` technique (defined in globals.css). */
export function VisuallyHidden({ children, as: Component = "span", id, className }: VisuallyHiddenProps) {
  return (
    <Component id={id} className={className ? `sr-only ${className}` : "sr-only"}>
      {children}
    </Component>
  );
}
