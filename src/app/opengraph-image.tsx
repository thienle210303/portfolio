import { ImageResponse } from "next/og";
import { profile } from "@/content/portfolio";

export const alt = `${profile.name} — ${profile.title}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Typographic and restrained, matching the site's own art direction:
// near-black background, warm off-white text, a single hairline rule.
// No gradients, no colour beyond the site's own palette tokens, and no
// custom font fetch — the build may have no network egress, so this
// relies only on the default font ImageResponse ships with.
export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#080808",
          color: "#F3F1EB",
          padding: 80,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div
            style={{
              display: "flex",
              fontSize: 22,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "#969691",
            }}
          >
            {profile.title}
          </div>
          <div style={{ display: "flex", width: "100%", height: 1, backgroundColor: "#2A2A2A" }} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ display: "flex", fontSize: 76, lineHeight: 1.05, letterSpacing: "-0.02em" }}>
            {profile.name}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 30,
              lineHeight: 1.4,
              maxWidth: 920,
              color: "#AAA9A3",
            }}
          >
            {profile.positioning}
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
