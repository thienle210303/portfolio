import { Tag } from "@/components/ui/Tag";
import { ExternalLink } from "@/components/ui/ExternalLink";
import { buildFieldTag } from "@/lib/hero";
import LinkedInQr from "./LinkedInQr";

const RULE = "my-2.5 border-t-[1.5px] border-dashed border-fg";

export default function FieldTag() {
  const t = buildFieldTag();
  return (
    <Tag className="font-mono text-[13.5px] leading-[1.75] w-full max-w-[380px] px-6 pt-10 pb-5 lg:w-[380px] lg:rotate-2">
      <div data-hero-step="field-tag">
        <div className="flex justify-between font-bold">
          <span>Field tag No. {t.number}</span>
          <span>{t.aside}</span>
        </div>
        <div className={RULE} />
        <dl className="grid grid-cols-[104px_1fr]">
          {t.rows.map((r) => (
            <div key={r.label} className="contents">
              <dt className="text-fg-muted">{r.label}</dt>
              <dd className={r.face === "sans" ? "font-sans" : undefined}>
                {r.value}
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
        <dl className="grid grid-cols-[104px_1fr] font-bold">
          <dt>Status</dt>
          <dd>{t.status}</dd>
        </dl>
        <div className="mt-4 flex items-end justify-between gap-3">
          <ExternalLink href={t.linkedin} className="flex flex-col gap-1.5 p-1.5 text-[12px] no-underline">
            <LinkedInQr className="size-[72px] text-fg" />
            <span className="text-fg-muted">{t.linkLabel}</span>
          </ExternalLink>
          <p className="mb-2 -rotate-6 border-[2.5px] border-[color:var(--mark)] px-2.5 py-1 text-[15px] font-bold uppercase tracking-[0.04em] text-[color:var(--mark)]">
            {t.motto}
          </p>
        </div>
      </div>
    </Tag>
  );
}
