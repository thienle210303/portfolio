import { ImageResponse } from "next/og";
import { profile } from "@/content/portfolio";
import { font } from "@/lib/share-image";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const extraBold = await font("BricolageGrotesque96pt-ExtraBold.ttf");

// The favicon's paper TL tag at the size a phone puts on its home screen
// (icon.tsx has the 32px one). iOS cuts its own rounded corners and shows any
// transparency as black, so the paper fills the square and the ink edge sits
// inside it, clear of that cut.
export default function AppleIcon() {
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
        }}
      >
        <div
          style={{
            width: 160,
            height: 160,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "5px solid #1d2321", // --color-ink
            borderRadius: 32,
            color: "#1d2321",
            fontFamily: "Bricolage Grotesque",
            fontWeight: 800,
            fontSize: 86,
            letterSpacing: -3.4,
          }}
        >
          {profile.monogram}
        </div>
      </div>
    ),
    { ...size, fonts: [{ name: "Bricolage Grotesque", data: extraBold, weight: 800, style: "normal" }] },
  );
}
