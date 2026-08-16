import { ImageResponse } from "next/og";
import { profile } from "@/content/portfolio";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

// The TL monogram, off-white on near-black — same two tokens as the rest
// of the site's dark chrome, at favicon scale.
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
          backgroundColor: "#080808",
          color: "#F3F1EB",
          fontSize: 18,
          fontWeight: 700,
          letterSpacing: "-0.02em",
        }}
      >
        {profile.monogram}
      </div>
    ),
    { ...size }
  );
}
