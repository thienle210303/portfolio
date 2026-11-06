import { Tag } from "@/components/ui/Tag";
import { ExternalLink } from "@/components/ui/ExternalLink";
import { buildFieldTag } from "@/lib/hero";
import LinkedInQr from "./LinkedInQr";

const RULE = "my-2.5 border-t-[1.5px] border-dashed border-fg";
/**
 * Label and value side by side at every width. The labels' column is 13
 * characters of the tag's own mono (the longest label is 12), easing to 12.4
 * on the narrowest tag, where those few pixels keep a 21-character value on
 * one line.
 */
const ROWS = "grid grid-cols-[clamp(12.4ch,12.4ch+(100cqw-264px)*0.05,13ch)_minmax(0,1fr)]";

/**
 * My field tag. It sizes to its own box (round 25): Hero.tsx's holder is the
 * container, and the type and side padding follow the holder's width (12px
 * and 10px on the 264px tag a 320px phone gets, 13.5px and 24px from about
 * 365px), so the rows stay two columns on the narrowest phone instead of
 * stacking label over value, which made the tag 620px tall at 320. Only the
 * longest value wraps there.
 */
export default function FieldTag() {
  const t = buildFieldTag();
  return (
    <Tag className="w-full max-w-[380px] origin-top rotate-1 px-[clamp(0.625rem,14cqw-27px,1.5rem)] pt-10 pb-5 font-mono text-[length:clamp(0.75rem,4cqw,0.84375rem)] leading-[1.75] lg:rotate-2">
      <div data-hero-step="field-tag">
        <div className="flex justify-between gap-3 font-bold">
          <span>Field tag No. {t.number}</span>
          <span>{t.aside}</span>
        </div>
        <div className={RULE} />
        <dl className={ROWS}>
          {t.rows.map((r) => (
            <div key={r.label} className="contents">
              <dt className="text-fg-muted">{r.label}</dt>
              <dd className={r.face === "sans" ? "font-sans" : undefined}>
                {/* Bind the last two words so a narrow tag never strands one. */}
                {r.value.replace(/ (\S+)$/, " $1")}
                {r.star && (
                  <svg aria-hidden="true" viewBox="-1 -1 2 2" className="ml-1 inline-block size-2.5" fill="var(--gold)">
                    <path d="M0 -1L0.29 -0.4L0.95 -0.31L0.47 0.15L0.59 0.81L0 0.5L-0.59 0.81L-0.47 0.15L-0.95 -0.31L-0.29 -0.4Z" />
                  </svg>
                )}
              </dd>
            </div>
          ))}
        </dl>
        <div className={RULE} />
        <dl className={`${ROWS} font-bold`}>
          <dt>Status</dt>
          <dd>{t.status}</dd>
        </dl>
        <div className="mt-4 flex items-end justify-between gap-3">
          <ExternalLink href={t.linkedin} className="flex flex-col gap-1.5 p-1.5 text-[12px] whitespace-nowrap no-underline">
            <LinkedInQr className="size-[72px] text-fg" />
            <span className="text-fg-muted">{t.linkLabel}</span>
          </ExternalLink>
          <p className="mb-2 -rotate-6 border-[2.5px] border-[color:var(--mark)] px-2.5 py-1 text-[15px] [text-wrap:balance] font-bold uppercase tracking-[0.04em] text-[color:var(--mark)]">
            {t.motto}
          </p>
        </div>
      </div>
    </Tag>
  );
}
