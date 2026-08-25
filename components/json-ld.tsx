/**
 * Renders a JSON-LD block.
 *
 * Search engines read the contents of this script as raw text, so React's
 * normal escaping would corrupt it — `<` would arrive as `&lt;`. It therefore
 * has to go through `dangerouslySetInnerHTML`, and the one real hazard of doing
 * so is closed off explicitly: a scraped title containing `</script>` would end
 * the block early and let the rest of the string be parsed as markup, so every
 * `<` is escaped to its `<` form. JSON parses that back to `<`, so
 * consumers still see the original text.
 *
 * This and the fixed theme-bootstrap literal in app/layout.tsx are the only two
 * uses of `dangerouslySetInnerHTML` in the codebase.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
