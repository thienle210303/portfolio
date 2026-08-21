import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import {
  achievements,
  careerEntries,
  certifications,
  education,
  profile,
  projects,
  resumeSummary,
  skillCategories,
  socialLinks,
  SITE_URL,
} from "@/content/portfolio";
import { resolved, type CareerEntry } from "@/types/portfolio";
import { ExternalLink } from "@/components/ui/ExternalLink";

/**
 * The résumé, as a view rather than as a section.
 *
 * It used to be a 5,000px section on the home page, and almost all of it was a
 * second telling: the experience was already in the Journey timeline, the
 * projects were already in Selected Work, the education and every award were
 * already timeline entries. Only the skills and certifications were unique,
 * and those are now their own section.
 *
 * So the résumé stopped being something to scroll past and became what a
 * résumé actually is — one page you look at or take away. This route is the
 * "view"; `profile.resumePdf` is the "download". Both show the same facts,
 * because both read the same content layer.
 *
 * Laid out for paper first: one column, no disclosures, nothing collapsed,
 * every fact visible at once. `Ctrl/Cmd+P` here produces a clean document
 * without the print stylesheet having to surgically hide a whole page around
 * it, which is what the old approach required.
 */

export const metadata: Metadata = {
  title: "Résumé",
  description: `${profile.name} — ${profile.title}. ${resumeSummary}`,
  alternates: { canonical: "/resume" },
  openGraph: { url: "/resume", title: `${profile.name} — Résumé` },
};

const WORK: readonly CareerEntry[] = [...careerEntries]
  .filter((entry) => entry.type === "work")
  .sort((a, b) => (a.sortKey > b.sortKey ? -1 : 1));

const LABEL = "eyebrow";

function contactLine(): string {
  return [profile.email, ...socialLinks.filter((l) => l.platform !== "Email").map((l) => l.handle)]
    .join("  ·  ");
}

export default function ResumePage() {
  return (
    <div className="tone-base bg-ground py-[var(--section-y)]">
      <div className="shell max-w-[52rem]">
        {/* Screen-only chrome. Nothing here belongs on paper. */}
        <div className="no-print mb-12 flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center gap-2 text-[length:var(--step-0)] text-fg-muted transition-colors duration-200 hover:text-accent"
          >
            <ArrowLeft aria-hidden="true" focusable="false" size={16} />
            Back to the site
          </Link>

          <ExternalLink
            href={profile.resumePdf}
            className="inline-flex min-h-11 items-center gap-2 bg-accent px-5 text-[length:var(--step-0)] font-medium text-fg-inverse transition-colors duration-200 hover:bg-accent-strong hover:text-ground"
          >
            <Download aria-hidden="true" focusable="false" size={16} />
            Download PDF
          </ExternalLink>
        </div>

        <header>
          <h1 className="font-display text-[length:var(--step-4)] leading-[1.05] tracking-[-0.02em] text-fg">
            {profile.name}
          </h1>
          <p className="mt-2 text-[length:var(--step-1)] text-fg-muted">{profile.title}</p>
          <p className="wrap-anywhere mt-3 font-mono text-[length:var(--step--1)] text-fg-muted">
            {contactLine()}
          </p>
          <p className="prose-measure mt-6 text-[length:var(--step-0)] leading-relaxed text-fg-muted">
            {resumeSummary}
          </p>
        </header>

        <section aria-labelledby="resume-experience" className="mt-12">
          <h2 id="resume-experience" className={LABEL}>
            Experience
          </h2>
          <div className="mt-5 flex flex-col gap-8">
            {WORK.map((entry) => (
              <article key={entry.id} className="print-avoid-break">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <h3 className="font-display text-[length:var(--step-1)] text-fg">
                    {entry.role} · {entry.organization}
                  </h3>
                  <span className="eyebrow">{entry.dateRange}</span>
                </div>

                {resolved(entry.context) ? (
                  <p className="mt-2 text-[length:var(--step-0)] leading-relaxed text-fg-muted">
                    {resolved(entry.context)}
                  </p>
                ) : null}

                {entry.impact.length > 0 ? (
                  <ul role="list" className="mt-3 flex flex-col gap-1.5">
                    {entry.impact.map((line) => (
                      <li
                        key={line}
                        className="text-[length:var(--step-0)] leading-relaxed text-fg before:mr-2 before:text-fg-subtle before:content-['—']"
                      >
                        {line}
                      </li>
                    ))}
                  </ul>
                ) : null}

                {entry.technologies.length > 0 ? (
                  <p className="mt-3 font-mono text-[length:var(--step--1)] text-fg-muted">
                    {entry.technologies.join(" · ")}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="resume-projects" className="mt-12">
          <h2 id="resume-projects" className={LABEL}>
            Selected projects
          </h2>
          <div className="mt-5 flex flex-col gap-6">
            {projects.map((project) => (
              <article key={project.id} className="print-avoid-break">
                <h3 className="font-display text-[length:var(--step-1)] text-fg">{project.title}</h3>
                <p className="mt-1.5 text-[length:var(--step-0)] leading-relaxed text-fg-muted">
                  {project.tagline}
                </p>
                {project.metrics && project.metrics.length > 0 ? (
                  <p className="mt-2 text-[length:var(--step-0)] text-fg">
                    {project.metrics.map((metric) => `${metric.label}: ${metric.after}`).join("  ·  ")}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="resume-skills" className="mt-12">
          <h2 id="resume-skills" className={LABEL}>
            Skills
          </h2>
          <dl className="mt-5 flex flex-col gap-3">
            {skillCategories.map((category) => (
              <div key={category.id} className="print-avoid-break sm:grid sm:grid-cols-[10rem_1fr] sm:gap-4">
                <dt className="text-[length:var(--step-0)] text-fg">{category.label}</dt>
                <dd className="wrap-anywhere font-mono text-[length:var(--step--1)] leading-relaxed text-fg-muted">
                  {category.skills.join(" · ")}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-labelledby="resume-education" className="mt-12">
          <h2 id="resume-education" className={LABEL}>
            Education
          </h2>
          <div className="mt-5 flex flex-col gap-4">
            {education.map((school) => (
              <div key={school.id} className="print-avoid-break">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <h3 className="font-display text-[length:var(--step-1)] text-fg">
                    {school.credential}
                  </h3>
                  <span className="eyebrow">{school.dateRange}</span>
                </div>
                <p className="mt-1 text-[length:var(--step-0)] text-fg-muted">
                  {school.institution}
                </p>
                {school.details.length > 0 ? (
                  <p className="mt-1.5 text-[length:var(--step--1)] leading-relaxed text-fg-muted">
                    {school.details.join(" · ")}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </section>

        {certifications.length > 0 || achievements.length > 0 ? (
          <section aria-labelledby="resume-credentials" className="mt-12">
            <h2 id="resume-credentials" className={LABEL}>
              Certifications and awards
            </h2>
            <ul role="list" className="mt-5 flex flex-col gap-2">
              {certifications.map((certification) => (
                <li key={certification.id} className="text-[length:var(--step-0)] text-fg">
                  {certification.name}
                  <span className="text-fg-muted"> · {certification.issuer}</span>
                  {resolved(certification.date) ? (
                    <span className="text-fg-muted"> · {resolved(certification.date)}</span>
                  ) : null}
                </li>
              ))}
              {achievements.map((achievement) => (
                <li key={achievement.id} className="text-[length:var(--step-0)] text-fg">
                  {achievement.title}
                  <span className="text-fg-muted"> · {achievement.context}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <p className="no-print mt-14 border-t border-rule pt-5 font-mono text-[length:var(--step--1)] text-fg-subtle">
          Every line above is read from the same content the site itself uses, so this page and{" "}
          {/* `.ink-link` (Workstream 3, P3): this is a prose link embedded in
              a running sentence, not a standalone row, so it takes the
              always-underlined-at-rest variant rather than `.ink-link-quiet`
              — see that class's comment in globals.css. */}
          <a href={SITE_URL} className="ink-link text-accent">
            the portfolio
          </a>{" "}
          can never disagree.
        </p>
      </div>
    </div>
  );
}
