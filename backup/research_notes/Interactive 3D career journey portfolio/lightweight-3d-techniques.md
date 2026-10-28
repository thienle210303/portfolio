# Lightweight 3D / Depth Techniques for the Web Without a 3D Library (September 2026)

> Scope note for the report writer: this file covers techniques, measured costs, browser
> support and implementation patterns for achieving perceived depth **without** shipping
> three.js / R3F / globe.gl / cobe. Those four are already measured and rejected by the
> project (~133 KB gz, ~254 KB gz, ~509 KB gz, 5.9 KB respectively) against a ~190 KB gz
> total-JS budget, and are referenced here only as comparison anchors. The project's proven
> baseline is a no-dependency Canvas 2D orthographic globe (24.5 KB engine raw, 18.4 KB gz
> coastline data, 1.8 ms/frame at 1440px, zero animation frames at rest).
>
> **Measurement provenance warning:** the web publishes far more qualitative advice about
> these techniques than it does numbers. Where I found a real measurement I give the device
> and the source. Where I did not, I say so in Gaps rather than inventing a figure. Several
> widely-repeated performance claims in this space trace back to blog posts from 2011–2014
> and are explicitly dated below.

---

## CSS 3D: what `preserve-3d`, `perspective`, `rotate3d` and `translateZ` can actually build

### Takeaway

CSS 3D can build genuine navigable scenes — terrain, voxel worlds, isometric constructions,
parallax stacks — at a cost of zero JavaScript bytes, and the browser does the projection
and depth-sorting for you. It falls down on three specific things: there is no z-buffer (only
polygon-level sorting, with undefined behaviour for intersecting planes), there is no
lighting model (all shading must be authored as static colour), and it is memory-hungry
because every 3D-transformed element tends to become its own GPU texture.

### Cited Findings

- Under `transform-style: preserve-3d`, children share one 3D rendering context and paint
  order follows z-position in that space rather than DOM order — [Ekioh, "3D Environments in CSS"](https://www.ekioh.com/devblog/3d-environments-in-css/)
- The CSS Transforms spec's suggested sorting approach is **Newell's algorithm** (1972),
  not a depth buffer; Ekioh's Flow engine implemented exactly that, and notes the algorithm
  must *split intersecting elements into polygon pieces*, adding computational overhead —
  [Ekioh](https://www.ekioh.com/devblog/3d-environments-in-css/); [CSS Transforms Module Level 2](https://www.w3.org/TR/css-transforms-2/)
- **Hard memory numbers for a CSS 3D scene.** Rendering the same CSS 3D environment, Ekioh's
  Flow used ~7 MB of static GPU textures plus 50–100 MB of temporary GPU surfaces, whereas
  **Chrome used 200–600 MB of GPU memory depending on viewpoint.** The difference is
  attributed to Chrome allocating a layer per 3D element; Flow renders 3D items directly to
  screen — [Ekioh](https://www.ekioh.com/devblog/3d-environments-in-css/)
- Behaviour of **intersecting** layers under `preserve-3d` is undefined and inconsistent
  across engines; implementations disagree on whether to sort by midpoint, frontmost point,
  backmost point, or local origin — [Ekioh](https://www.ekioh.com/devblog/3d-environments-in-css/); long-standing Gecko z-ordering bug: [Bugzilla 725299](https://bugzilla.mozilla.org/show_bug.cgi?id=725299)
- **The stacking-context trap is normative, not a bug.** "Grouping" properties — `opacity`,
  `filter`, and anything that affects clipping — applied to an element with
  `transform-style: preserve-3d` change the *used* value to `flat`, so the element neither
  creates nor extends a 3D rendering context. A single `opacity: 0.99` or `filter: blur()`
  silently flattens a subtree — [CSS Transforms Module Level 2](https://www.w3.org/TR/css-transforms-2/)
- CSS has no z-buffering, no texture mapping and no particle primitives; there is no
  mesh-level depth-buffer contract comparable to WebGL — [Ekioh](https://www.ekioh.com/devblog/3d-environments-in-css/)
- **Text at an angle degrades.** WebKit/Blink treat 3D-transformed elements as *textures*
  rather than vectors in order to hardware-accelerate them, so glyphs are rasterised once
  and then resampled; non-integer `translate3d` x/y values produce visibly fuzzy type.
  Documented mitigations: force greyscale antialiasing on the transformed element,
  `text-rendering: geometricPrecision`, render text larger and scale the element down
  (higher-res texture), or round positions to the device pixel ratio — [dropshado.ws, "Subpixel positioning with CSS transforms and type rendering"](http://desandro.github.io/dropshado.ws/post/subpixel-position-translate.html); [CSS-Tricks forum thread](https://css-tricks.com/forums/topic/transforms-cause-font-smoothing-weirdness-in-webkit/); [drei issue #2380 on blurry HTML in 3D](https://github.com/pmndrs/drei/issues/2380)
- Ekioh also reports anti-aliasing/colour-bleed artefacts at the edges of 3D-transformed
  elements, the same class of artefact seen with 2D transforms — [Ekioh](https://www.ekioh.com/devblog/3d-environments-in-css/)

### Real CSS-only scenes (existence proofs, not just card flips)

- **Codrops, "Crafting Generative CSS Worlds" (10 Nov 2025)** — a generative heightmap
  terrain built from *stacked CSS grids* plus 3D transforms, "no canvas, no WebGL, just
  CSS." A `.scene` element acts as the camera mount carrying `perspective`; the article
  uses a deliberately **large `perspective: 8000px`** to get an almost-isometric look with
  only slight natural distortion, and every child inherits `transform-style: preserve-3d`.
  Shipped as the Layoutit Terrain Generator — [Codrops](https://tympanus.net/codrops/2025/11/10/crafting-generative-css-worlds/)
- **Codrops, "CSS Meets Voxel Art: Building a Rendering Engine with Stacked Grids" (3 Mar
  2025)** — the predecessor CSS voxel editor the terrain work builds on — [Codrops](https://tympanus.net/codrops/2025/03/03/css-meets-voxel-art-building-a-rendering-engine-with-stacked-grids/)
- Pure-CSS isometric constructions: [Pure CSS Isometric Towers](https://codepen.io/xdesro/pen/dVxpgN),
  [Exploded isometric via CSS 3D transforms](https://codepen.io/scootman/pen/wrNdYP),
  [IsometricSass](https://www.cssscript.com/2d-isometric-sass/) (a SASS-only isometric
  primitive library using CSS3 transforms)
- A playable [pure CSS 3D maze (Chrome only)](https://dev.to/ivorjetski/a-pure-css-3d-maze-chrome-only-5c80) — note the author's own "Chrome only" caveat, which is itself
  evidence for the cross-engine inconsistency above
- The **perspective-parallax** pattern needs no scroll listener at all: put
  `perspective: 1px` on the scroll container, push layers back with `translateZ(-Npx)` and
  scale them up by `(1 + N)` to compensate; depth then falls out of the projection as the
  container scrolls — [CodeFronts, 3D Transform Perspective Layer Parallax](https://codefronts.com/motion/css-parallax-designs/3d-transform-perspective-layer-parallax/); [3D CSS Parallax Depth Effect (CodePen)](https://codepen.io/dazulu/pen/VVZrQv)
- Codrops' own horizontal parallax gallery tutorial takes the DOM/CSS version first and
  *then* offers a WebGL upgrade — useful as an explicit statement of where the DOM version
  runs out — [Codrops, Feb 2026](https://tympanus.net/codrops/2026/02/19/creating-a-smooth-horizontal-parallax-gallery-from-dom-to-webgl/)

### Inferences

- The Ekioh numbers are the single most important CSS-3D fact for this project: **a CSS 3D
  scene can cost 200–600 MB of GPU memory in Chrome** for what is visually a modest scene.
  That is a low-end-Android tab-crash risk, and it is the strongest argument for keeping a
  complex depth scene on one canvas rather than in hundreds of transformed DOM nodes.
- The grouping-property rule means the site's existing design vocabulary is partly
  incompatible with CSS 3D scenes: any tone/alias layer that reaches for `opacity` or
  `filter` on a wrapper inside a `preserve-3d` subtree will flatten it. Any CSS 3D scene
  must therefore be built as a self-contained subtree with an explicit "no opacity, no
  filter on these elements" rule.
- CSS 3D is at its best exactly where the project's constraints point: **static or
  low-element-count scenes that server-render**, because the markup is real HTML and the
  depth is pure CSS, so there is *zero* hydration cost and the scene exists before JS runs.
  It is at its worst for anything needing continuous free rotation of many faces.
- `perspective: 8000px` (Codrops) is the practical trick for "3D-ish but readable": it
  approaches an orthographic projection, which keeps text nearly fronto-parallel and
  therefore legible, avoiding most of the glyph-resampling problem above.

### Gaps

- I found **no published per-frame millisecond measurement** of a CSS 3D scene (paint vs
  composite split, layer count vs frame time) from a practitioner DevTools trace. Ekioh
  gives memory but not frame time; the Codrops articles give technique but no profile.
- No source quantified how many `preserve-3d` elements Chrome can hold before layer
  squashing fails and frame time collapses.

---

## Canvas 2D pseudo-3D: hand-written projection, painter's algorithm, isometric, 2.5D

### Takeaway

Everything the project needs for a "real 3D" feeling — orthographic and perspective
projection, depth sorting, isometric tiling, wireframe/hidden-line — is a few dozen lines
of arithmetic on a 2D context, with no library and no shader. The costs that actually bite
are per-draw-call binding overhead (which is why batching matters more than maths) and
`shadowBlur`, which web.dev singles out as "very expensive."

### Cited Findings

**Projection and depth sorting**

- Painter's algorithm: compute one depth value per polygon (typically camera-to-centroid
  distance), sort ascending, draw far→near. No depth buffer is needed; the only data
  structure is an array of polygons plus a sort — [Every Algorithm, "Painter's Algorithm"](https://every-algorithm.github.io/2024/10/15/painters_algorithm.html); [Aldream, "The Painter's Algorithm"](http://code.aldream.net/article/2013-04-13-painter-s-algorithm/)
- Known failure mode, identical to the CSS 3D one: it produces wrong results for
  **intersecting or cyclically overlapping** polygons, because a single depth scalar cannot
  express the relationship — [Every Algorithm](https://every-algorithm.github.io/2024/10/15/painters_algorithm.html)
- Interactive worked notebook with the maths and a step-through: [Observable, "The Painter's Algorithm"](https://observablehq.com/@pamacha/the-painters-algorithm)
- With a 2D canvas "you implement your own complete 3D pipeline and can try the painter's
  algorithm for visibility" — [Wisconsin CS559 Programming Assignment 4](https://pages.graphics.cs.wisc.edu/559-f15/2015/09/24/programming-assignment-4)
- Spherical-projection maths without any 3D engine is a solved, documented problem in
  d3-geo — "shapes and calculators for spherical coordinates" — which is the same family of
  maths the project's existing orthographic globe already implements by hand — [d3-geo on npm](https://registry.npmjs.org/d3-geo/latest)

**Measured costs**

- **Per-`drawImage` call overhead (dated, 2014):** a full `drawImage` call that actually
  does something took ≈**9,500 ns in Firefox nightly, ≈4,300 ns in Chrome dev, ≈3,000 ns in
  Safari 7.0.5.** The WHATWG thread's argument is that sprite engines call `drawImage`
  hundreds-to-thousands of times per frame, and the per-call script-binding and bookkeeping
  is an O(N) cost that batching could make O(1) — [WHATWG list, Ashley Gullen / Justin Novosad, Aug 2014](https://lists.w3.org/Archives/Public/public-whatwg-archive/2014Aug/0009.html); [proposal writeup](https://wiki.whatwg.org/wiki/Canvas_Batch_drawImage). **These are 2014 numbers on 2014 engines — treat as
  order-of-magnitude only.** Batched `drawImage` never shipped.
- Path cost is **not** linear in the nice direction: "performance in certain browsers
  degrades very quickly as the number of subpaths increases above a certain threshold," and
  converting O(n) `beginPath`/`arc`/`fill`/`stroke` work into O(1)-per-object `drawImage`
  blits from a pre-rendered sprite is faster — [Ebenezer Packwood, "Canvas Path Performance"](https://ebenpackwood.com/posts/canvas-path-performance.html/)
- Transform and `globalAlpha` changes **cannot** be batched away; composite-mode changes
  mostly can — [WHATWG list, Aug 2014](https://lists.w3.org/Archives/Public/public-whatwg-archive/2014Aug/0001.html)

**web.dev's canonical optimisation list** — [web.dev, "Improving HTML5 Canvas performance"](https://web.dev/articles/canvas-performance)

- Pre-render complex repeated objects to an offscreen canvas, then blit. Crucially, the
  scratch canvas must fit **snugly** around the art: their "pre-rendered loose" case
  (300×100 canvas for 100×40 of art) performed *worse* than the snug case, because the copy
  cost scales with the surface, not the ink.
- Batch: build one path containing all the lines and stroke once — with the stated
  exception that primitives with small bounding boxes can be cheaper drawn separately.
- Avoid state changes: group by fill colour, not by spatial position (draw all stripes of
  colour A, then all of colour B).
- Differential rendering: track the drawn bounding box and `clearRect` only that.
- **Layered canvases**: several absolutely-positioned transparent canvases, so a static
  background layer repaints far less often than the foreground. This leans on GPU
  compositing rather than redraw.
- **Avoid `shadowBlur`** — listed flatly as "very expensive" (no number given).
- `clearRect(0,0,w,h)` generally beats the width-reset trick.
- Snap to integer coordinates to avoid antialiasing overhead; `(0.5 + n) | 0` is the cheap
  truncation.
- Use `requestAnimationFrame` rather than a fixed tick, explicitly for battery on mobile.
- MDN's parallel guidance: [Optimizing canvas](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas)
- Konva's production tip list independently converges on the same advice, with a dedicated
  page on stroke cost — [Konva performance tips](https://konvajs.org/docs/performance/All_Performance_Tips.html); [Konva, Optimize Strokes](https://konvajs.org/docs/performance/Optimize_Strokes.html)

**Isometric specifically**

- Canvas is immediate-mode: to move anything you clear and redraw, which is why layering
  static vs dynamic content across multiple canvases is the standard isometric-engine
  optimisation — [O'Reilly, *Making Isometric Social Real-Time Games with HTML5, CSS3 and JavaScript*, ch.1](https://www.oreilly.com/library/view/making-isometric-social/9781449309664/ch01.html)
- A minimal worked isometric tile engine with the coordinate transforms spelled out —
  [Nick Aschenbach, "Simple Isometric Tiling"](http://nick-aschenbach.github.io/blog/2015/02/25/isometric-tile-engine/)
- [Isomer](https://github.com/klimonte/isomer) is the reference no-WebGL isometric canvas
  library if a worked implementation is wanted to read rather than depend on.

### Inferences

- The project's measured **1.8 ms/frame at 1440px** for a coastline globe sits comfortably
  inside a 16.7 ms budget, and it is dominated by path stroking, not by projection maths.
  The web.dev path→blit and layered-canvas advice is therefore the direct lever if the scene
  grows: a static graticule/ocean layer on its own canvas, repainted only on resize, with
  the moving ink on top.
- The 2014 `drawImage` figures imply a soft ceiling on the order of a few thousand discrete
  draw calls per frame on a 2D context before binding overhead alone eats the budget. That
  is roughly where "add another element to the scene" starts costing frame time rather than
  just pixels — and it is far more elements than a career-journey scene plausibly needs.
- Because `shadowBlur` is the one 2D-context primitive web.dev calls out as very expensive,
  soft-shadow depth cues on canvas should be pre-rendered into a sprite once, not applied
  per-frame.

### Gaps

- I could not find a **current (2025–2026)** measurement of per-`drawImage` or per-path
  cost on modern engines. Everything specific I found is 2014-era. Any number the report
  quotes here must carry that caveat.
- No published measurement of hidden-line/wireframe rendering cost on canvas at a stated
  polygon count.

---

## SVG depth: isometric SVG, lighting filters, layered parallax — and what filters really cost

### Takeaway

SVG gives crisp vectors at any zoom and ships as markup (server-renderable, zero JS), and
`feDiffuseLighting`/`feSpecularLighting` are the only *lighting model* available without
WebGL. But SVG filters are CPU-side paint-time work with a region that scales by area, not
by radius, and the practitioner consensus is unambiguous: use CSS `filter` where it can do
the job, keep filter regions tight, and never animate a filter parameter on a large surface.

### Cited Findings

- `feGaussianBlur` is rated **heavy, radius-dependent**; the specific advice is to minimise
  chained primitives, "especially expensive ones like `feTurbulence` or large-radius
  `feGaussianBlur`," to keep repaint cost manageable during scroll or animation — [svg-filter-lab, "How to implement performant SVG filters without killing your frame rate"](https://github.com/MelodicBloom/svg-filter-lab/blob/main/docs/how-to-implement-performant-svg-filters-without-killing-your-frame-rate.md)
- **Filter region is the dominant term**: keeping the region as tight as possible, rather
  than defaulting to the oversized default region, reduces the pixel area the browser must
  recompute per frame — [svg-filter-lab](https://github.com/MelodicBloom/svg-filter-lab/blob/main/docs/how-to-implement-performant-svg-filters-without-killing-your-frame-rate.md); [ImageToSVG, SVG filter performance tips](https://imagetosvg.com/how-to/svg-filter-performance-tips)
  (SVG's default filter region is -10%/-10% with 120%×120% size, i.e. ~44% more pixels than
  the element — [SVG 1.1 Filter Effects spec](https://www.w3.org/TR/SVG11/filters.html))
- **For blur, grayscale and drop-shadow, CSS `filter` is significantly faster than the SVG
  filter equivalent**, because CSS filters go through hardware-accelerated compositing —
  [ImageToSVG](https://imagetosvg.com/how-to/svg-filter-performance-tips)
- A single blur or colour shift is "often negligible on modern hardware"; it is *stacks* of
  primitives and *animated* filters on large areas that break — [svg-filter-lab](https://github.com/MelodicBloom/svg-filter-lab/blob/main/docs/how-to-implement-performant-svg-filters-without-killing-your-frame-rate.md)
- `feTurbulence` is **generated on the CPU at paint time**; the operative rules are: render
  it once as a fixed-size tiled layer, never put it on a filter that re-evaluates every
  frame, and never animate `baseFrequency` in CSS on a full-screen element — [Ultimate Design Tools, CSS noise textures guide](https://ultimatedesigntools.com/blog/css-noise-textures-guide/)
- Firefox has a long-standing tracked bug that its CSS blur filter was "an order of
  magnitude slower than Chrome" — evidence that filter cost is not uniform across engines —
  [Bugzilla 925025](https://bugzilla.mozilla.org/show_bug.cgi?id=925025)
- MDN reference for the primitive and its `stdDeviation` semantics: [feGaussianBlur](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/feGaussianBlur)

### Inferences

- `feDiffuseLighting`/`feSpecularLighting` are the only way to get a *computed* light
  response (surface normals from an alpha channel, a positioned light) without a shader, and
  they are genuinely "material"-looking. But they are multi-primitive filter chains on a
  large region — exactly the pattern every source above says is expensive. The safe use is
  **static**: render the lit surface once, at load, on an element that never re-filters.
  Treat any per-frame `feSpecularLighting` as disqualified on mobile.
- Layered SVG parallax has a hidden advantage over layered `<img>` parallax for this
  project: the layers can be drawn in the site's own ink (`currentColor`, semantic aliases)
  and therefore re-theme for free between `day` and `night`, which raster layers cannot.
  That is the same property that disqualified `cobe`.
- Practical ranking that falls out of the sources: CSS `filter: drop-shadow()` > stacked
  `box-shadow` > `feDropShadow` > hand-built `feGaussianBlur` + `feOffset` + `feMerge`
  chains, for equivalent visual results.

### Gaps

- **I found no rigorous, numeric benchmark of SVG filter cost** — no "this filter chain
  costs N ms on device X at size Y" from a practitioner DevTools trace. The literature on
  SVG filter performance is almost entirely qualitative ("heavy", "expensive",
  "radius-dependent"). This is a genuine hole; the brief asked to quantify it and the
  quantification does not appear to be published. The nearest hard number in this whole
  research set is the backdrop-filter measurement below, which is a *CSS* filter, not SVG.
- No measurement comparing `feDiffuseLighting` against an equivalent pre-baked gradient.

---

## Raw WebGL / WebGL2 without a framework, micro-wrappers, and WebGPU relevance

### Takeaway

The micro-wrapper tier is real but not free: the smallest credible WebGL helper is **~15 KB
gz (picogl)** and the most popular "minimal" one, **ogl, is 34 KB gz** — a quarter of
three.js and roughly 18% of the project's entire JS budget, before any scene code. A
hand-written WebGL scene has no library floor at all, but I could not find a credible
published byte count for one, so that number has to be produced by building it. WebGPU is
close to universal in 2026 but is not a substitute for a universal baseline.

### Cited Findings — measured sizes (all read from the Bundlephobia API on 28 Sep 2026)

| Package | Version checked | Minified | **Min + gzip** | Deps |
|---|---|---|---|---|
| `gl-matrix` | **3.4.4** | 53,819 B | **13,638 B** | 0 |
| `picogl` | **0.17.9** | 66,024 B | **15,195 B** | 0 |
| `twgl.js` | **7.0.0** | 78,360 B | **22,675 B** | 0 |
| `ogl` | **1.0.11** | 131,430 B | **34,177 B** | 0 |
| `regl` | **2.1.1** | 117,403 B | **37,658 B** | 0 |
| `versor` | **0.2.0** | 1,990 B | **977 B** | 0 |

Sources: [ogl](https://bundlephobia.com/api/size?package=ogl), [twgl.js](https://bundlephobia.com/api/size?package=twgl.js), [regl](https://bundlephobia.com/api/size?package=regl), [gl-matrix](https://bundlephobia.com/api/size?package=gl-matrix), [picogl](https://bundlephobia.com/api/size?package=picogl), [versor](https://bundlephobia.com/api/size?package=versor).
These are **whole-package** figures, not tree-shaken; ogl in particular is ES modules with
zero dependencies and is designed to be partially imported (see below).

- `gl-matrix`'s latest published version on the npm registry is still **3.4.4** as of
  28 Sep 2026 — there is no stable v4 — [npm registry](https://registry.npmjs.org/gl-matrix/latest)
- **ogl explicitly tree-shakes for the shader-only case**: "for a simpler use, such as a
  full-screen shader, more of the core can be omitted as a scene graph (`Transform`) and
  projection matrices (`Camera`) are not necessary," which further reduces bundle size —
  [ogl README / docs](https://github.com/oframe/ogl)
- ogl's own positioning: "a small, effective WebGL library aimed at developers who like
  minimal layers of abstraction and are interested in creating their own shaders," ES6
  modules, zero dependencies — [ogl](https://github.com/oframe/ogl)
- The qualitative claim repeated across write-ups is that "raw WebGL or a small library like
  ogl covers it in a few kilobytes" and that "shader-driven visuals are the cheapest 3D on
  the web — kilobytes rather than megabytes" — [21st.dev, "React Shader Backgrounds: What WebGL Costs and When It Pays"](https://21st.dev/blog/react-shader-background-components)
- A complete teaching reference for WebGL with no library at all (context setup, shader
  compile, buffer, draw) — [University of Illinois CS418, "Minimal WebGL"](https://cs418.cs.illinois.edu/website/text/minimal-webgl.html)

**Anomalous reading to flag:** Bundlephobia returned `d3-geo` 3.1.1 as 37,059 B minified but
**709 B gzipped** ([source](https://bundlephobia.com/api/size?package=d3-geo)). A 52:1 ratio
is not physically plausible for JavaScript and is almost certainly a Bundlephobia
measurement artefact (likely it resolved only a re-export shim). **Do not quote the 709 B
figure.** The raw 37 KB figure and the zero-dependency `versor` figure are sane; d3-geo's
real gzipped size should be re-measured before it is used in any budget.

### WebGPU status (September 2026) — sources conflict, flagged

- One 2026 write-up states WebGPU "hit Baseline in every major browser" as of January 2026,
  shipping by default in Chrome, Edge, Firefox on Windows and macOS, and Safari 26 on iOS
  and macOS Tahoe — [VR.org](https://vr.org/articles/webgpu-baseline-2026-three-js-webxr-default)
- **Contradicted in the same search results**: "as of September 2026 Firefox only ships it
  on Windows and Apple Silicon Macs"; Firefox first released WebGPU in Firefox 141 in July
  2025 — [Wikipedia, WebGPU](https://en.wikipedia.org/wiki/WebGPU); the canonical tracker is
  [gpuweb Implementation Status](https://github.com/gpuweb/gpuweb/wiki/Implementation-Status)
- Safari: WebGPU shipped in **Safari 26.0 on 15 September 2025** (macOS Tahoe/Sequoia/
  Sonoma, iOS 26, iPadOS 26, visionOS 26), on by default; behind a flag in Safari 17–18 —
  [Wikipedia, WebGPU](https://en.wikipedia.org/wiki/WebGPU)

### Inferences

- **The micro-wrapper tier does not solve the budget problem.** ogl at 34 KB gz is ~18% of
  a 190 KB gz total-JS budget for the *library alone*; regl at 38 KB gz is worse; twgl at
  23 KB gz is a thin helper that still leaves all the scene code to write. Only picogl
  (15 KB gz, WebGL2-only) and gl-matrix (14 KB gz, maths only, no GL) are in a range that
  could plausibly coexist with the rest of the site — and gl-matrix buys *no* rendering,
  only matrices the project would otherwise write in ~80 lines.
- The genuinely cheap WebGL option is **hand-written WebGL with hand-written 4×4 matrix
  maths and one shader pair**. A context setup + shader compile + one buffer + a draw loop
  is on the order of 150–250 lines; gzipped that is realistically **2–5 KB** — but I am
  labelling that an **estimate**, because no source published a measured byte count for
  such a file and I did not build one.
- For this project, `versor` at **977 B gzipped** is the standout find: it is the canonical
  quaternion helper for dragging a globe by great-circle rotation (the d3 community's
  solution to "drag a sphere without gimbal weirdness"), and at under 1 KB it is essentially
  free against the existing Canvas 2D orthographic globe. It adds *interaction quality* to
  the proven baseline rather than replacing it.
- **WebGPU is not relevant for a site that must work everywhere.** Even on the most
  optimistic reading it requires Safari 26+/Firefox 141+ on specific platforms, with Firefox
  Linux and older iOS excluded; a portfolio targeting WCAG 2.2 AA and Lighthouse 95+ cannot
  make its primary visual depend on it. It is at most a progressive enhancement, and given
  that WebGL2 is already broadly available there is no payoff to justify the branch.

### Gaps

- **No published measured bundle size for a hand-written WebGL scene.** Every source
  asserts "kilobytes" without measuring. The project will have to measure its own.
- Bundlephobia figures are pre-tree-shaking; I found no published *tree-shaken* size for
  ogl's shader-only import path, only the claim that it is smaller.
- The Firefox-platform question for WebGPU is genuinely contested between the two sources
  above; the gpuweb Implementation Status wiki should be checked directly before the report
  states anything definite.

---

## Scroll-driven and view-driven depth: `animation-timeline: scroll()` / `view()`

### Takeaway

Scroll-driven animations give parallax and depth reveals with **zero JavaScript**, running
off the main thread, and they are the single best payoff-per-byte technique in this whole
catalogue. The catch in September 2026 is Firefox: caniuse lists Firefox **159** as the
first supporting version, which is still ahead of the current stable release, so the feature
is not Baseline and must be wrapped in `@supports`.

### Cited Findings — support

- **caniuse global support for `animation-timeline`: 87.22%.** First supporting versions:
  Chrome 115, Edge 115, Opera 101, Samsung Internet 23, **Safari 26.0** (and iOS Safari
  26.0), **Firefox 159** — [caniuse: mdn-css_properties_animation-timeline](https://caniuse.com/mdn-css_properties_animation-timeline)
- A separate 2026 write-up quotes caniuse at **82.58%** for the feature and states that
  "technically [it is] not Baseline precisely because Firefox stable hasn't flipped the
  switch," with the feature behind `layout.css.scroll-driven-animations.enabled` in stable
  as of **Firefox 152 (June 2026)**, on by default in Nightly, and a named **Interop 2026**
  priority — [Frontend Horizon](https://www.frontendhorizon.com/blog/view-transitions-api-and-css-scroll-driven-animations-the-browser-wins-of-2026). **The two percentages disagree (87.22% vs
  82.58%) — likely different caniuse feature IDs and/or different snapshot dates. Report the
  range, not a single number.** Both agree Firefox stable is the blocker.
- Safari: landed the feature in **Safari 26 (September 2025)**, added **threaded**
  scroll-driven animations in **26.4**, bug cleanup in **26.5 (June 2026)** — [Frontend Horizon](https://www.frontendhorizon.com/blog/view-transitions-api-and-css-scroll-driven-animations-the-browser-wins-of-2026)
- The animations "run off the main thread," giving smooth scroll-linked motion without
  scroll-event jank — [Chrome Developers, Scroll-driven animations](https://developer.chrome.com/docs/css-ui/scroll-driven-animations)
- A polyfill exists ([scroll-timeline](https://github.com/flackr/scroll-timeline)), used by
  the reference site — [scroll-driven-animations.style](https://scroll-driven-animations.style/)
- MDN guide: [CSS scroll-driven animations](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Scroll-driven_animations)

### Cited Findings — working code patterns

All verbatim from [Chrome Developers, Scroll-driven animations](https://developer.chrome.com/docs/css-ui/scroll-driven-animations):

```css
/* Anonymous scroll progress timeline */
.subject {
  animation: animate-it linear;
  animation-timeline: scroll(root block);
}
```
`scroll()` takes `<scroller>` = `nearest` (default) | `root` | `self`, and `<axis>` =
`block` (default) | `inline` | `y` | `x`.

> **Critical requirement:** "`animation-duration` set in seconds does not make sense when
> using a Scroll Progress Timeline, you must set `animation-duration` to `auto`."

```css
/* Named scroll progress timeline — lets a subject use a specific scroller */
.scroller  { scroll-timeline: --my-scroller inline; }
.scroller .subject {
  animation: animate-it linear;
  animation-timeline: --my-scroller;
}
```

```css
/* View progress timeline with an explicit range — the depth-reveal pattern */
@keyframes reveal {
  from { opacity: 0; clip-path: inset(0% 60% 0% 50%); }
  to   { opacity: 1; clip-path: inset(0% 0% 0% 0%); }
}
.revealing-image {
  animation: auto linear reveal both;
  animation-timeline: view();
  animation-range: entry 25% cover 50%;
}
```

```css
/* Two animations on disjoint ranges — enter and exit */
#list-view li {
  animation: animate-in linear forwards, animate-out linear forwards;
  animation-timeline: view();
  animation-range: entry, exit;
}
```

```css
/* timeline-scope — a subject that is NOT a descendant of the scroller */
.parent                    { timeline-scope: --tl; }
.parent .scroller          { scroll-timeline: --tl; }
.parent .scroller ~ .subject {
  animation: animate linear;
  animation-timeline: --tl;
}
```

JS equivalents when a named timeline will not reach:
```js
const tl = new ScrollTimeline({ source: document.documentElement, axis: 'block' });
$el.animate({ opacity: [0, 1] }, { timeline: tl, fill: 'forwards' });

const vt = new ViewTimeline({ subject: document.getElementById('subject'), axis: 'block' });
$el.animate({ opacity: [0, 1] },
  { timeline: vt, rangeStart: 'entry 25%', rangeEnd: 'cover 50%', fill: 'forwards' });
```

- Documented depth-flavoured demos on the reference site: Reverse-Scrolling Columns
  (centre column scrolls normally, flanking columns move opposite — the cheapest possible
  parallax), Parallax Carousel, Window Carousel, Cover Flow, and a 3D Shoe Explorer that
  rotates a model on scroll — [scroll-driven-animations.style](https://scroll-driven-animations.style/)

### Inferences

- Scroll-driven animations pair naturally with the **`perspective: 1px` + `translateZ`**
  CSS parallax pattern: the projection supplies the depth, the timeline supplies the
  progress, and neither needs a byte of JS or a hydration boundary. For a Next.js App Router
  site that server-renders by default, this is the only depth technique here with literally
  zero client-JS cost.
- The correct 2026 shape for this project is `@supports (animation-timeline: view()) { … }`
  with the un-enhanced layout as the base — *not* the polyfill, which would reintroduce the
  JS cost the technique exists to avoid, and which is dead weight for the ~85% who don't
  need it.
- Because the timelines run off the main thread, a scroll-driven parallax stack is
  categorically cheaper per frame than the same effect driven by a scroll listener or
  IntersectionObserver — and it degrades to "nothing happens" rather than "janky nothing
  happens" when unsupported.

### Gaps

- The two caniuse percentages conflict (87.22% vs 82.58%) and I could not reconcile which
  feature ID / snapshot each used.
- The claim that Firefox 152 (June 2026) still has it behind a flag comes from a secondary
  blog, not from Mozilla; it is consistent with caniuse's "first supported: Firefox 159" but
  should ideally be confirmed against Mozilla's own release notes or the Interop 2026
  dashboard.
- No published frame-time comparison of scroll-driven animations vs a JS scroll listener
  doing the same parallax.

---

## Cheap "material" and luxury surface effects: glass, foil, grain, paper, soft shadows, speculars

### Takeaway

`backdrop-filter` is the one technique in this catalogue with a **hard, device-specific,
published measurement — and it is bad**: seven blurred panels cost +3.5 ms of GPU-process
time and +4.7 ms of Mali driver time per frame on a Galaxy A15, dropping a 90 Hz app to
75–80% of target frames. Everything else in the "material" family (grain, foil sheens, soft
shadow stacks) is cheap *if and only if* it is static and pre-rendered.

### Cited Findings — `backdrop-filter`, the measured case

From a real DevTools/Perfetto investigation on a **Samsung Galaxy A15** (MediaTek MT6835,
Mali-G57 MC2, 90 Hz panel), Chrome 153, 378×688 render buffer, HUD with **7 panels** using
`backdrop-filter: blur(18px) saturate(1.3)` — [Station-Sciences/bot-crossing issue #74](https://github.com/Station-Sciences/bot-crossing/issues/74):

| Condition | frames at 90 Hz | GPU-process (ms) | Mali driver (ms) |
|---|---|---|---|
| HUD shown, 7 blurred panels (as shipped) | **75–80%** | **8.2** | **6.4** |
| HUD hidden entirely | 99.9% | 4.7 | 1.6 |
| HUD shown, **blur removed by CSS** | **98.9%** | **4.7** | **1.7** |

- i.e. the blur itself costs **≈3.5 ms GPU-process + ≈4.7 ms Mali driver time per frame**
  for 7 panels; **p95 frame time went from 22.3 ms to 11.2 ms** when it was removed.
- The one-line fix that recovered it:
  ```css
  @media (max-width: 600px) { .panel, .help { backdrop-filter: none; } }
  ```
- Mechanism: "Android Chrome re-renders every backdrop blur each frame on the same
  GPU-process thread that executes the WebGL command stream" — so backdrop blur competes
  directly with any canvas/WebGL work on the same page.
- Cost **scales with the panel's area, not the blur radius**; transitioning
  `backdrop-filter: blur()` forces everything behind the element to be re-composited every
  frame, making it "one of the most expensive transitions available." Four blurred elements
  in a scrolling list, or one blur across the full viewport, "will drop frames on integrated
  graphics and drain battery on mobile" — [CodeFronts, Backdrop Filter Transitions and Their Cost](https://codefronts.com/motion/css-transition-designs/glassmorphism-hover-transition/)
- Beyond roughly **20px** blur radius the cost rises faster than the visual difference —
  [CodeFronts](https://codefronts.com/motion/css-transition-designs/glassmorphism-hover-transition/)
- An independent mobile-perf PR measured **−60% GPU cost per element** from reducing blur
  from **20px to 8px**, and **60–80% faster** by replacing the blur with gradient-based
  translucency at **zero GPU blur cost** — [itexpert120/journal-pwa PR #4](https://github.com/itexpert120/journal-pwa/pull/4)
- shadcn/ui carries an open issue titled "CSS Backdrop filter causing performance issues" —
  evidence this bites mainstream component libraries, not just games — [shadcn-ui/ui #327](https://github.com/shadcn-ui/ui/issues/327)
- Firefox has a tracked bug: "backdrop-filter: blur is laggy when many elements are
  rendered" — [Bugzilla 1718471](https://bugzilla.mozilla.org/show_bug.cgi?id=1718471)
- **Support is not the problem — cost is.** caniuse global support for `backdrop-filter` is
  **96.36%** (Chrome 76+, Edge 17+, Safari 9+ desktop and iOS, Firefox 103+, Opera 64+,
  Samsung Internet 12+); `-webkit-` prefix still relevant for older WebKit — [caniuse: css-backdrop-filter](https://caniuse.com/css-backdrop-filter)
- The original WebKit introduction post remains the canonical explainer — [WebKit, "Introducing Backdrop Filters"](https://webkit.org/blog/3632/introducing-backdrop-filters/)

### Cited Findings — grain / paper texture (the cheap one)

- **The grainy-gradient technique** (CSS-Tricks): generate fractal noise procedurally with
  `feTurbulence`, then crush it with CSS `filter` — [CSS-Tricks, "Grainy Gradients"](https://css-tricks.com/grainy-gradients/)
  ```html
  <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
    <filter id="noiseFilter">
      <feTurbulence type="fractalNoise" baseFrequency="0.65"
                    numOctaves="3" stitchTiles="stitch" />
    </filter>
    <rect width="100%" height="100%" filter="url(#noiseFilter)" />
  </svg>
  ```
  ```css
  .noise {
    background: linear-gradient(to right, blue, transparent), url(path-to-noise.svg);
    filter: contrast(170%) brightness(1000%);
  }
  ```
  `baseFrequency` controls granularity, `numOctaves` detail, `stitchTiles="stitch"` makes it
  tile seamlessly. A commenter's caveat, quoted in the article: "If only this trick didn't
  have to suck performance-wise."
- Inlined as a **data URI** on `background-image`, the texture "costs a few hundred bytes of
  markup instead of a tiling PNG and an extra network request" — zero image files, zero
  extra requests — [Ultimate Design Tools](https://ultimatedesigntools.com/blog/css-noise-textures-guide/)
- The hard rules: `feTurbulence` runs **on the CPU at paint time**; render it once as a
  fixed-size tiled layer; never attach it to a filter that re-evaluates per frame; never
  animate `baseFrequency` on a full-screen element. For animated grain, use `steps()` rather
  than smooth easing so it reads as film grain instead of a sliding texture — [Ultimate Design Tools](https://ultimatedesigntools.com/blog/css-noise-textures-guide/)
- For performance-critical pages the same source recommends falling back to a small tiling
  PNG instead of live `feTurbulence`
- Working implementations: [Grainy-image web component](https://github.com/yashrajbharti/Grainy-image), [uicat.dev grain tutorial](https://www.uicat.dev/grain)

### Inferences

- The Galaxy A15 numbers are the decisive datum for this project: **backdrop blur and a
  live canvas contend for the same GPU-process thread on Android Chrome.** A frosted-glass
  panel over the existing 1.8 ms/frame globe would not cost 1.8 + 3.5 ms independently — it
  would serialise against the canvas's own GPU work. Glass and a live canvas should not
  coexist on the same screen on mobile.
- The `@media (max-width: 600px) { backdrop-filter: none }` pattern from the issue is
  directly transplantable and is the cheapest possible mitigation; it also happens to
  satisfy the 320px constraint by removing the effect exactly where the budget is tightest.
- The 60–80% win from "gradient-based effects instead of blur" is the practical route to a
  luxury surface without the cost: **foil/metallic sheens and specular highlights are
  `linear-gradient`/`conic-gradient` with `background-position` animated on a transform, and
  gradients are composited, not filtered.** No source I found measured a gradient sheen's
  cost, but it is paint-only work with no backdrop re-read, which is categorically cheaper.
- Soft-shadow *stacks* (multiple `box-shadow` layers with increasing blur and decreasing
  opacity) are the standard "real depth" trick and stay on the compositor; they are not in
  the same cost class as `backdrop-filter` because nothing behind the element is re-read.
  I found no measurement of stacked `box-shadow` cost — flagged in Gaps.
- Grain is the best value in this section: a few hundred bytes of inline data-URI SVG,
  painted once, that reads as paper/film and gives a blueprint-ish surface for free. The
  only discipline required is *never animate it*.

### Gaps

- No measurement of **stacked `box-shadow`** cost vs `filter: drop-shadow()` vs a
  pre-rendered shadow sprite.
- No measurement of gradient-based "foil"/specular sheen cost; the 60–80% figure is a
  before/after on one app, not a controlled benchmark.
- No iOS Safari equivalent of the Galaxy A15 backdrop-filter measurement; all the hard
  numbers found are Android/Chromium.

---

## The honest comparison: when does hand-rolled Canvas 2D stop being cheaper than minimal WebGL?

### Takeaway

**Nobody has published the measurement the brief asks for.** What is published is the
*shape* of the curve — Canvas 2D wins at low object counts because it has no initialisation
or state-setup overhead, WebGL wins once transforms and object counts grow because it
batches and does matrix work on the GPU — but I found no source that states a crossover in
objects, polygons or milliseconds for a draggable 3D-looking scene.

### Cited Findings

- "For subsequent iterations, WebGL shows significantly better performance; however, the 2D
  canvas method is **faster initially** — this is due to initialisation overhead" — [semisignal, "A look at 2D vs WebGL canvas performance"](https://semisignal.com/a-look-at-2d-vs-webgl-canvas-performance/)
- "WebGL benefits from performing matrix transformations (e.g. zoom) on the GPU, whereas the
  2D Canvas is bound to performing these on the CPU, and so performance greatly decreases as
  the number of data points increases" — [semisignal](https://semisignal.com/a-look-at-2d-vs-webgl-canvas-performance/)
- Pixi.js — a WebGL-first 2D renderer — has an open issue literally titled **"Canvas2D
  renderer faster than WebGL for sprites?"**, i.e. the inversion is real enough to surprise
  the maintainers of a WebGL renderer — [pixijs/pixijs #7565](https://github.com/pixijs/pixijs/issues/7565)
- The original 2011 comparison that started this discussion — [Jeff Muizelaar, "Drawing Sprites: Canvas 2D vs. WebGL"](http://muizelaar.blogspot.com/2011/02/drawing-sprites-canvas-2d-vs-webgl.html) (dated)
- Multi-engine benchmark harnesses that exist but publish results as live pages rather than
  numbers: [js-game-rendering-benchmark](https://github.com/Shirajuki/js-game-rendering-benchmark), [quidmonkey/particle_test](https://github.com/quidmonkey/particle_test), [2dgraphs.netlify.app](https://2dgraphs.netlify.app/)
- One 2026 comparison's summary position: "For purely 2D content, WebGL can still boost
  performance (for instance, rendering thousands of sprites with physics), but only go this
  route if Canvas truly can't handle the load" — [SVG Genie, SVG vs Canvas vs WebGL 2026](https://www.svggenie.com/blog/svg-vs-canvas-vs-webgl-performance-2025)
- The per-call binding overhead that sets the ceiling for Canvas 2D is the `drawImage`
  figure above (≈3–9.5 µs/call, 2014 engines), which is an **O(N) per-draw cost WebGL avoids
  by batching into vertex buffers** — [WHATWG list, Aug 2014](https://lists.w3.org/Archives/Public/public-whatwg-archive/2014Aug/0009.html)

### Inferences

- Combining the two sourced facts — Canvas 2D has per-draw-call overhead of single-digit
  microseconds, WebGL has a fixed setup cost plus near-zero marginal cost per batched
  primitive — the crossover is a function of **draw calls per frame**, not of "how 3D it
  looks." A scene of **hundreds** of distinct filled/stroked shapes stays comfortably in
  Canvas 2D; a scene of **many thousands** of independently transformed primitives per frame
  is where WebGL's batching starts to matter. **This is an inference from the mechanism, not
  a measured threshold — label it as such.**
- Draggability does not move the crossover. Dragging changes *which* transform is applied,
  not how many draw calls happen, and both renderers redraw the whole frame. What dragging
  changes is the *idle* story: a draggable scene must still return to zero animation frames
  when the pointer is released, which the project's baseline already does.
- Applied to this project: the existing globe at **1.8 ms/frame at 1440px** is using roughly
  11% of a 60 Hz budget. There is close to an order of magnitude of headroom before Canvas
  2D's overhead is the binding constraint — and the *library* cost of crossing to WebGL
  (15–38 KB gz for a wrapper, or a hand-written file that must be written and maintained) is
  certain, while the frame-time benefit is speculative at this scene complexity. The honest
  conclusion is that **the crossover is not near** for a career-journey scene.
- The thing that would genuinely force WebGL is not object count but **per-pixel work**:
  real lighting, refraction, depth-of-field, volumetric atmosphere. Those are shader
  problems with no Canvas 2D equivalent at any object count.

### Gaps

- **The brief's central question here is unanswered in the literature.** I found no
  published, methodologically credible measurement of the Canvas 2D → WebGL crossover for
  an interactive pseudo-3D scene. The benchmark harnesses above exist but report through
  live pages rather than published figures; running one of them on the project's own target
  devices is the only way to get this number.
- No measurement isolating *hand-written* WebGL (no wrapper) against Canvas 2D; every
  comparison found uses Pixi/three/regl on the WebGL side, which conflates library overhead
  with API overhead.

---

## Failure modes: motion sickness, GPU memory, battery, thermals, and the canvas that never idles

### Takeaway

The three failure modes with real evidence behind them are: parallax as a documented
vestibular trigger with a WCAG AAA criterion attached; compositing-layer GPU memory, where
Chrome was measured at 200–600 MB for a CSS 3D scene and a single promoted layer costs
~1.92 MB; and continuous `requestAnimationFrame`, measured at 4% battery in 15 minutes on a
phone versus <1% idle.

### Cited Findings — motion sickness / vestibular

- Parallax scrolling "creates a mismatch between what the eyes see and what the inner ear
  senses — triggering dizziness, nausea, and vertigo for users with vestibular disorders" —
  [Front-End Checklist, "Provide alternatives to parallax effects"](https://frontendchecklist.io/rules/accessibility/parallax-effects); [Web Axe, "Vestibular Issues in Parallax Design"](https://www.webaxe.org/vestibular-issues-parallax-design/)
- **WCAG 2.3.3 Animation from Interactions (Level AAA)**: motion animation triggered by
  interaction can be disabled, unless the animation is essential to the functionality or the
  information being conveyed — [Deque University, 2.3.3](https://dequeuniversity.com/resources/wcag2.1/2.3.3-animations-from-interactions); [accessibility.build, WCAG 2.3.3](https://accessibility.build/wcag/2-3-3)
- `prefers-reduced-motion: reduce` reflects an **operating-system** setting, not a browser
  one, which the browser forwards to the page — so it is a real user signal, not a site
  preference — [BATI/ITAO accessibility course, Module 9](https://bati-itao.github.io/learning/esdc-self-paced-web-accessibility-course/module9/animation-motion.html)
- Practitioner guidance on doing motion accessibly rather than removing it — [IBM Design, "Accessible motion: why it's essential and how to do it right"](https://medium.com/design-ibm/accessible-motion-why-its-essential-and-how-to-do-it-right-ff38afcbc7a9); [Sarah Darr, Accessible Animation for the Web](https://www.sarahdarr.com/post/accessible-animation-best-practices)

### Cited Findings — GPU memory and layer explosion

- **Per-layer cost:** "A 400×300 element at 2× device pixel ratio is actually 800×600 pixels
  in memory. That is **1.92 megabytes per layer** for that one element, at 4 bytes per
  pixel" — [MSPK, "What will-change Actually Does to Your GPU Memory"](https://mspk.substack.com/p/what-will-change-actually-does-to)
- Consequences of exhausting it: "On high-end desktops this causes slowdowns. On mobile
  devices it causes the browser to start **evicting layers**," and "some browsers will
  **crash the tab entirely** if GPU memory pressure gets high enough" — [MSPK](https://mspk.substack.com/p/what-will-change-actually-does-to)
- **Layer explosion is automatic, not opt-in:** elements that *overlap* a compositing layer
  are themselves promoted; Blink mitigates by "squashing" multiple overlapping RenderLayers
  into one backing store, but squashing cannot always succeed — [Chromium, GPU Accelerated Compositing in Chrome](https://www.chromium.org/developers/design-documents/gpu-accelerated-compositing-in-chrome/); [Alibaba Cloud, Accelerated Compositing Part 2](https://www.alibabacloud.com/blog/594195)
- web.dev's standing guidance is literally titled "Stick to compositor-only properties **and
  manage layer count**" — [web.dev](https://web.dev/articles/stick-to-compositor-only-properties-and-manage-layer-count)
- And the CSS 3D case, restated from above because it is the largest number in this file:
  Chrome **200–600 MB** of GPU memory for a CSS 3D environment, vs ~7 MB static + 50–100 MB
  temporary for an engine that doesn't allocate per-element layers — [Ekioh](https://www.ekioh.com/devblog/3d-environments-in-css/)

### Cited Findings — battery, thermals, rAF throttling

- **Measured battery drain from a never-idle canvas:** "After 15 minutes of running code
  with a graph on a mobile phone, the battery drained **4%** compared to the device draining
  **<1%** without the graph in the page" — [cytoscape.js issue #2657, "Constant request for animation frames is killing battery life on mobile device"](https://github.com/cytoscape/cytoscape.js/issues/2657)
- **iOS Safari halves rAF to 30 fps in Low Power Mode**, with an immediate observable effect
  on animation smoothness when toggled — [Motion Magazine, "When browsers throttle requestAnimationFrame"](https://motion.dev/magazine/when-browsers-throttle-requestanimationframe)
- **Safari throttles rAF inside cross-origin iframes** until a click/tap (not
  mouse/touchstart) signals user intent — [Motion Magazine](https://motion.dev/magazine/when-browsers-throttle-requestanimationframe)
- **Firefox `resistFingerprinting` clamps timestamp resolution to 100 ms**, "enough to
  swallow six whole frames of animation" at 60 fps; a separate Mozilla proposal would reduce
  it to 2 ms. Serving `Cross-Origin-Opener-Policy: same-origin` +
  `Cross-Origin-Embedder-Policy: require-corp` restores high-resolution timers — [Motion Magazine](https://motion.dev/magazine/when-browsers-throttle-requestanimationframe)
- Animations in **inactive tabs stop**, reducing CPU/GPU/memory impact — which is why rAF
  (rather than `setInterval`) is the mandatory loop primitive — [web.dev, canvas performance](https://web.dev/articles/canvas-performance)
- **Thermals are the same coin as battery:** "every watt of power consumed by the SoC
  becomes heat that must be dissipated. A game that burns through battery quickly is also
  generating heat quickly, which triggers throttling sooner" — [Abratabia, "Battery and Thermal Throttling on Mobile"](https://www.abratabia.com/mobile-browser-performance/battery-and-thermal.php)
- The same source attributes "over 75% of battery drain and thermal throttling" not to
  gameplay maths but to **un-batched WebGL draw calls, continuous texture thrashing across
  the mobile memory bus, and undisposed audio buffers**. *Caveat: this 75% figure is
  asserted without a cited study or methodology — treat as the author's estimate, not a
  measurement.* — [Abratabia](https://www.abratabia.com/mobile-browser-performance/battery-and-thermal.php)
- Mobile CPU/thermal/FPS test methodology for web game runtimes — [HackMD, "Mobile Web Game Runtimes: CPU, Thermals, and FPS Test"](https://hackmd.io/@dashichen1/Hkdt29DFMe)

### Inferences

- **The project's "zero animation frames at rest" property is the single most valuable
  performance characteristic it already has**, and the cytoscape measurement (4% vs <1% in
  15 minutes) is the number that justifies it. Any technique added must preserve it: draw on
  interaction and on scroll, then stop. A scene that spins idly is a 4%/15min battery bill
  and a thermal-throttling source for every visitor who leaves the tab open.
- The iOS Low Power Mode 30 fps clamp means any motion must look correct at 30 fps, not just
  60. Anything tuned per-frame rather than per-elapsed-time will run at half speed for those
  users.
- Layer-count discipline and CSS 3D scenes are in direct tension: a `preserve-3d` scene of
  N elements is close to N promoted layers, at ~1.92 MB each for a modest element at 2× DPR.
  **100 elements ≈ 190 MB**, which is consistent with Ekioh's measured 200–600 MB for Chrome
  and is a plausible tab-crash on a low-end Android. This is the concrete reason to prefer
  one canvas over many transformed divs for anything dense.
- For `prefers-reduced-motion`, the correct degradation for each family here is different
  and worth stating explicitly in the report: scroll-driven parallax → drop to a static
  composition (`animation-timeline: none`); canvas scene → render one static frame and never
  request another; CSS 3D scene → keep the depth (it is static geometry, not motion) but
  remove any transition or auto-rotation. Depth itself is not a motion hazard; *changing*
  depth is.

### Gaps

- No source quantified a **GPU memory budget per device class** (e.g. "a 2022 budget Android
  browser tab gets X MB before eviction"), so the 190 MB inference above cannot be converted
  into a hard element-count limit.
- The "over 75% of battery drain" figure lacks methodology and should not be quoted as fact.
- No measurement of thermal throttling onset time for a continuously-animating web canvas on
  a named device.

---

## Ranking: visual payoff per kilobyte and per millisecond

### Takeaway

On the evidence collected, the ordering is: **scroll-driven CSS parallax (0 KB JS, 0 ms main
thread)** > **extending the existing Canvas 2D engine (0 new KB, ~1.8 ms/frame proven)** >
**inline SVG grain + gradient sheens (hundreds of bytes, paint-once)** > **layered SVG
parallax (KB of markup, re-themeable)** > **CSS 3D scenes (0 KB JS but 200–600 MB GPU
memory in Chrome)** > **micro-wrapper WebGL (15–38 KB gz)** > **`backdrop-filter` glass
(0 KB but +3.5 ms GPU-process on a Galaxy A15)** > `cobe`/three.js/globe.gl (already
rejected).

### Cited Findings

This section is a synthesis; every number in the ranking is cited in its own section above.
The load-bearing ones:

- Scroll-driven animations: 87.22% (caniuse) / 82.58% (secondary) global support, off-main-
  thread, zero JS — [caniuse](https://caniuse.com/mdn-css_properties_animation-timeline); [Chrome Developers](https://developer.chrome.com/docs/css-ui/scroll-driven-animations)
- `versor` 0.2.0 at **977 B gzipped** — the cheapest meaningful upgrade to a draggable
  globe in this entire catalogue — [Bundlephobia](https://bundlephobia.com/api/size?package=versor)
- picogl 0.17.9 **15,195 B gz** is the smallest real WebGL helper measured — [Bundlephobia](https://bundlephobia.com/api/size?package=picogl)
- `backdrop-filter` blur: **+3.5 ms GPU-process, +4.7 ms Mali driver, 90 Hz→75–80%** on a
  Galaxy A15 — [bot-crossing #74](https://github.com/Station-Sciences/bot-crossing/issues/74)
- CSS 3D scene in Chrome: **200–600 MB GPU memory** — [Ekioh](https://www.ekioh.com/devblog/3d-environments-in-css/)
- Idle rAF canvas: **4% battery / 15 min** vs **<1%** idle — [cytoscape.js #2657](https://github.com/cytoscape/cytoscape.js/issues/2657)

### Inferences — the three techniques an engineer should pick for *this* project

1. **Scroll-driven view timelines for depth-on-entry** (`animation-timeline: view()` with
   `animation-range`), behind `@supports`, layered over the existing `perspective: 1px` /
   `translateZ` parallax pattern. Zero JS, zero hydration, server-renders, off the main
   thread, and it degrades to a static layout in Firefox stable and under
   `prefers-reduced-motion` without a fallback path to maintain. Highest payoff per byte
   and per millisecond in the catalogue.
2. **Extend the existing Canvas 2D engine rather than replace it** — add painter's-algorithm
   depth sorting for authored scene elements, a static pre-rendered background layer on a
   second canvas (web.dev's layered-canvas pattern), and `versor` (977 B gz) for
   great-circle drag. This keeps the 1.8 ms/frame and the zero-frames-at-rest properties,
   adds under 1 KB gz, and has no library to maintain. The Canvas→WebGL crossover is
   demonstrably not near at this scene complexity.
3. **Inline SVG `feTurbulence` grain + gradient-based sheens for material**, painted once,
   never animated — a few hundred bytes of data URI, drawn in the site's own ink so it
   re-themes between `day` and `night` for free. Explicitly **instead of** `backdrop-filter`
   glass, on the strength of the Galaxy A15 measurement and the finding that gradient
   translucency is 60–80% faster at zero GPU blur cost.

- What to avoid, with reasons attached: a `preserve-3d` DOM scene of many elements (GPU
  memory), `backdrop-filter` anywhere near the canvas on mobile (same GPU-process thread),
  any live `feTurbulence`/`feSpecularLighting` filter (CPU at paint time, per frame), and
  any micro-wrapper WebGL library (15–38 KB gz buys nothing the current engine lacks).

### Gaps

- The ranking's per-millisecond ordering mixes measurements taken on different devices and
  different years; it is a defensible ordering but not a single controlled benchmark. Any
  claim stronger than "these are the right three to try" should be validated on the
  project's own target devices.
- The brief asked for a ranking "per kilobyte and per millisecond." The kilobyte axis is
  well-sourced (Bundlephobia, 28 Sep 2026). The millisecond axis is sourced only for
  `backdrop-filter`, and by the project's own prior measurement for the canvas globe.
  Everything else on that axis is inference from mechanism.
