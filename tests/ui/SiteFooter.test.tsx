import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import SiteFooter from "@/components/layout/SiteFooter";
import { footerLine, profile, socialLinks } from "@/content/portfolio";

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

  it.each(["production", "preview", undefined])(
    "renders the one-line footer (VERCEL_ENV %o)",
    (value) => {
      vi.stubEnv("VERCEL_ENV", value);
      const { container } = render(<SiteFooter />);
      const text = container.querySelector("footer")?.textContent ?? "";
      const line = `© 2026 ${profile.name} · ${footerLine}`;
      expect(footerLine).toBe("Two cats reviewed this code. Both approved.");
      if (value === "production") expect(text).toBe(`${line} · ${DISCLOSURE}`);
      else expect(text).toBe(line);
    },
  );

  it("has no email or social links", () => {
    const { container } = render(<SiteFooter />);
    expect(container.querySelector('a[href^="mailto:"]')).toBeNull();
    for (const link of socialLinks) {
      expect(container.querySelector(`a[href="${link.href}"]`)).toBeNull();
    }
    expect(container.querySelectorAll("a")).toHaveLength(0);
  });
});
