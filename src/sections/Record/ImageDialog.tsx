import type { ReactNode } from "react";
import { getImageProps } from "next/image";
import { cn } from "@/lib/cn";
import type { RecordImage } from "@/types/portfolio";

/**
 * A button that opens a native `<dialog>` holding a certificate or award
 * image. No JavaScript of its own: the button is an invoker
 * (`commandfor` + `command="show-modal"`), so the browser opens the dialog
 * modally, closes it on Escape and returns focus to the button. Browsers
 * without invoker commands get the same calls from `RecordFilters.tsx`'s
 * fallback.
 *
 * The image is a plain `<img loading="lazy">` whose optimised `srcset` comes
 * from `getImageProps()` on the server, so no image runtime ships. A lazy
 * image inside a closed dialog is not rendered, so nothing is fetched until
 * the button is pressed (`e2e/record.spec.ts`).
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
  const { props } = getImageProps({
    src: image.src,
    alt: image.alt,
    width: image.width,
    height: image.height,
    sizes: "(min-width: 64rem) 56rem, 92vw",
    loading: "lazy",
  });
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
        {/* eslint-disable-next-line @next/next/no-img-element -- props come from next/image's getImageProps */}
        <img {...props} alt={image.alt} className={cn("mt-4 h-auto w-full border border-rule")} />
      </dialog>
    </>
  );
}
