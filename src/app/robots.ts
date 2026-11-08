import type { MetadataRoute } from "next";
import { SITE_URL } from "@/content/portfolio";
import { INDEXABLE } from "@/lib/seo";

// Production: everything but the two form endpoints, which are POST-only and
// have nothing to read. A Vercel preview: nothing (src/lib/seo.ts).
export default function robots(): MetadataRoute.Robots {
  if (!INDEXABLE) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: "/api/",
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
