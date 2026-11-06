import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Download, FileText } from "lucide-react";
import { profile, resumeSummary } from "@/content/portfolio";
import { ExternalLink } from "@/components/ui/ExternalLink";
import ResumeFrame from "./ResumeFrame";
import preview from "./resume-preview.json";

/**
 * The résumé, as the PDF in a full-page viewer (round 23).
 *
 * It used to be an HTML page that retold the timeline, and the owner found it
 * ugly; the thing a recruiter takes away is the PDF (`profile.resumePdf`), so
 * this route now just shows it: a slim header (back to the site, Download) over
 * an `<iframe>`. The home page's Résumé chip opens the same PDF in a dialog
 * from 640px; this route stays so inbound links to `/resume` still land
 * somewhere useful.
 *
 * Under 40rem there is no frame (round 25): a phone shows an embedded PDF as
 * one cropped page or as nothing. It shows the first page as a picture
 * instead, a sheet of paper that is a link to the PDF, with Open and Download
 * under it; the phone's own viewer does the rest. The picture is drawn from
 * the real PDF by `pnpm resume:preview` (`scripts/resume-preview.mjs`), which
 * also records the PDF's hash in `resume-preview.json`;
 * `tests/lib/resume-preview.test.ts` fails when the PDF changes without it.
 * From 40rem the page is the frame, as before: `ResumeFrame` mounts it only
 * there, so a phone never fetches the PDF for a frame it will not show.
 */

export const metadata: Metadata = {
  title: "Résumé",
  description: `${profile.name} — ${profile.title}. ${resumeSummary}`,
  alternates: { canonical: "/resume" },
  openGraph: { url: "/resume", title: `${profile.name} — Résumé` },
};

/** The phone's two actions: 44px, squared like the rest of the site's paper. */
const ACTION = "inline-flex min-h-11 items-center gap-2 px-5 text-[length:var(--step-0)] font-medium transition-colors duration-200";

export default function ResumePage() {
  const pdf = profile.resumePdf;
  // The picture is of one particular file; if the content names another, show
  // the actions without it rather than the wrong page.
  const pictured = pdf === preview.pdf;

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
          // From 40rem. On a phone the same two actions sit under the picture.
          <ExternalLink
            href={pdf}
            className="no-print hidden min-h-11 items-center gap-2 bg-control px-5 text-[length:var(--step-0)] font-medium text-fg-inverse transition-colors duration-200 hover:bg-accent sm:inline-flex"
          >
            <Download aria-hidden="true" focusable="false" size={16} />
            Download PDF
          </ExternalLink>
        ) : null}
      </div>

      {pdf ? (
        <>
          <div data-resume-preview="" className="shell flex w-full flex-col items-center gap-5 pt-2 pb-10 sm:hidden">
            {pictured ? (
              <a href={pdf} className="paper-lift block w-full max-w-[26rem] bg-surface">
                <Image
                  src={preview.image}
                  width={preview.width}
                  height={preview.height}
                  alt="My résumé, page one. Open the PDF."
                  sizes="(min-width: 40rem) 1px, 92vw"
                  className="h-auto w-full"
                />
              </a>
            ) : null}
            <div className="no-print flex flex-wrap justify-center gap-3">
              <a href={pdf} className={`${ACTION} bg-control text-fg-inverse hover:bg-accent`}>
                <FileText aria-hidden="true" focusable="false" size={16} />
                Open the PDF
              </a>
              <a href={pdf} download className={`${ACTION} border border-rule text-fg hover:border-fg-muted hover:text-accent`}>
                <Download aria-hidden="true" focusable="false" size={16} />
                Download
              </a>
            </div>
          </div>

          {/* The frame's room is held here, so `ResumeFrame` arriving moves
              nothing. With JavaScript off the frame is the `<noscript>` one. */}
          <div className="hidden min-h-[70svh] w-full flex-1 flex-col bg-surface sm:flex">
            <ResumeFrame src={pdf} title={profile.resumePdfLabel} />
            <noscript>
              <iframe title={profile.resumePdfLabel} src={pdf} className="min-h-[70svh] w-full flex-1 border-0 bg-surface" />
            </noscript>
          </div>
          <p className="shell hidden py-3 font-mono text-[length:var(--step--1)] text-fg-muted sm:block">
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
