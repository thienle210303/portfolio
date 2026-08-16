import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, Newsreader } from "next/font/google";
import { cn } from "@/lib/cn";
import { careerEntries, education, profile, socialLinks, SITE_URL } from "@/content/portfolio";
import SkipLink from "@/components/layout/SkipLink";
import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import "./globals.css";

// Newsreader is variable on both `opsz` and `wght`, which is the reason it is
// here: the same family sets a 4rem headline and a 400-word case study without
// a second display face. Do not pin `weight` — that would collapse the
// variation axes the type scale relies on.
const newsreader = Newsreader({
  style: ["normal", "italic"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
});

// Plex Sans and Plex Mono ship as static faces, so the weights actually used
// have to be listed. Keep these lists minimal — every entry is a file the
// visitor downloads.
const plexSans = IBM_Plex_Sans({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

const plexMono = IBM_Plex_Mono({
  weight: ["400", "600"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
});

const title = `${profile.name} — ${profile.title}`;
// Drawn directly from the two content sentences the whole site hangs
// from — nothing added, nothing paraphrased into a new claim.
const description = `${profile.positioning} ${profile.focus}`;

// Organisation names read from content rather than retyped, so neither
// drifts out of sync with the résumé if either changes.
const almaMater = education[0]?.institution;
// The most recent `work` entry by sortKey — i.e. the current employer,
// whoever that is — rather than a hardcoded id that would need updating
// by hand the day the employer changes.
const currentEmployer = careerEntries
  .filter((entry) => entry.type === "work")
  .sort((a, b) => (a.sortKey > b.sortKey ? -1 : 1))[0]?.organization;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: title,
    template: `%s — ${profile.name}`,
  },
  description,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: profile.name,
    title,
    description,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  authors: [{ name: profile.name, url: SITE_URL }],
  creator: profile.name,
  // Every entry is a real term from src/content/portfolio — the title,
  // the focus-area phrases, and the two organisations read from
  // careerEntries/education above (never retyped).
  keywords: [
    profile.name,
    profile.title,
    "Automation",
    "Developer Experience",
    "Performance",
    "AI Workflows",
    "Web Scraping",
    ...(currentEmployer ? [currentEmployer] : []),
    ...(almaMater ? [almaMater] : []),
  ],
};

// Person structured data. Every field is sourced from src/content/portfolio;
// nothing here (no address, no invented handle) goes beyond what's on file.
const personJsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: profile.name,
  url: SITE_URL,
  email: profile.email,
  jobTitle: profile.title,
  description: profile.positioning,
  sameAs: socialLinks
    .filter((link) => link.platform === "GitHub" || link.platform === "LinkedIn")
    .map((link) => link.href),
  // Omitted entirely if `education` is ever empty, rather than emitting a
  // broken/empty alumniOf — matches the "omit, never invent" content rule.
  ...(almaMater ? { alumniOf: { "@type": "CollegeOrUniversity", name: almaMater } } : {}),
};

/**
 * Resolves the theme and stamps it on <html> before the browser paints, so a
 * night-theme visitor never sees a white flash on load. It has to be an inline
 * synchronous script in the document — anything deferred, hydrated or bundled
 * runs after first paint, which is exactly the frame this exists to prevent.
 *
 * Stored preference wins; with none, the OS preference is resolved here rather
 * than left to CSS, so the attribute is always concrete and the toggle only
 * ever has one state to read. globals.css keeps a `prefers-color-scheme`
 * fallback for the case where this script does not run at all.
 */
const THEME_SCRIPT = `(function(){try{var s=localStorage.getItem("theme");document.documentElement.dataset.theme=s==="day"||s==="night"?s:(window.matchMedia("(prefers-color-scheme: dark)").matches?"night":"day")}catch(e){}})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      // Scoped to this one element and required, not a workaround: THEME_SCRIPT
      // deliberately writes `data-theme` onto <html> before React hydrates, so
      // the server markup and the client DOM genuinely differ by that attribute
      // and always will. Suppression does not extend to any child, so a real
      // mismatch anywhere inside the tree still surfaces.
      suppressHydrationWarning
      className={cn(newsreader.variable, plexSans.variable, plexMono.variable)}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="blueprint-grid bg-ground text-fg">
        <SkipLink />
        <SiteHeader />
        {/* tabIndex={-1} is load-bearing, not decoration. Fragment
            navigation only scrolls; it cannot move focus to a
            non-interactive element. Without this the skip link and both
            "Back to top" controls scroll the page while leaving keyboard
            focus stranded where it was, which defeats the point of a skip
            link entirely. Verified by e2e/navigation.spec.ts. */}
        <main id="main" tabIndex={-1}>
          {children}
        </main>
        <SiteFooter />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
        />
      </body>
    </html>
  );
}
