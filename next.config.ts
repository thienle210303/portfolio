import type { NextConfig } from "next";

/**
 * Response headers for a public personal site. No full Content-Security-Policy:
 * the theme is set by an inline script before first paint (layout.tsx), and the
 * analytics load their own scripts, so a script policy would need nonces on
 * every page for little gain on a site with no logins and nothing stored. What
 * is here costs nothing and closes the common gaps:
 *  - the site may be framed only by itself (the résumé dialog frames our PDF);
 *  - no MIME sniffing;
 *  - other sites see only the origin it was linked from, never the path;
 *  - no camera, microphone, location or payment, which the site never asks for.
 * Vercel adds HSTS itself.
 */
const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
];

const nextConfig: NextConfig = {
  // No "X-Powered-By: Next.js": nothing a visitor needs, something a scanner reads.
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
