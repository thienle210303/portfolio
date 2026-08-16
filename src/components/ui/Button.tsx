import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { ExternalLink } from "@/components/ui/ExternalLink";

type ButtonVariant = "primary" | "secondary" | "quiet";
type ButtonSize = "md" | "sm";

interface ButtonSharedProps {
  readonly children: ReactNode;
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
  readonly className?: string;
}

interface ButtonAsLinkProps
  extends ButtonSharedProps,
    Omit<
      AnchorHTMLAttributes<HTMLAnchorElement>,
      "className" | "children" | "href" | "target" | "rel"
    > {
  readonly href: string;
}

interface ButtonAsButtonProps
  extends ButtonSharedProps,
    Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children" | "href" | "type"> {
  readonly href?: undefined;
  readonly type?: "button" | "submit" | "reset";
}

/** Discriminated union on `href`: pass `href` for a link, omit it for a
 * `<button>`. */
export type ButtonProps = ButtonAsLinkProps | ButtonAsButtonProps;

const BASE_CLASSES =
  "inline-flex min-h-11 items-center justify-center gap-2 border font-sans font-medium transition-colors duration-200 disabled:pointer-events-none disabled:opacity-50";

const SIZE_CLASSES: Record<ButtonSize, string> = {
  md: "px-6 py-2.5 text-[length:var(--step-0)]",
  sm: "px-4 py-2 text-[length:var(--step--1)]",
};

// Colours are drawn from the semantic aliases (not the raw --color-*
// tokens) so every variant stays legible regardless of which section tone
// (`ink`, `charcoal`, or `.on-light` `paper`) the button is placed in.
const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "border-[color:var(--fg)] bg-[color:var(--fg)] text-[color:var(--fg-inverse)] hover:bg-transparent hover:text-[color:var(--fg)]",
  secondary:
    "border-[color:var(--rule-color)] bg-transparent text-[color:var(--fg)] hover:border-[color:var(--fg)]",
  quiet:
    "border-transparent bg-transparent px-1 text-[color:var(--fg)] underline-offset-4 hover:underline focus-visible:underline",
};

/** Renders `<a>` or `<button>` depending on whether `href` is supplied.
 * External hrefs (starting with `http`) route through `ExternalLink` so the
 * new-tab behaviour and notice are never duplicated. All variants/sizes
 * meet the 44px minimum tap target. */
export function Button(props: ButtonProps) {
  const { children, variant = "primary", size = "md", className, ...rest } = props;
  const classes = cn(BASE_CLASSES, SIZE_CLASSES[size], VARIANT_CLASSES[variant], className);

  if (rest.href !== undefined) {
    const { href, ...anchorRest } = rest;
    const isExternal = href.startsWith("http");

    if (isExternal) {
      return (
        <ExternalLink href={href} className={classes} {...anchorRest}>
          {children}
        </ExternalLink>
      );
    }

    return (
      <a href={href} className={classes} {...anchorRest}>
        {children}
      </a>
    );
  }

  const { type, ...buttonRest } = rest;

  return (
    <button type={type ?? "button"} className={classes} {...buttonRest}>
      {children}
    </button>
  );
}
