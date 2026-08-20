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
 * always keeps its shape.
 *
 * GitHub and LinkedIn stay one link per row spanning its full width, not a
 * label beside a separate "View" affordance, because the platform name has
 * to be part of the link's own accessible name — splitting it into a
 * sibling text node would leave the link announced only as "thienle210303".
 * Those two rows now share a fixed-width label column (`LINK_LABEL_CLASS`)
 * so "GitHub" and "LinkedIn" — six and eight characters — stop each setting
 * their own indent and the two handles start at the same x instead, the
 * way a datasheet's key/value pairs line up. The email row deliberately
 * stays unlabelled: an `@`-address is self-evidently mail, a "Mail" label
 * would only eat into the row that rounds 4–5 already measured to the
 * pixel for the copy button, and the visual rhyme of three label-led rows
 * was not worth reopening that budget. The old per-row arrow glyph is gone
 * too: a card in your hand has no "opens elsewhere" affordance either, and
 * dropping it is what buys the compact mono block its one-line-per-fact
 * rhythm.
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
 * The engraved frame — outer border plus an inset hairline rule plus four
 * corner registration ticks — is the round-6 addition that stops the card
 * reading as "one bordered rectangle." All three pieces are `absolute`,
 * `aria-hidden`, `pointer-events-none` and sit inside the card's existing
 * `p-6`/`sm:p-7` padding (inset `0.75rem`, ticks a further `0.25–0.625rem`
 * in from the outer edge — comfortably clear of the `24–28px` where real
 * content starts), so none of them touches a line of text and none of them
 * costs the flex column a pixel of the height rounds 4–5 measured: taking
 * an element out of flow is exactly what makes it free. The ticks sit
 * *between* the outer border and the inner rule rather than touching
 * either — a small independent cross, the way a registration mark floats
 * near a trim line without sitting on it — and stay on the inner-frame side
 * of the card rather than bleeding past the outer edge, because the card
 * already relies on `overflow-hidden` to crop the monogram and a second,
 * competing reason to clip at that exact boundary was one variable too many
 * to introduce in the same pass. Built from `border-rule` only (never
 * `box-shadow`, which the print stylesheet zeroes globally) so the frame is
 * still ink on the printed page, not a screen-only effect.
 *
 * The divider between the identity block and the contact block keeps its
 * full-width `border-t` (a plain rule reads correctly at every width this
 * card renders at) but now carries a small centred diamond — a rotated
 * `border-rule` square filled with the card's own `bg-surface` — sitting
 * exactly on the line the way a printer's fleuron breaks a rule. It is one
 * more `absolute`, zero-height element, so the vertical rhythm below it
 * (`pt-3`, `space-y-2`) is untouched.
 *
 * The card also carries a quiet lift (`shadow-[0_10px_28px_-18px_…]`) — the
 * same recipe `ToolkitPanel`/`RestingBox` use, turned down: less blur, less
 * spread, lower opacity, because a card resting on the page should sit
 * barely off it, not float the way a floating panel does. `* { box-shadow:
 * none !important }` in the print stylesheet already kills it on paper.
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
 *
 * Round 6 added the engraved frame, its ticks, and the divider's diamond —
 * all `position: absolute`, none of them in the flex column's flow — plus
 * a fixed-width label column on the GitHub/LinkedIn rows only, which *is*
 * in flow but only ever changes where a line breaks horizontally, not how
 * tall any row is. Neither changes the natural-height floor this ratio was
 * measured against, so the number above still stands; re-verified instead
 * by screenshotting the compiled card at 320/375/390/768/1024/1280/1440 in
 * both themes and confirming zero descendant overflow — see the PR notes.
 */
const CARD_ASPECT = "lg:aspect-[5/4]";

const LINK_ROW_CLASS =
  "group flex items-baseline gap-2 py-1 text-fg transition-colors duration-200";

/**
 * Shared column so "GitHub" and "LinkedIn" — six and eight characters —
 * stop each setting their own indent and both handles start flush at the
 * same x, the tabular alignment a datasheet's key/value pairs use. Sized
 * for "LinkedIn" (the longer of the two labels) with headroom to spare;
 * `shrink-0` keeps the column width fixed even though the row itself is a
 * flex container, and `whitespace-nowrap` keeps a label from ever line-
 * wrapping into the handle's column.
 */
const LINK_LABEL_CLASS = "inline-block w-[4.5rem] shrink-0 whitespace-nowrap text-fg-subtle";

export default function BusinessCard({ className }: BusinessCardProps) {
  const github = socialLinks.find((link) => link.platform === "GitHub");
  const linkedin = socialLinks.find((link) => link.platform === "LinkedIn");

  return (
    // `data-cat-hide` is a cross-component contract, the twin of the
    // `data-cat-nap` the knowledge tree's plinth carries: it says this panel is
    // opaque and has a top edge, and the companion cats occasionally duck behind
    // it so only their heads clear the rule. This file only declares the
    // attribute; everything that reads it lives in src/components/companion, and
    // nothing about the card itself changes.
    //
    // It is currently the only element on the site that carries it, and that is
    // measured rather than assumed — see the note in CodeBlock.tsx, which had
    // it and could never satisfy it. What makes the card work is the clear band
    // above its top edge; a panel with a heading or a control sitting on that
    // band has nowhere to put the visible half of a cat.
    <aside
      aria-label={`${profile.name} — business card`}
      data-cat-hide
      className={cn(
        "relative isolate flex flex-col justify-between overflow-hidden border border-rule bg-surface p-6 shadow-[0_10px_28px_-18px_rgba(0,0,0,0.32)] sm:p-7",
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
          does. Given a touch more presence than before (larger crop,
          opacity nudged up) now that the frame around it gives the card
          more visual structure to carry it. */}
      <p
        aria-hidden="true"
        className="pointer-events-none absolute -right-9 -bottom-16 select-none font-display text-[14.5rem] leading-none tracking-tighter text-fg opacity-[0.09] sm:text-[17rem]"
      >
        {profile.monogram}
      </p>

      {/* Engraved frame: inner hairline rule, out of flow so it costs the
          content nothing. See the file comment for why it sits inside the
          card's own overflow-hidden edge rather than bleeding past it. */}
      <span aria-hidden="true" className="pointer-events-none absolute inset-3 border border-rule" />

      {/* Corner registration marks — a small independent cross floating
          between the outer border and the inner rule, never touching
          either. Deliberately built from `border-rule` (not `box-shadow`)
          so it survives the print stylesheet, which zeroes shadows but
          leaves borders alone. */}
      <span aria-hidden="true" className="pointer-events-none absolute top-1 left-1 h-1.5 w-1.5 border-t border-l border-rule" />
      <span aria-hidden="true" className="pointer-events-none absolute top-1 right-1 h-1.5 w-1.5 border-t border-r border-rule" />
      <span aria-hidden="true" className="pointer-events-none absolute bottom-1 left-1 h-1.5 w-1.5 border-b border-l border-rule" />
      <span aria-hidden="true" className="pointer-events-none absolute bottom-1 right-1 h-1.5 w-1.5 border-b border-r border-rule" />

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
        {/* A small fleuron breaking the rule at its centre — a rotated
            `border-rule` square filled with the card's own `bg-surface`,
            positioned on the line itself. Zero-height and absolute, so it
            adds nothing to the block's flow. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-[3.5px] left-1/2 h-[7px] w-[7px] -translate-x-1/2 rotate-45 border border-rule bg-surface"
        />

        {/* Beside, not beneath — see the file-level comment. The compact
            `CopyButton` is what makes one row enough for both. Unlabelled
            on purpose: see the file comment on why "Mail" was dropped. */}
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
            <span className={LINK_LABEL_CLASS}>{github.platform}</span>{" "}
            <span className="whitespace-nowrap group-hover:text-accent group-hover:underline">
              {github.handle}
            </span>
          </ExternalLink>
        ) : null}

        {linkedin ? (
          <ExternalLink href={linkedin.href} className={LINK_ROW_CLASS}>
            <span className={LINK_LABEL_CLASS}>{linkedin.platform}</span>{" "}
            <span className="whitespace-nowrap group-hover:text-accent group-hover:underline">
              {linkedin.handle}
            </span>
          </ExternalLink>
        ) : null}
      </div>
    </aside>
  );
}
