import type { CSSProperties } from "react";
import { Drawing } from "@/components/scenery/Drawing";
import { certifications, record } from "@/content/portfolio";
import { resolved, type Certification } from "@/types/portfolio";
import { ImageDialog } from "./ImageDialog";

const CERTS: readonly Certification[] = certifications;
/** Each stamp a little askew (the board's three, and a fourth). */
const TILT = [-7, 4, -3, 5];

/**
 * "Certificates I've collected": every certification that has an image, as a
 * perforated postage stamp with a small line drawing. Pressing one opens the
 * certificate itself (`ImageDialog`). A certification without an image (AT&T)
 * gets no stamp: owner, 2026-10-21. It is still on `/resume`.
 */
export default function Stamps({ className }: { readonly className?: string }) {
  const stamped = CERTS.filter((c) => c.stamp);
  return (
    <div className={className}>
      <h4 className="font-serif text-[length:var(--step-1)] italic text-fg">{record.certificates}</h4>
      <ul role="list" className="mt-4 flex flex-wrap gap-x-3 gap-y-5">
        {stamped.map((c, i) => {
          const stamp = c.stamp!;
          const date = resolved(c.date);
          return (
            <li key={c.id} className="rotate-(--tilt) stamp-lift" style={{ "--tilt": `${TILT[i % TILT.length]}deg` } as CSSProperties}>
              <ImageDialog
                id={`certificate-${c.id}`}
                title={c.name}
                meta={[c.issuer, c.via ? `via ${c.via}` : null, date].filter(Boolean).join(" · ")}
                image={stamp.image}
                className="record-stamp block w-[7.5rem] text-left"
              >
                <span className="record-stamp-paper flex aspect-[132/150] flex-col justify-between bg-surface">
                  <span className="flex min-h-0 flex-1 flex-col justify-between border border-rule p-2.5">
                    <Drawing name={`stamp-${stamp.drawing}`} className="h-11 w-full shrink-0 text-accent [mask-position:bottom]" />
                    <span className="block">
                      <span className="block font-display text-[length:var(--step-0)] font-semibold leading-none text-fg">
                        {stamp.short}
                      </span>
                      <span className="mt-1 line-clamp-2 text-[length:var(--step--2)] leading-tight text-fg-muted">
                        {c.name}
                      </span>
                    </span>
                  </span>
                </span>
              </ImageDialog>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
