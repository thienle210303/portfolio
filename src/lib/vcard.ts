import { profile, socialLinks, SITE_URL } from "@/content/portfolio";

// RFC 6350 §3.4 text escaping. Newlines go second, so the backslash in their
// `\n` is not itself escaped; a bare newline would end the property mid-value.
const esc = (s: string) => s.replace(/[\\,;]/g, "\\$&").replace(/\r\n|[\r\n]/g, "\\n");

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
