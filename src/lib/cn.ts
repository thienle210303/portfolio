/**
 * Minimal class-name joiner. Deliberately not a dependency — the site has no
 * conditional-variant complexity that would justify one.
 */
export function cn(
  ...classes: Array<string | false | null | undefined>
): string {
  return classes.filter(Boolean).join(" ");
}
