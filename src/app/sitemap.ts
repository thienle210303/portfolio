import type { MetadataRoute } from "next";
import { SITE_URL } from "@/content/portfolio";
import { INDEXABLE } from "@/lib/seo";
import { SHOWN, workHref } from "@/lib/showcase";

// This is a build-time route handler, not a rendered component, so
// `new Date()` here is fine — it is not a hydration risk. The pages a person
// can land on: the site, the résumé and each case study (round 32). A preview
// lists none.
export default function sitemap(): MetadataRoute.Sitemap {
  if (!INDEXABLE) return [];
  const lastModified = new Date();
  return [
    { url: SITE_URL, lastModified, changeFrequency: "monthly", priority: 1 },
    ...SHOWN.map((project) => ({
      url: `${SITE_URL}${workHref(project.id)}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    { url: `${SITE_URL}/resume`, lastModified, changeFrequency: "monthly", priority: 0.7 },
  ];
}
