"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import { Download, ExternalLink as OpenIcon, X } from "lucide-react";
import { profile } from "@/content/portfolio";

/**
 * The business card's Résumé chip (round 23). It is a plain link to the PDF:
 * with JavaScript off, on a phone, or anywhere a dialog is unavailable, it
 * opens the PDF itself (a phone's own viewer beats an embedded one). From
 * 640px, with JavaScript, a click opens a native `<dialog>` instead: a big
 * paper sheet with the PDF in an `<iframe>`.
 *
 * The iframe's `src` is not set until the first time the dialog opens, so the
 * PDF never loads with the page (it is the page's heaviest file). It stays
 * once loaded: closing and reopening costs nothing.
 *
 * `showModal()` gives the focus trap, Escape and the inert page for free, and
 * hands focus back to the chip on close; the chip is refocused by hand too,
 * for the browsers that don't. A click on the backdrop closes it.
 */

/** From this width the dialog opens; below it the link opens the PDF. */
const DIALOG_QUERY = "(min-width: 640px)";

const ACTION =
  "inline-flex min-h-11 items-center gap-2 border border-rule px-3.5 text-[14px] text-fg transition-colors duration-150 hover:border-fg-muted hover:text-accent";

export default function ResumeLink({ className, children }: { readonly className: string; readonly children: ReactNode }) {
  const pdf = profile.resumePdf;
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLAnchorElement>(null);
  const [armed, setArmed] = useState(false);
  const titleId = useId();

  if (!pdf) return null;

  function open(event: React.MouseEvent<HTMLAnchorElement>) {
    const dialog = dialogRef.current;
    // Let the browser follow the link when it can't (or shouldn't) show a dialog,
    // or when the click means "a new tab".
    if (!dialog || typeof dialog.showModal !== "function") return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    if (!window.matchMedia(DIALOG_QUERY).matches) return;
    event.preventDefault();
    setArmed(true);
    if (!dialog.open) dialog.showModal();
  }

  return (
    <>
      <a ref={triggerRef} href={pdf} onClick={open} className={className}>
        {children}
      </a>
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        data-resume-dialog=""
        onClose={() => triggerRef.current?.focus()}
        onClick={(event) => {
          // Only the backdrop is the dialog element itself.
          if (event.target === event.currentTarget) event.currentTarget.close();
        }}
        className="resume-dialog m-auto h-[90svh] w-[min(1100px,calc(100vw-2rem))] max-w-none flex-col overflow-hidden border-0 bg-surface p-0 text-fg shadow-[var(--paper-shadow)] open:flex"
      >
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-rule px-4 py-2.5">
          <h2 id={titleId} className="mr-auto font-display text-[length:var(--step-1)] font-semibold">
            {profile.resumePdfLabel}
          </h2>
          <a href={pdf} download className={ACTION}>
            <Download aria-hidden="true" focusable="false" className="size-4" />
            Download
          </a>
          <a href={pdf} target="_blank" rel="noopener noreferrer" className={ACTION}>
            <OpenIcon aria-hidden="true" focusable="false" className="size-4" />
            Open in a new tab
          </a>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label="Close the résumé"
            className="inline-flex size-11 items-center justify-center border border-rule text-fg transition-colors duration-150 hover:border-fg-muted hover:text-accent"
          >
            <X aria-hidden="true" focusable="false" className="size-5" />
          </button>
        </div>
        <iframe
          title={profile.resumePdfLabel}
          src={armed ? pdf : undefined}
          className="min-h-0 w-full flex-1 border-0 bg-ground"
        />
      </dialog>
    </>
  );
}
