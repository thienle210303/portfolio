import { ImageResponse } from "next/og";
import { profile } from "@/content/portfolio";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// The favicon's TL monogram at the size a phone puts on its home screen
// (icon.tsx has the 32px one). Same two colours; iOS rounds the corners.
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
          backgroundColor: "#080808",
          color: "#F3F1EB",
          fontSize: 92,
          fontWeight: 700,
          letterSpacing: "-0.02em",
        }}
      >
        {profile.monogram}
      </div>
    ),
    { ...size },
  );
}
