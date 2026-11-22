import { ImageResponse } from "next/og";
import type { CSSProperties } from "react";
import { profile } from "@/content/portfolio";
import { SHARE_IMAGE, SHARE_TICKET } from "@/lib/seo";
import { drawing, font } from "@/lib/share-image";

export const alt = SHARE_IMAGE.alt;
export const size = { width: SHARE_IMAGE.width, height: SHARE_IMAGE.height };
export const contentType = "image/png";

/*
 * The card a link to the site shows before anyone clicks (round 31, board B:
 * design/round-31-front-door/v1/boards/share-card.html). The morning sky; a
 * line strung between a bamboo pole and a pine that both stand in the bank;
 * the oak's DoorDash ticket hanging from it; the h1 with my name as its label.
 *
 * It is an image, so the site's aliases don't exist here: every colour is a
 * literal named for its day token (the-pass allows this file), and only
 * pairings docs/contrast.md already measures are used.
 */
const INK = "#1d2321"; // --color-ink
const MUTED = "#56605a"; // --color-muted
const MOSS = "#46603a"; // --color-moss: the day's text-accent, which paints bamboo, pine and grass
const TWINE = "#8b7b5e"; // --color-twine
const KRAFT_INK = "#4a4f45"; // --color-kraft-muted, the tag's own muted ink
const TAG = "#e5d4ab"; // color-mix(--color-kraft 80%, --color-manila): TAG_LOOKS[0]

const [extraBold, bold, regular, mono, monoBold] = await Promise.all([
  font("BricolageGrotesque96pt-ExtraBold.ttf"),
  font("BricolageGrotesque96pt-Bold.ttf"),
  font("BricolageGrotesque12pt-Regular.ttf"),
  font("CourierPrime-Regular.ttf"),
  font("CourierPrime-Bold.ttf"),
]);
const [sky, pine, crown, stem, sprig, sprigB, tuft, grass, hat] = await Promise.all([
  drawing("sky-day"),
  drawing("pine", MOSS),
  drawing("bamboo-top", MOSS),
  drawing("bamboo-stem", MOSS),
  drawing("bamboo-sprig", MOSS),
  drawing("bamboo-sprig-b", MOSS),
  drawing("bamboo-tuft", MOSS),
  drawing("bank-grass", MOSS),
  drawing("non-la"),
]);

/** The line: from the bamboo's tie to the pine's trunk, sagging between. */
const LINE = { from: [72, 73], via: [600, 250], to: [1130, 63] } as const;
const along = (t: number, i: 0 | 1) =>
  (1 - t) ** 2 * LINE.from[i] + 2 * t * (1 - t) * LINE.via[i] + t ** 2 * LINE.to[i];
/** The line's height above `x`, so each string drops straight to its eyelet. */
function lineAt(x: number): number {
  let lo = 0;
  let hi = 1;
  for (let n = 0; n < 40; n++) {
    const mid = (lo + hi) / 2;
    if (along(mid, 0) < x) lo = mid;
    else hi = mid;
  }
  return along(lo, 1);
}

const TICKET = { left: 700, top: 214, width: 344, eyes: [0.25, 0.75] } as const;
const EYE_Y = TICKET.top + 22;

/** The h1 breaks after its comma, then once more, as on the board. */
const comma = profile.headline.indexOf(", ");
const headLead = comma === -1 ? "" : profile.headline.slice(0, comma + 1);
const headRest = comma === -1 ? profile.headline : profile.headline.slice(comma + 2);

const abs = (style: CSSProperties): CSSProperties => ({ position: "absolute", display: "flex", ...style });

function DateStamp({ year, turn }: { readonly year: string; readonly turn: number }) {
  return (
    <span
      style={{
        fontFamily: "Courier Prime",
        fontWeight: 700,
        fontSize: 17,
        letterSpacing: 1.4,
        color: KRAFT_INK,
        border: `2px solid ${KRAFT_INK}`,
        borderRadius: 4,
        padding: "4px 7px 3px",
        transform: `rotate(${turn}deg)`,
      }}
    >
      {year}
    </span>
  );
}

const value: CSSProperties = { fontWeight: 700, fontSize: 64, letterSpacing: -1.3, whiteSpace: "nowrap", lineHeight: 1 };
const what: CSSProperties = { fontWeight: 400, fontSize: 23, marginTop: 8, lineHeight: 1 };

export default function Image() {
  const { name, run, agent } = SHARE_TICKET;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          overflow: "hidden",
          // --sky by day: --color-morning-high, --color-morning, --color-morning-low
          backgroundImage: "linear-gradient(180deg, #dce6e2 0%, #e4eae1 45%, #ecece2 100%)",
          color: INK,
          fontFamily: "Bricolage Grotesque",
        }}
      >
        <img src={sky} width={1200} height={750} alt="" style={abs({ left: 0, top: 0 })} />
        {/* The pine at 0.8 of its drawing: its trunk 77 in, the line tied on 39 down; it runs on below the bank. */}
        <img src={pine} width={144} height={2016} alt="" style={abs({ left: 1053, top: 24 })} />
        {/* The bamboo at 1.15 (Yard.tsx's pieces), mirrored so its crown leans into the card. */}
        <div
          style={abs({
            left: -24.6,
            top: 34,
            width: 112.7,
            height: 574,
            transform: "scaleX(-1)",
            transformOrigin: "96.6px 0",
          })}
        >
          <img src={crown} width={112.7} height={240.4} alt="" style={abs({ left: 0, top: 0 })} />
          <div style={abs({ left: 82.8, top: 238.4, width: 27.6, height: 335.6, overflow: "hidden", flexDirection: "column" })}>
            <img src={stem} width={27.6} height={248.4} alt="" />
            <img src={stem} width={27.6} height={248.4} alt="" />
          </div>
          <img src={sprig} width={48.3} height={46} alt="" style={abs({ left: 43.7, top: 319.7 })} />
          <img src={sprigB} width={48.3} height={46} alt="" style={abs({ left: 43.7, top: 506 })} />
        </div>
        <svg aria-hidden="true" width="1200" height="630" viewBox="0 0 1200 630" style={abs({ left: 0, top: 0 })}>
          <path
            d={`M${LINE.from.join(" ")} Q${LINE.via.join(" ")} ${LINE.to.join(" ")}`}
            fill="none"
            stroke={TWINE}
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          {TICKET.eyes.map((at) => {
            const x = TICKET.left + TICKET.width * at;
            return (
              <path
                key={at}
                d={`M${x} ${lineAt(x)} L${x} ${EYE_Y}`}
                fill="none"
                stroke={TWINE}
                strokeWidth="2"
                strokeLinecap="round"
              />
            );
          })}
        </svg>
        <img src={hat} width={108} height={117} alt="" style={abs({ left: 41, top: 128 })} />

        <div
          style={abs({
            left: TICKET.left,
            top: TICKET.top,
            width: TICKET.width,
            flexDirection: "column",
            transform: "rotate(-1.5deg)",
            transformOrigin: "50% 0",
          })}
        >
          <div
            style={{
              display: "flex",
              position: "relative",
              flexDirection: "column",
              backgroundColor: TAG,
              padding: "42px 22px 16px",
              clipPath: `polygon(16px 0, ${TICKET.width - 16}px 0, ${TICKET.width}px 16px, ${TICKET.width}px 100%, 0 100%, 0 16px)`,
            }}
          >
            {/* Brass eyelets (twine mixed 85% with black, 55% with manila) round the sky
                seen through the hole; circles, since Satori squares off a rounded box's shadow. */}
            <svg
              aria-hidden="true"
              width={TICKET.width}
              height={40}
              viewBox={`0 0 ${TICKET.width} 40`}
              style={{ position: "absolute", left: 0, top: 0 }}
            >
              {TICKET.eyes.map((at) => (
                <g key={at}>
                  <circle cx={TICKET.width * at} cy={EYE_Y - TICKET.top} r={14} fill="#766950" />
                  <circle cx={TICKET.width * at} cy={EYE_Y - TICKET.top} r={12} fill="#b9ab8e" />
                  <circle cx={TICKET.width * at} cy={EYE_Y - TICKET.top} r={8} fill="#e0e8e2" />
                </g>
              ))}
            </svg>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontWeight: 700, fontSize: 24 }}>{name}</span>
              <DateStamp year={run.year} turn={-3} />
            </div>
            <span style={{ ...value, marginTop: 4 }}>{run.value}</span>
            <span style={what}>{run.label}</span>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              backgroundColor: TAG,
              padding: "16px 22px 22px",
              borderTop: "2px dashed rgba(74, 79, 69, 0.45)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={value}>{agent.value}</span>
              <DateStamp year={agent.year} turn={4} />
            </div>
            {agent.measure ? (
              <span style={{ fontFamily: "Courier Prime", fontSize: 19, color: KRAFT_INK, marginTop: 6, whiteSpace: "nowrap" }}>
                {agent.measure}
              </span>
            ) : null}
            <span style={what}>{agent.label}</span>
          </div>
        </div>

        <div style={abs({ left: 0, top: 594, width: 1200, height: 36 })}>
          <img src={grass} width={504} height={36} alt="" />
          <img src={grass} width={504} height={36} alt="" />
          <img src={grass} width={504} height={36} alt="" />
        </div>
        <img src={tuft} width={82.8} height={39.1} alt="" style={abs({ left: 30.6, top: 589 })} />

        <div style={abs({ left: 186, top: 232, width: 510, flexDirection: "column" })}>
          <span
            style={{
              fontFamily: "Courier Prime",
              fontWeight: 700,
              fontSize: 21,
              letterSpacing: 3.4,
              color: MUTED,
              textTransform: "uppercase",
              marginBottom: 18,
            }}
          >
            {`${profile.name} · ${profile.title}`}
          </span>
          <div style={{ display: "flex", flexDirection: "column", fontWeight: 800, fontSize: 64, lineHeight: 1.02, letterSpacing: -1.6 }}>
            {headLead ? <span style={{ whiteSpace: "nowrap" }}>{headLead}</span> : null}
            <span style={{ width: 340 }}>{headRest}</span>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Bricolage Grotesque", data: extraBold, weight: 800, style: "normal" },
        { name: "Bricolage Grotesque", data: bold, weight: 700, style: "normal" },
        { name: "Bricolage Grotesque", data: regular, weight: 400, style: "normal" },
        { name: "Courier Prime", data: mono, weight: 400, style: "normal" },
        { name: "Courier Prime", data: monoBold, weight: 700, style: "normal" },
      ],
    },
  );
}
