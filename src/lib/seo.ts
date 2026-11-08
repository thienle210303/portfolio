import type { Metadata } from "next";
import { profile } from "@/content/portfolio";

/**
 * Whether search engines may index this deployment. Production does; a Vercel
 * preview does not (it is a copy of the site on a throwaway hostname, and an
 * indexed copy competes with the real one); a build off Vercel (local, or any
 * other host) does, since there is nothing to tell it apart from production.
 */
export const INDEXABLE = process.env.NEXT_PUBLIC_VERCEL_ENV
  ? process.env.NEXT_PUBLIC_VERCEL_ENV === "production"
  : true;

export const SITE_TITLE = `${profile.name} — ${profile.title}`;

/**
 * The search snippet. My one positioning line, as written on the page: short
 * enough that a result shows it whole (the old one ran past 200 characters and
 * was cut mid-sentence).
 */
export const SITE_DESCRIPTION = profile.positioning;

/** The root's share image (`src/app/opengraph-image.tsx`), named explicitly for
 *  routes that set their own `openGraph`: a page's `openGraph` replaces the
 *  layout's whole, so without this it would share with no picture. */
export const SHARE_IMAGE = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: SITE_TITLE,
} as const;

/** The parts of `openGraph` every page shares; a page adds its url and title. */
export const OPEN_GRAPH_BASE = {
  type: "website",
  siteName: profile.name,
  locale: "en_US",
} as const satisfies Metadata["openGraph"];

export const ROBOTS: Metadata["robots"] = INDEXABLE
  ? {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    }
  : { index: false, follow: false };
