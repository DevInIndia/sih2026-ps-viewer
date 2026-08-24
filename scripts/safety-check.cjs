/*
 * Safety regression checks for the sanitising helpers.
 *
 * Run with: npm run test:safety
 *
 * These cover the guarantees the UI depends on — that a hostile value in the
 * scraped dataset cannot become a link, a script, or a runaway regex.
 */
const { unmangle, decodeEntities, toProse } = require("../.next/testbuild/text.js");
const { parseQuery, highlightPattern } = require("../.next/testbuild/query.js");
const { safeHref, toSegments, toLinkItems } = require("../.next/testbuild/safe-url.js");

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
// A query is user input compiled into a regex, so it is bounded and escaped.
// Behavioural coverage of the same code lives in scripts/filter-tests.cjs.
const hl = (q) => {
  const p = highlightPattern(parseQuery(q).terms);
  return p && new RegExp(p.source, p.flags);
};
check("terms capped", parseQuery("a b c d e f g h i j k l m n o").terms.length, 12);
check("term length capped", parseQuery("x".repeat(300)).terms[0].value.length, 64);
check("query length capped", parseQuery("y".repeat(500)).terms[0].value.length <= 64, true);
check("regex metachars escaped", hl(".*").test("ordinary words"), false);
check("metachars match literally", hl(".*").test("a literal .* here"), true);
check("catastrophic pattern is literal", hl("(a+)+$").test("a".repeat(24)), false);
check("literal match still works", hl("(a+)+$").test("x (a+)+$ y"), true);
check("empty query builds no pattern", highlightPattern(parseQuery("").terms), null);

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
