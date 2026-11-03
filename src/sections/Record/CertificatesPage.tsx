import Stamps from "./Stamps";

export const CERTIFICATES_PAGE_ID = "diary-certificates";

/** The last page: the certificates as stamps, each with a drawing of what it
 *  was about. Pressing one opens the certificate in a dialog (`Stamps`). */
export default function CertificatesPage() {
  return (
    <article
      id={CERTIFICATES_PAGE_ID}
      aria-labelledby="diary-certificates-title"
      className="diary-page @container relative flex min-h-full scroll-mt-20 flex-col bg-surface px-5 pt-9 pb-16 sm:px-10 sm:pt-10"
    >
      <Stamps titleId="diary-certificates-title" />
    </article>
  );
}
