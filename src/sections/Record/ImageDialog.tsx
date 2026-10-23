import type { ReactNode } from "react";
import type { RecordImage } from "@/types/portfolio";
import { DialogImage } from "./DialogImage";

/**
 * A button that opens a native `<dialog>` holding a certificate or award
 * image. The button is an invoker (`commandfor` + `command="show-modal"`), so
 * the browser opens the dialog modally, closes it on Escape and returns focus
 * to the button, with no script of ours. Browsers without invoker commands
 * get the same calls from `RecordFilters.tsx`'s fallback.
 *
 * The image is `DialogImage`, which mounts `next/image` only once the dialog
 * opens, so nothing is fetched (image or code) until the button is pressed
 * (`e2e/record.spec.ts`). Without JavaScript the dialog offers the file as a
 * link instead.
 *
 * React does not know the invoker attributes yet, so they are spread in as
 * plain attributes; it passes lowercase unknown attributes through.
 */
const invoke = (id: string, command: "show-modal" | "close") =>
  ({ commandfor: id, command }) as Record<string, string>;

export function ImageDialog({
  id,
  title,
  meta,
  image,
  className,
  children,
}: {
  readonly id: string;
  readonly title: string;
  readonly meta: string;
  readonly image: RecordImage;
  readonly className?: string;
  /** The button's face. Its text is the button's name. */
  readonly children: ReactNode;
}) {
  return (
    <>
      <button type="button" aria-haspopup="dialog" data-image-dialog={id} className={className} {...invoke(id, "show-modal")}>
        {children}
      </button>
      <dialog
        id={id}
        aria-labelledby={`${id}-title`}
        closedby="any"
        className="record-dialog m-auto max-h-[92svh] w-[min(56rem,92vw)] bg-surface p-4 text-fg paper-lift sm:p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h4 id={`${id}-title`} className="font-display text-[length:var(--step-1)] font-semibold leading-snug">
              {title}
            </h4>
            <p className="mt-1 font-mono text-[length:var(--step--1)] text-fg-muted">{meta}</p>
          </div>
          <button
            type="button"
            className="inline-flex min-h-11 shrink-0 items-center border border-rule px-4 text-[length:var(--step--1)] hover:border-[color:var(--accent)]"
            {...invoke(id, "close")}
          >
            Close
          </button>
        </div>
        <DialogImage image={image} />
        <noscript>
          <a href={image.src} className="mt-4 inline-flex min-h-11 items-center text-accent underline underline-offset-4">
            Open the certificate image
          </a>
        </noscript>
      </dialog>
    </>
  );
}
