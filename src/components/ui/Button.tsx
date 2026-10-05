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
  /**
   * Arbitrary `data-*` attributes pass straight through to the rendered
   * `<a>`/`<button>` (or `<ExternalLink>`'s own `<a>`) unchanged — for DOM
   * hooks a section needs (analytics, CSS attribute selectors, a
   * cross-section querying contract) that have nothing to do with how
   * Button itself behaves. This is deliberately narrow: it only ever
   * matches literal `data-*` keys, so a real typo like `varaint` is still
   * rejected. Anything Button itself needs to reason about — anything that
   * changes what gets rendered — belongs in a real, named prop instead,
   * not a data attribute read back out of the DOM.
   */
  readonly [key: `data-${string}`]: string | number | boolean | undefined;
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
  "relative inline-flex min-h-11 items-center gap-2 border font-sans font-medium transition-colors duration-200 disabled:pointer-events-none disabled:opacity-50";

/*
 * The mechanical press (Workstream 3, P3): every *boxed* variant gets
 * `active:translate-y-px`, a 1px, un-eased nudge on click that reads as the
 * button actually depressing rather than merely changing colour. `quiet` is
 * deliberately excluded — see its own comment above, it is "a link wearing
 * a button's tap target," and a link doesn't get pressed. `relative` on
 * `BASE_CLASSES` above is shared plumbing for `primary`'s etched keyline
 * below, harmless on the other two variants since neither positions a child
 * off it.
 */
const PRESS_CLASSES = "active:translate-y-px";

/*
 * Padding and centring are split by whether the variant draws a box, because
 * `cn` is a plain string joiner with no tailwind-merge: emitting `px-6` and
 * `px-0` together would leave the winner to stylesheet order rather than to
 * the call site. Nothing conflicting is ever emitted instead.
 *
 * `quiet` gets no inline padding and no `justify-center` on purpose. It is a
 * link wearing a button's tap target, and it is usually stacked under real
 * buttons — so its text has to sit on the same left margin as the heading and
 * body copy above it. With the boxed padding it sat ~25px inboard of every
 * other element in the column, which read as a broken indent rather than as a
 * tertiary action.
 */
const SIZE_CLASSES: Record<ButtonSize, string> = {
  md: "justify-center px-6 py-2.5 text-[length:var(--step-0)]",
  sm: "justify-center px-4 py-2 text-[length:var(--step--1)]",
};

const QUIET_SIZE_CLASSES: Record<ButtonSize, string> = {
  md: "py-2.5 text-[length:var(--step-0)]",
  sm: "py-2 text-[length:var(--step--1)]",
};

// Colours are drawn from the semantic aliases (never the raw --color-* tokens)
// so every variant stays legible in either theme and in any of the three
// section tones, with no per-tone branch here.
//
// `primary` fills with --accent rather than --fg. That is the one place the
// blue is allowed to carry a whole element, and it is what makes the single
// most important control on each screen the only saturated thing on it.
// --fg-inverse is its partner on purpose: the pair clears 7:1 in both themes,
// where a hardcoded white would fail against night's lighter accent.
// `primary` additionally carries the etched inner keyline (Workstream 3,
// P3) — the one rich hover this site allows itself, reserved for the single
// primary control per screen. `after:inset-[3px]` sits inside the fill, not
// on its edge, so it reads as a mark pressed into the surface rather than a
// second border racing the element's own; invisible at rest, never past 40%
// on hover. SiteHeader's "Let's talk" and ContactForm's send button carry the
// identical recipe by hand, since neither renders through this component.
const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "border-[color:var(--accent)] bg-[color:var(--accent)] text-[color:var(--fg-inverse)] after:pointer-events-none after:absolute after:inset-[3px] after:border after:border-current after:opacity-0 after:transition-opacity after:duration-150 hover:border-[color:var(--accent-strong)] hover:bg-[color:var(--accent-strong)] hover:text-[color:var(--ground)] hover:after:opacity-40",
  secondary:
    "border-[color:var(--rule-color)] bg-transparent text-[color:var(--fg)] hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]",
  quiet:
    "border-transparent bg-transparent text-[color:var(--fg)] underline-offset-4 hover:text-[color:var(--accent)] hover:underline focus-visible:underline",
};

/** Renders `<a>` or `<button>` depending on whether `href` is supplied.
 * External hrefs (starting with `http`) route through `ExternalLink` so the
 * new-tab behaviour and notice are never duplicated. All variants/sizes
 * meet the 44px minimum tap target. */
export function Button(props: ButtonProps) {
  const { children, variant = "primary", size = "md", className, ...rest } = props;
  const sizeClasses = variant === "quiet" ? QUIET_SIZE_CLASSES[size] : SIZE_CLASSES[size];
  const classes = cn(
    BASE_CLASSES,
    sizeClasses,
    VARIANT_CLASSES[variant],
    variant !== "quiet" && PRESS_CLASSES,
    className,
  );

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

export default Button;
