import { profile, socialLinks } from "@/content/portfolio";
import CopyButton from "@/components/ui/CopyButton";
import ExternalLink from "@/components/ui/ExternalLink";
import { cn } from "@/lib/cn";

/**
 * One panel that reads as a real printed business card rendered in the
 * site's own blueprint style — the right-hand pane of Contact's two-pane
 * composition at >=1024px (see Contact.tsx), and the block that folds in
 * what used to be QuickConnect's three separate link cards.
 *
 * Geometry, not a settings list: at >=1024px the card holds a true
 * landscape card aspect ratio (`lg:aspect-[9/8]`, chosen — see the
 * measurement note below `CARD_ASPECT` — to be the shortest box the
 * content still clears at both `22rem` and `24rem`, the widths Contact.tsx
 * actually gives it) and every element is anchored to a corner or edge the
 * way a printed card is composed: name + title lock up top-left, the
 * philosophy line sits quietly under them, and the ways to reach him are a
 * single ruled block flush to the bottom, pushed there by `justify-between`
 * on the card's flex column rather than by manual spacing. Below `lg` there
 * is no width to earn a fixed ratio, so the card relaxes to its natural
 * (`aspect-auto`) height — the same rule the rest of the page uses for
 * "this only works once it has room."
 *
 * The email is the one line on the card that must never wrap mid-address:
 * it gets a `whitespace-nowrap` line entirely to itself, sized at
 * `step--1` (the type scale's smallest step), which measures short enough
 * to clear even a 320px stacked card with room to spare. Copy sits
 * *beneath* it, right-aligned, rather than beside it — `CopyButton` (see
 * that file) always renders a full visible label ("Copy email address")
 * with its own `min-h-11` pill chrome and has no compact/icon-only
 * presentation to opt into, and that label's natural width plus a
 * `whitespace-nowrap` email's natural width do not both fit on one line at
 * any width this card ever renders at — putting them in the same flex row
 * is the exact defect the owner rejected (the button clipped mid-word,
 * which is what happens when a `shrink-0` sibling refuses to yield and a
 * flex row has nowhere else to put the pressure). Its own row removes the
 * contest entirely: at >=1024px it sits well inside the card on one line;
 * on a narrow phone, a wrapped two-line label is still fully inside the
 * card, which is what "no overflow" actually requires.
 *
 * GitHub and LinkedIn stay one link per row spanning its full width, not a
 * label beside a separate "View" affordance, because the platform name has
 * to be part of the link's own accessible name — splitting it into a
 * sibling text node would leave the link announced only as "thienle210303".
 * The old per-row arrow glyph is gone: a card in your hand has no "opens
 * elsewhere" affordance either, and dropping it is what buys the compact
 * mono block its one-line-per-fact rhythm.
 *
 * The monogram watermark is the card's one flourish, and it is now a
 * deliberate crop rather than faint noise: sized to bleed off the bottom
 * and right edges simultaneously (`overflow-hidden` on the card does the
 * cropping) so only the shoulder of the letterforms actually shows, behind
 * the contact block rather than competing with the name. `aria-hidden` and
 * `pointer-events-none` throughout — the real monogram already lives in
 * the header and the favicon, so this is decoration, never a second source
 * of identity.
 *
 * Colour stays inside the semantic aliases throughout, so the card reads
 * correctly in both themes and keeps working if `tone="deep"` on Contact
 * ever changes — nothing here is a raw `--color-*` token or a hex literal.
 *
 * Deliberately NOT wrapped in `.no-print` by its caller: unlike the two
 * forms beside it, this card is pure identity with nothing that only makes
 * sense on screen, so it is one of the few things in Contact worth handing
 * someone on paper. Print renders below the `lg` breakpoint (the page's
 * printable width is narrower than 1024px), so the card automatically
 * prints in its auto-height stacked form — the aspect ratio never has to
 * survive a page break.
 */

interface BusinessCardProps {
  readonly className?: string;
}

/**
 * `9/8` (1.125:1) rather than a print ratio like `85/55` (~1.545:1) or the
 * classic `7/4` (1.75:1). Measured by rendering the card's real content
 * (compiled CSS + the actual IBM Plex Mono / Newsreader faces, headless)
 * at `aspect-auto` and reading its natural height: ~295px at `22rem`
 * (Contact's `lg` column, 352px) and ~297px at `24rem` (`xl`, 384px) — the
 * two widths barely move because almost everything is already one line.
 * `9/8` renders at 312.9px tall at 352px wide, an ~18px margin over that
 * floor, and considerably more at 384px since a fixed ratio only grows
 * taller as the column widens. A closer-to-print ratio (`3/2`, `7/4`)
 * looked better in isolation but ran the contact block through the bottom
 * padding at `22rem` — this card is carrying a `CopyButton` whose own
 * `min-h-11` alone accounts for 44 of those ~295px, which a printed card
 * never has to. `9/8` is the honest shape for that content, not the most
 * dramatic one; still unmistakably landscape, not square.
 */
const CARD_ASPECT = "lg:aspect-[9/8]";

const LINK_ROW_CLASS =
  "group flex items-baseline justify-between gap-3 py-1 text-fg transition-colors duration-200";

export default function BusinessCard({ className }: BusinessCardProps) {
  const github = socialLinks.find((link) => link.platform === "GitHub");
  const linkedin = socialLinks.find((link) => link.platform === "LinkedIn");

  return (
    <aside
      aria-label={`${profile.name} — business card`}
      className={cn(
        "relative isolate flex flex-col justify-between overflow-hidden border border-rule bg-surface p-6 sm:p-7",
        CARD_ASPECT,
        className,
      )}
    >
      {/* The one flourish, cropped deliberately rather than centred: only the
          shoulder of the letterforms clears the card's own overflow-hidden
          edge, which is what makes this read as a chosen crop instead of a
          logo someone forgot to resize. Sized in raw rem, not the type
          scale — it is a graphic device, not text meant to be read, so it
          does not need to track the fluid --step scale the way real content
          does. */}
      <p
        aria-hidden="true"
        className="pointer-events-none absolute -right-8 -bottom-14 select-none font-display text-[13rem] leading-none tracking-tighter text-fg opacity-[0.07] sm:text-[15rem]"
      >
        {profile.monogram}
      </p>

      <div className="relative">
        <p className="font-display text-[length:var(--step-1)] leading-[1.05] tracking-[-0.02em] text-fg">
          {profile.name}
        </p>
        <p className="eyebrow mt-1 leading-tight">{profile.title}</p>
        {/* No `max-w` clamp: the quote is short enough to clear the card's
            own content width on one line without help, and an arbitrary
            character clamp narrower than that width only forced an
            unnecessary second line. */}
        <p className="mt-2 font-display text-[length:var(--step--1)] leading-snug text-fg-muted italic">
          &ldquo;{profile.philosophy}&rdquo;
        </p>
      </div>

      <div className="relative mt-4 space-y-2 border-t border-rule pt-3 font-mono text-[length:var(--step--1)] leading-snug">
        <div>
          <a
            href={`mailto:${profile.email}`}
            className="block w-fit max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-fg underline-offset-4 hover:text-accent hover:underline"
          >
            {profile.email}
          </a>
          {/* Beneath, not beside — see the file-level comment for why the
              same row as the email is exactly the defect being fixed. */}
          <div className="mt-1 flex justify-end">
            <CopyButton value={profile.email} label="Copy email address" />
          </div>
        </div>

        {github ? (
          <ExternalLink href={github.href} className={LINK_ROW_CLASS}>
            <span className="whitespace-nowrap">
              <span className="text-fg-subtle">{github.platform}</span>{" "}
              <span className="group-hover:text-accent group-hover:underline">
                {github.handle}
              </span>
            </span>
          </ExternalLink>
        ) : null}

        {linkedin ? (
          <ExternalLink href={linkedin.href} className={LINK_ROW_CLASS}>
            <span className="whitespace-nowrap">
              <span className="text-fg-subtle">{linkedin.platform}</span>{" "}
              <span className="group-hover:text-accent group-hover:underline">
                {linkedin.handle}
              </span>
            </span>
          </ExternalLink>
        ) : null}
      </div>
    </aside>
  );
}
