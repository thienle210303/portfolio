import { describe, expect, it } from "vitest";
import { resolveSiteUrl } from "@/lib/site-url";
import { SITE_URL } from "@/content/portfolio";

const FALLBACK = "https://thienle.dev";

/**
 * `metadataBase: new URL(SITE_URL)` runs during the build. A malformed value
 * here does not degrade — it fails the build, or worse, silently publishes a
 * preview deployment's canonical URLs as production. These tests pin the two
 * things that matter: the resolver always returns something `new URL()`
 * accepts, and precedence is explicit-override first.
 */
describe("resolveSiteUrl", () => {
  it("prefers an explicit override over everything else", () => {
    expect(resolveSiteUrl("https://thien.example", "preview.host", FALLBACK)).toBe(
      "https://thien.example",
    );
  });

  it("falls back to the deployment's own hostname, so previews are not production", () => {
    expect(resolveSiteUrl(undefined, "portfolio-abc123.vercel.app", FALLBACK)).toBe(
      "https://portfolio-abc123.vercel.app",
    );
  });

  it("falls back to the compiled-in domain when the environment says nothing", () => {
    expect(resolveSiteUrl(undefined, undefined, FALLBACK)).toBe(FALLBACK);
  });

  it("accepts a bare hostname, which is the form a host hands you", () => {
    expect(resolveSiteUrl("thienle.dev", undefined, FALLBACK)).toBe(FALLBACK);
  });

  it("strips a trailing slash, which would otherwise double up in every URL", () => {
    expect(resolveSiteUrl("https://thienle.dev/", undefined, FALLBACK)).toBe(FALLBACK);
  });

  it("keeps only the origin, so a stray path cannot prefix every canonical URL", () => {
    expect(resolveSiteUrl("https://thienle.dev/portfolio?x=1#top", undefined, FALLBACK)).toBe(
      FALLBACK,
    );
  });

  it("preserves an explicit port, which is how a self-hosted deployment differs", () => {
    expect(resolveSiteUrl("http://localhost:3000", undefined, FALLBACK)).toBe(
      "http://localhost:3000",
    );
  });

  it("ignores empty and whitespace-only values rather than building a broken URL", () => {
    expect(resolveSiteUrl("", "   ", FALLBACK)).toBe(FALLBACK);
  });

  it("ignores a value that is not a URL at all", () => {
    expect(resolveSiteUrl("http://", undefined, FALLBACK)).toBe(FALLBACK);
  });
});

describe("SITE_URL", () => {
  it("is always something new URL() accepts, because metadataBase depends on it", () => {
    expect(() => new URL(SITE_URL)).not.toThrow();
  });

  it("carries no trailing slash, so `${SITE_URL}/sitemap.xml` is well formed", () => {
    expect(SITE_URL.endsWith("/")).toBe(false);
    expect(new URL(`${SITE_URL}/sitemap.xml`).pathname).toBe("/sitemap.xml");
  });
});
