import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import SiteFooter from "@/components/layout/SiteFooter";
import { profile, socialLinks } from "@/content/portfolio";

/**
 * The analytics disclosure line, which is the only sentence on the page that
 * talks about the page. It used to render in every environment while the
 * scripts it describes render in production only, so a local or preview build
 * claimed measurement that was not happening — the same class of error the
 * margin rail's rules exist to prevent, one layer down in the colophon.
 *
 * Both arms are pinned here rather than in `e2e/accessibility.spec.ts`,
 * because Playwright only ever runs against `pnpm dev`, where `VERCEL_ENV` is
 * unset: the e2e suite can see the absent arm and nothing else. The present
 * arm has no environment in which the browser suite could observe it.
 *
 * The two DOM nodes this gate now costs a gate-off build — the paragraph and
 * the `·` divider before it — are the difference between 3651 and 3649 nodes
 * in `docs/feedback-tracker.md`'s round 17 stage 4 row.
 */
const DISCLOSURE = "Anonymous page counts, no cookies (Vercel)";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("SiteFooter", () => {
  it("discloses the analytics in one plain line on a production deployment", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    render(<SiteFooter />);
    expect(screen.getByText(DISCLOSURE)).toBeInTheDocument();
  });

  it.each(["preview", "development", "", undefined])(
    "omits the disclosure when VERCEL_ENV is %o, because nothing is being measured",
    (value) => {
      vi.stubEnv("VERCEL_ENV", value);
      render(<SiteFooter />);
      expect(screen.queryByText(DISCLOSURE)).not.toBeInTheDocument();
    },
  );

  it("drops the divider with the line, not just the sentence", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    const { container: gateOn } = render(<SiteFooter />);
    const dividersOn = gateOn.querySelectorAll('[aria-hidden="true"]').length;

    vi.stubEnv("VERCEL_ENV", "preview");
    const { container: gateOff } = render(<SiteFooter />);
    const dividersOff = gateOff.querySelectorAll('[aria-hidden="true"]').length;

    expect(dividersOn - dividersOff).toBe(1);
  });

  // The rest of the colophon is not gated on anything, and a regression in the
  // gate must not be able to take it with it.
  it.each(["production", "preview", undefined])(
    "keeps the colophon's own links in every environment (VERCEL_ENV %o)",
    (value) => {
      vi.stubEnv("VERCEL_ENV", value);
      render(<SiteFooter />);
      expect(screen.getByRole("link", { name: "Back to top" })).toHaveAttribute("href", "#main");
      expect(screen.getByText(`© 2026 ${profile.name}`)).toBeInTheDocument();
      // By href, not by accessible name: the email link renders its handle
      // and the others render their label, and one link's label is a prefix
      // of another's handle.
      for (const link of socialLinks) {
        expect(
          screen.getAllByRole("link").some((node) => node.getAttribute("href") === link.href),
          `${link.platform} link missing from the colophon`,
        ).toBe(true);
      }
    },
  );
});
