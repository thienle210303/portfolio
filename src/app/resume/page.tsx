import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import { profile, resumeSummary } from "@/content/portfolio";
import { ExternalLink } from "@/components/ui/ExternalLink";

/**
 * The résumé, as the PDF in a full-page viewer (round 23).
 *
 * It used to be an HTML page that retold the timeline, and the owner found it
 * ugly; the thing a recruiter takes away is the PDF (`profile.resumePdf`), so
 * this route now just shows it: a slim header (back to the site, Download) over
 * an `<iframe>`. The home page's Résumé chip opens the same PDF in a dialog
 * from 640px; this route stays so inbound links to `/resume` still land
 * somewhere useful. A browser without an inline PDF viewer (most phones) gets
 * the link under the frame.
 */

export const metadata: Metadata = {
  title: "Résumé",
  description: `${profile.name} — ${profile.title}. ${resumeSummary}`,
  alternates: { canonical: "/resume" },
  openGraph: { url: "/resume", title: `${profile.name} — Résumé` },
};

export default function ResumePage() {
  const pdf = profile.resumePdf;

  return (
    <div className="tone-base section-ground flex min-h-[calc(100svh-var(--header-h,0px))] flex-col">
      <div className="shell flex w-full flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3">
        <Link
          href="/"
          className="no-print inline-flex min-h-11 items-center gap-2 text-[length:var(--step-0)] text-fg-muted transition-colors duration-200 hover:text-accent"
        >
          <ArrowLeft aria-hidden="true" focusable="false" size={16} />
          Back to the site
        </Link>
        <h1 className="font-display text-[length:var(--step-1)] font-semibold text-fg">
          {profile.name} — Résumé
        </h1>
        {pdf ? (
          <ExternalLink
            href={pdf}
            className="no-print inline-flex min-h-11 items-center gap-2 bg-control px-5 text-[length:var(--step-0)] font-medium text-fg-inverse transition-colors duration-200 hover:bg-accent"
          >
            <Download aria-hidden="true" focusable="false" size={16} />
            Download PDF
          </ExternalLink>
        ) : null}
      </div>

      {pdf ? (
        <>
          <iframe
            title={profile.resumePdfLabel}
            src={pdf}
            className="min-h-[70svh] w-full flex-1 border-0 bg-surface"
          />
          <p className="shell py-3 font-mono text-[length:var(--step--1)] text-fg-muted">
            Can&apos;t see it? Open the{" "}
            <a href={pdf} className="ink-link text-accent">
              PDF itself
            </a>
            .
          </p>
        </>
      ) : null}
    </div>
  );
}
