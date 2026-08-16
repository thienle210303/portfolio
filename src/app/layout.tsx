import type { Metadata } from "next";
import { Instrument_Serif, Inter, JetBrains_Mono } from "next/font/google";
import { cn } from "@/lib/cn";
import { careerEntries, education, profile, socialLinks, SITE_URL } from "@/content/portfolio";
import SkipLink from "@/components/layout/SkipLink";
import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import "./globals.css";

const instrumentSerif = Instrument_Serif({
  weight: ["400"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
});

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

const jetbrainsMono = JetBrains_Mono({
  weight: ["400", "700"],
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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={cn(instrumentSerif.variable, inter.variable, jetbrainsMono.variable)}>
      <body className="bg-ink text-paper">
        <SkipLink />
        <SiteHeader />
        <main id="main">{children}</main>
        <SiteFooter />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
        />
      </body>
    </html>
  );
}
