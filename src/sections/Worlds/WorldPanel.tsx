import { GLYPHS, GLYPH_VIEWBOX } from "./glyphs";
import { DECORATION_LABEL, type ResolvedWorld } from "@/lib/worlds";

/**
 * One world, in words. Pure presentation — every string it renders was
 * resolved from the content layer by `src/lib/worlds.ts`, and this component
 * never composes a sentence of its own.
 *
 * The two halves are visually and semantically different on purpose: plaques
 * are a list of quotes each carrying its own source line, and decorations are
 * a row of drawings under a rule, each labelled as carrying no fact. A visitor
 * who cannot see either of them gets the same distinction from the accessible
 * names, which is the whole point of the honesty rule being in the DOM rather
 * than only in the design.
 */
export function WorldPanel({ world }: { readonly world: ResolvedWorld }) {
  return (
    <div className="mt-4 border border-rule bg-surface p-5">
      <h3 className="font-display text-[length:var(--step-2)] italic leading-tight text-[color:var(--fg)]">
        {world.name}
      </h3>
      <p className="eyebrow mt-1">{world.where}</p>

      {world.plaques.length > 0 ? (
        <ul className="mt-4 grid gap-3">
          {world.plaques.map((plaque) => (
            <li key={`${plaque.source}-${plaque.text}`} className="grid grid-cols-[1.9rem_1fr] items-start gap-3">
              <svg
                viewBox={GLYPH_VIEWBOX}
                aria-hidden="true"
                className="mt-0.5 h-6 w-6 fill-none stroke-[color:var(--fg-muted)] [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:1.1]"
              >
                <path d={GLYPHS[plaque.glyph]} />
              </svg>
              <span className="text-[length:var(--step--1)] text-[color:var(--fg-muted)]">
                {/* The quote gets its own text-node boundary, isolated from the
                    citation line below it: `getByText(plaque.text, { exact: true })`
                    (e2e/worlds.spec.ts) matches against an element's full
                    descendant text in a real browser, not just its own direct
                    text nodes — with no wrapper here, that query would always
                    see the citation's text appended to the quote's and never
                    find an exact match. */}
                <span>{plaque.text}</span>
                <span className="eyebrow mt-1 block normal-case">
                  {plaque.attribution ? `${plaque.attribution} · ` : ""}
                  plaque · {plaque.source}
                  {plaque.link ? (
                    <>
                      {" · "}
                      <a
                        href={plaque.link}
                        className="ink-link"
                        // Two of these can be open in the same world (Technology
                        // has one per case study): identical visible text is
                        // fine to look at, but identical accessible names are
                        // not — a screen reader's "list all links" gives no way
                        // to tell them apart. `plaque.attribution` is already
                        // resolved to the destination's own title whenever
                        // `plaque.link` exists (see the "project" branch of
                        // `resolvePlaque`), so naming it here composes nothing
                        // new.
                        aria-label={
                          plaque.attribution ? `see it proven — ${plaque.attribution}` : "see it proven"
                        }
                      >
                        see it proven
                      </a>
                    </>
                  ) : null}
                </span>
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {world.decorations.length > 0 ? (
        <div className="mt-4 border-t border-dashed border-rule pt-3">
          {/* The constant, never a second copy of the words. Each glyph's
              own accessible name already ends in this exact string (see
              `resolveWorlds`), so a re-typed heading here could drift out of
              step with what a screen reader is told — and this one string is
              the whole honesty rule. */}
          <p className="eyebrow">{DECORATION_LABEL}</p>
          <div className="mt-2 flex flex-wrap items-center gap-4">
            {world.decorations.map((decoration) => (
              <svg
                key={decoration.label}
                viewBox={GLYPH_VIEWBOX}
                role="img"
                aria-label={decoration.label}
                className="h-6 w-6 fill-none stroke-[color:var(--fg-subtle)] [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:1.1]"
              >
                <path d={GLYPHS[decoration.glyph]} />
              </svg>
            ))}
          </div>
        </div>
      ) : null}

      {world.disclosure ? (
        <p className="mt-3 border-l-2 border-[color:var(--accent)] pl-3 text-[length:var(--step--1)] text-[color:var(--accent)]">
          {world.disclosure}
        </p>
      ) : null}
    </div>
  );
}

export default WorldPanel;
