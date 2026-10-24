# Accessible Immersive Motion — WCAG 2.2 AA for an animated, spatially-navigated journey site

> **Attribution note.** Normative Success Criterion text below is quoted from *Web Content
> Accessibility Guidelines (WCAG) 2.2*, W3C Recommendation, and from the *Understanding WCAG 2.2*
> supporting documents. Copyright © W3C®. Reproduced under the
> [W3C Document License](https://www.w3.org/copyright/document-license-2023/). Every quotation is
> linked to its source. **Understanding** documents and **Techniques** are *informative*, not
> normative — only the Success Criterion text itself is binding.

> **Research date:** 28 September 2026. Sources checked live on that date.

---

## Which WCAG 2.2 criteria bite hardest on immersive sites?

### Takeaway

Eleven criteria do the real work, and only three of them are WCAG 2.2 *additions*: **2.5.7 Dragging
Movements (AA)**, **2.5.8 Target Size Minimum (AA)** and **2.4.11 Focus Not Obscured Minimum (AA)**.
The rest (2.2.2, 2.3.1, 2.5.1, 2.5.2, 2.4.7, 1.4.10, 1.4.11, 1.3.2, 4.1.2, 4.1.3) are inherited from
2.0/2.1 but are the ones immersive sites routinely fail, because canvas, scroll-driving and floating
companions attack exactly the assumptions those criteria encode. **2.3.3 Animation from Interactions
is AAA and is not required at AA** — at AA the only motion obligation is 2.2.2, which is narrower
than most people assume.

### Cited Findings

**Which criteria are new in 2.2, and at what level** — the W3C spec marks these as new: 2.4.11 Focus
Not Obscured (Minimum) AA; 2.4.12 Focus Not Obscured (Enhanced) AAA; 2.4.13 Focus Appearance AAA;
2.5.7 Dragging Movements AA; 2.5.8 Target Size (Minimum) AA; 3.2.6 Consistent Help A; 3.3.7 Redundant
Entry A; 3.3.8 Accessible Authentication (Minimum) AA; 3.3.9 Accessible Authentication (Enhanced)
AAA. **4.1.1 Parsing is obsolete and removed** in WCAG 2.2 — [WCAG 2.2, W3C](https://www.w3.org/TR/WCAG22/)

---

#### 2.2.2 Pause, Stop, Hide — Level A (inherited from 2.0). *The main AA-level motion hook.*

Normative text, two bullets:

> "For any **moving, blinking or scrolling** information that (1) starts automatically, (2) lasts
> more than five seconds, and (3) is presented in parallel with other content, there is a mechanism
> for the user to pause, stop, or hide it unless the movement, blinking, or scrolling is part of an
> activity where it is essential."

> "For any **auto-updating** information that (1) starts automatically and (2) is presented in
> parallel with other content, there is a mechanism for the user to pause, stop, or hide it or to
> control the frequency of the update unless the auto-updating is part of an activity where it is
> essential."

— [Understanding SC 2.2.2](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html)

- "Moving" content is defined as "content in which the visible content conveys a sense of motion",
  including animations and real-time games — [Understanding SC 2.2.2](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html)
- A compliant pause mechanism must give control "that does not tie up the user or the focus so that
  the page cannot be used"; pausing only while an element is focused **fails** — [Understanding SC 2.2.2](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html)
- Note 4 allows pre-load animations to be considered essential — [Understanding SC 2.2.2](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html)
- **Honest gap:** the Understanding document does not explicitly resolve whether *purely decorative*
  canvas animation is "information" and therefore in scope — [Understanding SC 2.2.2](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html)

**Typical immersive failure:** a globe that idles with a slow auto-spin, and companion figures that
loop a breathing/walking animation, both running indefinitely alongside readable prose, with no
control anywhere. **How to pass:** one persistent, keyboard-reachable "Pause motion" control (a real
`<button>` with `aria-pressed`) that halts *all* non-essential looping motion — globe idle spin,
companion loops, any ticker — and persists the choice. Honouring `prefers-reduced-motion` is
*not* a substitute: 2.2.2 wants an in-page mechanism, because many users have not set the OS flag.

---

#### 2.3.1 Three Flashes or Below Threshold — Level A

> "Web pages do not contain anything that flashes more than three times in any one second period, or
> the flash is below the general flash and red flash thresholds."

Note: "Since any content that does not meet this success criterion can interfere with a user's
ability to use the whole page, all content on the web page (whether it is used to meet other success
criteria or not) must meet this success criterion."
— [Understanding SC 2.3.1](https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html)

- General flash threshold: a pair of opposing luminance changes of 10% or more where the darker image
  is below 0.80 relative luminance, occurring no more than three times per second; content occupying
  no more than 25% of any 10-degree visual field also passes — [Understanding SC 2.3.1](https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html)
- A 341 × 256 pixel rectangle approximates a 10-degree visual field at typical viewing distance — [Understanding SC 2.3.1](https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html)
- Tools named: Harding Flash and Pattern Analyzer, and the Trace Center Photosensitive Epilepsy
  Analysis Tool (PEAT) — [Understanding SC 2.3.1](https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html)

**Typical immersive failure:** day↔night theme toggles or tone changes that cross-fade fast, and
scroll-linked colour inversions where a fast scroll can strobe the whole viewport (the whole viewport
is far more than 25% of a 10° field). **How to pass:** rate-limit theme/ground transitions; never
bind a full-viewport luminance flip directly to scroll delta; cap any scroll-driven luminance change
to ≤3 transitions/second regardless of scroll velocity.

---

#### 2.3.3 Animation from Interactions — **Level AAA. Not required at AA.**

> "Motion animation triggered by interaction can be disabled, unless the animation is essential to
> the functionality or the information being conveyed."

— [Understanding SC 2.3.3](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html)

- The W3C confirms 2.3.3 is Level AAA, and that the AA-level requirement for motion is 2.2.2
  (automatically-initiated animation), *not* 2.3.3 (interaction-triggered animation) — [Understanding SC 2.3.3](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html)
- `prefers-reduced-motion` is W3C's named preferred mechanism for satisfying it — [Understanding SC 2.3.3](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html)
- Parallax and scroll-driven animation can cause "dizziness, nausea and headaches", severe enough to
  require bed rest — [Understanding SC 2.3.3](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html)

**The precise AA position:** a scroll-driven journey that animates *only* in response to the user's
own scrolling is largely **outside 2.2.2** (it does not "start automatically" and is not
"auto-updating") and is governed by **2.3.3, which is AAA**. So a site can be strictly AA-conformant
with heavy scroll-linked parallax. That is a real gap in the standard, not a licence — implement 2.3.3
anyway and *say so*; it is the single highest-value AAA criterion for this genre.

---

#### 2.5.1 Pointer Gestures — Level A

> "All functionality that uses multipoint or path-based gestures for operation can be operated with a
> single pointer without a path-based gesture, unless a multipoint or path-based gesture is essential."

Note: "This requirement applies to web content that interprets pointer actions (i.e., this does not
apply to actions that are required to operate the user agent or assistive technology)."
— [Understanding SC 2.5.1](https://www.w3.org/WAI/WCAG22/Understanding/pointer-gestures.html)

- Path-based gestures depend on direction/trajectory (swipe, flick, tracing a shape); multipoint
  gestures need two or more simultaneous pointers (pinch-zoom, two-finger swipe) — [Understanding SC 2.5.1](https://www.w3.org/WAI/WCAG22/Understanding/pointer-gestures.html)
- Named failures/techniques: **F105** (path-based gesture without simple pointer alternative),
  **G215** (controls achieving the same result), **G216** (single point activation for a control
  slider) — [Understanding SC 2.5.1](https://www.w3.org/WAI/WCAG22/Understanding/pointer-gestures.html)
- Cited failure examples include a map with pinch-zoom but no ± buttons, and a carousel operated only
  by fast horizontal swipe — [Understanding SC 2.5.1](https://www.w3.org/WAI/WCAG22/Understanding/pointer-gestures.html)

**Typical immersive failure:** pinch-to-zoom on the globe with no zoom buttons; a horizontal "journey"
rail advanced only by swipe/flick.

---

#### 2.5.2 Pointer Cancellation — Level A

> "For functionality that can be operated using a single pointer, at least one of the following is
> true: **No Down-Event:** The down-event of the pointer is not used to execute any part of the
> function; **Abort or Undo:** Completion of the function is on the up-event, and a mechanism is
> available to abort the function before completion or to undo the function after completion;
> **Up Reversal:** The up-event reverses any outcome of the preceding down-event; **Essential:**
> Completing the function on the down-event is essential."
>
> Note 1: "Functions that emulate a keyboard or numeric keypad key press are considered essential."

— [Understanding SC 2.5.2](https://www.w3.org/WAI/WCAG22/Understanding/pointer-cancellation.html)

- Failure **F101**: "Failure of Success Criterion 2.5.2 due to activating a control on the
  down-event" — [Understanding SC 2.5.2](https://www.w3.org/WAI/WCAG22/Understanding/pointer-cancellation.html)

**Typical immersive failure:** canvas hit-testing wired to `pointerdown`, so touching a globe marker
navigates before the user can slide off to cancel. **How to pass:** commit on `pointerup`/`click`
with the up-event landing on the same target; for a drag-rotate, offer `Escape`-to-abort plus a
"Reset view" control (the *Abort or Undo* branch).

---

#### 2.5.7 Dragging Movements — **Level AA, new in WCAG 2.2.** *See the dedicated section below.*

> "All functionality that uses a dragging movement for operation can be achieved by a single pointer
> without dragging, unless dragging is essential or the functionality is determined by the user agent
> and not modified by the author."

— [Understanding SC 2.5.7](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html)

---

#### 2.5.8 Target Size (Minimum) — **Level AA, new in WCAG 2.2**

> "The size of the target for pointer inputs is at least 24 by 24 CSS pixels, except when:
> **Spacing:** Undersized targets (those less than 24 by 24 CSS pixels) are positioned so that if a
> 24 CSS pixel diameter circle is centered on the bounding box of each, the circles do not intersect
> another target or the circle for another undersized target; **Equivalent:** The function can be
> achieved through a different control on the same page that meets this criterion; **Inline:** The
> target is in a sentence or its size is otherwise constrained by the line-height of non-target text;
> **User Agent Control:** The size of the target is determined by the user agent and is not modified
> by the author; **Essential:** A particular presentation of the target is essential or is legally
> required for the information being conveyed."

— [Understanding SC 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)

- Bounding box: for non-rectangular targets it is the smallest axis-aligned rectangle enclosing all
  points; the circle is centred on that box's centre, which can fall outside a concave shape — [Understanding SC 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)
- Worked pass: a row of buttons wider than 24px but only 20px tall passes with **4 CSS px** vertical
  margin above and below. Worked fail: six 20×20 buttons with zero spacing; two stacked 16px-tall
  button rows with a 1 CSS px gap — [Understanding SC 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)

**The arithmetic that matters:** the circle radius is **12 CSS px from the target's bounding-box
centre**. Two undersized targets pass when their centres are ≥24 CSS px apart (tangent circles do not
intersect). For a 20px-wide target that means a 4px edge gap; for a 16px-wide target, an 8px edge gap.
**If both targets are already ≥24×24 CSS px, the spacing exception is irrelevant and any gap — including
zero — passes.**

**Typical immersive failure:** globe markers/hotspots drawn as 12–16px dots, tiny canvas zoom chevrons,
and companion figures made clickable at their drawn size.

---

#### 2.4.11 Focus Not Obscured (Minimum) — **Level AA, new in WCAG 2.2.** *See dedicated section below.*

#### 2.4.7 Focus Visible — Level AA

> "Any keyboard operable user interface has a mode of operation where the keyboard focus indicator is
> visible."

— [Understanding SC 2.4.7](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html)

- A custom indicator is **not required** — platform defaults are acceptable — [Understanding SC 2.4.7](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html)
- The indicator must persist; it may not time out — [Understanding SC 2.4.7](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html)
- Failures: **F55** (removing focus via scripting), **F78** (styling outlines/borders so the indicator
  is hidden). Techniques: G149, G165, G195, C15, C40, C45, SCR31 — [Understanding SC 2.4.7](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html)
- Focus indicators are non-text visual information and so **also fall under 1.4.11** (3:1) — [Understanding SC 2.4.7](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html)

**Typical immersive failure:** `outline: none` on the canvas wrapper; a focus ring drawn *inside* the
canvas bitmap (invisible to forced-colors and to zoom); a ring in the brand blue that hits 3:1 on the
light ground but not on the darkest tone.

#### 2.4.13 Focus Appearance — **Level AAA** (measurable, useful as a design target only)

> Minimum Area: "is at least as large as the area of a 2 CSS pixel thick perimeter of the unfocused
> component or sub-component"; Change of Contrast: "has a contrast ratio of at least 3:1 between the
> same pixels in the focused and unfocused states".

— [Understanding SC 2.4.13](https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html)

- The area of a 2px perimeter of a *w* × *h* rectangle works out to **4h + 4w**; shadows and glow
  effects are excluded from the component's visual presentation — [Understanding SC 2.4.13](https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html)

#### 1.4.10 Reflow — Level AA

> "Content can be presented without loss of information or functionality, and without requiring
> scrolling in two dimensions for: Vertical scrolling content at a width equivalent to 320 CSS pixels;
> Horizontal scrolling content at a height equivalent to 256 CSS pixels. Except for parts of the
> content which require two-dimensional layout for usage or meaning."
>
> Note: "320 CSS pixels is equivalent to a starting viewport width of 1280 CSS pixels wide at 400% zoom."

— [Understanding SC 1.4.10](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html)

- Named common failures include **sticky elements blocking content at zoom** and images without
  `max-width: 100%` producing horizontal scrollbars — [Understanding SC 1.4.10](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html)

**Typical immersive failure:** a fixed-size canvas; a horizontally-scrolled journey rail (that *is*
two-dimensional scrolling unless the rail is the only scroller and the page itself does not also
scroll horizontally); absolutely-positioned companion figures whose transform pushes the document
width past 320px. Note the criterion is about **400% zoom at 1280px**, not only about a narrow
viewport — a Playwright test at `viewport: 320px` is a good proxy but is *not* the same test;
`page.setViewportSize({width:1280})` + `deviceScaleFactor`/CSS zoom emulation is closer.

#### 1.4.11 Non-text Contrast — Level AA

> User Interface Components: "Visual information required to identify user interface components and
> states, except for inactive components or where the appearance of the component is determined by the
> user agent and not modified by the author"; Graphical Objects: "Parts of graphics required to
> understand the content, except when a particular presentation of graphics is essential to the
> information being conveyed" — each at "a contrast ratio of at least 3:1 against adjacent color(s)".

— [Understanding SC 1.4.11](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)

- Graphics are **exempt** when purely aesthetic, when text conveys the same information, or when the
  information is also available elsewhere (e.g. a data table beside a chart) — [Understanding SC 1.4.11](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)
- Focus indicators must hit 3:1 against adjacent colours whether drawn inside, outside, or straddling
  the component boundary — [Understanding SC 1.4.11](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)
- For charts/canvas, each graphical object needed for understanding (lines, shapes, boundaries) needs
  3:1; decorative background elements are exempt — [Understanding SC 1.4.11](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)

**The leverage here:** if the globe is genuinely decorative *and* every fact it depicts is also in the
DOM, its graphics are exempt from 1.4.11. The moment a marker is the only way to learn something, that
marker needs 3:1 against the globe surface **in both themes and all three tones**.

#### 1.3.2 Meaningful Sequence — Level A

> "When the sequence in which content is presented affects its meaning, a correct reading sequence can
> be programmatically determined."

— [Understanding SC 1.3.2](https://www.w3.org/WAI/WCAG22/Understanding/meaningful-sequence.html)

- Failures **F1** (changing meaning via CSS positioning), **F32/F33/F34** (whitespace formatting),
  **F49** (layout tables that don't linearise). Techniques **C6**, **C8**, and **C27** "Making the DOM
  order match the visual order" is the direct solution — [Understanding SC 1.3.2](https://www.w3.org/WAI/WCAG22/Understanding/meaningful-sequence.html)

**Typical immersive failure:** sections positioned by `transform`/`position: sticky` into a visual
order different from the DOM; `order`/`grid-area` used to reflow a "journey" so the spatial story
reads backwards to a screen reader.

#### 4.1.2 Name, Role, Value — Level A

> "For all user interface components (including but not limited to: form elements, links and
> components generated by scripts), the name and role can be programmatically determined; states,
> properties, and values that can be set by the user can be programmatically set; and notification of
> changes to these items is available to user agents, including assistive technologies."
>
> Note: "This success criterion is primarily for web authors who develop or script their own user
> interface components. For example, standard HTML controls already meet this success criterion when
> used according to specification."

— [Understanding SC 4.1.2](https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html)

- Canvas controls must "implement equivalent accessibility information through alternative
  mechanisms"; failures **F59** (interactive div/span without a role) and **F79** (focus state not
  exposed) — [Understanding SC 4.1.2](https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html)

#### 4.1.3 Status Messages — Level AA

> "In content implemented using markup languages, status messages can be programmatically determined
> through role or properties such that they can be presented to the user by assistive technologies
> without receiving focus."

— [Understanding SC 4.1.3](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html)

- A status message both reports success/result/progress/error **and** is not delivered via a change of
  context. Excluded: messages announced because focus moved; expanded/collapsed state changes; newly
  revealed conditional form fields — [Understanding SC 4.1.3](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html)
- Techniques **ARIA22** (`role="status"`), **ARIA19** (`role="alert"`/`aria-live="assertive"`),
  **ARIA23/ARIA25** (`role="log"`, progress) — [Understanding SC 4.1.3](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html)

**Applies here:** "Globe reset to start", "Chapter 3 of 7: Foundry", "Motion paused" — each is a status
message and needs `role="status"` (polite), *not* a focus move.

### Inferences

- The AA motion surface is smaller than reputation suggests. Auto-motion (globe idle spin, companion
  loops) is squarely 2.2.2 (Level A). Scroll-linked motion is 2.3.3 (AAA) and therefore optional at AA.
  If this site wants to *claim* motion safety rather than merely conform, 2.3.3 must be adopted
  voluntarily and stated in the accessibility statement.
- The three 2.2 additions map almost one-to-one onto this site's three riskiest features: **2.5.7 →
  the draggable globe**, **2.5.8 → globe markers and companion hotspots**, **2.4.11 → companion
  figures floating over a sticky theme/tone control**.
- 1.4.11 and the "Blueprint" tone system interact: a semantic alias that is compliant against
  `--color-paper` may fail 3:1 against `--color-paper-deep`. Non-text contrast has to be verified per
  *tone*, not just per *theme* — the same trap the project's `pnpm contrast` script already documents
  for text.

### Gaps

- W3C does not state whether purely decorative, non-informational canvas animation is "moving
  *information*" under 2.2.2. Auditors in practice treat it as in scope; I found no authoritative
  W3C ruling either way.
- The W3C Recommendation page itself refused bulk extraction in this session, so criterion text above
  is taken from the per-criterion Understanding documents, which reproduce the normative text at the
  top of each page. Spot-check against https://www.w3.org/TR/WCAG22/ before publishing a conformance
  claim.

---

## 2.5.7 Dragging Movements in depth — what satisfies a draggable globe?

### Takeaway

The alternative must be **operable by a single pointer** — a click or tap. **Keyboard support does not
satisfy 2.5.7.** The criterion exists for people who *use* a pointer (head pointer, eye-gaze, mouth
stick, trackball, speech-driven mouse emulator) but cannot hold-and-move one, so arrow-key rotation —
which satisfies 2.1.1 Keyboard — leaves 2.5.7 failing. For a spinnable globe the accepted pattern is
**click-to-target**: click/tap a point (or a marker, or a direction button) and the globe animates
itself to that orientation.

### Cited Findings

- Normative text: "All functionality that uses a dragging movement for operation can be achieved by a
  **single pointer without dragging**, unless dragging is essential or the functionality is determined
  by the user agent and not modified by the author." — [Understanding SC 2.5.7](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html)
- Who it is for: "Some people cannot perform dragging movements in a precise manner. Others use a
  specialized or adapted input device, such as a trackball, head pointer, eye-gaze system, or
  speech-controlled mouse emulator, which may make dragging cumbersome and error-prone." — [Understanding SC 2.5.7](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html)
- Dragging is decomposed into four actions: establish a start point, press and hold, reposition, release;
  not all users can maintain contact while repositioning — [Understanding SC 2.5.7](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html)
- The alternative "can't exclusively rely on a path-based gesture, such as swiping or 'flicking'" — [Understanding SC 2.5.7](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html)
- **User-agent exception**: the criterion does not apply to scrolling or dragging provided by the
  browser itself — [Understanding SC 2.5.7](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html)
- Worked examples given by W3C include: **maps with up/down/left/right buttons**; sortable lists with
  adjacent up/down controls; task boards with a "move to" pop-up menu; **colour wheels that accept a
  click anywhere on the wheel**; range sliders where "tapping or clicking on any point of the slider
  track" sets the value; canvas-style drawing where a selection mode lets the user "click/tap the
  first corner, then click/tap the opposite corner, without the need to keep the pointer pressed and
  dragging"; carousels with forward/back buttons — [Understanding SC 2.5.7](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html)
- Sufficient technique **G219** "Ensuring that an alternative is available for dragging movements that
  operate on content"; failure **F108** "…due to not providing a single pointer method that does not
  require a dragging movement" — [Understanding SC 2.5.7](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html)
- G219 requires the alternative to use "one or several single pointer activations that don't require
  dragging", and its test procedure is: "Check that there is a single pointer activation alternative
  that does not require dragging to operate the same function" — [Technique G219](https://www.w3.org/WAI/WCAG22/Techniques/general/G219)
- **G219 Example 4 is the closest published analogue to a globe**: "A radial control widget allows
  changing values by clicking/tapping positions on the control, as an alternative to dragging the
  visual indicator." — [Technique G219](https://www.w3.org/WAI/WCAG22/Techniques/general/G219)
- Text entry counts as a valid alternative (e.g. typing a slider's value) — [Understanding SC 2.5.7](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html)
- Related but separate: 2.5.1 Pointer Gestures (Level A) already forbids requiring a *path-based*
  gesture; **G216** "Providing single point activation for a control slider" — [Understanding SC 2.5.1](https://www.w3.org/WAI/WCAG22/Understanding/pointer-gestures.html)

### Inferences

- **Verified pattern for a Canvas 2D globe**, assembled from G219 Example 4 (radial control), the map
  example, and the colour-wheel example — all three are W3C-published:
  1. **Click-to-orient on the canvas itself.** A single click/tap anywhere on the visible sphere
     animates the globe so that point rotates to face the viewer. This is the colour-wheel/radial
     example applied literally, and it is the cheapest full satisfaction of 2.5.7 because it reuses
     the geometry the drag handler already has (unproject the click to lat/long, tween to it).
  2. **Discrete direction controls.** Four (or six, with zoom) real `<button>` elements — W3C's map
     example — each ≥24×24 CSS px, that step the rotation by a fixed increment on `click`. These also
     satisfy 2.1.1, 2.5.1 and 2.5.8 in one move.
  3. **Named destinations.** A list of the journey's places/entries as buttons or links; activating
     one flies the globe there. This doubles as the 4.1.2/1.3.2 parallel-DOM answer and is the only
     alternative that is genuinely *equivalent* rather than merely *operable*.
  Keep drag working for those who want it; 2.5.7 asks for an alternative, not a removal.
- **What does *not* satisfy it:** arrow-key rotation only (keyboard ≠ single pointer); a
  "flick/swipe to spin" affordance (path-based, and also 2.5.1 A); a press-and-hold direction button
  (hold is a drag-adjacent dexterity demand — prefer click-to-step or click-to-start/click-to-stop).
- **The "essential" exception almost certainly does not apply** to a portfolio globe. "Essential" means
  removing the drag would fundamentally change the functionality — true for a free-hand drawing canvas,
  not for a decorative career globe whose content also exists as text.
- 2.5.2 interacts: if the globe commits rotation continuously during the drag, take the *Abort or
  Undo* branch — `Escape` cancels and restores the pre-drag orientation, plus a persistent "Reset view"
  control.

### Gaps

- I found no published case study of a *named* production site documenting its 2.5.7 solution for a
  rotating 3D globe specifically. The pattern above is synthesised from W3C's own analogous examples
  (radial control, colour wheel, map), which is the strongest available authority but is not a
  worked globe example.
- There is no ACT rule and no axe rule for 2.5.7 (see the testing section) — conformance here is
  established by manual test only.

---

## 2.4.11 Focus Not Obscured — how much clearance is actually required?

### Takeaway

**At AA (2.4.11 Minimum) the requirement is binary: the focused component must not be *entirely*
hidden. Partial obscuring passes.** There is no pixel threshold — not 24px, not 19px, not any number.
A 19px sliver of a visible control passes 2.4.11 outright. The 24px figure the project is measuring
belongs to a *different* criterion (2.5.8 Target Size, 24×24 CSS px) and answers a different question.
Only **2.4.12 (Enhanced, AAA)** demands zero obscuring.

### Cited Findings

- **2.4.11 Focus Not Obscured (Minimum), Level AA, new in 2.2** — "When a user interface component
  receives keyboard focus, the component is **not entirely hidden** due to author-created content."
  - Note 1: "Where content in a configurable interface can be repositioned by the user, then only the
    initial positions of user-movable content are considered for testing and conformance of this
    success criterion."
  - Note 2: "Content opened by the user may obscure the component receiving focus. If the user can
    reveal the focused component without advancing the keyboard focus, the component with focus is not
    considered visually hidden due to author-created content."
  — [Understanding SC 2.4.11](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html)
- W3C states this "AA criterion allows for the component receiving focus to be **partially** obscured
  by other author-created content", that a "partly obscured component can still be very visible", and
  that authors "should attempt to design interactions to reduce the degree and frequency" of obscuring
  — advisory, not normative — [Understanding SC 2.4.11](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html)
- **2.4.12 Focus Not Obscured (Enhanced), Level AAA** — "When a user interface component receives
  keyboard focus, **no part of the component is hidden** by author-created content." — [Understanding SC 2.4.12](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-enhanced.html)
- The Enhanced Understanding document **does not specify any measurement** for required clearance; it
  offers solutions (CSS scroll-padding, making overlays modal, closing notifications on focus loss)
  and frames the goal as "the item receiving keyboard focus is always visible in the user's viewport"
  — [Understanding SC 2.4.12](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-enhanced.html)
- Scope note: it is the **component** that must not be hidden, not the focus *indicator* (the
  indicator is 2.4.7 / 2.4.13's business). 2.4.13 Focus Appearance is explicitly evaluated "at the
  component level itself, not just the focus indicator" — [Understanding SC 2.4.12](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-enhanced.html)
- Sticky headers/footers, non-modal dialogs, cookie banners and floating widgets are the canonical
  author-created obscuring content; the cited fix is CSS scroll-padding — [Understanding SC 2.4.11](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html)
- Practitioner implementation (TetraLogical): apply `scroll-padding-top` to the **scroll container**,
  not the element — "Chromium-based browsers allow this to be applied to the elements themselves, but
  Safari requires it to be applied to the scroll containers"; use `rem`/`em` "which will scale
  alongside any zoom or text sizing applied"; the known limitation is that "You will need to know the
  exact height of the sticky content" — [TetraLogical, *Sticky content: focus in view*](https://tetralogical.com/blog/2023/06/08/focus-in-view/)
- TetraLogical's conditional-sticky pattern: `:is(html, body):has(aside) { scroll-padding-bottom: 6rem; }`
  — [TetraLogical](https://tetralogical.com/blog/2023/06/08/focus-in-view/)
- TetraLogical also frames fully-obscured focus as a **2.4.7 Focus Visible (AA, 2.0-era)** failure:
  when obscured, "the focus indicator is not visible, nor is the control that receives focus" — [TetraLogical](https://tetralogical.com/blog/2023/06/08/focus-in-view/)

### Inferences

- **Direct answer for the 19px-vs-24px measurement.** Decide which question is being asked:
  - *"When the sticky control is focused, is any of it visible past the floating companion?"* →
    **2.4.11, AA.** 19px visible ⇒ **passes**. 0px visible ⇒ fails. There is no minimum clearance at AA.
    (It would fail 2.4.12 at AAA, which the project is not targeting.)
  - *"Are the floating element and the sticky control too close together as pointer targets?"* →
    **2.5.8, AA.** The 24 figure is the **target size**, and the 24 CSS px circle is centred on each
    *undersized* target's bounding box. If both the companion hotspot and the sticky control are
    ≥24×24 CSS px, a 19px gap between them is **irrelevant and passing**. If either is undersized, the
    test is circle intersection (centres ≥24px apart), not edge gap ≥24px.
  - *"Does the companion cover the control so it can't be clicked?"* → not a size criterion at all;
    that is an operability problem (2.1.1 / 2.5.2) and a plain bug.
- A 19px clearance is therefore very likely **conformant at AA on both readings**. The residual risk is
  reverse-tabbing (Shift+Tab into an element under a sticky footer) and `scroll-padding` only covering
  one edge — those produce *entirely* hidden components and are the real 2.4.11 failures to test for.
- Because 2.4.11 is about the **component**, a focus ring drawn 3px outside a button does not rescue a
  button whose box is fully covered; conversely a button whose box peeks out by 1px passes even if its
  ring is invisible — at which point **2.4.7 catches it instead**. Test both.
- The `:has()`-based conditional scroll-padding is the right shape for companion figures that appear
  and disappear as the journey progresses, and it scales with zoom if expressed in `rem` — which also
  protects 1.4.10 at 400%.

### Gaps

- Neither W3C document gives any numeric clearance for either 2.4.11 or 2.4.12. If a numeric threshold
  is wanted for internal QA it has to be an in-house design rule, and must be labelled as such rather
  than as a WCAG requirement.
- The TPGi article "Prevent focused elements from being obscured by sticky headers" now 301-redirects
  to a Vispero resources index and the article body was not retrievable in this session; the
  TetraLogical piece covers the same ground and is cited instead.

---

## Canvas accessibility — decorative vs functional

### Takeaway

The canvas element has **no accessibility semantics of its own**: it is a bitmap. The correct model is
(a) decorative canvas → `aria-hidden="true"` (or `role="presentation"`) with **no focusable descendants**,
and every fact it depicts present in real DOM elsewhere; (b) functional canvas → **fallback content
inside the element acting as a shadow DOM of real focusable controls**, one per interactive region, per
the HTML Standard. **Hit regions (`addHitRegion`) are dead** — removed from the HTML Standard and not
shipped by browsers. `drawFocusIfNeeded()` survives and is the supported way to paint a focus ring for
a focused fallback element.

### Cited Findings

- HTML Standard, normative: "When authors use the `canvas` element, they must also provide content
  that, when presented to the user, conveys essentially the same function or purpose as the canvas's
  bitmap." — [WHATWG HTML Standard, canvas best practices](https://html.spec.whatwg.org/multipage/canvas.html#best-practices)
- HTML Standard, advisory: "Authors should not use the `canvas` element in a document when a more
  suitable element is available." — [WHATWG HTML Standard](https://html.spec.whatwg.org/multipage/canvas.html#best-practices)
- HTML Standard on keyboard access: "When a canvas element represents embedded content, the user can
  still focus descendants of the canvas element (in the fallback content)", and authors "should have a
  one-to-one mapping of interactive regions to focusable areas in the fallback content" — [WHATWG HTML Standard](https://html.spec.whatwg.org/multipage/canvas.html#best-practices)
- `drawFocusIfNeeded()` is defined in the spec as part of the `CanvasUserInterface` interface — [WHATWG HTML Standard](https://html.spec.whatwg.org/multipage/canvas.html#best-practices)
- **Hit regions are gone**: the HTML Standard as published today "does not define hit regions or
  include `addHitRegion()`"; the feature was removed in favour of fallback-content strategies — [WHATWG HTML Standard](https://html.spec.whatwg.org/multipage/canvas.html#best-practices)
- MDN, blunt and quotable: "The `<canvas>` element on its own is just a bitmap and does not provide
  information about any drawn objects. Canvas content is not exposed to accessibility tools as semantic
  HTML is. In general, you should avoid using canvas in an accessible website or app." — [MDN, `<canvas>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/canvas)
- MDN on fallback: "You should provide alternate content inside the `<canvas>` block. That content will
  be rendered both on older browsers that don't support canvas and in browsers with JavaScript
  disabled." — [MDN, `<canvas>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/canvas)
- ARIA route for an image-like canvas: "ARIA `role=img` sets the canvas as an image for the screen
  reader and an accessible name can be created with an `aria-label` string value or an `aria-labelledby`
  ID reference…The image can also have an accessible description via `aria-describedby`" — [Paul J. Adam, *HTML `<canvas>` Accessibility*](https://pauljadam.com/demos/canvas.html)
- Decorative-image convention generally: purely decorative graphics "should be hidden from assistive
  tech using `aria-hidden="true"`, which omits them from the accessibility tree altogether" — [Scott O'Hara, *Contextually marking up accessible images and SVGs*](https://www.scottohara.me/blog/2019/05/22/contextual-images-svgs-and-a11y.html)
- ACT rule confirming the decorative convention is testable: "Image not in the accessibility tree is
  decorative" — [ACT Rules Community, rule e88epe](https://act-rules.github.io/rules/e88epe/)
- axe-core has a rule **`aria-hidden-focus`** — "Ensure `aria-hidden` elements are not focusable nor
  contain focusable elements", tags `cat.name-role-value, wcag2a, wcag412` — [axe-core rule descriptions (4.13)](https://raw.githubusercontent.com/dequelabs/axe-core/develop/doc/rule-descriptions.md)
- 4.1.2 explicitly reaches canvas: canvas-based controls "must implement equivalent accessibility
  information through alternative mechanisms — essentially providing the structural information that
  built-in controls offer automatically" — [Understanding SC 4.1.2](https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html)

### Inferences

- **Decision rule.** Ask: *is there any fact, state or action available only through the canvas?*
  - **No** → the canvas is decorative. `aria-hidden="true"` on the `<canvas>`, `tabindex` absent, and
    **nothing focusable inside it** (otherwise `aria-hidden-focus` fires and 4.1.2 fails). The drag
    interaction is then an enhancement over content that already exists in the DOM — which also
    collapses the 2.5.7 problem, because the "single pointer alternative" is the DOM list of places.
  - **Yes** → the canvas is functional. Put real `<button>`s (one per marker) inside the `<canvas>`
    element as fallback content, position them with CSS over the bitmap (or keep them visually hidden
    but focusable and use `drawFocusIfNeeded()` to paint the ring into the bitmap), and keep their
    names/states in sync with what is drawn. `role="img"` + `aria-label` is only correct for a
    *static, non-interactive* canvas — it flattens the canvas to a single image node and destroys any
    interactive children.
- `aria-hidden="true"` and `role="img"` are mutually exclusive choices, not a combination. Applying
  both (a pattern that circulates in blog posts) makes the `role` inert, since `aria-hidden` removes
  the node from the tree entirely.
- For this project the honest reading is: the globe *is* decorative — every career fact lives in
  `src/content/portfolio.ts` and renders as text. Declaring it decorative is defensible, cheaper, and
  removes it from 1.4.11, 4.1.2 and most of 2.5.8 at a stroke. The cost is that the globe must then
  never become the sole route to anything, which is a content-architecture commitment, not a CSS one.
- MDN's "avoid using canvas in an accessible website or app" is advisory and overstated as written —
  the HTML Standard's fallback-content model is the actual supported route — but it is a fair warning
  that the parallel-DOM burden is real and ongoing (it must be maintained every time the drawing changes).
- The companion figures: if they are canvas or SVG and purely decorative, `aria-hidden="true"` and no
  tab stop. If either is clickable, it stops being decorative and acquires 4.1.2, 2.5.8, 2.4.7 and
  1.4.11 obligations.

### Gaps

- MDN's `<canvas>` reference page no longer carries `aria-label` / `role="img"` guidance directly (it
  defers to W3C wiki pages, at least one of which is a stale WG wiki). The `role="img"` advice above
  rests on a practitioner demo page rather than a W3C or MDN normative statement.
- The MDN tutorial page *Hit regions and accessibility* now returns HTTP 404, which is consistent with
  the API's removal but means MDN no longer hosts a canonical "canvas a11y" tutorial.

---

## Reduced motion, and the other user-preference media queries

### Takeaway

A good `prefers-reduced-motion: reduce` implementation for a spatial site **substitutes a meaningful
static state** — the end frame, a labelled still, the same information as text — rather than freezing
mid-animation or deleting content. Use the **opt-in** (progressive) authoring order so the static
version is the default. `prefers-contrast` is Baseline and safe to rely on; `prefers-reduced-transparency`
is *not* Baseline; `forced-colors` rewrites CSS colour at paint time but **does not touch canvas
bitmaps**, which is the single biggest gotcha for a Canvas 2D globe.

### Cited Findings

- Values are `no-preference` and `reduce`; MDN warns the value is `reduce`, not "none", and that this
  "doesn't mean removing ALL animations with `* {animation: none !important;}`" but disabling
  non-essential animation while preserving animation critical to function or information — [MDN, using media queries for accessibility](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_media_queries/Using_media_queries_for_accessibility)
- Two authoring strategies: **defensive/opt-out** (animate by default, override in the query) vs
  **progressive/opt-in** (static by default, add animation inside `(prefers-reduced-motion: no-preference)`);
  the opt-in order "is safer because users without a preference set still get reduced motion" — [Pope Tech, *Design accessible animation and movement*](https://blog.pope.tech/2025/12/08/design-accessible-animation-and-movement/)
- Where animation carries meaning, "replace the motion with a static equivalent rather than removing
  the feedback entirely: a visible label or icon that changes, instead of a spinner" — [Pope Tech](https://blog.pope.tech/2025/12/08/design-accessible-animation-and-movement/)
- JS-driven motion needs the same gate in script: read
  `window.matchMedia('(prefers-reduced-motion: reduce)').matches` and branch; CSS smooth scrolling
  should be wrapped in `(prefers-reduced-motion: no-preference)` and JS scrolls should fall back to
  `window.scrollTo` with `behavior: 'auto'` — [Pope Tech](https://blog.pope.tech/2025/12/08/design-accessible-animation-and-movement/)
- Vestibular triggers named firsthand: parallax scrolling (the most severe), scrolljacking,
  `background-attachment: fixed`, autoplaying carousels, background video, and **vertical slants**,
  which "likely mimic forced perspective and reinforce falling sensations" — [A List Apart, *Accessibility for Vestibular Disorders*](https://alistapart.com/article/accessibility-for-vestibular/)
- Prevalence figures from the same article: up to 40% of the population experiences vertigo at least
  once; 4% of US adults report chronic balance problems; 1.1% report chronic dizziness — [A List Apart](https://alistapart.com/article/accessibility-for-vestibular/)
- Its recommendation: "Consider reducing animations to a minimum. Provide users with controls to turn
  off non-essential animations and to pause, stop, or hide them." On parallax: "Try limiting its use to
  the header only" — [A List Apart](https://alistapart.com/article/accessibility-for-vestibular/)
- **`prefers-contrast`** — Baseline, "available across browsers since May 2022". Values: `no-preference`;
  `more` ("the user has notified the system that they prefer an interface that has a higher level of
  contrast"); `less`; and `custom` ("the user has notified the system for using a specific set of
  colors… This value will match the color palette specified by users of `forced-colors: active`") — [MDN, `prefers-contrast`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-contrast)
- **`prefers-reduced-transparency`** — values `no-preference` / `reduce`; MDN flags it "Limited
  availability… **not Baseline** because it does not work in some of the most widely-used browsers".
  Surfaced by Windows "Transparency effects", macOS/iOS "Reduce Transparency" — [MDN, `prefers-reduced-transparency`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-transparency)
- **`forced-colors: active`** forces, at paint time: `color`, `background-color`,
  `text-decoration-color`, `text-emphasis-color`, `border-color`, `outline-color`, `column-rule-color`,
  `-webkit-tap-highlight-color`, and SVG `fill`/`stroke`. It forces `box-shadow` → `none`,
  `text-shadow` → `none`, and `background-image` → `none` **except url-based images**. `color-scheme`
  is forced to `light dark`; `scrollbar-color` to `auto` — [MDN, `forced-colors`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors)
- System colour keywords available: `CanvasText`, `Canvas`, `LinkText`, `ButtonText`, `ButtonFace`,
  `Highlight`, `HighlightText`, `GrayText`. **Critical:** the browser picks them from *native element
  semantics, not ARIA roles* — "Adding `role="button"` to a `div` will NOT trigger `ButtonText` colour
  forcing" — [MDN, `forced-colors`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors)
- **Canvas bitmaps are not recoloured by forced-colors mode.** The workaround is to detect it in script
  and redraw: `if (window.matchMedia("(forced-colors: active)").matches) { ctx.fillStyle = getComputedStyle(document.body).color; }` — [MDN, `forced-colors`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors)
- The browser draws opaque "backplates" behind text over images in forced-colors mode; these are
  **disabled by `forced-color-adjust: none`** — [MDN, `forced-colors`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors)
- MDN's own best practices: use `forced-colors` queries "for tweaks only, not redesigns"; do not remove
  or hide content based on forced-colors status; avoid `forced-color-adjust: none` unless necessary — [MDN, `forced-colors`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors)

### Inferences

- **What a *good* reduced-motion state looks like for this site**, concretely:
  - **Globe:** stop the idle spin; render the globe at the orientation the current chapter implies —
    i.e. the *end frame* of the animation, not frame zero. Keep click-to-orient working but make the
    transition instantaneous (`behavior: 'auto'`, no tween). Never blank the canvas: a missing globe is
    a loss of information, which is worse than a still globe.
  - **Scroll-driven journey:** stop driving transforms from scroll position entirely. Sections become
    ordinary stacked blocks in DOM order; the "progress" that the animation conveyed becomes a static
    chapter marker in the margin rail (this site already has a rail that carries facts — a "3 of 7"
    there is exactly the static equivalent Pope Tech describes).
  - **Companions:** freeze at a designed rest pose, not wherever the loop happened to be. Ideally drop
    them to a single static illustration anchored once, rather than following the scroll at all —
    element-follows-scroll is the pattern vestibular users name as most provocative.
  - **Authoring order:** opt-in. Static styles are the default; wrap every keyframe/transition in
    `@media (prefers-reduced-motion: no-preference)`. This also matches "server-rendered by default" —
    the no-JS, no-preference render is already the static one.
- The **theme × tone × preference matrix** is larger than it looks: 2 themes × 3 tones × {motion,
  reduced-motion} × {normal, forced-colors} = 24 render states. The existing harness already covers
  2×3; adding the two preference axes is a loop, not a rewrite.
- **Forced-colors is the sharpest risk for "Blueprint".** The design leans on semantic aliases
  (`border-rule`, `bg-surface`, `text-accent`) — all of which are forced away under Windows High
  Contrast. Specific breakages to expect: (1) any rule/hairline drawn with `box-shadow` disappears
  entirely; (2) any tonal ground drawn with a gradient disappears (`background-image: none`); (3) the
  blue accent collapses to `LinkText`/`CanvasText`, so "blue is the only hue" stops distinguishing
  anything — annotation and body text become identical, which is a 1.3.1/1.4.1 problem, not just
  cosmetic; (4) the canvas globe keeps its authored day/night palette and now clashes with a
  black-or-white page and may sit at <3:1 against `Canvas`. Fixes: replace shadow-drawn rules with
  `border` in the `forced-colors: active` block; give every gradient a `background-color` fallback;
  re-establish the accent/annotation distinction non-chromatically (underline, weight, a glyph);
  and redraw the canvas from `getComputedStyle` system colours when `forced-colors: active` matches.
- `prefers-contrast: custom` matching alongside `forced-colors: active` means a single
  `@media (forced-colors: active)` block is usually sufficient; a separate `prefers-contrast: more`
  block is still worth having for macOS "Increase contrast", which does *not* trigger forced colors.
- `prefers-reduced-transparency` is worth implementing (cheap: raise opacity on frosted/translucent
  companion backdrops and any scrim over the globe) but must not be *relied on* — it is not Baseline,
  so the design must be legible without it.

### Gaps

- A search result attributed to WebAIM a survey finding that "40% of users with vestibular impairments
  always or often have problems with scrolling" and "over 50% named parallax scrolling as a trigger",
  plus a "28% of users report motion sickness" figure. **I could not verify either against a primary
  source.** WebAIM's published surveys are screen-reader, low-vision and motor-disability surveys;
  I found no WebAIM vestibular survey. **Do not cite these numbers.** Use the A List Apart prevalence
  figures instead, which are sourced in that article.
- No source found that quantifies how many users actually set `prefers-reduced-motion` in 2026, so the
  "most users haven't set the OS flag" argument for an in-page pause control is reasoning, not data.

---

## Scroll-jacking, keyboard, and scroll-driven content

### Takeaway

Scroll position driving content is not itself a WCAG failure, but it reliably *causes* failures in
four places: keyboard operability (2.1.1), focus order and focus visibility (2.4.3, 2.4.7, 2.4.11),
reading sequence (1.3.2), and reflow at zoom (1.4.10). The hardest obligation is the one WCAG does not
name explicitly: **browser find-in-page must keep working**, which rules out unmounting off-screen
sections. The usability research is unambiguous — NN/g found most participants were at least mildly
disoriented by scrolljacking, some reading it as a bug.

### Cited Findings

- NN/g usability testing: "The majority of study participants were at least mildly disoriented by
  scrolljacking", observed across multiple sites; participants "did not hesitate to click away from the
  page or refresh it"; disorientation was "severely exacerbated when scrolljacks were excessively
  lengthy, interfering with normal scrolling for most of the page's length", at which point "users
  sometimes interpreted the scrolljack as a bug". One participant "got lost" and did not comprehend the
  story — [Nielsen Norman Group, *Scrolljacking 101*](https://www.nngroup.com/articles/scrolljacking-101/)
- NN/g has a separate finding that scroll-triggered text animation delays users — [NN/g, *Scroll-Triggered Text Animations Delay Users*](https://www.nngroup.com/articles/scroll-animations/)
- Adrian Roselli's testing of CSS scroll snap found cross-browser breakage: in Safari "scroll snap does
  not work on the horizontal axis" and content is hidden behind fixed headers; in Chrome and Firefox
  users cannot use "the arrow keys to scroll for only part of a cell", i.e. **snap points remove
  fine-grained keyboard scrolling** — [Adrian Roselli, *Scroll Snap Challenges*](https://adrianroselli.com/2021/07/scroll-snap-challenges.html)
- Roselli names the criteria to test snap-based layouts against: **1.4.4 Resize Text, 1.4.10 Reflow,
  1.4.12 Text Spacing**, because "content that may snap into place reasonably well could be a problem
  if the user resizes or re-spaces it", and his overall advice is "Test the heck out of them both with
  users and in browsers" — [Adrian Roselli](https://adrianroselli.com/2021/07/scroll-snap-challenges.html)
- Virtualisation/unmounting breaks find-in-page: "If a user presses Ctrl+F, the browser cannot find
  text contained in unmounted elements", and DOM-stripping virtualisation is described as "destroying
  accessibility, breaking keyboard navigation, and making native search impossible"; the suggested
  accessible alternative is CSS `content-visibility` with IntersectionObserver — [TechSheet, *Beyond Virtual Scrolling*](https://techsheet.vercel.app/blogs/beyond-virtual-scrolling-dom-performance-at-scale-with-css-content-visibility-and-intersectionobserver)
- Scrolljacking "involves changing the normal pace or direction of scrolling", repurposing scroll to
  trigger custom animations and navigation, and "is harmful to people with vestibular disorders and
  should be avoided or used with extreme caution" — [Webflow Accessibility Checklist, *Avoid scrolljacking*](https://webflow.com/accessibility/checklist/task/avoid-scrolljacking)
- 1.3.2's direct remedy is technique **C27 "Making the DOM order match the visual order"**; **F1** is
  the failure for changing meaning via CSS positioning — [Understanding SC 1.3.2](https://www.w3.org/WAI/WCAG22/Understanding/meaningful-sequence.html)
- 1.4.10's named failures include "sticky elements blocking content" during zoom — [Understanding SC 1.4.10](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html)

### Cited obligations, assembled

For a scroll-driven journey, these are the enforceable requirements, each traced to a criterion:

| Obligation | Criterion | Level |
|---|---|---|
| Every journey stage reachable and operable by keyboard alone | 2.1.1 Keyboard | A |
| No keyboard trap when a stage "locks" scroll | 2.1.2 No Keyboard Trap | A |
| Focus order follows the journey's meaning | 2.4.3 Focus Order | A |
| DOM order matches the spatial narrative | 1.3.2 Meaningful Sequence | A |
| Focus indicator visible at every stage | 2.4.7 Focus Visible | AA |
| Focused control not entirely hidden by pinned chrome/companions | 2.4.11 Focus Not Obscured (Min) | AA |
| No 2-D scrolling at 320 CSS px / 400% zoom | 1.4.10 Reflow | AA |
| Auto-running motion pausable | 2.2.2 Pause, Stop, Hide | A |
| Stage-change announcements without focus moves | 4.1.3 Status Messages | AA |
| Scroll-triggered motion disableable | 2.3.3 Animation from Interactions | **AAA** |

### Inferences

- **Do not take over the scroll wheel.** The defensible version of "scroll-driven" is: the browser
  scrolls natively at its native rate, and content *reacts* to scroll position (opacity, transform,
  chapter state). The undefensible version is intercepting `wheel`/`touchmove` to impose fixed stage
  advances — that is what NN/g tested and what disorients people, and it breaks arrow-key and
  Page Up/Down scrolling in the way Roselli documented for snap points.
- **Keep everything in the DOM.** Use `content-visibility: auto` with `contain-intrinsic-size` rather
  than unmounting off-screen sections. This preserves Ctrl+F, screen-reader browse mode, and
  in-page anchor links. Next.js server-rendering by default is an advantage here: the full text ships
  in the HTML, and the risk is only in client components that conditionally render.
- **Focus must be able to drive the scroll, not fight it.** A journey where scroll position sets a
  state variable, and focusing a control *also* sets that state variable (via `focusin` → set stage),
  is the pattern that keeps Tab order and the visual stage synchronised. Without it, tabbing to an
  off-stage control scrolls the page while the animation controller yanks it back — a classic
  focus-fight that reads as a keyboard trap.
- **Scroll snap is a liability at zoom.** If snap points are used, add `scroll-snap-stop: normal` (not
  `always`), and disable snapping entirely under `prefers-reduced-motion: reduce` and below the
  reflow breakpoint. Roselli's 1.4.4/1.4.10/1.4.12 list is the right test set.
- **`scroll-behavior: smooth` must be gated.** Put it inside `(prefers-reduced-motion: no-preference)`
  and pass `behavior: 'auto'` in JS when the preference is set.
- A "skip the journey" link at the top — jumping straight to a plain, linear content view or to the
  `/resume` route — is the cheapest, most honest escape hatch, and it is testable.

### Gaps

- I found no controlled study isolating screen-reader behaviour on scroll-driven sites specifically
  (as distinct from carousels and infinite scroll). The screen-reader obligations above are derived
  from the criteria and from general browse-mode behaviour, not from published scroll-journey research.
- NN/g's scrolljacking article does not publish participant counts or effect sizes in the material
  retrieved, so "majority… at least mildly disoriented" is their qualitative finding, not a statistic.

---

## Screen reader narrative — how to expose a "journey"

### Takeaway

Expose it as **headings first, landmarks second**. The evidence is lopsided: 71.6% of screen reader
users navigate a long page by headings; only 3.7% reach for landmarks first. A spatial journey should
therefore be a conventional, correctly-nested heading outline over ordinary sections in DOM order —
with the spatial/positional framing carried by *text* ("Chapter 3 of 7"), not by geometry. There is no
evidence base for exotic non-linear exposure, and inventing one is a risk.

### Cited Findings

- WebAIM Screen Reader User Survey #10, conducted December 2023 – January 2024, **1,539 valid
  responses**. When finding information on a long page: **headings 71.6%**, find feature 13.6%,
  read through 6.4%, navigate links 4.8%, **landmarks/regions 3.7%**. Advanced users favour headings
  more (78%); beginners lean on Find — [WebAIM Screen Reader User Survey #10](https://webaim.org/projects/screenreadersurvey10/)
- Landmark usage frequency: whenever available 17.9%, often 13.9%, sometimes 31.5%, seldom 20.6%,
  never 16.1%; frequent landmark use rose to 31.8% in 2024, reversing prior declines — [WebAIM #10](https://webaim.org/projects/screenreadersurvey10/)
- Heading *levels* are useful to 88.8% ("very useful" 57.0%, "somewhat useful" 31.8%) — [WebAIM #10](https://webaim.org/projects/screenreadersurvey10/)
- Top SR+browser pairs: JAWS+Chrome 24.7%, NVDA+Chrome 21.3%, JAWS+Edge 11.4%, NVDA+Firefox 10.0%,
  VoiceOver+Safari 7.0% — [WebAIM #10](https://webaim.org/projects/screenreadersurvey10/)
- Landmarks and headings are complementary navigation layers: landmarks are "the small set of major
  regions like the banner, navigation, main content, sidebar, and footer, while headings are the
  fine-grained outline inside those regions" — [accessibility.build, *ARIA Landmarks & Page Structure*](https://accessibility.build/guides/landmarks-page-structure)
- Screen readers let users list all landmarks and jump between them, and separately list all headings —
  together reproducing visual scanning for a non-visual user — [WebAIM, *Designing for Screen Reader Compatibility*](https://webaim.org/techniques/screenreader/)
- Status-message technique for stage changes without moving focus: `role="status"` (ARIA22), or
  `role="log"`/live regions for running updates (ARIA23/ARIA25) — [Understanding SC 4.1.3](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html)

### Inferences

- **Recommended exposure model**, in priority order:
  1. **One `<h1>`, then one `<h2>` per journey stage, in DOM order matching the narrative order.**
     Each stage's heading text should carry its position: "Chapter 3 of 7 — Foundry" beats "Foundry",
     because 88.8% use heading levels and the level alone cannot convey "3 of 7". This is also what
     satisfies 1.3.2 without any ARIA.
  2. **Landmarks as the coarse layer only** — `<header>`/`banner`, `<nav>`, `<main>`, `<footer>`.
     Do not make each stage a `<section aria-label>`/`region` landmark: at seven-plus stages that
     floods the landmark list for the ~32% who use it frequently, with no benefit to the 71.6% who
     don't. Sections are fine as `<section>` elements *without* accessible names (an unnamed
     `<section>` is not a landmark).
  3. **A list, only if the stages are genuinely a set rather than a narrative.** A `<nav>` containing
     an `<ol>` of stage links is a good *table of contents*; making the journey body itself a list
     adds "list with 7 items" noise to prose.
  4. **`role="status"` for transitions** the user causes but that don't move focus (globe reset,
     chapter change from a jump link).
- **The spatial metaphor must not be load-bearing.** Anything expressed only as position ("this branch
  sits to the left of that one") has to also exist as a relationship in text or markup, or it is
  invisible to 100% of screen reader users. For this project the career tree's authored parent→child
  edges are already that text layer; the globe should be treated the same way.
- **Do not build an ARIA `application`-mode canvas explorer.** It defeats browse mode, on which the
  71.6% heading navigation depends, and there is no evidence it helps.
- **Test with NVDA+Chrome and JAWS+Chrome first** — together 46% of the surveyed population — and
  VoiceOver+Safari for macOS/iOS coverage.

### Gaps

- **No research found specifically on how screen reader users experience spatial or "scrollytelling"
  narratives.** The WebAIM survey is about long pages generally. The recommendations above are
  extrapolation from general navigation data plus the criteria, and should be labelled as such.
- WebAIM #10 contains no data on dynamic content or `aria-live` usage, so there is no population-level
  evidence on how often live-region announcements help versus annoy.

---

## Automated testing — what axe-core catches, and what it cannot

### Takeaway

For WCAG 2.2, **axe-core has exactly one rule: `target-size` (2.5.8)**, it is **off by default**, and
Deque has said publicly it is likely to be the only 2.2 rule axe-core ever gets. **Nothing automated
exists for 2.5.7 Dragging, 2.4.11 Focus Not Obscured, 2.4.13 Focus Appearance, 2.2.2 Pause, 2.3.1
Flashes, or reduced-motion behaviour.** Those must be Playwright assertions written by hand. The good
news is that most of them are mechanically checkable in Playwright *without* axe — geometry,
`getComputedStyle`, focus position and bounding-box intersection are all scriptable.

### Cited Findings

- axe-core 4.13 rule descriptions: **exactly one rule carries a `wcag22aa` tag** — `target-size`,
  "Ensure touch targets have sufficient size and space", tags `cat.sensory-and-visual-cues, wcag22aa,
  wcag258, EN-301-549v4, EN-9.2.5.8`, serious impact, issue types "failure, needs review" — [axe-core rule descriptions, develop branch (4.13)](https://raw.githubusercontent.com/dequelabs/axe-core/develop/doc/rule-descriptions.md)
- Deque, on introducing it in 4.5: the rule "tests if links, buttons, form fields, and other controls
  have a width and height of at least 24 pixels, or if they don't, that they have that much space from
  the closest other control"; "Until WCAG 2.2 is a W3C Recommendation that is more widely required,
  this rule will be off by default"; "To use this rule you will need to configure your axe products to
  use the WCAG 2.2 ruleset" — [Deque, *axe-core 4.5: First WCAG 2.2 Support*](https://www.deque.com/blog/axe-core-4-5-first-wcag-2-2-support-and-more/)
- Deque, on the ceiling: "Because of how few new success criteria in WCAG 2.2 can be automated without
  false positives, the target-size rule is likely the only rule for WCAG 2.2 that will be added to
  axe-core. Tests for criteria such as Focus Appearance and Focus Not Obscure will be available in an
  upcoming version of axe DevTools Pro." — [Deque](https://www.deque.com/blog/axe-core-4-5-first-wcag-2-2-support-and-more/)
- Other rules directly relevant here: `aria-hidden-focus` (`wcag2a`, `wcag412`) — "Ensure aria-hidden
  elements are not focusable nor contain focusable elements"; `scrollable-region-focusable`
  (`wcag2a`, `wcag211`, `wcag213`) — "Ensure elements that have scrollable content are accessible by
  keyboard"; `color-contrast` (`wcag2aa`); `region` (best-practice) — "Ensure all page content is
  contained by landmarks" — [axe-core rule descriptions (4.13)](https://raw.githubusercontent.com/dequelabs/axe-core/develop/doc/rule-descriptions.md)
- Seven rules are tagged experimental: `css-orientation-lock`, `focus-order-semantics`,
  `hidden-content`, `label-content-name-mismatch`, `p-as-heading`, `table-fake-caption`,
  `td-has-header`; ~40 rules carry "needs review" — [axe-core rule descriptions (4.13)](https://raw.githubusercontent.com/dequelabs/axe-core/develop/doc/rule-descriptions.md)
- `@axe-core/playwright` API: `new AxeBuilder({ page })` then `.analyze()`; `.withTags('wcag2a')` or
  `.withTags(['wcag2a','wcag2aa'])`; `.include('.results-panel')`; `.exclude('.another-element')`;
  `.disableRules('color-contrast')`. Versioning note: "This package does not follow Semantic Versioning
  (SemVer) but instead uses the major and minor version (but not patch version) of axe-core that the
  package uses." — [@axe-core/playwright README](https://github.com/dequelabs/axe-core-npm/blob/develop/packages/playwright/README.md)

### Inferences

**What to configure in the existing harness**

```ts
// target-size is OFF unless the wcag22aa tag is requested explicitly
const results = await new AxeBuilder({ page })
  .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
  .analyze();
```

Two cautions: `target-size` returns **incomplete** ("needs review") results as well as violations, so
the assertion should inspect `results.incomplete` and not only `results.violations` — an all-green
`violations` array with twelve `incomplete` entries is a false sense of safety. And exclude the canvas
from contrast scanning (`.exclude('canvas')`) or accept noise — axe cannot read a bitmap.

**What axe can catch on this site**

| Rule | Catches |
|---|---|
| `target-size` (opt-in) | undersized globe markers, companion hotspots, tone/theme toggles |
| `aria-hidden-focus` | a focusable control left inside an `aria-hidden` canvas |
| `color-contrast` | text over the globe/tonal grounds, per theme × tone |
| `scrollable-region-focusable` | a scroll container for the journey with no keyboard access |
| `region`, landmark rules | stages outside `<main>`, duplicate banners |
| `heading-order`, `empty-heading` | the journey's heading outline (1.3.1/2.4.6 support) |

**What axe cannot catch, and the Playwright assertions that replace it**

- **2.5.7 Dragging** — assert that a non-drag path exists and works: `page.click()` on a direction
  button (never `mouse.down/move/up`) changes the globe's exposed orientation state. Expose that state
  in the DOM (`data-globe-lat`, `data-globe-lon`, or an `aria-valuenow`) purely so it is assertable;
  asserting on canvas pixels is brittle. Also assert every named destination is reachable by a single
  `click`.
- **2.5.2 Pointer Cancellation** — `page.mouse.down()` on a marker, `page.mouse.move()` away, then
  `page.mouse.up()`; assert no navigation occurred and URL is unchanged.
- **2.4.11 Focus Not Obscured** — for every focusable element: focus it, then compare
  `element.boundingBox()` against the bounding boxes of the sticky control and each companion, and
  assert the intersection does **not** cover the element entirely. (Binary test — no pixel threshold.
  If an internal stricter rule is wanted, assert a minimum visible area and label it as a house rule,
  not WCAG.) Run the loop **forwards and backwards** (`Shift+Tab`) — reverse tabbing under a sticky
  footer is where this actually fails.
- **2.4.7 Focus Visible** — assert `getComputedStyle(el).outlineStyle !== 'none'` or an equivalent
  indicator token, in both themes and all three tones.
- **2.2.2 Pause** — assert a pause control exists, is a `<button>`, is keyboard-reachable, and that
  after activation the globe's rotation state (`data-globe-lon`) is unchanged across two RAF ticks and
  no element has a running `getAnimations()` entry.
- **Reduced motion** — run the whole suite a second time with
  `test.use({ reducedMotion: 'reduce' })` (Playwright's built-in emulation) and assert:
  `document.getAnimations().length === 0` (or only `finished` ones), `scroll-behavior` computed as
  `auto`, the globe present and non-spinning, and chapter text still present.
- **Forced colors** — `test.use({ forcedColors: 'active' })`; assert no element relies on `box-shadow`
  for its only boundary (`getComputedStyle(el).borderStyle !== 'none'` on rules/cards) and that the
  canvas redrew (assert a `data-forced-colors="true"` attribute the draw loop sets).
- **Contrast preference** — Playwright has `contrast: 'more'` emulation; assert the accent remains
  distinguishable.
- **1.4.10 Reflow** — the existing 320–1440 sweep is right, but add the *actual* criterion condition:
  1280px viewport with 400% zoom. `document.documentElement.scrollWidth <= innerWidth + 1` is the
  assertion (the +1 absorbs sub-pixel rounding).
- **2.3.1 Flashes** — not automatable in this harness. Manual: record a scroll-through and a rapid
  theme toggle, check with PEAT or the Harding analyzer, and rate-limit transitions in code so the
  failure is impossible by construction.
- **1.4.11 Non-text Contrast on canvas** — not automatable by axe. Compute it at the source: the
  project's `pnpm contrast` script already derives ratios from palette tokens; extend it to cover the
  globe's marker/graticule colours against each ground, including `--color-paper-deep`.

**Matrix sizing.** Existing: 2 themes × 3 tones. Add: × 2 motion states × 2 forced-colors states =
24 axe runs. At ~1–2s each that is acceptable in CI; if not, run the full matrix nightly and a
2 themes × 1 tone × 2 motion subset on PRs.

### Gaps

- I could not confirm whether any axe-core release after 4.13 has added further `wcag22` rules; the
  4.13 `develop`-branch rule list fetched on 28 Sep 2026 still shows only `target-size`, and Deque's
  stated position is that it will remain the only one. Re-check `doc/rule-descriptions.md` at upgrade time.
- Deque's statement that Focus Appearance and Focus Not Obscured tests would ship "in an upcoming
  version of axe DevTools Pro" dates from the 4.5 announcement; I found no confirmation of whether
  those shipped, and they would be commercial-product features, not axe-core, so they would not be
  available to this open-source harness regardless.

---

## The European Accessibility Act — does it oblige a personal portfolio?

### Takeaway

**No.** A personal portfolio site is not one of the products or services listed in Article 2 of
Directive (EU) 2019/882, and it is not an "e-commerce service" because no consumer contract is
concluded on it. Even if it were reclassified as a service, Article 4(5) exempts microenterprises
providing services outright. Enforcement through 2026 is real but is aimed at e-commerce, banking,
transport and telecoms operators, not personal sites. The separate Web Accessibility Directive
(2016/2102) binds public sector bodies only, which also does not apply.

### Cited Findings

- **Covered services** (provided after 28 June 2025) under Article 2: electronic communications
  services; audiovisual media services; elements of air, bus, rail and waterborne passenger transport;
  consumer banking services; e-books and dedicated software; **e-commerce services**. Covered products
  include consumer computer hardware and OSes, self-service terminals, consumer terminal equipment for
  electronic communications/AV media, and e-readers — [Directive (EU) 2019/882, EUR-Lex](https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32019L0882)
- **"E-commerce services"** are defined as "services provided at a distance, through websites and
  mobile device-based services by electronic means and at the individual request of a consumer **with a
  view to concluding a consumer contract**" — [Directive (EU) 2019/882](https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32019L0882)
- **Article 4(5)**: "Microenterprises providing services shall be exempt from complying with the
  accessibility requirements referred to in paragraph 3 of this Article and any obligations relating to
  the compliance with those requirements." — [Directive (EU) 2019/882](https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32019L0882)
- **"Microenterprise"** is "an enterprise which employs fewer than 10 persons and which has an annual
  turnover not exceeding EUR 2 million or an annual balance sheet total not exceeding EUR 2 million" — [Directive (EU) 2019/882](https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32019L0882)
- **Article 14** limits requirements where compliance would "require a significant change in a product
  or service that results in the fundamental alteration of its basic nature" or "result in the
  imposition of a disproportionate burden on the economic operators concerned"; assessments must be
  documented and retained for five years — [Directive (EU) 2019/882](https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32019L0882)
- **Article 31**: general date of application **28 June 2025**; a five-year transitional period for
  products used in service provision placed on the market before that date; self-service terminals may
  remain in use for up to 20 years — [Directive (EU) 2019/882](https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32019L0882)
- The microenterprise exemption "applies exclusively to services"; microenterprises that *manufacture*
  covered products are **not** exempt — [Webyes, *EAA Exemptions*](https://www.webyes.com/blogs/eaa-exemptions/) (commercial secondary source)
- Enforcement picture in 2026 (secondary, commercial sources — directionally useful, figures unverified
  against national law): enforcement began 28 June 2025 across all 27 member states and is described as
  intensifying through 2026 via complaints, notices, injunctions and market surveillance; Sweden began
  market surveillance of digital products in October 2025 and Denmark began contacting businesses the
  same month; the Dutch ACM is enforcing for e-commerce and electronic communications — [Level Access, *EAA 2026: Requirements and Penalties*](https://www.levelaccess.com/compliance-overview/european-accessibility-act-eaa/); [Webyes, *EAA Fines*](https://www.webyes.com/blogs/eaa-fines/)
- Reported national penalty ranges (same secondary sources, **not verified against national statutes**):
  Germany up to €100,000 per violation; France €5,000–€250,000 plus €25,000/year for a missing
  accessibility statement; Austria and Belgium up to €80,000 per violation; authorities may also order
  withdrawal, ban products, require audits, and name non-compliant organisations — [Level Access](https://www.levelaccess.com/blog/penalties-for-eaa-non-compliance/); [Webyes](https://www.webyes.com/blogs/eaa-fines/)
- Ongoing 2026 legal commentary confirms nonconformity and derogation **disclosure** obligations for
  economic operators are a live enforcement theme — [Bird & Bird, *Accessibility Alert: nonconformity and derogation disclosure obligations*](https://www.twobirds.com/en/insights/2026/accessibility-alert-nonconformity-and-derogation-disclosure-obligations-for-operators-under-the-euro)

### Inferences

- A portfolio that displays work and offers a contact form does not conclude a consumer contract, so it
  falls outside the e-commerce service definition and outside Article 2 entirely. **No EAA obligation.**
- The trigger that *would* change this: adding a checkout, a paid booking flow, a subscription, or
  selling digital products. At that point the site becomes an e-commerce service — but a sole trader
  or a company with fewer than 10 employees and under €2m turnover is exempt under Article 4(5)
  regardless. The exemption is about the *provider*, not the site.
- The practical reason to meet WCAG 2.2 AA here is professional, not legal: a portfolio is a work
  sample, and for many employers and clients — especially EU public sector, which *is* bound by
  Directive 2016/2102 and EN 301 549 — accessible work is a procurement precondition. That argument
  is stronger than a compliance claim the site does not need to make.
- Note that the `EN-301-549v4` / `EN-9.2.5.8` tags on axe's `target-size` rule show the harmonised
  European standard already maps WCAG 2.2 criteria — so building to 2.2 AA is forward-compatible with
  EN 301 549 if the site ever does come into scope.

### Gaps

- National transpositions vary and I did not check any member state's implementing statute. Some states
  may define scope more broadly than the Directive's minimum; a definitive answer for a specific
  country requires reading that country's law.
- All penalty figures and enforcement-activity claims above come from accessibility-vendor blogs, which
  have a commercial interest in emphasising risk. I found no primary Commission or national regulator
  source in this session confirming the specific amounts. **Treat them as indicative only.**
- I found no source addressing personal/portfolio sites explicitly — the "no obligation" conclusion is
  reasoning from the Directive's own scope and definitions, not a citation of someone saying so.
