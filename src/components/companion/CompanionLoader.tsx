"use client";

import { useEffect, useState, type ComponentType } from "react";
import type { CompanionFacts } from "@/lib/companion-facts";

type CompanionComponent = ComponentType<{ facts: CompanionFacts }>;

// Keeps the cats' chunk out of the initial bundle: it is fetched only once
// the browser is idle. A plain import() in an effect, not next/dynamic —
// `ssr: false` is not allowed in a server layout.
export default function CompanionLoader({ facts }: { facts: CompanionFacts }) {
  const [Companion, setCompanion] = useState<CompanionComponent | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      import("./Companion")
        .then((module) => {
          if (!cancelled) setCompanion(() => module.default);
        })
        .catch(() => {
          // Silent: the cats are decoration; the page is whole without them.
        });
    };

    if (typeof requestIdleCallback === "function") {
      const id = requestIdleCallback(load, { timeout: 2000 });
      return () => {
        cancelled = true;
        cancelIdleCallback(id);
      };
    }
    const id = setTimeout(load, 1200);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, []);

  return Companion ? <Companion facts={facts} /> : null;
}
