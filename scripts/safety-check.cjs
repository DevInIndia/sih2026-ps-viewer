/*
 * Safety regression checks for the sanitising helpers.
 *
 * Run with: npm run test:safety
 *
 * These cover the guarantees the UI depends on — that a hostile value in the
 * scraped dataset cannot become a link, a script, or a runaway regex.
 */
const { unmangle, decodeEntities, toProse, tokenize, highlightPattern } = require("../.next/safety/text.js");
const { safeHref, toSegments, toLinkItems } = require("../.next/safety/safe-url.js");

const rows = [];
const check = (name, actual, expected) => {
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  rows.push(`${pass ? "PASS" : "FAIL"}  ${name}\n        got: ${JSON.stringify(actual)}`);
  if (!pass) rows.push(`        want: ${JSON.stringify(expected)}`);
};

// --- URL scheme allow-listing -------------------------------------------
check("javascript: refused", safeHref("javascript:alert(1)"), null);
check("JaVaScRiPt: refused", safeHref("JaVaScRiPt:alert(1)"), null);
check("data:text/html refused", safeHref("data:text/html,<script>alert(1)</script>"), null);
check("vbscript: refused", safeHref("vbscript:msgbox(1)"), null);
check("file: refused", safeHref("file:///C:/Windows/win.ini"), null);
check("credentials refused", safeHref("https://user:pass@evil.example/"), null);
check("no-dot host refused", safeHref("https://localhost"), null);
check("https kept", safeHref("https://sih.gov.in/x?a=1"), "https://sih.gov.in/x?a=1");
check("bare domain upgraded", safeHref("tkdl.res.in"), "https://tkdl.res.in/");
check("over-long refused", safeHref("https://a.example/" + "x".repeat(4000)), null);

// --- a hostile dataset_link cell ----------------------------------------
const hostile =
  '<img src=x onerror=alert(1)><br> &#8226; <a href="javascript:alert(2)">click</a><br> &#8226; ok: https://data.gov.in/set';
const cleaned = unmangle(hostile);
check("tags stripped from blob", /</.test(cleaned), false);
const items = toLinkItems(cleaned);
const hrefs = items.flatMap((i) => i.segments.filter((s) => s.kind === "link").map((s) => s.href));
check("only the safe URL becomes a link", hrefs, ["https://data.gov.in/set"]);

// --- entity decoding is a pure string transform -------------------------
check("script entity stays text", decodeEntities("&lt;script&gt;"), "<script>");
check("bad codepoint left alone", decodeEntities("&#1114112;"), "&#1114112;");
check("surrogate refused", decodeEntities("&#xD800;"), "&#xD800;");
check("bullet decoded", decodeEntities("&#8226;"), "\u2022");
check("hex decoded", decodeEntities("&#x2014;"), "\u2014");

// --- query handling ------------------------------------------------------
check("terms capped at 8", tokenize("a b c d e f g h i j k").length, 8);
check("term length capped", tokenize("x".repeat(200))[0].length, 64);
check("regex metachars escaped", highlightPattern(tokenize(".*")).source, "(\\.\\*)");
check("single chars ignored", highlightPattern(tokenize("a b")), null);
check("catastrophic pattern is literal", highlightPattern(tokenize("(a+)+$")).test("aaaa"), false);
check("literal match still works", highlightPattern(tokenize("(a+)+$")).test("x(a+)+$y"), true);

// --- prose never yields markup ------------------------------------------
const prose = toProse("Background:\n<script>alert(1)</script>\n\u2022 one\n\u2022 two");
check("no markup survives prose", JSON.stringify(prose).includes("<"), false);
check("heading detected", prose[0], { kind: "heading", text: "Background" });
check("bullets grouped", prose[prose.length - 1].kind, "list");

console.log(rows.join("\n"));

const passed = rows.filter((r) => r.startsWith("PASS")).length;
const failed = rows.filter((r) => r.startsWith("FAIL")).length;
console.log(`\n${passed} passed, ${failed} failed`);
process.exitCode = failed === 0 ? 0 : 1;
