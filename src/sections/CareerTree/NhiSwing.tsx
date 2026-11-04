"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Drawing } from "@/components/scenery/Drawing";
import MiniNhi, { NHI_MOODS, NHI_SEAT_Y, NHI_W } from "@/components/companion/MiniNhi";
import { cn } from "@/lib/cn";
import type { JourneyCopy, NhiMood } from "@/types/portfolio";

/**
 * Bé Nhi on a rope swing under the oak (round 22). Everyone sees her, phones
 * too; mini-Thien's walks with the cats are desktop-only.
 *
 * "Easy mood changing" is the whole behaviour, and none of it is a timer:
 *  - a press gives her a new mood and a push (the swing sways and settles);
 *  - each time she scrolls back into view she has changed her mind;
 *  - she is sleepy at night, and grins when the day comes back;
 *  - she grins while "Watch it grow" plays (`origin-story`), and hugs it
 *    when it ends.
 * Each change hangs her line (`says`) over her head for a moment; the
 * caption under the swing always reads how she is (`is`), like the board's
 * other captions. Under reduced motion she still changes, the swing never
 * moves. Only a press is announced: the other changes happen without asking.
 *
 * Round 24, her act: "Hả?" (`huh`, "what did you say?"). It is a beat, not a
 * still: the swing checks short (whatever sway she had is cut off and it
 * recoils), her head snaps into its tilt (`MiniNhi`, `globals.css`) and the
 * bubble pops. She does it as a reaction, three ways besides the random draw:
 *  - a press that wakes her from sleepy;
 *  - the theme turning (the light changes on her), after which she settles
 *    into sleepy (night) or grins (day) a moment later;
 *  - the thunderclap in "Watch it grow" (a beat whose weather is a
 *    thunderstorm or a hurricane, at the instant `wx-bolt` strikes), after
 *    which she grins again. Only the first clap of a run of the same weather
 *    startles her: the second is old news.
 * Under reduced motion she shows the end pose and the line, and nothing moves.
 *
 * From 1280 the ropes are tied round the oak's left limb (board x 212 and
 * 264, where the limb is at y 542 and 564), between the lantern and the
 * trunk; below 1280 she hangs from a bough of her own under the last tag
 * (globals.css, "Bé Nhi's swing").
 */

const SCALE = 2;
/** The ride's frame: ropes at x 6 and 58 inside a 64px seat. */
const RIDE_W = NHI_W * SCALE + 8;
const PUSH_MS = 2600;
const SAYS_MS = 2400;
/** The swing's check: cut off, recoil, settle. */
const CHECK_MS = 780;
/** The bubble's pop, started as the head arrives. */
const POP_MS = 340;
const POP_DELAY_MS = 120;
/** How long she holds "Hả?" before the light or the storm moves her on. */
const HUH_MS = 1500;
/** Where in a beat the bolt strikes: `wx-bolt` shows from 46% and `wx-flash`
 *  peaks at 47% of the beat (globals.css, "Watch it grow, with weather"). */
const CLAP_AT = 0.47;
/** After a clap she holds "Hả?" for this many beats, which is a hair longer
 *  than the next clap is away. */
const HOLD_BEATS = 1.1;
/** The beat's length when `#tree` does not say (`GrowOak`'s `BEAT_MS`). */
const BEAT_FALLBACK_MS = 1600;
const STORMY: readonly string[] = ["thunderstorm", "hurricane"];

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const isNight = () => document.documentElement.dataset.theme === "night";

function another(mood: NhiMood): NhiMood {
  const rest = NHI_MOODS.filter((m) => m !== mood);
  return rest[Math.floor(Math.random() * rest.length)];
}

/** The angle the swing is at right now, from its computed transform. */
function swungBy(el: Element): number {
  const t = getComputedStyle(el).transform;
  if (!t || t === "none" || typeof DOMMatrixReadOnly === "undefined") return 0;
  const m = new DOMMatrixReadOnly(t);
  return Math.atan2(m.b, m.a) * (180 / Math.PI);
}

export default function NhiSwing({ copy, className }: { readonly copy: JourneyCopy["swing"]; readonly className?: string }) {
  // Pouting is her resting face by day, sleepy by night (set the first time
  // she is seen: the server cannot know the theme).
  const [mood, setMood] = useState<NhiMood>("pout");
  const [saying, setSaying] = useState(false);
  const [announce, setAnnounce] = useState("");
  // How many times she has startled: replays the head's snap, and is what
  // plays the swing's check and the bubble's pop.
  const [beat, setBeat] = useState(0);
  const ride = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const bubble = useRef<HTMLParagraphElement>(null);
  const sayTimer = useRef(0);
  const settleTimer = useRef(0);
  const clapTimer = useRef(0);

  const change = useCallback((next: NhiMood) => {
    window.clearTimeout(settleTimer.current);
    setMood(next);
    if (next === "huh") setBeat((n) => n + 1);
    setSaying(true);
    window.clearTimeout(sayTimer.current);
    sayTimer.current = window.setTimeout(() => setSaying(false), SAYS_MS);
  }, []);

  /** She startles, and `hold` ms later `then` moves her on (any other change
   *  in between takes over: a press, the end of the show, the next clap). */
  const startle = useCallback(
    (then: NhiMood, hold = HUH_MS) => {
      change("huh");
      settleTimer.current = window.setTimeout(() => change(then), hold);
    },
    [change],
  );

  const push = () => {
    if (reducedMotion() || !ride.current?.animate) return;
    ride.current.animate(
      [
        { transform: "rotate(0deg)" },
        { transform: "rotate(9deg)" },
        { transform: "rotate(-7deg)" },
        { transform: "rotate(4deg)" },
        { transform: "rotate(-2deg)" },
        { transform: "rotate(0deg)" },
      ],
      { duration: PUSH_MS, easing: "ease-in-out" },
    );
  };

  // The act itself, once per startle: the swing checks short (any sway is cut
  // off where it is, then it recoils and settles) and the bubble pops as her
  // head arrives. The head's own snap is CSS on her drawing.
  useEffect(() => {
    if (beat === 0 || reducedMotion()) return;
    const el = ride.current;
    if (el?.animate) {
      const was = swungBy(el);
      for (const running of el.getAnimations?.() ?? []) running.cancel();
      el.animate(
        [
          { transform: `rotate(${was}deg)` },
          { transform: "rotate(-2.8deg)", offset: 0.3 },
          { transform: "rotate(1.2deg)", offset: 0.62 },
          { transform: "rotate(0deg)" },
        ],
        { duration: CHECK_MS, easing: "ease-out" },
      );
    }
    bubble.current?.animate?.(
      [
        { scale: "0.5", opacity: 0 },
        { scale: "1.15", opacity: 1, offset: 0.55 },
        { scale: "1", opacity: 1 },
      ],
      { duration: POP_MS, delay: POP_DELAY_MS, easing: "ease-out", fill: "backwards" },
    );
  }, [beat]);

  useEffect(() => {
    // The light changes on her: "Hả?", then the evening or the morning it is.
    const theme = new MutationObserver(() => startle(isNight() ? "sleepy" : "grin"));
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    let seen = false;
    // Without it (old browsers) she keeps her resting face until pressed.
    const view = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      // The first sight is her resting face; every return is a new mood.
      const first = !seen;
      seen = true;
      const rest: NhiMood = isNight() ? "sleepy" : "pout";
      setMood((m) => (first ? rest : another(m)));
    });
    if (root.current) view?.observe(root.current);

    let weather = "";
    const onShow = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      weather = "";
      window.clearTimeout(clapTimer.current);
      if (detail === "start") change("grin");
      if (detail === "end") change("hug");
    };
    document.addEventListener("origin-story", onShow);

    // The thunderclap: each beat says its weather. The first beat of a run of
    // storm weather gets her "Hả?" at the instant the bolt strikes.
    const onBeat = (event: Event) => {
      const next = (event as CustomEvent<{ weather?: string }>).detail?.weather ?? "";
      const was = weather;
      weather = next;
      if (!STORMY.includes(next) || next === was) return;
      const beatMs = parseFloat(document.getElementById("tree")?.style.getPropertyValue("--beat-ms") ?? "") || BEAT_FALLBACK_MS;
      window.clearTimeout(clapTimer.current);
      // She holds it a little past the next beat's clap, so a thunderstorm
      // that turns into a hurricane is one long "Hả?", not a flicker of grins.
      clapTimer.current = window.setTimeout(() => startle("grin", beatMs * HOLD_BEATS), beatMs * CLAP_AT);
    };
    document.addEventListener("origin-story-beat", onBeat);

    return () => {
      theme.disconnect();
      view?.disconnect();
      document.removeEventListener("origin-story", onShow);
      document.removeEventListener("origin-story-beat", onBeat);
      window.clearTimeout(sayTimer.current);
      window.clearTimeout(settleTimer.current);
      window.clearTimeout(clapTimer.current);
    };
  }, [change, startle]);

  const press = () => {
    // Woken from sleep, she can only say one thing.
    const next = mood === "sleepy" ? "huh" : another(mood);
    change(next);
    // "Hả?" is its own motion (the check, above): no push on top of it.
    if (next !== "huh") push();
    setAnnounce(`${copy.moods[next].says} ${copy.name} is ${copy.moods[next].is}.`);
  };

  const { says, is } = copy.moods[mood];

  return (
    <div ref={root} data-swing="" data-grow-late="" className={cn("no-print", className)}>
      <span aria-hidden="true" data-bough="" className="pointer-events-none absolute xl:hidden">
        <Drawing name="oak-bough" className="absolute inset-0 text-[color:var(--scene-bark)] [mask-size:100%_100%]" />
        <Drawing name="oak-bough-leaves" className="absolute inset-0 text-accent [mask-size:100%_100%]" />
      </span>
      <div ref={ride} data-ride="" className="relative h-(--ride-h) origin-[50%_var(--tie)]" style={{ width: RIDE_W }}>
        <span aria-hidden="true" data-rope="left" className="absolute left-1.5 top-(--tie-l) h-[calc(var(--seat)-var(--tie-l))] w-[1.3px] bg-(--twine)" />
        <span aria-hidden="true" data-rope="right" className="absolute right-1.5 top-(--tie-r) h-[calc(var(--seat)-var(--tie-r))] w-[1.3px] bg-(--twine)" />
        <span aria-hidden="true" className="absolute inset-x-0 top-(--seat) h-1.5 rounded-[2px] bg-[color:var(--scene-bark)]" />
        <p
          ref={bubble}
          aria-hidden="true"
          data-says=""
          className={cn(
            "absolute left-1/2 top-[calc(var(--seat)-6.75rem)] -translate-x-1/2 whitespace-nowrap bg-surface px-1.5 py-0.5 font-serif text-[length:var(--step--1)] leading-tight italic text-fg transition-opacity duration-300 motion-reduce:transition-none",
            saying ? "opacity-100" : "opacity-0",
          )}
        >
          {says}
        </p>
        <button
          type="button"
          onClick={press}
          className="absolute left-1 block cursor-pointer"
          style={{ top: `calc(var(--seat) - ${NHI_SEAT_Y * SCALE}px)` }}
        >
          {/* Paper, like the tags: ink on paper in both themes. On the span,
              not the button, so the focus ring keeps the sky's colours. */}
          <span data-paper="" className="block text-fg">
            <MiniNhi mood={mood} pose="sit" scale={SCALE} beat={beat} />
          </span>
          <span className="sr-only">
            {copy.name}, {copy.action}
          </span>
        </button>
      </div>
      {/* From 1280 it sits beside the seat, under the lantern: below the swing
          is where the cats wait above Watch it grow, and right is the trunk. */}
      <p aria-hidden="true" className="mt-2 whitespace-nowrap font-serif text-[length:var(--step--1)] leading-none italic text-fg-muted xl:absolute xl:top-[calc(var(--seat)-0.75rem)] xl:right-[calc(100%+0.5rem)] xl:mt-0">
        {copy.name}, {is}
      </p>
      <p aria-live="polite" className="sr-only">
        {announce}
      </p>
    </div>
  );
}
