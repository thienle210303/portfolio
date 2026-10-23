"use client";

import { lazy, Suspense, useEffect, useRef, useState } from "react";
import type { RecordImage } from "@/types/portfolio";

const CertificateImage = lazy(() => import("./CertificateImage"));

/**
 * Holds a certificate's place in its dialog, and mounts the image (and
 * `next/image` with it) the first time the dialog opens. Importing
 * `next/image` from a server component, even for `getImageProps()`, put its
 * client code in the page's initial JS (+5.7 KB gzip, measured); a lazy import
 * here keeps it out until a stamp is pressed.
 *
 * Without JavaScript the dialog still opens (invoker commands) and offers the
 * file itself as a link, rendered by `ImageDialog`.
 */
export function DialogImage({ image }: { readonly image: RecordImage }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const dialog = ref.current?.closest("dialog");
    if (!dialog) return;
    const onToggle = () => {
      if (dialog.open) setShown(true);
    };
    dialog.addEventListener("toggle", onToggle);
    return () => dialog.removeEventListener("toggle", onToggle);
  }, []);
  return (
    <div ref={ref} className="mt-4" style={{ aspectRatio: `${image.width} / ${image.height}` }}>
      {shown ? (
        <Suspense fallback={null}>
          <CertificateImage image={image} />
        </Suspense>
      ) : null}
    </div>
  );
}
