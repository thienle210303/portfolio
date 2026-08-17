import { ArrowUpRight } from "lucide-react";
import { profile, socialLinks } from "@/content/portfolio";
import CopyButton from "@/components/ui/CopyButton";
import ExternalLink from "@/components/ui/ExternalLink";
import { cn } from "@/lib/cn";

/**
 * One elegant panel that reads as a real business card rendered in the
 * site's own blueprint style — the right-hand pane of Contact's two-pane
 * composition at >=1024px (see Contact.tsx), and the block that folds in
 * what used to be QuickConnect's three separate link cards.
 *
 * Content, top to bottom, is exactly the order Thien's round-3 feedback
 * asked for: the name in the display serif, the title as a mono eyebrow,
 * the philosophy line in italic, then a ruled block of ways to reach him.
 * Every value comes straight from `profile` / `socialLinks` — nothing here
 * is retyped, so the card can never drift from the facts stated elsewhere
 * on the page.
 *
 * The one flourish is the monogram: `profile.monogram` set very large,
 * very quiet (5% opacity) and bled off the top-right corner behind the
 * text. It is `aria-hidden` and purely decorative — the real monogram
 * already lives in the header and the favicon — so this is a watermark,
 * not a second source of identity. Restraint on purpose: a premium card
 * earns its one gesture and stays typographic everywhere else, which is
 * also why the GitHub/LinkedIn rows below carry no icons (QuickConnect's
 * old cards did; a card in your hand doesn't).
 *
 * Colour stays inside the semantic aliases throughout, so the card reads
 * correctly in both themes and keeps working if `tone="deep"` on Contact
 * ever changes — nothing here is a raw `--color-*` token or a hex literal.
 *
 * Deliberately NOT wrapped in `.no-print` by its caller: unlike the two
 * forms beside it, this card is pure identity with nothing that only makes
 * sense on screen, so it is one of the few things in Contact worth handing
 * someone on paper.
 */

interface BusinessCardProps {
  readonly className?: string;
}

const ROW_CLASS =
  "group flex min-h-11 items-center justify-between gap-3 py-4 text-fg transition-colors duration-200";

export default function BusinessCard({ className }: BusinessCardProps) {
  const github = socialLinks.find((link) => link.platform === "GitHub");
  const linkedin = socialLinks.find((link) => link.platform === "LinkedIn");

  return (
    <aside
      aria-label={`${profile.name} — business card`}
      className={cn(
        "relative overflow-hidden border border-rule bg-surface p-8 sm:p-10",
        className,
      )}
    >
      {/* The one flourish. Sized in raw rem rather than the type scale on
          purpose — it is a graphic device, not a piece of text meant to be
          read, so it does not need to respond to the fluid --step scale the
          way real content does. */}
      <p
        aria-hidden="true"
        className="pointer-events-none absolute -top-8 -right-6 select-none font-display text-[10rem] leading-none tracking-tighter text-fg opacity-[0.05] sm:text-[11rem]"
      >
        {profile.monogram}
      </p>

      <div className="relative">
        <p className="font-display text-[length:var(--step-3)] leading-[1.05] tracking-[-0.02em] text-fg">
          {profile.name}
        </p>
        <p className="eyebrow mt-3">{profile.title}</p>
        <p className="mt-6 font-display text-[length:var(--step-0)] leading-snug text-fg-muted italic">
          &ldquo;{profile.philosophy}&rdquo;
        </p>
      </div>

      <div className="relative mt-9 divide-y divide-[color:var(--rule-color)] border-t border-rule">
        <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="eyebrow">Email</p>
            <a
              href={`mailto:${profile.email}`}
              className="wrap-anywhere mt-1 block text-[length:var(--step-0)] font-medium text-fg underline-offset-4 hover:text-accent hover:underline"
            >
              {profile.email}
            </a>
          </div>
          <CopyButton value={profile.email} label="Copy email address" className="shrink-0" />
        </div>

        {/* GitHub and LinkedIn are each one link spanning the whole row —
            not a label beside a separate "View" affordance — because the
            platform name has to be part of the link's own accessible name
            (it is what identifies the link as "GitHub" vs "LinkedIn" to a
            screen reader), and splitting it out into sibling text would
            leave the link itself announced only as "thienle210303". */}
        {github ? (
          <ExternalLink href={github.href} className={ROW_CLASS}>
            <span className="min-w-0">
              <span className="eyebrow block">{github.platform}</span>
              <span className="wrap-anywhere mt-1 block text-[length:var(--step-0)] font-medium group-hover:text-accent group-hover:underline">
                {github.handle}
              </span>
            </span>
            <ArrowUpRight
              aria-hidden="true"
              focusable="false"
              className="h-4 w-4 shrink-0 text-fg-subtle transition-all duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent"
            />
          </ExternalLink>
        ) : null}

        {linkedin ? (
          <ExternalLink href={linkedin.href} className={ROW_CLASS}>
            <span className="min-w-0">
              <span className="eyebrow block">{linkedin.platform}</span>
              <span className="wrap-anywhere mt-1 block text-[length:var(--step-0)] font-medium group-hover:text-accent group-hover:underline">
                {linkedin.handle}
              </span>
            </span>
            <ArrowUpRight
              aria-hidden="true"
              focusable="false"
              className="h-4 w-4 shrink-0 text-fg-subtle transition-all duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent"
            />
          </ExternalLink>
        ) : null}
      </div>
    </aside>
  );
}
