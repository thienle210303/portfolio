import type { MetadataRoute } from "next";
import { SITE_URL } from "@/content/portfolio";

// This is a build-time route handler, not a rendered component, so
// `new Date()` here is fine — it is not a hydration risk.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
