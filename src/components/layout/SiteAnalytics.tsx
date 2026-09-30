import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

/**
 * Whether the two Vercel scripts should mount at all: production deployments
 * only, never a preview and never a local build.
 *
 * `VERCEL_ENV` rather than `NODE_ENV` because the two answer different
 * questions. `NODE_ENV` is `production` for *any* optimised build — including
 * `pnpm build` on this laptop and every preview deployment — and the point
 * here is to separate "built for production" from "actually serving the
 * public site", which is the only traffic worth counting.
 *
 * Two things ride on that distinction:
 *
 * 1. **The console-error gate.** `e2e/accessibility.spec.ts` allows zero
 *    `console.error` on load, and the Playwright suite runs against
 *    `pnpm dev`, where `@vercel/analytics` fetches a debug script from
 *    va.vercel-scripts.com. Mounting unconditionally would make that gate
 *    depend on a third-party fetch succeeding — a red run would mean "the
 *    network blinked", not "the page broke". Locally `VERCEL_ENV` is unset,
 *    so in dev and under Playwright this renders nothing and no request is
 *    ever made. `e2e/accessibility.spec.ts` pins that directly.
 *
 * 2. **The event allowance.** Web Analytics events are counted per *team*,
 *    not per project, and the Hobby plan includes 50,000 a month. Preview
 *    deployments are almost entirely Thien reloading his own branch, so
 *    counting them would both spend that allowance and skew the only number
 *    the section exists to report.
 *
 * Every route on this site prerenders, so this predicate is evaluated at
 * build time and the `<Analytics />` / `<SpeedInsights />` elements are gone
 * from the output. That is *not* the same as the packages leaving the bundle:
 * round 17 stage 4 diffed the full response list of a gate-off and a gate-on
 * build and found `_next/static/chunks/01v6f8nq-k-ez.js` — 28,861 bytes,
 * carrying both vendor packages' code and their script URLs — requested by
 * both, with total script bytes identical either way. The gate is about
 * behaviour, not bytes; see `docs/feedback-tracker.md`.
 *
 * This predicate is also what gates `SiteFooter`'s disclosure line, so the
 * sentence and the scripts it describes can only appear together.
 */
export function analyticsEnabled(): boolean {
  return process.env.VERCEL_ENV === "production";
}

/**
 * Server Component, and deliberately the only place either Vercel package is
 * imported. Both render `null` and inject their own deferred `<script>`, so
 * there is no markup here to style and nothing for the Blueprint alias rules
 * to apply to.
 *
 * Neither collects personal data or sets a cookie, which is why the site
 * carries no consent banner — one honest line in `SiteFooter` instead, which
 * is the only self-referential copy on the page and is gated on the same
 * predicate, so it is never present where it would not be true.
 */
export default function SiteAnalytics() {
  if (!analyticsEnabled()) return null;

  return (
    <>
      <Analytics />
      <SpeedInsights />
    </>
  );
}
