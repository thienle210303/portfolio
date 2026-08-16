import type { Achievement, Certification, EducationEntry } from "@/types/portfolio";
import { resolved } from "@/types/portfolio";
import { stripNeedsInput, isEntirelyNeedsInput } from "@/lib/content";
import { Disclosure } from "@/components/ui/Disclosure";

interface ResumeCredentialsProps {
  readonly education: readonly EducationEntry[];
  readonly certifications: readonly Certification[];
  readonly achievements: readonly Achievement[];
}

function EducationCard({ entry }: { readonly entry: EducationEntry }) {
  return (
    <div className="print-avoid-break border-t border-[color:var(--rule-color)] py-6 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h4 className="font-display text-[length:var(--step-1)] text-[color:var(--fg)]">{entry.institution}</h4>
        <p className="font-mono text-[length:var(--step--1)] uppercase tracking-[0.05em] text-[color:var(--fg-subtle)]">{entry.dateRange}</p>
      </div>
      <p className="mt-1 text-[length:var(--step-0)] text-[color:var(--fg-muted)]">{entry.credential}</p>
      {entry.details.length > 0 ? (
        <ul role="list" className="mt-2 list-disc space-y-1 pl-5 text-[length:var(--step-0)] leading-relaxed text-[color:var(--fg-muted)]">
          {entry.details.map((detail) => (
            <li key={detail}>{detail}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/** `date` is currently `undefined` for every certification — never render an
 * empty date slot, just issuer + name, and pick the date up automatically
 * the day one is actually supplied. */
function CertificationRow({ cert }: { readonly cert: Certification }) {
  const date = resolved(cert.date);
  return (
    <li className="print-avoid-break flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-[color:var(--rule-color)] py-3 first:border-t-0 first:pt-0">
      <span className="text-[length:var(--step-0)] text-[color:var(--fg)]">
        {cert.name} <span className="text-[color:var(--fg-muted)]">— {cert.issuer}</span>
      </span>
      {date ? (
        <span className="font-mono text-[length:var(--step--1)] uppercase tracking-[0.05em] text-[color:var(--fg-subtle)]">{date}</span>
      ) : null}
    </li>
  );
}

function AchievementRow({ item }: { readonly item: Achievement }) {
  const date = resolved(item.date);
  const rawNote = item.note;
  const noteText = rawNote !== undefined ? stripNeedsInput(rawNote) : undefined;
  const showNote = rawNote !== undefined && !isEntirelyNeedsInput(rawNote);
  return (
    <li className="print-avoid-break border-t border-[color:var(--rule-color)] py-3 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="text-[length:var(--step-0)] text-[color:var(--fg)]">{item.title}</span>
        {date ? (
          <span className="font-mono text-[length:var(--step--1)] uppercase tracking-[0.05em] text-[color:var(--fg-subtle)]">{date}</span>
        ) : null}
      </div>
      <p className="text-[length:var(--step--1)] text-[color:var(--fg-muted)]">{item.context}</p>
      {showNote ? <p className="mt-1 text-[length:var(--step--1)] text-[color:var(--fg-subtle)]">{noteText}</p> : null}
    </li>
  );
}

/** Education, Certifications and Achievements. None of these three types
 * carry a `lenses` field, so — unlike `ResumeEntries` — they are never
 * filtered by lens and always render in full. Split out of `ResumeEntries`
 * to stay under the per-file line budget; see the build report. */
export default function ResumeCredentials({ education, certifications, achievements }: ResumeCredentialsProps) {
  return (
    <div className="space-y-10">
      <Disclosure id="resume-group-education" summary="Education" defaultOpen>
        <ol role="list">
          {education.map((entry) => (
            <li key={entry.id}>
              <EducationCard entry={entry} />
            </li>
          ))}
        </ol>
      </Disclosure>
      <Disclosure id="resume-group-certifications" summary={`Certifications (${certifications.length})`} defaultOpen>
        <ul role="list">
          {certifications.map((cert) => (
            <CertificationRow key={cert.id} cert={cert} />
          ))}
        </ul>
      </Disclosure>
      <Disclosure id="resume-group-achievements" summary={`Achievements (${achievements.length})`} defaultOpen>
        <ul role="list">
          {achievements.map((item) => (
            <AchievementRow key={item.id} item={item} />
          ))}
        </ul>
      </Disclosure>
    </div>
  );
}
