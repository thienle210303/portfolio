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
 * landscape card aspect ratio (`lg:aspect-[5/4]`, chosen — see the
 * measurement note below `CARD_ASPECT` — to be the flattest box the
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
 * it gets `overflow-hidden text-ellipsis whitespace-nowrap` so a width this
 * card never actually hits would elide it rather than break it mid-word.
 * Copy sits *beside* it now, not beneath: `CopyButton`'s `variant="icon"`
 * (see that file) drops the visible label down to icon size while keeping
 * `min-h-11 min-w-11` for the tap target and the full name on `aria-label`,
 * which is what makes one row wide enough for both — `min-w-0 flex-1` on
 * the email and `shrink-0` on the button so the button, not the address,
 * always keeps its shape. That single row is the height this card gave
 * back: the old stacked email-then-button pair cost roughly the button's
 * own `min-h-11` *twice over* (once for the button's row, once for the
 * email's row above it); collapsing them to one row costs it once, which is
 * the entire reason a flatter ratio is reachable at all.
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
 * `5/4` (1.25:1) — flatter than the previous `9/8` (1.125:1), still short
 * of the `3/2` (1.5:1) this round's brief named as a target, and rejected
 * in favour of it for a measured reason, not a cautious one.
 *
 * Re-measured the same way as before: the card's real content (compiled
 * CSS + the actual IBM Plex Mono / Newsreader faces, headless) rendered at
 * `aspect-auto`, reading its natural height. Collapsing the copy control
 * onto the email's own row (see the file comment) brought that floor down
 * from ~295px to **271.7px** at `22rem` (Contact's `lg` column, 352px) and
 * **273.8px** at `24rem` (`xl`, 384px) — the entire saving is the row the
 * card no longer has, not any single element shrinking.
 *
 * `3/2` was tried first, since that was the brief. It renders at 234.7px
 * at 352px wide — 37px short of the 271.7px floor — and still comes up
 * 16.8px short even at 384px, unlike the old `9/8` case where only the
 * narrower width was ever the binding constraint. Short by that much, the
 * ruled contact block does not clip at the card's outer edge (nothing
 * literally leaves the box) — it eats straight through the bottom padding
 * instead, which is the same family of defect as the "copy button clipped
 * mid-word" regression this card was already rewritten to fix once. A
 * bottom row flush against the card's border is that defect with a softer
 * name, so "fits" here means clearing the full declared `p-6`/`sm:p-7`,
 * not just clearing the border.
 *
 * That floor was then bisected rather than guessed at a second time:
 * `7/5` (251.4px, −19.3px into the padding), `4/3` (264px, −6.7px), `21/16`
 * (268.2px, −2.5px) all still cut into it; `13/10` (270.8px) lands within
 * 0.1px of the floor, i.e. exactly the knife-edge — one browser's worth of
 * font-hinting or sub-pixel rounding away from being the regression again,
 * not a ratio to ship. `9/7` (273.8px) is the first one with real air under
 * it, but only ~3px — plausible headroom for a build with the real
 * (non-approximated) fonts and a different rendering engine, not a margin
 * anyone should have to trust. `5/4` (281.6px at 352px, 307.2px at 384px)
 * is the first stop past that with a margin in the same neighbourhood as
 * the old `9/8` case (~10px, next to that one's ~18px) — flatter than
 * before, and still honestly clear of the floor rather than balanced on it.
 */
const CARD_ASPECT = "lg:aspect-[5/4]";

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
        {/* Beside, not beneath — see the file-level comment. The compact
            `CopyButton` is what makes one row enough for both. */}
        <div className="flex items-center justify-between gap-2">
          <a
            href={`mailto:${profile.email}`}
            className="block min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-fg underline-offset-4 hover:text-accent hover:underline"
          >
            {profile.email}
          </a>
          <CopyButton
            value={profile.email}
            label="Copy email address"
            variant="icon"
            className="shrink-0"
          />
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
