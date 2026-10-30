# Voice

Rules every section's copy follows. Source: the Round 19 design,
[§2](superpowers/specs/2026-10-10-round-19-voice-and-journey-design.md).

1. **First person everywhere.** No "he / his / him / himself" in any rendered
   content field. Quotations of other people are the only exception.
2. **Surface vs depth.** At rest: titles, results, evidence (numbers, chips,
   recordings). Behind a click: context, responsibilities, impact sentences,
   case-study deep dives.
3. **Story belongs to motion.** Text never retells what an animation shows.
4. **Headlines:** 12 words or fewer, phrased as a result, every figure taken
   from the same record's own content. "I" allowed, not required. No adjectives
   about the person. One exception, by my ruling (2026-10-28): the hero's
   `<h1>`, `profile.headline` ("Just a curious kid, and this is my youth."),
   stays as written. It opens the story rather than reporting a record, and
   the Round 22 critique's case for a result there was heard and declined.
5. **Taste:** one idea per line; numbers beat adjectives; playful only where it
   costs nothing.
6. **Before / after**, each "before" quoted from the content layer as it stood at Round 19:

   - **Third person to first person** (`careerEntries.eastside-high.context`)
     - Before: Three years of American high school, started three weeks after landing, in a language he could read and write but not speak.
     - After: Three years of American high school, started three weeks after landing, in a language I could read and write but not speak.
   - **Act title** (`ACTS["the-switch"].title`)
     - Before: Friends talk him into it
     - After: Friends talk me into it
   - **Surface vs depth** (DoorDash `impact[0]`)
     - Before: Re-engineered a major retailer's catalog scraper from HTML crawling to a direct API: runtime 17 hours to 3 minutes, coverage 654 to 1,529 products, failures 3.9% to zero, plus hidden data the crawl never reached.
     - After: Reverse engineering scraper: 17 hours to 3 minutes
   - **The figure stays with its source** (Schaeffler `impact`)
     - Before: 96% increase in production throughput after integrating custom Java functions.
     - After: Moved paper setup sheets to low-code; my Java lifted throughput 96%.
7. **Every word is me talking to you.** All copy, including chat questions,
   suggestion chips and empty states, is first person ("What do you do at
   DoorDash?", "Ask me"). Source: the Round 21 spec. The copy this changes is
   rewritten in the phases that own it (the chips in Phase 6).
