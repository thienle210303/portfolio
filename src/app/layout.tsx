import type { Metadata } from "next";
import { Fraunces, IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import { cn } from "@/lib/cn";
import { careerEntries, education, profile, socialLinks, SITE_URL } from "@/content/portfolio";
import { buildCompanionFacts } from "@/lib/companion-facts";
import SkipLink from "@/components/layout/SkipLink";
import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import Companion from "@/components/companion/Companion";
import InkReveal from "@/components/ui/InkReveal";
import "./globals.css";

// Fraunces is variable on `opsz` and `wght`, which is the reason a variable
// display face is here at all: the same family sets a 4rem headline and a
// 400-word case study without a second display face. Do not pin `weight` —
// that would collapse the variation axes the type scale relies on.
//
// `axes` (Workstream 3, P4) is what actually turns that on. next/font only
// ships the axes it's told to request beyond the default `wght` — without
// this, `font-optical-sizing: auto` has nothing to steer, because the one
// variable file next/font fetches never carries an `opsz` axis in the first
// place: silent substitution rather than a visible bug. With it, the same file
// genuinely reshapes letterforms between the hero's ~4rem headline and a ~13px
// note — heavier stroke contrast and a taller x-height at small sizes, closer
// to the display cut at large ones.
//
// `SOFT` and `WONK` are requested for the opposite reason: to pin them off.
// They are Fraunces' two personality axes — `SOFT` rounds the terminals,
// `WONK` swaps in the single-storey g and the splayed leg forms — and both
// default to a value this design does not want. An axis cannot be set to 0 in
// CSS unless the file carries it, so they are fetched here and then held at 0
// by the `.font-display` rule in globals.css. That pairing is load-bearing:
// drop either half and the page renders the whimsical cut of the face.
//
// Fraunces replaces Newsreader (round 17). Newsreader is a reading serif with
// low stroke contrast, which is why the page read sober rather than expensive;
// Fraunces at SOFT 0 / WONK 0 is the same variable-axis argument with the
// contrast a display face needs. The cost is measured, not assumed — see the
// perf row in docs/feedback-tracker.md.
// `style` is normal only, and that is the single largest asset decision on
// the site. The display italic is its own font file: dropping it took the
// font payload from 375.5 KB to 223.8 KB — **151.7 KB**, 40% of everything
// the page downloads in fonts, and roughly forty times what swapping the
// whole display family cost. It bought four italic lines: a quote on the
// business card, two world names, and the closing sign-off.
//
// Nothing here synthesises a replacement on purpose. A browser will shear the
// roman into a faux oblique for any `italic` left in the markup, and on a
// high-contrast serif at --step-2 that looks like a rendering fault, so all
// four call sites were set in roman instead. Adding `italic` back to a
// `font-display` element without adding it here will look wrong, not fall
// back gracefully.
//
// Plex Sans and Plex Mono below have always been loaded without an italic,
// so every sans and mono italic on this page — including the code block's
// strings and comments — has been a synthesised oblique all along. This
// change makes the display face consistent with them rather than being the
// one exception that cost a file.
const fraunces = Fraunces({
  style: ["normal"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
  axes: ["opsz", "SOFT", "WONK"],
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
 *
 * The trailing statement stamps `data-motion` on the same element for the
 * same reason `data-theme` has to be — the hero's load choreography
 * (globals.css, P2) animates the page's own `<h1>`, a Largest Contentful
 * Paint candidate, so the attribute that gates it must exist before first
 * paint or the animation would start a frame late and the LCP guard would be
 * fighting a flash instead of preventing one. It is unconditional, outside
 * the `try` above and never itself capable of throwing: whether the theme
 * read succeeded or the `catch` swallowed a `localStorage` failure, the hero
 * still gets its one entrance. The two real kill switches both live in CSS,
 * not here — see the block comment on the hero keyframes in globals.css.
 */
const THEME_SCRIPT = `(function(){try{var s=localStorage.getItem("theme");document.documentElement.dataset.theme=s==="day"||s==="night"?s:(window.matchMedia("(prefers-color-scheme: dark)").matches?"night":"day")}catch(e){}document.documentElement.dataset.motion=""})()`;

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
      className={cn(fraunces.variable, plexSans.variable, plexMono.variable)}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="blueprint-grid bg-ground text-fg">
        {/* P6's header-hairline sentinel: a 1px, off-flow, aria-hidden marker
            InkReveal's second observer watches to know whether the visitor
            is still at the very top of the page. It has to be `body`'s
            first child, ahead of the sticky header, so its geometric
            position is the actual document top rather than wherever the
            header's own box happens to end — the two are unrelated to each
            other on purpose: this element is never painted (1px, no
            content), it exists purely as an IntersectionObserver target. */}
        <div aria-hidden="true" data-scroll-sentinel className="pointer-events-none absolute left-0 top-0 h-px w-px" />
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
        {/* D1: facts computed once, on the server, from src/content/* — see
            src/lib/companion-facts.ts. The content arrays never reach the
            client chunk the cats ship in; only this small object does. */}
        <Companion facts={buildCompanionFacts()} />
        {/* The one reveal observer for the whole page — see that file's own
            doc comment for why its two jobs (section settles + the header
            hairline sentinel above) live in a single mount rather than two. */}
        <InkReveal />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
        />
      </body>
    </html>
  );
}
