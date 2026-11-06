# Performance-budget engineering for a rich interactive experience on Next.js 16 + Vercel Hobby (September 2026)

> **Measurement provenance.** Findings marked **[MEASURED HERE]** were produced by
> me on 2026-09-29 against this repository: the `.next` build present on branch
> `claude/round-16-demolition`, served with `next start -p 3100`, fetched with
> `curl -H "Accept-Encoding: gzip"` (so the byte counts are transfer bytes, not
> disk bytes), plus live requests to the Google Fonts CSS2 API. They are
> reproducible with the commands quoted. Everything else is cited to a URL.
> Findings marked **[INFERENCE]** are my reasoning, not a source's claim.
>
> **Installed versions (from `D:/Project/portfolio/package.json` and
> `node_modules/next/package.json`): `next@16.3.1`, `react@19.2.8`,
> `react-dom@19.2.8`, `tailwindcss@^4`, `pnpm@10.33.0`.** Every version-sensitive
> claim below names its version.

---

## Objective: the ranked playbook — what buys the most KB/ms per unit of effort

### Takeaway

The single largest, cheapest, and most reversible win on this site is **not** the
JavaScript — it is one line of font configuration. Removing `axes: ["opsz"]`
from the `Newsreader()` call in `src/app/layout.tsx` cuts **152.6 KB (46% of the
entire 331.4 KB font payload, ~11% of all page bytes)** with a one-line diff.
The italic, which the project's own tracker flags as "the single largest win
available", is actually the *second* lever, and it is far cheaper than believed:
the italic only costs 143.6 KB *because* it carries the `opsz` axis. Priced
without `opsz`, a real italic costs 63.0 KB.

### Cited Findings

**Tier 1 — one-line diffs, ≥100 KB each**

| # | Change | Saving | Effort | Risk |
|---|---|---|---|---|
| 1 | Drop `axes: ["opsz"]` from `Newsreader()` | **152.6 KB** (font bytes 331.4 → 178.8 KB) | 1 line | Loses continuous optical sizing (see Fonts §) |
| 2 | Drop Newsreader italic (`style: ["normal"]`), keeping `opsz` off | a **further 63.0 KB** (→ 115.8 KB total fonts) | 1 line + 2 call-sites | Loses real italic at `BusinessCard.tsx:275`, `Closing.tsx:76` |
| 2′ | *Alternative to 1+2:* two `next/font/local` cuts with `opsz` pinned at 16 and 72, roman only | 331.4 → ~112.2 KB fonts (**−219 KB**) *and keeps a genuine display/text optical distinction* | ~1 h (download 2 instanced files, wire `next/font/local`) | Two discrete cuts instead of a continuum |

**Tier 2 — structural, 20–100 KB**

| # | Change | Est. saving | Effort |
|---|---|---|---|
| 3 | Defer the Companion (26.4 KB gz chunk, decorative) behind `next/dynamic` + an idle/interaction trigger | ~26 KB off initial JS | Medium |
| 4 | Audit the 39.6 KB `0cz1d0mv5g_q7.js` app chunk — the largest non-framework chunk on `/` | up to ~39 KB | Medium; needs `pnpm next experimental-analyze` |
| 5 | Shrink the **98.5 KB gzipped (823 KB raw) HTML document** — it is the biggest single transfer on the page after fonts | unknown, potentially large | Medium |

**Tier 3 — milliseconds, not kilobytes**

| # | Change | Effect | Evidence |
|---|---|---|---|
| 6 | `content-visibility: auto` on below-the-fold `<Section>`s | web.dev's own demo: 232 ms → 30 ms rendering (~7×) | [web.dev/articles/content-visibility](https://web.dev/articles/content-visibility) |
| 7 | IntersectionObserver/`contentvisibilityautostatechange`-gated hydration of below-fold islands | Wix field data: **−20% JS payload, ~−40% INP** | [Wix Engineering, 9 Nov 2025](https://www.wix.engineering/post/40-faster-interaction-how-wix-solved-react-s-hydration-problem-with-selective-hydration-and-suspen) |
| 8 | Never leave a gated `rAF` loop armed at rest | Idle page ≈ 25 mW vs CSS animation 100–500 mW | [Torchbox, 18 Feb 2025](https://torchbox.com/wagtail-cms-services/blog/how-much-power-do-web-assets-use/) |

**Tier 4 — explicitly *not* worth it here**

- `cacheComponents: true` (PPR): this is a static personal site with no
  per-request data. PPR's value is mixing dynamic islands into a static shell;
  there is nothing dynamic to stream. It also forces the Node runtime and
  removes `dynamic`/`revalidate`/`fetchCache` route segment config
  ([cacheComponents](https://nextjs.org/docs/app/api-reference/config/next-config-js/cacheComponents),
  local copy `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/cacheComponents.md`).
- `reactCompiler: true`: it reduces *re-renders*, not bundle size, and it adds
  Babel to the build. Next 16 docs: "Expect compile times in development and
  during builds to be higher when enabling this option as the React Compiler
  relies on Babel" ([Next.js 16 blog](https://nextjs.org/blog/next-16)).
- Shaving the React/Next runtime itself: it is 127.6 KB gz and fixed (see §2).

### Inferences

- **[INFERENCE]** The ordering above is by *KB saved per line of diff*. Items 1
  and 2 together take the site from 188.2 KB JS + 331.4 KB fonts = 519.6 KB down
  to 188.2 + 115.8 = 304.0 KB — a 41% cut in total transferred bytes — without
  touching a single component.
- **[INFERENCE]** Because the LCP element is a text paragraph and
  `font-display: swap` is already set (verified in the served CSS), the font
  saving buys **bandwidth and CLS-window, not LCP directly**. The LCP win comes
  from Tier 2 item 5 (HTML size) and from render-blocking CSS. See §6.

### Gaps

- I did not run `pnpm build` + `pnpm perf` after any change, so every "saving"
  above is a byte-count arithmetic result, not a re-measured LCP/TBT delta.

---

## Key question 1 — Next.js 16 specifics: what the App Router actually gives you for shaving client JS in 2026

### Takeaway

Next.js 16.3.1 gives you Server Components by default, automatic per-route code
splitting, automatic `unicode-range` font splitting, and a new Turbopack bundle
analyzer — but it **removed the `First Load JS` number from `next build`
output**, so you must measure bytes yourself. PPR is no longer a flag: it is
folded into `cacheComponents`, which is a caching model, not a bundle-size tool.

### Cited Findings

**Server/Client boundaries**
- Server Components "run on the server, and don't require JavaScript to render on
  the client. As such, they have no impact on the size of your client-side
  JavaScript bundles." — local docs `01-app/02-guides/production-checklist.md`; published at [nextjs.org/docs/app/guides/production-checklist](https://nextjs.org/docs/app/guides/production-checklist)
- The documented technique is leaf-level `'use client'`: "add `'use client'` to
  specific interactive components instead of marking large parts of your UI as
  Client Components." — local docs `01-app/01-getting-started/05-server-and-client-components.md` §"Reducing JS bundle size"
- **This repo has 31 files carrying `"use client"`** [MEASURED HERE] (`grep -rl '"use client"' src/`), including whole modules of plain data/logic (`companion-dialogue.ts`, `companion-moods.ts`, `companion-play.ts`, `companion-space.ts`, `companion-tour.ts`, `companion-motion.ts`, `companion-state.ts`).

**`next/dynamic` vs `React.lazy`**
- "`next/dynamic` is a composite of `React.lazy()` and Suspense. It behaves the
  same way in the `app` and `pages` directories." — local docs `01-app/02-guides/lazy-loading.md`
- The practical difference: `next/dynamic` accepts `{ ssr: false }` and
  `{ loading }`. `ssr: false` **only works inside Client Components**: "`ssr: false` is not allowed with `next/dynamic` in Server Components. Please move it into a Client Component." — same doc.
- **Gotcha that matters here:** "When a Server Component dynamically imports a Client Component, automatic code splitting is currently **not** supported." — same doc. So `dynamic()` calls must live inside a `'use client'` module to actually split.
- Turbopack magic comments are new: `turbopackIgnore`, `turbopackOptional`
  (`webpackOptional` is *not* supported). They work only on dynamic `import()`,
  `require()`, `require.resolve()` and `new Worker()`, never on static imports. — same doc.

**PPR / Cache Components**
- "**Next.js 16** removes the experimental Partial Prerendering (PPR) flag and configuration options, including the route level segment `experimental_ppr`." — local docs `01-app/02-guides/upgrading/version-16.md`
- "`cacheComponents` implements **Partial Prerendering (PPR)** as the default behavior in the App Router." Introduced in 16.0.0; "controls the `ppr`, `useCache`, and `dynamicIO` flags as a single, unified configuration." — local docs `cacheComponents.md`
- Requires the Node.js runtime; `runtime = 'edge'` routes must migrate. — same doc.
- With `cacheComponents` on, `dynamic`, `dynamicParams`, `revalidate` and `fetchCache` route segment config are **removed**; `experimental_ppr` is removed outright with a codemod. — local docs `03-file-conventions/02-route-segment-config/index.md` version history.
- So: **PPR is "stable" in 16 only in the sense that it is no longer a flag — it is now the behaviour you get by opting into Cache Components, which is itself a new model.** [Next.js 16 blog](https://nextjs.org/blog/next-16), published 21 Oct 2025.

**Route Segment Config — what's left in 16.3**
Only four options remain: `dynamicParams` (bool, default `true`), `runtime`
(`'nodejs' | 'edge'`, edge **deprecated**), `preferredRegion` (**deprecated**),
`maxDuration`. — local docs `02-route-segment-config/index.md`.
New in 16.3: `instant` (`true | false | { level }`), which validates that a
navigation into a segment produces instant UI. It **only works when
`cacheComponents` is enabled**, cannot be used in Client Components, and
currently only supports `level: 'warning'` (dev-only). — local docs
`02-route-segment-config/instant.md`.

**`after()`**
- "`after` allows you to schedule work to be executed after a response (or prerender) is finished… such as logging and analytics."
- "**`after` is not a Request-time API and calling it does not cause a route to become dynamic.** If it's used within a static page, the callback will execute at build time, or whenever a page is revalidated."
- It runs within the route's `maxDuration` and executes even on error/`notFound`/`redirect`. — local docs `01-app/03-api-reference/04-functions/after.md`
- **[INFERENCE]** For a statically prerendered portfolio, `after()` is close to useless — on a static page the callback fires at *build* time, not per visit.

**Turbopack production behaviour (the big 16 change)**
- Turbopack is the **default bundler** for `next dev` and `next build` in 16; opt out with `--webpack`. A custom `webpack` config makes `next build` **fail** unless you pass `--turbopack` or `--webpack`. — local docs `version-16.md`, `08-turbopack.md`
- 2–5× faster production builds, up to 10× faster Fast Refresh. — [Next.js 16 blog](https://nextjs.org/blog/next-16)
- Turbopack uses **Lightning CSS** (not PostCSS) for CSS Modules and nesting, but *does* run `postcss.config.*` in a Node worker pool — which is how Tailwind v4 works here. — local docs `08-turbopack.md`
- Chunking is configurable and its defaults are documented:
  `experimental.turbopackChunking = { minChunkSize: 50000, maxChunkCountPerGroup: 40, maxMergeChunkSize: 200000, minComponentChunkSize: 20000, generateComponentChunks: false }`. "Sizes are in bytes of **uncompressed, unminified** code (roughly 5× the size of the compressed, minified output)." — local docs `turbopackChunking.md`
- 16.3 specifics: repeat builds up to **5.5× faster** via incremental filesystem caching in `next build`; SSR handles **up to 22% more requests** after replacing web streams with native Node streams; apps upgrading 16.2 → 16.3 saw **45% fewer prefetch requests on average** (some >70%), and on Vercel **17% fewer CDN requests, 24% fewer bytes for static content**, "up to 60% global TTFB reductions for frequently deployed projects." — [Next.js 16.3 release coverage](https://nextjs.org/blog/next-16-3), summarised by [InfoQ, Aug 2026](https://www.infoq.com/news/2026/08/vercel-next-js-16-3/)

**Bundling/measurement changes in 16 that bite**
- **"Next.js 16 removes the `size` and `First Load JS` metrics from the `next build` output. We found these to be inaccurate in server-driven architectures using React Server Components. Both our Turbopack and Webpack implementations had issues, and disagreed on how to account for Client Components payload."** — local docs `version-16.md` §Performance Improvements. This is the most important single fact for a byte budget: **the framework no longer tells you your bundle size.**
- Replacement: `pnpm next experimental-analyze` (v16.1+), with `--output` writing to `.next/diagnostics/analyze` for before/after diffing. It is integrated with Turbopack's module graph and shows per-module import chains. — local docs `01-app/02-guides/package-bundling.md`
- `@next/bundle-analyzer` still exists but is documented as the **Webpack** path only. — same doc.
- `experimental.optimizePackageImports` already covers **`lucide-react`** by default — this project's only icon dependency needs no configuration. — local docs `optimizePackageImports.md`
- `experimental.inlineCss: true` turns every CSS `<link>` into an inline `<style>`. Docs: "**Enable** if you use atomic CSS (like Tailwind) and want to optimize first-load performance for new visitors… **Skip** if returning visitors are common." — local docs `inlineCss.md`
- `experimental.cssChunking` defaults to `true`; Turbopack additionally supports `'graph'`, "a cost-based graph algorithm to group CSS across your routes, balancing the bytes each route downloads and the requests it makes." — local docs `cssChunking.md`
- Routing overhaul in 16: layout deduplication ("a page with 50 product links now downloads the shared layout once instead of 50 times") and incremental prefetching. Trade-off stated outright: "you may see more individual prefetch requests, but with much lower total transfer sizes." — [Next.js 16 blog](https://nextjs.org/blog/next-16)
- Browser baseline moved to **Chrome/Edge/Firefox 111+, Safari 16.4+**; Node 20.9+; TypeScript 5.1+. — [Next.js 16 blog](https://nextjs.org/blog/next-16)
- `middleware.ts` → `proxy.ts` (deprecated, not removed); `next lint` removed; AMP removed; `next/image` `qualities` default narrowed to `[75]` and `minimumCacheTTL` raised 60 s → 4 h. — [Next.js 16 blog](https://nextjs.org/blog/next-16)

### Inferences

- **[INFERENCE]** With `First Load JS` gone from build output, a byte budget on
  Next 16 has to be enforced against a *running server* (what `scripts/perf.mjs`
  already does) or against `next experimental-analyze --output`. A CI gate that
  greps build stdout for "First Load JS" will silently pass forever.
- **[INFERENCE]** Several files in `src/components/companion/` are marked
  `"use client"` but contain only data and pure functions
  (`companion-dialogue.ts`, `companion-moods.ts`, `companion-space.ts`). A
  `"use client"` directive on a module does not by itself add bundle weight — the
  module would be bundled anyway once imported from a Client Component — but it
  *forecloses* ever importing that data from a Server Component. Worth auditing.
- **[INFERENCE]** `cacheComponents` is the wrong tool for this site (see Tier 4
  above): it is about *when* data is fetched, and this site fetches none.

### Gaps

- I could not find a published number for the client-JS cost of a single
  `'use client'` leaf in Next 16. Turbopack's `minChunkSize: 50000` (uncompressed)
  and `maxMergeChunkSize: 200000` mean small leaves get **merged** into larger
  chunks, so the marginal cost is not separable from a build output.
- Whether `experimental.inlineCss` interacts badly with Tailwind v4 + Lightning
  CSS in 16.3: not documented either way.

---

## Key question 2 — The React baseline: how much of 188 KB is irreducible, and what is the floor?

### Takeaway

**About two thirds of the JavaScript is framework and cannot be removed.**
On this exact build, the chunks Next loads on *every* route total **127.6 KB
gzipped**, of which React + React DOM is 69.9 KB and the App Router client
runtime is 42.8 KB. An independent September 2026 measurement puts the Next 16
shared runtime at 129 kB gzipped. The realistic floor for any Next 16 App Router
page with at least one Client Component is therefore **~128–130 KB gzipped**.

### Cited Findings

**[MEASURED HERE]** — `.next/build-manifest.json` `rootMainFiles`, fetched from
`next start` with gzip:

| Chunk | gzip bytes | Identified by |
|---|---|---|
| `1p3d44_0e5dsm.js` | **71,614** | contains `hydrateRoot`, `react-dom` → React + React DOM client |
| `35ky_fpfydp7n.js` | **43,848** | contains `AppRouter` → Next App Router client runtime |
| `2kgmcb0usqjq_.js` | 7,359 | `node_modules/next/dist/compiled/process` polyfill |
| `turbopack-269hzvv8nkjp_.js` | 4,284 | Turbopack runtime |
| `3k5ua5vc1d7fp.js` | 3,565 | — |
| **Root-main total** | **130,670 B = 127.6 KB** | loaded on every route |

**[MEASURED HERE]** Full JS set actually requested by `/` — 11 chunks,
**228,394 B = 223.0 KB gzipped**. App-specific remainder above the framework
floor: **97,724 B = 95.4 KB**, of which the two largest are `0cz1d0mv5g_q7.js`
(39,627 B) and `3u3x5ye5ntbh3.js` (26,423 B, contains the string `Companion`).

> **Discrepancy flagged:** the project's own tracker records **188.2 KB** JS for
> the same branch (`docs/feedback-tracker.md:721`), measured by
> `scripts/perf.mjs` via CDP `request.sizes().responseBodySize`. My curl-based
> figure is 223.0 KB. Three candidate explanations, none verified: (a) the
> `.next` directory on disk is from a later build than the tracker row; (b) CDP
> `responseBodySize` under-reports when a response is served from the preload
> cache; (c) the perf script's `page.on("response")` handler drops chunks whose
> `sizes()` throws (it catches and skips — the script's own comment says this
> "under-reports rather than crashing"). **The report writer should treat 188.2
> and 223.0 as two measurements of the same thing by different methods, not as a
> regression.**

**Corroborating third-party number**
- "The Next 16 shared runtime is 129 kB gzipped vs 94 kB on Next 14, so every route's first-load JS grows by 25–35 kB"; median first-load JS "179 → 210 kB"; "Route-specific JS is unchanged." — [jgt7405/analytics-frontend PR #10, 26 Sept 2026](https://github.com/jgt7405/analytics-frontend/pull/10). This is a single project's re-baseline, not a Vercel figure, but it lands within 1.5 KB of my independent measurement of 127.6 KB.

**Why you cannot get the official number any more**
- Next 16 removed `First Load JS` from build output as inaccurate for RSC
  architectures. — local docs `version-16.md`; see §1.

### Inferences

- **[INFERENCE]** Against a ~190 KB total-JS budget, a **127.6 KB framework floor
  leaves ~62 KB for all application code, on every route.** The current `/`
  spends 95.4 KB — i.e. the app code is ~33 KB over what a 190 KB budget allows,
  *if* my 223 KB measurement is the right one. Against the tracker's 188.2 KB the
  site is exactly at budget with ~61 KB of app code. Either way the framework is
  the majority and the headroom is small.
- **[INFERENCE]** The `next/dist/compiled/process` polyfill (7,359 B) is shipped
  on every route. It exists so `process.env` works in client code. Whether it can
  be dropped is undocumented; 7.4 KB is 4% of the budget.
- **[INFERENCE]** Because Turbopack merges chunks below `minChunkSize: 50000`
  (uncompressed), removing one small Client Component will often move *zero*
  bytes — the freed space is absorbed by the merge. This matches the project's
  own observation that removing ~1,040 lines of client code (`ProblemSolvingLoop`)
  moved only 4.5 KB (`docs/feedback-tracker.md`).

### Gaps

- I did not build a bare `create-next-app@16.3.1` to measure a zero-`use client`
  floor. That is the one experiment that would settle whether 127.6 KB is really
  irreducible or whether some of it is pulled in by this app's root layout.
  Recommended: `pnpm dlx create-next-app@16.3.1` → build → `curl` the root-main
  chunks the same way.
- No Vercel-published baseline number for Next 16 First Load JS exists that I
  could find; the 129 kB figure is one practitioner's.

---

## Key question 3 — Lazy and conditional hydration: current best patterns and quantified wins

### Takeaway

The measured state of the art is **viewport-gated hydration via Suspense +
IntersectionObserver**, which Wix reports at −20% JS payload and ~−40% INP across
field data. React 19.2 itself ships no dedicated "hydrate on interaction" API;
`use()` is a data-reading primitive, not a hydration control. The Next.js-native
path is `next/dynamic` inside a Client Component, and the CSS-native path is
`content-visibility: auto`, which has a published 7× rendering-time win.

### Cited Findings

**Measured wins**
- Wix: "We reduced JavaScript payloads by **20%**" and "improved **INP** by roughly **40%**", using "Suspense boundaries that intentionally pause hydration until components enter the viewport through Intersection Observer detection", from "field data across hundreds of millions of real user sessions." React 18 at time of writing. — [Wix Engineering, 9 Nov 2025](https://www.wix.engineering/post/40-faster-interaction-how-wix-solved-react-s-hydration-problem-with-selective-hydration-and-suspen)
- `content-visibility: auto`: web.dev's travel-blog demo goes **232 ms → 30 ms rendering time (~7×)**; article also cites "an expected reduction of 50% or more from the rendering cost of loading." — [web.dev/articles/content-visibility](https://web.dev/articles/content-visibility), updated 23 Sept 2025
- Chrome, on why this matters at all: "The primary downside of server-side rendering with rehydration is that it can have a significant negative impact on TBT and INP, even if it improves FCP." — [web.dev/articles/rendering-on-the-web](https://web.dev/articles/rendering-on-the-web)

**`content-visibility: auto` — the caveats that matter for WCAG 2.2 AA**
From [MDN: content-visibility](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/content-visibility) and [web.dev](https://web.dev/articles/content-visibility):
- **Good news:** skipped content stays in the DOM *and* the accessibility tree. Ctrl+F finds text inside skipped subtrees and scrolls it into view. Tab order and selection work normally. Screen readers traverse the DOM, not the render tree.
- **Real problems:** scrollbar jank when dragging fast; zero-height skipped elements shift the scrollbar (mitigate with `contain-intrinsic-size`, and `contain-intrinsic-size: auto <len>` to remember last-rendered size); `scroll-into-view` and anchor links with `scroll-behavior: smooth` misbehave when the target is inside a skipped container; scroll restoration breaks; offscreen landmarks may clutter the a11y tree and need `aria-hidden="true"`.
- **The kill-switch:** calling any DOM API that forces layout on a skipped subtree destroys the benefit entirely.
- **`contentvisibilityautostatechange`** is the documented companion event and it names canvas explicitly: "provides a way for an app's code to also start or stop rendering processes (e.g., drawing on a `<canvas>`) when they are not needed, thereby conserving processing power." **Baseline since September 2024.** — [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Element/contentvisibilityautostatechange_event)

**What React 19.2 actually offers**
- Next 16 ships React 19.2 canary. Highlights per Vercel: **View Transitions**, **`useEffectEvent`**, **`<Activity>`** ("Render 'background activity' by hiding UI with `display: none` while maintaining state and cleaning up Effects"). — [Next.js 16 blog](https://nextjs.org/blog/next-16); [React 19.2 announcement, 1 Oct 2025](https://react.dev/blog/2025/10/01/react-19-2)
- With `cacheComponents` on, **Next.js itself uses `<Activity>`** to keep recently-visited routes mounted-but-hidden during client navigation, preserving state; "Next.js uses heuristics to keep a few recently visited routes `hidden`, while older routes are removed from the DOM." — local docs `cacheComponents.md`
- Selective hydration in React is automatic and priority-based, not API-driven: "When a user tries to interact with a component that hasn't hydrated yet, React automatically prioritizes hydrating that component first." — [patterns.dev: React Selective Hydration](https://www.patterns.dev/react/react-selective-hydration/)
- `use()` "can be used instead of throwing promises, and it must be called inside a Suspense boundary" — it is a read primitive that composes with Suspense, **not** a hydration gate. — [jsdev.space, React 19 hydration guide](https://jsdev.space/react-19-hydration-guide/)

**The Next.js-native mechanics**
- Conditional render inside a Client Component is the documented "load on demand" pattern: `{showMore && <ComponentB />}` where `ComponentB` came from `dynamic()`. — local docs `01-app/02-guides/lazy-loading.md`
- Library-level deferral: `const Fuse = (await import('fuse.js')).default` inside an event handler. — same doc.
- **Constraint:** dynamic imports from a Server Component do not code-split (see §1). The `dynamic()` call must sit in a `'use client'` module.

### Inferences

- **[INFERENCE]** The honest island pattern on Next 16 App Router is: a thin
  `'use client'` shell that renders a placeholder, observes its own container with
  `IntersectionObserver` (or listens for `contentvisibilityautostatechange`), and
  flips a state flag that conditionally renders a `dynamic()`-imported child. The
  server still SSRs the shell; only the heavy child's JS is deferred. There is no
  framework primitive that does this for you in 16.3.
- **[INFERENCE]** `<Activity>` is *not* a bundle-size tool. It keeps components
  mounted; it does not defer their code. Useful for INP on repeat navigation,
  irrelevant to first load.
- **[INFERENCE]** For this site specifically, the Companion (26.4 KB gz) and the
  below-fold sections are the natural islands. The hero must stay eagerly
  hydrated because it contains the LCP element and the primary control.

### Gaps

- No published measurement of the *cost* of the island wrapper itself (the
  IntersectionObserver shell) in KB or ms. Wix's −20%/−40% is a platform-wide
  aggregate, not a per-island figure.
- React has no public RFC or documented API for author-controlled hydration
  gating as of 19.2 that I could find.

---

## Key question 4 — Fonts: where the 331.4 KB actually goes, and whether the italic is worth it

### Takeaway

**The italic is not the problem; the `opsz` axis is.** `next/font/google`
already does `unicode-range` splitting and only downloads the Latin subset — so
that lever is spent. What remains is **variable-axis instancing**, and the
measurement is unambiguous: requesting Newsreader's `opsz` axis as a *range*
more than doubles both font files. Dropping it saves **152.6 KB**. A real italic,
priced without `opsz`, costs **63.0 KB** — which is a defensible price for real
italic in a display serif.

### Cited Findings — [MEASURED HERE]

**What the site actually downloads** (5 woff2 files, 339,320 B = **331.4 KB**,
exactly matching `docs/feedback-tracker.md`):

| File | bytes | = KB | Identity (from the served `@font-face` rules) |
|---|---|---|---|
| `2b7d3311b69a4dca-s.p.*` | 147,060 | **143.6** | Newsreader **italic**, `font-weight: 200 800`, Latin |
| `d38f3bca7db33566-s.p.*` | 131,848 | **128.8** | Newsreader **normal**, `font-weight: 200 800`, Latin |
| `03fc1b4a8d284b5e-s.p.*` | 40,240 | 39.3 | IBM Plex Sans Latin — **one file shared by weights 400/500/600** |
| `23b7a97ae3b5c134-s.p.*` | 10,120 | 9.9 | IBM Plex Mono Latin |
| `99e609270109b47d-s.p.*` | 10,052 | 9.8 | IBM Plex Mono Latin |

**→ Newsreader alone is 278,908 B = 272.4 KB = 82.2% of all font bytes.**

**`next/font` already does unicode-range splitting.** The served CSS contains
three `@font-face` blocks per Newsreader style, each with a distinct
`unicode-range` (Vietnamese, Latin-Extended, Latin). Only the Latin one carries
the `-s.p.` (preloaded) marker and only it is fetched for English content.
Verbatim from the served stylesheet:
```
@font-face{font-family:Newsreader;font-style:italic;font-weight:200 800;font-display:swap;
  src:url(../media/2b7d3311b69a4dca-s.p.1elj1f4z6aq4a.woff2) format("woff2");
  unicode-range:U+??,U+131,U+152-153,...,U+FEFF,U+FFFD}
```

**What `next/font` generates for CLS** — verbatim from the served stylesheet:
```
@font-face{font-family:Newsreader Fallback;src:local(Times New Roman);
  ascent-override:69.68%;descent-override:25.12%;line-gap-override:0.0%;size-adjust:105.48%}
```
This is `adjustFontFallback` at work. Per the API reference (local docs
`01-app/03-api-reference/02-components/font.md`): for `next/font/google` it is a
boolean, default `true`; for **`next/font/local` it is a string or `false`, with
possible values `'Arial'`, `'Times New Roman'` or `false`, default `'Arial'`**.
So a local font gets metric-matched to exactly two possible fallbacks — but
`next/font/local` also accepts arbitrary `declarations: [{ prop: 'ascent-override', value: '90%' }]`.

**Live Google Fonts CSS2 API measurements** (Latin block, `U+0000-00FF`), 2026-09-29:

| CSS2 request | italic Latin | roman Latin | roman+italic |
|---|---|---|---|
| `ital,opsz,wght@0,6..72,200..800;1,6..72,200..800` **(= this project's `axes:["opsz"]`)** | 146,872 B | 132,000 B | **278,872 B (272.3 KB)** |
| `ital,wght@0,200..800;1,200..800` (no `opsz`) | **64,520 B** | **58,084 B** | **122,604 B (119.7 KB)** |
| `opsz,wght@6,200..800` | — | 56,568 B | — |
| `opsz,wght@16,200..800` | — | 58,084 B | — |
| `opsz,wght@32,200..800` | — | **132,000 B — falls back to the full 2-axis file** | — |
| `opsz,wght@72,200..800` | — | 56,848 B | — |
| `wght@400` (static single weight) | — | 22,480 B | — |

**The deltas that matter:**
- **Drop `axes: ["opsz"]`: 278,872 → 122,604 B = −156,268 B = −152.6 KB.** The weight range `200..800` is entirely preserved.
- **Drop `opsz` *and* the italic: 278,872 → 58,084 B = −220,788 B = −215.6 KB.**
- **Pin `opsz` at a supported value:** Google serves a *pre-instanced* file (~57 KB) for `opsz@6`, `@16`, `@72` — but **not** `@32`, which falls back to the full variable file. So Google has a fixed set of precomputed instances; do not assume an arbitrary value works.
- **Two pinned cuts beat one range:** `opsz@16` (58,084 B) + `opsz@72` (56,848 B) = **114,932 B**, which is *less* than the single full-range roman file (132,000 B), while delivering a genuine text cut and display cut.

**IBM Plex, for completeness:**
- `IBM+Plex+Sans:wght@400;500;600` → **one shared 45,712 B file** for all three weights (Google serves a variable file). The site's served copy is 40,240 B.
- `IBM+Plex+Sans:wght@400` static → 22,588 B. So going to one static weight saves ~23 KB but loses 500 and 600.
- `IBM+Plex+Mono:wght@400` → 14,708 B; `wght@600` → 15,620 B.
- **[INFERENCE]** The comment in `src/app/layout.tsx` — "Plex Sans and Plex Mono ship as static faces, so the weights actually used have to be listed" — is **out of date**: Google now serves one variable file for all three Plex Sans weights, so the weight list costs nothing extra. Listing fewer weights would not save bytes.

**`font-display` and LCP**
- Defaults and periods ([developer.chrome.com/blog/font-display](https://developer.chrome.com/blog/font-display)): `auto` ≈ browser default (~3 s block in Chromium); `block` ~3 s block / infinite swap; **`swap` 0 s block / infinite swap**; `fallback` ~100 ms block / ~3 s swap; `optional` ~100 ms block / 0 s swap.
- `next/font` defaults to `display: 'swap'`. — local docs `font.md` §`display`
- The decisive line, verbatim from web.dev: **"if you set a `font-display` value of anything other than `auto` or `block`, then text will always be visible during load, and LCP won't be blocked on an additional network request."** — [web.dev/articles/optimize-lcp](https://web.dev/articles/optimize-lcp), updated 31 Mar 2025
- Chromium and Firefox block text rendering for up to **3 seconds** before falling back; **Safari blocks indefinitely**. — [web.dev/learn/performance/optimize-web-fonts](https://web.dev/learn/performance/optimize-web-fonts)

**`preload` scoping** — "If it's the root layout, it is preloaded on all routes." All three families are called in `src/app/layout.tsx`, so all five Latin files are preloaded on every route including `/resume`. — local docs `font.md` §Preloading

### A concrete decision framework: "is this italic worth 143 KB?"

**[INFERENCE]** The question as posed is malformed, because 143.6 KB is the price
of *italic × opsz-range*, not of italic. Price the two axes separately:

| Option | Newsreader bytes | Δ vs today | What you lose |
|---|---|---|---|
| **A.** Today: `opsz` range + italic | 272.3 KB | — | nothing |
| **B.** Drop `opsz`, keep italic | 119.7 KB | **−152.6 KB** | continuous optical sizing; `font-optical-sizing: auto` becomes inert again (the exact regression `layout.tsx` documents fixing) |
| **C.** Two `next/font/local` cuts (`opsz@16` text, `opsz@72` display), roman only | 112.2 KB | **−160.1 KB** | italic; continuum → two discrete cuts |
| **D.** Two local cuts + italic at `opsz@16` | ~175 KB | −97 KB | continuum only |
| **E.** Drop `opsz` and italic | 56.7 KB | **−215.6 KB** | both |
| **F.** Static `wght@400` roman only | 22.0 KB | −250.3 KB | the whole type scale |

Decision rule **[INFERENCE]**: the italic appears at exactly two call sites
(`BusinessCard.tsx:275`, `Closing.tsx:76`, per `docs/feedback-tracker.md`).
**63.0 KB for two italic phrases is ~19% of the font budget and ~7% of total page
weight.** If those two phrases are load-bearing to the design, option **D** keeps
them and still returns ~97 KB. If they are not, option **C** is the largest
saving that preserves the optical-sizing intent CLAUDE.md treats as the reason
Newsreader was chosen at all. **Option B is the one-line change and should be
taken first regardless**, because it is reversible and because it isolates
whether anyone can actually see the continuum.

### Inferences

- **[INFERENCE]** `next/font/google`'s `axes` option takes **axis names only**
  ("An array of strings", e.g. `axes: ['slnt']` — local docs `font.md`). There is
  no way to pin an axis to a value. Therefore options C and D require
  `next/font/local` with files downloaded from the CSS2 API — which is legitimate
  (Google Fonts are OFL) and keeps `next/font`'s self-hosting, preloading and
  `size-adjust` fallback generation.
- **[INFERENCE]** Because `next/font` already splits by `unicode-range` and
  serves WOFF2 (Brotli-class compression internal to the format), further
  server-side Brotli on the woff2 will not help — the entropy is already spent.
- **[INFERENCE]** Glyph-level subsetting (pyftsubset/glyphhanger) on top of the
  Latin subset would save further, but the Latin subset is only ~100 codepoints;
  the ~57 KB post-instancing size is dominated by outline data for a 200–800
  weight range, not by glyph count. Axis instancing is the higher-leverage cut.

### Tooling: doing this yourself instead of relying on Google's precomputed instances

- **`fontTools.varLib.instancer`** "allow[s] to create full instances (static fonts) from variable fonts, as well as **'partial' variable fonts that only contain a subset of the original variation space**." CLI syntax — pin one axis, restrict another: `fonttools varLib.instancer ./NotoSans-VF.ttf wdth=85 wght=400:700`. Range syntax is `axis=min:max`. **Passing `axis=drop` removes an axis at its default location.** When *all* axes get explicit coordinates the output "no longer contains an `fvar` table" — it becomes a static font; otherwise it stays variable with a reduced `fvar`. — [fontTools: instancer](https://fonttools.readthedocs.io/en/latest/varLib/instancer.html)
- **Worked example that is almost exactly this project's case** — a variable font with `opsz,wdth,wght`, reduced with `opsz=drop`:
  ```
  fonttools varLib.instancer My-VariableFont_opsz,wdth,wght.ttf wdth=drop opsz=drop wght=300:700
  pyftsubset My-VariableFont_opsz,wdth,wght-partial.ttf \
    --unicodes="U+0020-007F, U+00A0-00FF, U+0100-017F, U+2000-206F, U+FB00-FB4F" \
    --layout-features='*' --flavor="woff2" --output-file="My-VariableFont.woff2"
  ```
  Reported results: **4,491 KB → 281 KB (94%)** and **673 KB → 63 KB (90%)**. — [MRW Web Design, 16 Dec 2025](https://mrwweb.com/technical-removing-axes-subsetting-and-compressing-a-variable-font-with-fonttools/)
  **[INFERENCE] Do not read those percentages as the axis-dropping win** — the inputs were uncompressed `.ttf` and the outputs `woff2`, so most of the reduction is WOFF2 compression. The axis-dropping component is what my CSS2 API measurements isolate: **~2.3× for Newsreader's `opsz`.**
- `pyftsubset` "now preserves the input font's flavor (WOFF, WOFF2) when `--flavor` is omitted, instead of writing uncompressed sfnt data under the same extension" — a recent behaviour change worth knowing. — [fontTools releases](https://github.com/fonttools/fonttools/releases)
- **Metric-override fallbacks** (`size-adjust`, `ascent-override`, `descent-override`, `line-gap-override`): "If the fallback font and the web font are not metrically compatible, font-swapping behavior will cause text to shift and jump around on the page, hurting cumulative layout shift." — [Chrome for Developers: Improved font fallbacks](https://developer.chrome.com/blog/font-fallbacks)
- Generators: **`next/font` "calculates these overrides automatically"** (verified above — it emitted `Newsreader Fallback` with `size-adjust: 105.48%`); **Fontaine** is a Vite plugin that generates them; **Capsize** is the font-metrics library underneath most of these tools. — [Chrome for Developers: Framework tools for font fallbacks](https://developer.chrome.com/blog/framework-tools-font-fallback)
- **[INFERENCE]** Because `next/font/local` restricts `adjustFontFallback` to `'Arial' | 'Times New Roman' | false`, a locally-hosted instanced Newsreader should either take `adjustFontFallback: 'Times New Roman'` (matching what `next/font/google` chose) or supply explicit `declarations` copied verbatim from the values captured above — `ascent-override: 69.68%; descent-override: 25.12%; line-gap-override: 0.0%; size-adjust: 105.48%` — so the move to `next/font/local` is CLS-neutral.

### Gaps

- `fonttools` / Python is **not installed on this machine** (verified:
  `python -c "import fontTools"` → not found), so I could not run `pyftsubset` or
  `varLib.instancer` and produce a measured custom-subset number for *this* font.
  The Google CSS2 API numbers above are a direct proxy for what instancing buys,
  because Google's `opsz@16` URL *is* a pre-instanced file.
- I could not determine why `opsz@32` falls back to the full variable file while
  6/16/72 are pre-instanced — Google publishes no list of precomputed instances.
- Whether Newsreader's italic is a separate file or an `ital` axis: **separate
  file**, confirmed from the served `@font-face` rules (distinct `src` per
  `font-style`). There is no one-file roman+italic option for this family.
- No source found on the acceptability of synthesised oblique for a display
  serif at WCAG 2.2 AA; `font-synthesis: style` is a rendering-quality question,
  not an accessibility one.

---

## Key question 5 — Canvas and animation cost: keeping INP and battery intact

### Takeaway

The rules that are actually documented: **stop re-arming `rAF` at rest** (a
dirty-flag check inside a still-running loop saves nothing), pause offscreen work
with `contentvisibilityautostatechange` rather than a hand-rolled
IntersectionObserver, clamp DPR to 2, prefer CSS `transform`/`opacity` over
script animation, and instrument with LoAF's `blockingDuration`. WCAG 2.2.2
(Level A) binds an autoplaying decorative animation independently of
`prefers-reduced-motion`.

### Cited Findings

**rAF discipline**
- "`requestAnimationFrame()` calls are **paused in most browsers when running in background tabs** or hidden `<iframe>`s, in order to improve performance and battery life." — [MDN: requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame)
- rAF is one-shot; "your callback function must call `requestAnimationFrame()` again if you want to animate another frame." Not re-arming *is* the stop. — same
- Always use the callback timestamp, "otherwise, the animation will run faster on high refresh-rate screens" — 75/120/144 Hz are "widely used." — same
- **No browser stops rAF because the element scrolled offscreen** — MDN addresses background tabs and hidden iframes only. **NOT FOUND** as a browser behaviour.
- Chrome 133 (Jan 2025) Energy Saver *freezes* tabs hidden and silent >5 min that are "CPU-intensive", suspending handlers, timers and promise resolvers. — [developer.chrome.com/blog/freezing-on-energy-saver](https://developer.chrome.com/blog/freezing-on-energy-saver)
- iOS Low Power Mode throttles rAF *and* CSS animations to ~30 fps; Safari throttles rAF in cross-origin iframes until a tap. — [Matt Perry, Motion, 1 Oct 2020](https://motion.dev/magazine/when-browsers-throttle-requestanimationframe) *(pre-2025)*
- MDN canvas optimisations: "Render screen differences only, not the whole new state"; "Use multiple layered canvases for complex scenes"; `getContext("2d", { alpha: false })`; "Scaling canvas using CSS transforms… better to have a smaller canvas scaled up than a larger canvas scaled down." — [MDN: Optimizing canvas](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas)

**OffscreenCanvas + Worker (2026 support)**
- Chrome 69, Edge 79, Firefox 105, **Safari desktop 16.4 (2D only) → 17.0 (adds WebGL)**, Safari iOS 17.0, Samsung 10.1. **Global usage 95.99%.** — [caniuse: OffscreenCanvas](https://caniuse.com/offscreencanvas); [WebKit 16.4](https://webkit.org/blog/13966/webkit-features-in-safari-16-4/), [WebKit 17.0](https://webkit.org/blog/14445/webkit-features-in-safari-17-0/)
- Measured win, Chrome 138, n=10, published 21 Aug 2026: main-thread JS + Canvas2D **~52.5 FPS / 21.2 ms p95** vs worker + OffscreenCanvas **~143.9 FPS / 7.0 ms p95**; Cliff's δ = 1.0, p < 10⁻⁴. Authors' conclusion: "When profiling shows UI-thread jank on an effect, **offload first** — before reaching for WASM or a heavier renderer." A WASM rewrite was 1.5–1.85× faster in-kernel yet **did not raise user-visible FPS**. — [arXiv 2608.23609](https://arxiv.org/html/2608.23609)
- **`transferControlToOffscreen()` throws `InvalidStateError` if `getContext()` was already called on that canvas** — the transfer must be the first thing you do to the element. — [MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/transferControlToOffscreen)
- **Text metrics DO work in a worker.** `OffscreenCanvasRenderingContext2D` supports the full 2D API including `measureText()`/`fillText()`; the only missing method is `drawFocusIfNeeded()`. — [MDN](https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvasRenderingContext2D)
- **The INP catch:** there is no native event delivery to workers; engines "support this by forwarding all input events with `postMessage`." — [WICG discourse proposal](https://discourse.wicg.io/t/proposal-exposing-input-events-to-worker-threads/3479/). So a worker removes *rendering* from the INP path; the listener and the `postMessage` hop stay on the main thread.

**devicePixelRatio clamping**
- MDN documents the `ctx.scale(dpr, dpr)` recipe with **no clamping guidance and no perf caveat**. — [MDN: devicePixelRatio](https://developer.mozilla.org/en-US/docs/Web/API/Window/devicePixelRatio)
- The arithmetic is the only hard fact: DPR 2 = 4× pixels, DPR 3 = 9× pixels of DPR 1.
- PlayCanvas confirms the mechanism: DPR "comes at a performance cost as now there are more pixels to fill and render each frame"; recommends adapting `maxPixelRatio` at runtime and exposing a quality setting. — [PlayCanvas: Device Pixel Ratio](https://developer.playcanvas.com/user-manual/optimization/runtime-devicepixelratio/)
- **NOT FOUND: any controlled measurement of 2D-canvas frame time at DPR 1 vs 2 vs 3.** Practitioner claims (e.g. "clamping with `Math.min(devicePixelRatio, 1.5)` removes half to three quarters of the fragment work") are pixel-count derivations; the cited article states outright it ran no benchmarks. — [21st.dev, 19 Aug 2026](https://21st.dev/blog/react-animated-background-components)

**`will-change` misuse** — all from [MDN: will-change](https://developer.mozilla.org/en-US/docs/Web/CSS/will-change)
- "Don't apply `will-change` to too many elements… Overusing the property can cause the page to slow down instead of improving it."
- "Excessive use of `will-change` will result in excessive memory use and will cause more complex rendering to occur."
- "It is a good practice to **switch `will-change` on and off using script code** before and after the change occurs" — MDN's own pattern is `mouseenter` → set, `animationEnd` → `auto`.
- "`will-change` is intended to be used as a **last resort**… It should not be used to anticipate performance problems."

**Compositor-only animation rules (2026)**
- Blink's own source docs: "A subset of style properties (currently **transform, opacity, filter, and backdrop-filter**) can be mutated on the compositor thread." Accelerated only if the animation targets *exclusively* those and passes `CheckCanStartAnimationOnCompositor()` (composite mode, property conflicts, promotability). — [Chromium `core/animation/README.md`](https://github.com/chromium/chromium/blob/main/third_party/blink/renderer/core/animation/README.md)
- **web.dev has not been updated to match** and still says "restrict animations to `opacity` and `transform`"; Paul Lewis's 2015 page saying "only two properties" is **stale**. — [web.dev/articles/animations-guide](https://web.dev/articles/animations-guide), [web.dev/articles/stick-to-compositor-only-properties…](https://web.dev/articles/stick-to-compositor-only-properties-and-manage-layer-count) *(2015)*
- Filter compositing is engine-specific: an animated SVG turbulence filter caused a large energy spike in Safari and Firefox while Chrome's GPU path "require[s] much less power." — [Torchbox, 18 Feb 2025](https://torchbox.com/wagtail-cms-services/blog/how-much-power-do-web-assets-use/)
- Scroll-driven animations: Chrome claims "animations, driven by scroll, **running off the main thread**" ([developer.chrome.com](https://developer.chrome.com/docs/css-ui/scroll-driven-animations)); **WebKit makes no such claim** in its Safari 26 announcement ([WebKit, 20 Jun 2025](https://webkit.org/blog/17101/a-guide-to-scroll-driven-animations-with-just-css/)). Support for `animation-timeline`: Chrome/Edge 115, Firefox 159, Safari 26.0, **global 87.22%** — [caniuse](https://caniuse.com/mdn-css_properties_animation-timeline). The JS `ScrollTimeline` object is **not Baseline** — [MDN](https://developer.mozilla.org/en-US/docs/Web/API/ScrollTimeline).
- WAAPI `KeyframeEffect.composite` (`replace|add|accumulate`) is Baseline since Sept 2022 — [MDN](https://developer.mozilla.org/en-US/docs/Web/API/KeyframeEffect/composite) — but a non-`replace` composite is one of the things that can disqualify compositor acceleration (per the Blink README above).

**Energy**
- `powermetrics` on an M1 MacBook, medians of 3× 10 s samples: **idle page ~25 mW**; video 50–150 mW; **CSS animations ~100–500 mW**; SVG filter animations 5–1000 mW; **WebGL shaders 200–2000 mW**; Zoom call ~750 mW. — [Torchbox, 18 Feb 2025](https://torchbox.com/wagtail-cms-services/blog/how-much-power-do-web-assets-use/)
- Safari Web Inspector energy ratings: **idle pages should be "Low" = under 3% average CPU**; interactive recordings target "Medium" = under 30%. — [WebKit, 6 Jun 2019](https://webkit.org/blog/8993/cpu-timeline-in-web-inspector/) *(2019)*
- WebKit's canonical guidance: "the more performance that is required from the chips, the lower their power-efficiency"; "Lots of uncoordinated timers which trigger frequent CPU wake-ups are much worse than gathering that work into fewer chunks"; **"Use declarative animations (CSS Animations and Transitions) where possible. The browser can optimize these away when the animating content is not visible, and they are more efficient than script-driven animation."** — [WebKit, 27 Aug 2019](https://webkit.org/blog/8970/how-web-content-can-affect-power-usage/) *(2019)*

**SVG vs Canvas at scale** — benchmark, Apple M4 Pro, headless Chromium 147, 5-trial medians, 20 Jul 2026 ([ApexCharts benchmark](https://apexcharts.com/blog/javascript-chart-library-benchmark/)):
- Scatter (one DOM node per point): 5k → canvas 24–29 ms vs **SVG 64 ms**; 20k → canvas 47–59 ms vs **SVG 233 ms**; 50k → canvas 89–120 ms vs **SVG 527 ms**. DOM nodes at 20k: canvas **104** vs SVG **20,102**.
- Line (one `<path>`): at 1k points SVG (15 ms) was *faster* than both canvas renderers (16 ms).
- ApexCharts' own auto-switch threshold is **8,000 points**, and they stress the crossover depends on mark type: "a 5,000-point line is a single path, but a 5,000-point scatter is 5,000 nodes." — [ApexCharts, 18 Mar 2026](https://apexcharts.com/blog/svg-vs-canvas-charts/)
- **The widely-cited Boris Smus canvas-vs-SVG benchmark is from 19 January 2009 — do not cite it.**

**`prefers-reduced-motion` and WCAG 2.2**
- `@media (prefers-reduced-motion)` ≡ `(prefers-reduced-motion: reduce)`; "Animations such as scaling or panning large objects can be vestibular motion triggers." — [MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion)
- For JS you must handle it yourself — CSS re-evaluates on preference change, JS animations don't. Pattern: `matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', …)`; parentheses are mandatory. — [web.dev, Thomas Steiner](https://web.dev/articles/prefers-reduced-motion) *(2019)*
- **SC 2.2.2 Pause, Stop, Hide is Level A** and applies to moving content that "starts automatically, lasts more than five seconds, and is presented in parallel with other content." — [W3C Understanding SC 2.2.2](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html)
- SC 2.3.3 Animation from Interactions is **AAA** (above this project's AA target) and explicitly **excludes** "changes in color, blurring, or opacity that don't alter perceived size, shape, or position" from "motion animation." — [W3C Understanding SC 2.3.3](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html)

### Inferences

- **[INFERENCE]** The hardest constraint for a WCAG 2.2 **AA** site is SC 2.2.2,
  which is Level A and is **not satisfied by honouring `prefers-reduced-motion`** —
  2.2.2 is unconditional. An autoplaying decorative canvas running >5 s beside
  content needs a reachable pause control, or must settle within 5 s.
- **[INFERENCE]** "Respecting reduced motion" for a decorative canvas means
  rendering the *final static state and never starting the loop*, not running the
  same animation slower. A crossfade is a legitimate substitute for a pan; a
  slower pan is not (per 2.3.3's exclusion list).
- **[INFERENCE]** A dirty-flag check *inside* a still-armed rAF loop does not save
  power: the callback still fires 60×/s and the CPU still wakes. Combined with
  WebKit's <3% idle CPU target, "idle at rest" must mean **not re-arming**.
- **[INFERENCE]** At "a few hundred elements", the ApexCharts data says
  SVG/DOM is *not* the bottleneck — the per-frame *update* rate is, because every
  SVG attribute mutation costs style + layout. Choose canvas for a scene that
  redraws continuously; choose SVG/DOM for one that redraws on discrete
  interaction (and get accessibility and CSS theming for free).

### Gaps

- No measurement of DPR 1/2/3 canvas frame time exists in any source I found.
- No published figure for battery-hours lost to a 60 fps rAF loop vs an idle page.
- IntersectionObserver-gated `cancelAnimationFrame` is a ubiquitous practitioner
  pattern but **I could not find it recommended by MDN, web.dev or
  developer.chrome.com**; `contentvisibilityautostatechange` is the citable one.

---

## Key question 6 — Core Web Vitals in 2026

### Takeaway

The metric set is unchanged: **LCP, INP, CLS**, thresholds identical, INP still
the responsiveness metric. The one 2026 change is soft-navigation measurement
shipping by default in Chrome 151 — which is not a Core Web Vital and is not in
CrUX. For a **text** LCP, the metric collapses to **TTFB + render delay**: with
`font-display: swap` already set, fonts are off the LCP critical path entirely.

### Cited Findings

**The metric set**
- Still exactly three: LCP, INP, CLS. Nothing added or removed since INP replaced FID on **12 March 2024**. — [web.dev/articles/vitals](https://web.dev/articles/vitals), [web.dev/blog/inp-cwv-launch](https://web.dev/blog/inp-cwv-launch)
- CrUX monthly release notes through the **August 2026 dataset (published 8 Sept 2026)** record no additions or removals. — [developer.chrome.com/docs/crux/release-notes](https://developer.chrome.com/docs/crux/release-notes)
- **Chrome 151 (Aug 2026) enabled soft-navigation measurement by default, no flag** — `soft-navigation` entries, `SoftNavigationEntry`, `interaction-contentful-paint`, `getLargestInteractionContentfulPaint()`, `navigationId`/`interactionId`. Announced at Google I/O, 19 May 2026. — [developer.chrome.com/docs/web-platform/soft-navigations](https://developer.chrome.com/docs/web-platform/soft-navigations) (updated 2 Sept 2026), [chrome-at-io26](https://developer.chrome.com/blog/chrome-at-io26)
- **Soft-nav metrics are NOT Core Web Vitals and NOT in CrUX**; Chromium-only. — [web.dev/articles/vitals-spa-faq](https://web.dev/articles/vitals-spa-faq) (updated 11 Aug 2026)
- CLS: **no change.** The session-window definition (1 s gap, 5 s cap) is from June 2021. — [web.dev/blog/cls-web-tooling](https://web.dev/blog/cls-web-tooling)
- A **smoothness/scrolling** metric remains a proposal with no ship date. **NOT FOUND:** any 2026 announcement of a fourth Core Web Vital. — [web.dev/blog/better-responsiveness-metric](https://web.dev/blog/better-responsiveness-metric)
- Context: CWV pass rate **55.6%** (Aug 2026, down 0.2%); Chrome flags "the continued regression of INP in particular is a cause for concern." — [CrUX release notes](https://developer.chrome.com/docs/crux/release-notes)

**Thresholds** (75th percentile, segmented mobile/desktop) — [web.dev/articles/vitals](https://web.dev/articles/vitals)

| Metric | Good | Needs improvement | Poor |
|---|---|---|---|
| LCP | ≤ 2.5 s | 2.5–4.0 s | > 4.0 s |
| INP | ≤ 200 ms | 200–500 ms | > 500 ms |
| CLS | ≤ 0.1 | 0.1–0.25 | > 0.25 |
| TTFB *(diagnostic, not a CWV)* | ≤ 800 ms | 800–1800 ms | > 1800 ms |
| FCP *(diagnostic)* | ≤ 1.8 s | 1.8–3.0 s | > 3.0 s |

TTFB is explicitly **not** a Core Web Vital — [web.dev/articles/ttfb](https://web.dev/articles/ttfb) (updated 18 Nov 2025). *Caveat: the FCP thresholds article was last updated 6 Dec 2023.*

**Lighthouse**
- **Current version is 13.x** — v13.0 released 10 Oct 2025 (Chrome 143); **v13.5.0 current as of 18 Sept 2026** (Chrome 156 DevTools). — [developer.chrome.com/blog/lighthouse-13-0](https://developer.chrome.com/blog/lighthouse-13-0), [GitHub releases](https://github.com/GoogleChrome/lighthouse/releases)
- **Weights unchanged since Lighthouse 10 and explicitly unchanged in v13: FCP 10%, SI 10%, LCP 25%, TBT 30%, CLS 25%.** v13 release notes: "There are no changes to the performance scoring in this version of Lighthouse." — [performance-scoring](https://developer.chrome.com/docs/lighthouse/performance/performance-scoring/)
- **v13 changed audits, not scoring** — 16+ audits were replaced by consolidated "insight audits" shared with the DevTools Performance panel. **Any CI automation keyed to old audit IDs breaks on Lighthouse 13.**

**Text LCP — the part that applies here**
- Chrome's rules: eligible elements are "block-level elements containing text nodes or other inline-level text element children"; sizing uses "only the smallest rectangle that can contain all text nodes", excluding margins, padding and borders; "every text node belongs to (and only to) its closest block-level ancestor element." Once an element is the LCP, removing it from the DOM does not clear it. — [web.dev/articles/lcp](https://web.dev/articles/lcp) (updated 4 Sept 2025)
- For a text LCP, **resource load delay = 0 and resource load duration = 0**; only TTFB and **element render delay** apply. — [developer.chrome.com/docs/performance/insights/lcp-breakdown](https://developer.chrome.com/docs/performance/insights/lcp-breakdown) (updated 8 Oct 2025)
- The standard four-phase targets (~40% TTFB / <10% load delay / ~40% load duration / <10% render delay) are calibrated for **image** LCP and do not map onto text. — [web.dev/articles/optimize-lcp](https://web.dev/articles/optimize-lcp)
- **Fonts can block a text LCP**, via the block period (see §4): Chromium/Firefox block up to 3 s, Safari indefinitely. The fix is exactly `font-display: swap|fallback|optional`.
- **CrUX deliberately excludes text-LCP subparts**: it added image LCP subparts in Feb 2025 but excluded text "since they are less useful and would distort image LCPs numbers." For text-LCP sites Chrome says to use overall **TTFB and FCP** instead. — [developer.chrome.com/blog/crux-2025-02](https://developer.chrome.com/blog/crux-2025-02)
- Prevalence: text LCP is **14.4% of desktop pages and 23.7% of mobile**. web.dev's own homepage is 98.5% text LCP. — [Web Almanac 2025, Performance](https://almanac.httparchive.org/en/2025/performance) (published 15 Jan 2026)

**TBT on React sites**
- **TBT is getting much worse industry-wide:** median mobile TBT **1,916 ms in 2025, up 58% from 1,209 ms in 2024**; desktop 67 → 92 ms. p90: mobile **7,555 ms**, desktop 802 ms. — [Web Almanac 2025](https://almanac.httparchive.org/en/2025/performance)
- Chrome's documented contributors to framework long tasks: unoptimised JS / poor code-splitting, non-interaction-critical third-party scripts, multiple interfering event handlers, framework event-handling overhead, **hydration during load**. — [developer.chrome.com/docs/aurora/inp-in-frameworks](https://developer.chrome.com/docs/aurora/inp-in-frameworks)
- "The primary downside of server-side rendering with rehydration is that it can have a significant negative impact on TBT and INP, even if it improves FCP." — [web.dev/articles/rendering-on-the-web](https://web.dev/articles/rendering-on-the-web)
- Framework INP pass rates often quoted (Next.js 28.5%, Preact 48.6%, Vue 50.3%) are **June 2023 data** and could not be confirmed refreshed for 2026 — treat as stale.
- **NOT FOUND:** any first-party published number splitting TBT into script-evaluation vs hydration vs style/layout. [web.dev/articles/script-evaluation-and-long-tasks](https://web.dev/articles/script-evaluation-and-long-tasks) explains parse → compile → execute qualitatively with no measurements.
- `scheduler.yield()` is now the recommended yielding primitive; **`isInputPending()` is explicitly deprecated advice** — "we no longer recommend using this API." — [web.dev/articles/optimize-long-tasks](https://web.dev/articles/optimize-long-tasks) (updated 19 Dec 2024)

**Long Animation Frames (LoAF)**
- **Shipped in Chrome 123 (March 2024); stable, non-experimental.** Chrome/Edge 123+; **Firefox and Safari do not support it.** — [developer.chrome.com/docs/web-platform/long-animation-frames](https://developer.chrome.com/docs/web-platform/long-animation-frames), [loaf-has-shipped](https://developer.chrome.com/blog/loaf-has-shipped), [DebugBear](https://www.debugbear.com/blog/long-animation-frames) (updated 9 Mar 2026)
- Threshold **50 ms**. Entry fields: `startTime`, `duration` (excludes presentation), `renderStart`, `styleAndLayoutStart`, `firstUIEventTimestamp`, `blockingDuration`, `scripts[]`.
- `scripts[]` entries (>5 ms each): `invoker`, `invokerType` (`user-callback | event-listener | resolve-promise | reject-promise | classic-script | module-script`), `executionStart`, `forcedStyleAndLayoutDuration`, `pauseDuration`, `sourceURL`, `sourceFunctionName`, `sourceCharPosition`, `windowAttribution`.
- "`blockingDuration` is the sum of task durations longer than 50 ms (including the final render duration within the longest task)… **Reducing or eliminating `blockingDuration` by breaking up long tasks is therefore key to improving responsiveness as measured by INP.**"
- Observer: `observer.observe({ type: 'long-animation-frame', buffered: true })`.
- **In `web-vitals.js` attribution since v4** (`longAnimationFrameEntries`); v5.0.0 (7 May 2025) added longest-script attribution; **current version v6.2.2 (14 Sept 2026)**; v6.0.0 added soft-navigation support; v5.0.0 removed `onFID()`. — [web-vitals CHANGELOG](https://github.com/GoogleChrome/web-vitals/blob/main/CHANGELOG.md)
- SpeedCurve's recommended LoAF dashboard: count, total duration, total blocking duration, longest LoAF — **excluding frames before FCP**. — [Andy Davies, SpeedCurve, 19 May 2025](https://www.speedcurve.com/blog/guide-long-animation-frames-loaf/)
- Next.js exposes `experimental.webVitalsAttribution: ['CLS', 'LCP']` to enable `web-vitals` attribution per metric (off by default). — local docs `webVitalsAttribution.md`

### Inferences

- **[INFERENCE]** This site's LCP (3.88 s, text paragraph) is **not font-blocked**:
  `font-display: swap` is verified present in the served CSS, and web.dev states
  plainly that anything other than `auto`/`block` takes fonts off the LCP path.
  The 3.88 s is TTFB + render delay under 4× CPU throttle. The two things
  plausibly in it: **the 98.5 KB gzipped / 823 KB raw HTML document** (transfer
  ~0.5 s at 1.6 Mbps plus parse under 4× throttle) and the single 13.5 KB
  render-blocking stylesheet.
- **[INFERENCE]** Because TBT carries **30%** of the Lighthouse score — the single
  heaviest weight — and LCP + CLS carry 25% each, a Lighthouse 90+ target on this
  site is primarily a TBT problem, and TBT is primarily a hydration problem
  (§3). Cutting 152 KB of fonts improves the *experience* and the byte budget but
  will move the Lighthouse score very little.
- **[INFERENCE]** `experimental.inlineCss: true` would remove the one
  render-blocking stylesheet round-trip — a direct text-LCP lever, and the docs
  name atomic CSS (Tailwind) as the case where it helps most.

### Gaps

- No field data on text-LCP phase composition exists — CrUX excludes it by design.
- No first-party TBT composition breakdown for React exists.
- Whether Lighthouse 13's audit consolidation breaks any assertion this project
  would write: not determinable without running it.

---

## Key question 7 — Vercel Hobby constraints as of 2026

### Takeaway

A static portfolio sits comfortably inside Hobby: 100 GB Fast Data Transfer,
1M edge requests, full CDN caching identical to paid plans, ISR and PPR with no
plan gate. The two things that can actually bite are the **non-commercial use
restriction** (broadly defined) and the fact that **Hobby has no paid overage —
it pauses**.

### Cited Findings

**Bandwidth and transfer**
- **Fast Data Transfer: 100 GB/month.** **Fast Origin Transfer: 10 GB/month.** **Edge Requests: 1,000,000/month.** Edge Request CPU Duration: N/A on Hobby. — [vercel.com/docs/plans/hobby](https://vercel.com/docs/plans/hobby) (`last_updated: 2026-09-14`), [manage-cdn-usage](https://vercel.com/docs/manage-cdn-usage)
- **No paid overage on Hobby.** "In most cases, if you exceed your usage limits on the Hobby plan, you will have to wait until 30 days have passed before you can use the feature again." — [plans/hobby](https://vercel.com/docs/plans/hobby)
- **Conflict flagged:** the legacy functions page says instead that a paused Hobby team "remains in this state indefinitely unless you take action." — [legacy-pricing](https://vercel.com/docs/functions/usage-and-pricing/legacy-pricing) (`2026-08-11`)
- These three numbers date from the **4 April 2024** "Improved infrastructure pricing" split and have been stable since. — [vercel.com/blog/improved-infrastructure-pricing](https://vercel.com/blog/improved-infrastructure-pricing)

**Functions (post-2025 model)**
| Resource | Hobby included |
|---|---|
| Active CPU | **4 CPU-hours/month** |
| Provisioned Memory | **360 GB-hrs/month** |
| Invocations | **1,000,000/month** |
— [functions/usage-and-pricing](https://vercel.com/docs/functions/usage-and-pricing) (`2026-06-16`), [plans/hobby](https://vercel.com/docs/plans/hobby)
- Model change date: **25 June 2025** — "Active CPU pricing is now enabled by default for all Hobby, Pro, and new Enterprise teams." — [changelog](https://vercel.com/changelog/lower-pricing-with-active-cpu-pricing-for-fluid-compute)
- **Max duration on Hobby: 300 s default and max** with Fluid compute — [duration docs](https://vercel.com/docs/functions/configuring-functions/duration). *Conflict:* [/docs/limits](https://vercel.com/docs/limits) still shows 10 s/60 s, scoped to pre-2025-04-23 non-Fluid projects.

**CDN / caching**
- **"CDN caching is available for all deployments and domains on your account, regardless of the pricing plan."** — [caching/cdn-cache](https://vercel.com/docs/caching/cdn-cache) (`2026-09-14`)
- Network: **126 PoPs across 51 countries, 20+ compute regions.** — [vercel.com/docs/cdn](https://vercel.com/docs/cdn)
- **Default `Cache-Control` when unset: `public, max-age=0, must-revalidate`** (neither CDN nor browser caches).
- **Immutable build output** (`/_next/static/immutable/`, `/_vercel/immutable/`) is served `Cache-Control: public, max-age=31536000, immutable`.
- Cacheability limits (all plans): max cacheable response **10 MB** non-streaming / **20 MB** streaming; max cache time 1 year; GET/HEAD only; no `Authorization`, no `set-cookie`, no `Vary: Cookie`.
- **The one real Hobby-vs-paid caching difference:** "On Hobby, all projects in your team share a single [runtime] cache"; "A project that writes a lot of data can evict entries that belong to your other projects." Item size 2 MB, 128 tags/item. — [caching/runtime-cache](https://vercel.com/docs/caching/runtime-cache) (`2026-08-28`)

**Image Optimization**
| Metric | Hobby |
|---|---|
| Transformations | **5,000/month** |
| Cache reads | **300,000/month** |
| Cache writes | **100,000/month** |
— [image-optimization/limits-and-pricing](https://vercel.com/docs/image-optimization/limits-and-pricing) (`2026-08-11`)
- Hobby quotas were **raised 7 March 2025** from 3K/180K/60K. — [changelog](https://vercel.com/changelog/increased-hobby-usage-limits-for-image-optimization)
- **Overage behaviour is benign:** new images return HTTP 402 and the `alt` text renders; "Previously optimized images have already been cached and will continue to work as expected, without error"; "You will **not** be charged"; **deployments are not paused.** — [same](https://vercel.com/changelog/exceeding-included-image-optimization-usage-no-longer-pauses-deployments)
- Cache TTL: remote images use upstream `max-age` or `minimumCacheTTL` (default 3600 s), whichever is larger; local images cached up to **31 days**. — [image-optimization](https://vercel.com/docs/image-optimization)

**Builds**
- **Max build duration 45 minutes** (all plans); **1 concurrent deployment** on Hobby ("Builds beyond this run sequentially"); **Basic build machine only — 2 vCPUs, 8 GB memory, 32 GB disk**; build cache **1.5 GB**, retained one month. — [builds/managing-builds](https://vercel.com/docs/builds/managing-builds) (`2026-09-17`), [/docs/limits](https://vercel.com/docs/limits)
- **Monthly build-minutes quota on Hobby: NOT FOUND** — the pricing page lists it as simply "Included". What does bound you: **100 deployments/day, 100 builds/hour, 60 deployments per 5 minutes**. Other caps: 200 projects, 50 domains/project, **2048 routes/deployment**.

**ISR / PPR / `after()`**
- **ISR is available on Hobby** with no plan gating. ISR cache retained "until it goes unaccessed for **31 days**"; "There is no limit on storage for ISR"; reads/writes metered in **8 KB units**; global purge within **300 ms**. — [incremental-static-regeneration](https://vercel.com/docs/incremental-static-regeneration) (`2026-08-28`)
- **PPR: no Hobby restriction documented.** The PPR page describes framework requirements (App Router + Cache Components + `use cache`) and billing with **no plan gate**. — [vercel.com/docs/partial-prerendering](https://vercel.com/docs/partial-prerendering) (`2026-09-22`)
- **`after()`: no Hobby-specific restriction documented.** `after()`/`waitUntil()` run within the function's `maxDuration` (300 s on Hobby). — [vercel-functions-package](https://vercel.com/docs/functions/functions-api-reference/vercel-functions-package)

**2025–2026 changes that matter for a personal portfolio**
- **Commercial-use restriction is real and broad.** "Hobby teams are restricted to non-commercial personal use only", explicitly including **"Receiving payment to create, update, or host the site"**, payment processing, advertising a product or service, affiliate linking as primary purpose, and AdSense. **Donations are explicitly exempt.** — [fair-use-guidelines](https://vercel.com/docs/limits/fair-use-guidelines)
- **Hobby teams cannot connect projects to Git-organization-owned repositories** — personal repos only. — [/docs/limits](https://vercel.com/docs/limits)
- **Observability retention on Hobby: 12 hours. Runtime logs: 1 hour.** Observability Plus/Query unavailable on Hobby. — [observability-plus](https://vercel.com/docs/observability/observability-plus)
- WAF on Hobby capped at 3 IP blocks and 3 custom rules (Pro: 100/40). — [plans/hobby](https://vercel.com/docs/plans/hobby)

**Speed Insights & Web Analytics**
- **Speed Insights: 10,000 events over a rolling 30 days, team-wide** — "a rolling window, not a calendar-month or billing-cycle reset." On hitting the cap, Vercel "pauses collection for those projects for **at least 14 days**"; no charges, site keeps running. **Free tier gets Real Experience Score only, with 24-hour and 7-day ranges only**; all Core Web Vitals + 30-day range require Pro. — [speed-insights/limits-and-pricing](https://vercel.com/docs/speed-insights/limits-and-pricing) (`2026-09-23`)
- **Web Analytics: 50,000 events/month on Hobby**, shared across all projects; **1-month reporting window**; **custom events not available on Hobby**. Exceeding: 3-day grace, then collection stops, then a 7-day wait. — [analytics/limits-and-pricing](https://vercel.com/docs/analytics/limits-and-pricing) (`2026-08-25`)

### Inferences

- **[INFERENCE]** For a fully prerendered portfolio, every one of these quotas is
  irrelevant except Fast Data Transfer. At ~520 KB per cold visit today (or ~304 KB
  after the font cuts), 100 GB/month allows roughly **200,000 cold visits/month**
  (or ~340,000 after the cuts) — far beyond any personal site.
- **[INFERENCE]** The Hobby Speed Insights limitation (Real Experience Score only,
  no per-metric CWV breakdown) means **field data for LCP/INP/CLS is not available
  on Hobby**. Lab measurement (`pnpm perf`, Lighthouse CI) is the only signal
  available without paying.
- **[INFERENCE]** Nothing about Hobby argues for or against Cache Components/PPR.
  The decision is purely architectural (see §1, Tier 4).

### Gaps

- **NOT FOUND:** Hobby ISR read/write allowances; a numeric Hobby build-minute
  quota; the numeric runtime-cache storage limit; the default `max-age` for
  ordinary (non-immutable) static files.
- Two live contradictions in Vercel's own docs are flagged above (pause duration;
  function max duration).

---

## Key question 8 — Measurement: what a repeatable local perf gate should assert on

### Takeaway

Because **Next 16 removed `First Load JS` from build output**, a byte budget must
be asserted against a running server or against `next experimental-analyze
--output`. The project's existing `scripts/perf.mjs` is already the right shape;
what it lacks is (a) multi-run aggregation, (b) a hard assertion that fails, and
(c) a LoAF/`blockingDuration` channel. Lighthouse CI adds the score gate the
targets are stated in.

### Cited Findings

**What changed in Next 16**
- "**Next.js 16 removes the `size` and `First Load JS` metrics from the `next build` output.** We found these to be inaccurate in server-driven architectures using React Server Components… The most effective way to measure actual route performance is through tools such as Chrome Lighthouse or Vercel Analytics, which focus on Core Web Vitals and downloaded resource sizes." — local docs `01-app/02-guides/upgrading/version-16.md`
- Replacement tool: `pnpm next experimental-analyze` (v16.1+), `--output` writes to `.next/diagnostics/analyze` for diffing: "You can copy this directory elsewhere to compare results." Shows per-module size **and full import chains**. — local docs `01-app/02-guides/package-bundling.md`
- `@next/bundle-analyzer` is documented as the **Webpack** path; this project builds with Turbopack by default.

**Lighthouse CI**
- Assert on audit IDs with `maxNumericValue` + `aggregationMethod`:
  ```js
  'largest-contentful-paint': ['error', { maxNumericValue: 2500, aggregationMethod: 'median' }]
  ```
  Useful IDs: `largest-contentful-paint`, `cumulative-layout-shift`, `categories:performance`, `categories:accessibility`, `resource-summary:script:size`, `resource-summary:third-party:count`, `performance-budget`. — [qaskills.sh, Lighthouse CI budgets & assertions guide, 2026-08-07](https://qaskills.sh/blog/lighthouse-ci-budgets-assertions-guide)
- **`numberOfRuns: 5` is the recommended practical starting point.** Aggregation: `median` for stable timing metrics; `pessimistic` for layout shift or strict invariants; `optimistic` only for early-warning rollouts.
- **Unit trap:** "file sizes in a Lighthouse budget file are expressed in **kilobytes**, while `maxNumericValue` for Lighthouse CI `resource-summary` size assertions is expressed in **bytes**." `"budget": 250` = 250 KB; `maxNumericValue: 256000` = 256 KB.
- Direct assertions are preferred over `budget.json` because they consolidate policy and allow mixed severity in one config.
- On thresholds: "Collect enough clean results from the default branch to understand typical variance" before setting limits; start aspirational gates as **warnings**, promote to **error** after improvement. — same source
- **Lighthouse 13 replaced 16+ audits with consolidated "insight audits"** — any assertion keyed to an old audit ID breaks. — [developer.chrome.com/blog/lighthouse-13-0](https://developer.chrome.com/blog/lighthouse-13-0)
- Lighthouse weights to gate against: FCP 10 / SI 10 / **LCP 25 / TBT 30 / CLS 25**. — [performance-scoring](https://developer.chrome.com/docs/lighthouse/performance/performance-scoring/)
- Next's own production checklist recommends running Lighthouse "in incognito… This is a simulated test and should be paired with looking at field data." — local docs `production-checklist.md`

**What this project already has** [MEASURED HERE, from `scripts/perf.mjs`]
- Playwright + CDP: `Network.emulateNetworkConditions` (latency 150 ms, ~1.6 Mbps down) and `Emulation.setCPUThrottlingRate { rate: 4 }`; viewport 412×823 @ DPR 2.625.
- Three `PerformanceObserver`s installed via `context.addInitScript` **before the document runs** — LCP (with element identification), `longtask`, `layout-shift`. The script's own comment: "Observers must exist before the document runs, or LCP and long tasks that happen during load are simply never seen."
- Byte accounting via `page.on("response")` → `request().sizes().responseBodySize`, bucketed by `resourceType` into script/stylesheet/font/other.
- **Known weakness, in the script's own words:** a response that never finished has no sizes, and the handler swallows the error — "Skipping it under-reports rather than crashing the run." This is a candidate explanation for the 188.2 vs 223.0 KB gap (§2).
- Explicitly excluded from `pnpm verify` because "it needs a server, and `verify` must stay hermetic."

**Run-to-run variance is real on this project**
- `docs/feedback-tracker.md` records a **196 ms same-commit TBT swing** (456 ms vs 260 ms with no code change) and a **456 ms LCP spread** (4148 vs 3692 ms) between two runs against the same build. The tracker's own policy is to record both numbers rather than pick one.

### Inferences — what a good gate should assert

- **[INFERENCE]** Three independent gates, because they fail for different reasons:
  1. **Byte budget (deterministic, no variance).** Assert on the sum of
     `responseBodySize` for `script` and `font` resource types against a running
     `next start`. This is the only number with zero run-to-run noise, so it can be
     an `error` from day one. Suggested: scripts ≤ 195 KB, fonts ≤ 180 KB post-cut.
     Curl-based measurement (as used in §2/§4) is even more deterministic than CDP.
  2. **Lighthouse CI score gate**, `numberOfRuns: 5`, `aggregationMethod: 'median'`,
     asserting `categories:performance ≥ 0.90`, `categories:accessibility ≥ 0.95`,
     `categories:best-practices ≥ 0.95`, `categories:seo ≥ 0.95` — the project's
     stated targets. Timing assertions (`largest-contentful-paint`,
     `total-blocking-time`) should start as **warnings** given the documented
     196 ms / 456 ms swings.
  3. **A LoAF channel** (Chrome-only): observe `long-animation-frame` with
     `buffered: true`, report count, total `blockingDuration`, and longest frame,
     **excluding frames before FCP** (SpeedCurve's recommendation). This is the
     metric that maps onto INP, which `pnpm perf`'s `longtask` observer only
     approximates.
- **[INFERENCE]** Fix the silent under-reporting in `scripts/perf.mjs`: count
  skipped responses and print the count, so a run that swallowed chunks is
  visibly different from one that didn't. The 188.2 vs 223.0 KB discrepancy
  should be resolved before any byte budget is set on the old number.
- **[INFERENCE]** Add `pnpm next experimental-analyze --output` to the workflow and
  commit the diff artefact when the bundle changes — it is the only tool in
  Next 16 that answers *why* a chunk grew, with import chains.

### Gaps

- I did not run Lighthouse or `lhci` against this project, so I cannot state its
  current Lighthouse scores — only the `pnpm perf` numbers already in
  `docs/feedback-tracker.md`.
- No source gives a recommended `numberOfRuns` for the specific case of a
  4× CPU-throttled local machine with documented ~200 ms TBT noise; 5 runs is a
  general recommendation.
- `next experimental-analyze` is marked experimental in 16.3; its output format
  may change, which makes it fragile as a CI assertion target.
