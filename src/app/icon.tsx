import { ImageResponse } from "next/og";
import { profile } from "@/content/portfolio";
import { font } from "@/lib/share-image";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

const extraBold = await font("BricolageGrotesque96pt-ExtraBold.ttf");

// The header's TL tag as paper with an ink edge (round 31), so it reads on a
// light tab bar and a dark one. Literals: an image has no aliases.
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#fbfbf8", // --color-paper
          border: "1.5px solid #1d2321", // --color-ink
          borderRadius: 7,
          color: "#1d2321",
          fontFamily: "Bricolage Grotesque",
          fontWeight: 800,
          fontSize: 17,
          letterSpacing: -0.7,
        }}
      >
        {profile.monogram}
      </div>
    ),
    { ...size, fonts: [{ name: "Bricolage Grotesque", data: extraBold, weight: 800, style: "normal" }] },
  );
}
