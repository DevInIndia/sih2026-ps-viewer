/** Minimal class-name joiner — no runtime dependency needed for this. */
export function cx(
  ...parts: (string | false | null | undefined)[]
): string {
  return parts.filter(Boolean).join(" ");
}
