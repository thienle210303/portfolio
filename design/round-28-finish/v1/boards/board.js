// A board opens in day; ?theme=night stamps the site's own attribute, and
// ?pins=off hides the numbered change pins (for a clean preview).
const params = new URLSearchParams(location.search);
if (params.get("theme") === "night") document.documentElement.dataset.theme = "night";
else document.documentElement.dataset.theme = "day";
if (params.get("pins") === "off") document.documentElement.dataset.pins = "off";

// Anything drawn as paper carries the site's `data-paper`, so tokens.css
// repoints its ink at night exactly as the site does for `.bg-surface`.
document.addEventListener("DOMContentLoaded", () => {
  for (const node of document.querySelectorAll(".paper, .tag, .hdr > *, .tabs span, .try span")) {
    node.setAttribute("data-paper", "");
  }
});
