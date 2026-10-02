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
 * landscape card aspect ratio (`lg:aspect-[13/10]`, chosen — see the
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
 * Copy sits *beside* it now, not beneath: `CopyButton`'s `variant="compact"`
 * (see that file — this round's unlock, promised in round 4's feedback note)
 * drops the visible box itself to 32px while extending the accessible tap
 * target to 44px through an invisible, out-of-flow pseudo-element rather
 * than through the box's own size — which is what makes one row wide enough
 * for both without the 44px box round 4 and 6 were still stuck carrying —
 * `min-w-0 flex-1` on the email and `shrink-0` on the button so the button,
 * not the address, always keeps its shape.
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
 * No `box-shadow` (Workstream 3, P5 — removed; this file used to carry the
 * site's only hardcoded rgba shadow, a quiet lift matching `ToolkitPanel`/
 * `RestingBox`'s recipe turned down). The engraved frame two paragraphs up
 * already carries "an object resting on the page" on its own — a border-only
 * device that survives print, where a shadow never did (`* { box-shadow:
 * none !important }` zeroed it there regardless) — so the shadow was one
 * more way of saying the same thing this card had already said twice.
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
 * `13/10` (1.3:1) — flatter than round 6's `5/4` (1.25:1), still short of
 * the true `3/2` (1.5:1) round 4 named as the eventual target, and rejected
 * in favour of it for the same kind of measured reason round 4 and 6 both
 * gave, not a cautious one.
 *
 * Round 4's note was that `CopyButton`'s fixed 44px box — not the card's
 * padding, spacing or type — was the binding constraint, and that a compact
 * variant was "the future unlock." `variant="compact"` (CopyButton.tsx) is
 * that unlock: same 44px *tap target*, an out-of-flow pseudo-element rather
 * than a 44px box. Swapping the email row's `CopyButton` from `variant=
 * "icon"` to `variant="compact"` is the only change this round makes to the
 * card's content — everything else (padding, spacing, type, the round-6
 * frame) is untouched — and it re-measures cheaper for exactly the reason
 * predicted: one row shrinks from 44px to 32px tall, nothing else moves.
 *
 * Re-measured the same way rounds 4 and 6 did, but against a live `pnpm dev`
 * render rather than a headless reconstruction: with the ratio and any
 * explicit height cleared (`aspectRatio`/`height` set to `auto` inline,
 * `getBoundingClientRect().height` read, then restored), the card's real
 * content floor is **260.4px** at `22rem` (Contact's `lg` column, 352px)
 * and **261.8px** at `24rem` (`xl`, 384px) — down from round 6's 271.7px /
 * 273.8px, a ~11px saving at both widths, matching the ~12px a 44px→32px
 * row should cost and nothing more.
 *
 * `3/2` was tried first, since that is still the named target. At 352px
 * wide it renders 234.7px tall against a 260.4px floor — 25.7px short, the
 * same "eats through the bottom padding rather than clipping at the edge"
 * defect rounds 4 and 6 already named. At 384px it is only 5.8px short
 * (261.8px floor vs. 256px rendered) — close, but 352px (Contact's `lg`
 * column, not just its narrower one — both widths are real, reachable
 * viewport ranges, 1024–1279px and >=1280px respectively) is just as live a
 * width as 384px is, so a ratio that only clears at one of the two column
 * widths a real visitor's window can land on is not a ratio that "fits."
 *
 * The floor was bisected the same way round 6 did, against the new numbers:
 * `4/3` (264.0px, +3.6px of margin at 352px) is the same kind of knife-edge
 * round 6 rejected `9/7`'s ~3px margin for — plausible on this machine, not
 * a margin worth trusting on another rendering engine. `21/16` (268.2px,
 * +7.8px) is better but still thinner than round 6's own bar. `13/10`
 * (270.8px, **+10.4px** at 352px, +33.6px at 384px) lands almost exactly on
 * the margin round 6 picked `5/4` for (+9.9px there, against the old,
 * higher floor) — the compact `CopyButton` turned the exact ratio round 6
 * measured as "0.1px short of the floor" into one with a full ten-pixel
 * cushion, which is the unlock round 4 promised, precisely.
 *
 * Nothing about the round-6 frame, ticks, fleuron or label column changes
 * here — all four are still either out of the flex column's flow or, for
 * the label column, horizontal-only — so the floor above is the same kind
 * of number they were already measured against, not a new category of one.
 * The ratio only ever applies at `lg` and up, so 1024px and 1440px (of this
 * repo's six-viewport Playwright matrix) are the only two widths where it
 * does anything to verify — narrower widths stay `aspect-auto` and were
 * never at risk. `e2e/contact.spec.ts`'s "business card" describe block
 * pins the 352px/384px measurements above as an assertion, at those two
 * widths, rather than leaving them as a comment only; the same block also
 * confirms the compact `CopyButton`'s 44px hit area actually reaches 44px in
 * a real browser. `e2e/axe.spec.ts`'s desktop-viewport audits (day and
 * night, `wcag22aa` tags — target-size included) passed against this ratio
 * and the compact control with zero violations.
 */
const CARD_ASPECT = "lg:aspect-[13/10]";

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

/**
 * The GitHub/LinkedIn handle's own quiet-link treatment (Workstream 3, P3) —
 * the same "decoration transparent -> currentColor" vocabulary `.ink-link-
 * quiet` gives every other standalone link, hand-written here rather than
 * that shared class because the trigger is the parent `<a>`'s hover
 * (`group-hover:`), not this `<span>`'s own — a plain `.ink-link-quiet`
 * would never see a `:hover` of its own to react to, since the whole row is
 * the actual link and this handle is just the half of its label the state
 * change should visibly land on.
 */
const HANDLE_CLASS =
  "whitespace-nowrap underline decoration-transparent underline-offset-4 transition-[color,text-decoration-color] duration-(--dur-quick) group-hover:text-accent group-hover:decoration-current";

export default function BusinessCard({ className }: BusinessCardProps) {
  const github = socialLinks.find((link) => link.platform === "GitHub");
  const linkedin = socialLinks.find((link) => link.platform === "LinkedIn");

  return (
    // `data-cat-hide` is a cross-component contract, the twin of
    // `data-cat-nap` (which nothing carries since round 18 retired the
    // career tree's plinth, its only declarer): it says this panel is
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
        {/* `.hanging-quote` (Workstream 3, P4): this is the one quoted line
            inside this workstream's file scope — Safari hangs the opening
            curly quote fractionally outside the text's own left edge; every
            other engine ignores the unknown declaration.

            No italic since round 17. The curly quotes already say this is
            quoted and the muted tone already says it is an aside, so the
            slope was a third signal for one job — which made this the
            cheapest of the four display italics to give up when that font
            file turned out to be 151.7 KB. */}
        <p className="hanging-quote mt-2 font-display text-[length:var(--step--1)] leading-snug text-fg-muted">
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
            className="ink-link-quiet block min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-fg hover:text-accent"
          >
            {profile.email}
          </a>
          <CopyButton
            value={profile.email}
            label="Copy email address"
            variant="compact"
            className="shrink-0"
          />
        </div>

        {github ? (
          <ExternalLink href={github.href} className={LINK_ROW_CLASS}>
            <span className={LINK_LABEL_CLASS}>{github.platform}</span>{" "}
            <span className={HANDLE_CLASS}>{github.handle}</span>
          </ExternalLink>
        ) : null}

        {linkedin ? (
          <ExternalLink href={linkedin.href} className={LINK_ROW_CLASS}>
            <span className={LINK_LABEL_CLASS}>{linkedin.platform}</span>{" "}
            <span className={HANDLE_CLASS}>{linkedin.handle}</span>
          </ExternalLink>
        ) : null}
      </div>
    </aside>
  );
}
