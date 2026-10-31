"use client";

import { useEffect, useRef, useState } from "react";
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

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const isNight = () => document.documentElement.dataset.theme === "night";

function another(mood: NhiMood): NhiMood {
  const rest = NHI_MOODS.filter((m) => m !== mood);
  return rest[Math.floor(Math.random() * rest.length)];
}

export default function NhiSwing({ copy, className }: { readonly copy: JourneyCopy["swing"]; readonly className?: string }) {
  // Pouting is her resting face by day, sleepy by night (set the first time
  // she is seen: the server cannot know the theme).
  const [mood, setMood] = useState<NhiMood>("pout");
  const [saying, setSaying] = useState(false);
  const [announce, setAnnounce] = useState("");
  const ride = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const sayTimer = useRef(0);

  const change = (next: NhiMood) => {
    setMood(next);
    setSaying(true);
    window.clearTimeout(sayTimer.current);
    sayTimer.current = window.setTimeout(() => setSaying(false), SAYS_MS);
  };

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

  useEffect(() => {
    const theme = new MutationObserver(() => change(isNight() ? "sleepy" : "grin"));
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

    const onShow = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      if (detail === "start") change("grin");
      if (detail === "end") change("hug");
    };
    document.addEventListener("origin-story", onShow);

    return () => {
      theme.disconnect();
      view?.disconnect();
      document.removeEventListener("origin-story", onShow);
      window.clearTimeout(sayTimer.current);
    };
  }, []);

  const press = () => {
    const next = another(mood);
    change(next);
    push();
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
            <MiniNhi mood={mood} pose="sit" scale={SCALE} />
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
