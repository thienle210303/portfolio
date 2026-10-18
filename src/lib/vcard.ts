import { profile, socialLinks, SITE_URL } from "@/content/portfolio";

// RFC 6350 §3.4 text escaping; backslash first so it doesn't double-escape the rest.
const esc = (s: string) => s.replace(/[\\,;]/g, "\\$&");

export function buildVCard(p = profile, links = socialLinks, site = SITE_URL): string {
  const words = p.name.trim().split(/\s+/);
  const family = words.length > 1 ? words.pop()! : "";
  const [locality, ...region] = p.location.split(",").map((s) => s.trim());
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${esc(p.name)}`,
    `N:${esc(family)};${esc(words.join(" "))};;;`,
    `TITLE:${esc(p.title)}`,
    `EMAIL;TYPE=INTERNET:${esc(p.email)}`,
    `ADR;TYPE=HOME:;;;${esc(locality)};${esc(region.join(", "))};;`,
    `URL:${site}`,
    ...links.filter((l) => l.href.startsWith("https://")).map((l) => `URL:${l.href}`),
    "END:VCARD",
  ];
  return lines.join("\r\n") + "\r\n";
}
