"use client";

import Image from "next/image";
import type { RecordImage } from "@/types/portfolio";

/**
 * The certificate itself, through `next/image`. Only ever loaded by
 * `DialogImage`'s `lazy()` import, the first time a dialog opens, so neither
 * this module nor `next/image`'s client code is in the page's initial JS.
 */
export default function CertificateImage({ image }: { readonly image: RecordImage }) {
  return (
    <Image
      src={image.src}
      alt={image.alt}
      width={image.width}
      height={image.height}
      sizes="(min-width: 64rem) 56rem, 92vw"
      className="h-auto w-full border border-rule"
    />
  );
}
