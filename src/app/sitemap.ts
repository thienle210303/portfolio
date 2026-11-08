import type { MetadataRoute } from "next";
import { SITE_URL } from "@/content/portfolio";
import { INDEXABLE } from "@/lib/seo";

// This is a build-time route handler, not a rendered component, so
// `new Date()` here is fine — it is not a hydration risk. The two pages a
// person can land on: the site and the résumé. A preview lists none.
export default function sitemap(): MetadataRoute.Sitemap {
  if (!INDEXABLE) return [];
  const lastModified = new Date();
  return [
    { url: SITE_URL, lastModified, changeFrequency: "monthly", priority: 1 },
    { url: `${SITE_URL}/resume`, lastModified, changeFrequency: "monthly", priority: 0.7 },
  ];
}
