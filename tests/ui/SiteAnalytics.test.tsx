import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import SiteAnalytics, { analyticsEnabled } from "@/components/layout/SiteAnalytics";

/**
 * The gate, not the vendor scripts. Both Vercel components are stubbed here
 * on purpose: the real `/next` entries reach for `useParams`/`useSearchParams`
 * and would need a router context to mount, which would make this suite
 * brittle about Next internals when the only thing worth pinning is *whether*
 * they mount at all.
 *
 * That question is load-bearing rather than cosmetic. `e2e/accessibility.spec.ts`
 * allows zero `console.error` on load and the Playwright suite runs against
 * `pnpm dev`, where `@vercel/analytics` fetches a debug script from
 * va.vercel-scripts.com. An ungated mount would tie that gate to a
 * third-party fetch succeeding, so a red run would mean "the network blinked"
 * rather than "the page broke". Hence: production deployments only, proven
 * here for every other environment the site is ever built in.
 */
vi.mock("@vercel/analytics/next", () => ({
  Analytics: () => <div data-testid="vercel-analytics" />,
}));
vi.mock("@vercel/speed-insights/next", () => ({
  SpeedInsights: () => <div data-testid="vercel-speed-insights" />,
}));

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("analyticsEnabled", () => {
  it("is true only on a production deployment", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    expect(analyticsEnabled()).toBe(true);
  });

  it.each(["preview", "development", "", undefined])(
    "is false when VERCEL_ENV is %o",
    (value) => {
      vi.stubEnv("VERCEL_ENV", value);
      expect(analyticsEnabled()).toBe(false);
    },
  );
});

describe("SiteAnalytics", () => {
  it("mounts both Vercel scripts on a production deployment", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    render(<SiteAnalytics />);
    expect(screen.getByTestId("vercel-analytics")).toBeInTheDocument();
    expect(screen.getByTestId("vercel-speed-insights")).toBeInTheDocument();
  });

  // The arm that protects the console-error gate and keeps preview traffic
  // out of the (team-wide, shared) Hobby event allowance.
  it.each(["preview", "development", undefined])(
    "renders nothing at all when VERCEL_ENV is %o",
    (value) => {
      vi.stubEnv("VERCEL_ENV", value);
      const { container } = render(<SiteAnalytics />);
      expect(container).toBeEmptyDOMElement();
      expect(screen.queryByTestId("vercel-analytics")).not.toBeInTheDocument();
      expect(screen.queryByTestId("vercel-speed-insights")).not.toBeInTheDocument();
    },
  );
});
