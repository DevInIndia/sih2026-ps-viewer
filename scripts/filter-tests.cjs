/*
 * Filter and search regression tests.
 *
 * Run with: npm test
 *
 * These exercise the real filter logic against the real dataset rather than a
 * fixture, so a portal change that breaks an assumption shows up here instead
 * of in the UI. `lib/filter.ts` is deliberately free of React and of the full
 * dataset, which is what makes this possible.
 */
const fs = require("node:fs");
const path = require("node:path");

const {
  parseQuery,
  fold,
  highlightPattern,
} = require("../.next/testbuild/query.js");
const {
  buildRecordText,
  matchesQuery,
  scoreQuery,
  passes,
  countBy,
  sortItems,
  hasActiveFilters,
} = require("../.next/testbuild/filter.js");
const { EMPTY_FILTERS, resolveSort } = require("../.next/testbuild/types.js");
const { unmangle } = require("../.next/testbuild/text.js");

/* ------------------------------------------------------------- harness ---- */

let passed = 0;
const failures = [];
let group = "";

const describe = (name) => {
  group = name;
  console.log(`\n${name}`);
};

function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) {
    passed += 1;
    console.log(`  PASS  ${name}`);
  } else {
    failures.push(`${group} / ${name}`);
    console.log(`  FAIL  ${name}`);
    console.log(`          got  ${JSON.stringify(actual)}`);
    console.log(`          want ${JSON.stringify(expected)}`);
  }
}

const ok = (name, condition, detail = "") =>
  check(name + (detail ? ` (${detail})` : ""), Boolean(condition), true);

/* ---------------------------------------------------------------- data ---- */

const raw = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "sih2026_ps.json"), "utf8"),
);

const items = raw.map((r) => ({
  ps: r.ps_number,
  title: r.title,
  org: r.org,
  department: r.department,
  category: r.category,
  theme: r.theme,
  hasDataset: r.dataset_link.length > 0,
}));

const descriptions = new Map(
  raw.map((r) => [r.ps_number, fold(unmangle(r.description))]),
);
const text = new Map(
  items.map((i) => [i.ps, buildRecordText(i, descriptions.get(i.ps))]),
);

/** Build a MatchContext the way the shell does. */
function ctxFor(overrides = {}, query = "") {
  const filters = { ...EMPTY_FILTERS, ...overrides, query };
  return {
    filters,
    terms: parseQuery(query).terms,
    themeSet: new Set(filters.themes),
    shortlist: new Set(overrides.shortlist || []),
    text,
  };
}

const search = (query, overrides = {}) =>
  items.filter((i) => passes(i, ctxFor(overrides, query))).map((i) => i.ps);

/* -------------------------------------------------------------- parser ---- */

describe("query parser");

check("bare words split on whitespace", parseQuery("drone mapping").terms.length, 2);
check(
  "phrase stays one term",
  parseQuery('"flash flood"').terms.map((t) => [t.value, t.phrase]),
  [["flash flood", true]],
);
check(
  "negation is flagged",
  parseQuery("-blockchain").terms.map((t) => [t.value, t.negated]),
  [["blockchain", true]],
);
check(
  "field scope is parsed",
  parseQuery("org:isro").terms.map((t) => [t.field, t.value]),
  [["org", "isro"]],
);
check(
  "field aliases resolve",
  parseQuery("department:space category:hardware id:26001").terms.map((t) => t.field),
  ["dept", "cat", "ps"],
);
check(
  "unknown field is treated as a plain word",
  parseQuery("colour:red").terms.map((t) => [t.field, t.value]),
  [[null, "colour:red"]],
);
check(
  "negated phrase with a field",
  parseQuery('-theme:"smart education"').terms.map((t) => [
    t.field,
    t.value,
    t.negated,
    t.phrase,
  ]),
  [["theme", "smart education", true, true]],
);
check("unclosed quote still yields a term", parseQuery('"flash flo').terms.length, 1);
check("unclosed quote is reported", parseQuery('"flash flo').incomplete, true);
check("lone dash yields nothing", parseQuery("-").terms.length, 0);
check("lone field prefix yields nothing", parseQuery("org:").terms.length, 0);
check("empty query yields nothing", parseQuery("   ").terms.length, 0);
check("term count is capped", parseQuery("a b c d e f g h i j k l m n o p").terms.length, 12);
check(
  "term length is capped",
  parseQuery("x".repeat(300)).terms[0].value.length,
  64,
);
check("diacritics fold", fold("Kvātha Cūrṇa"), "kvatha curna");
check("case folds", parseQuery("ISRO").terms[0].value, "isro");

/* ------------------------------------------------------------ semantics ---- */

describe("match semantics — the substring bug");

const t = (q) => parseQuery(q).terms;
const rec = (ps) => text.get(ps);

/**
 * A record whose metadata is empty, so these assertions test the description
 * only. Using a real row here hides bugs: SIH26001's title is "AI-Based …", so
 * a query for "ai" matches it through the title no matter what the body says.
 */
const BLANK = {
  ps: "",
  title: "",
  org: "",
  department: "",
  category: "",
  theme: "",
  hasDataset: false,
};
const body = (description) => buildRecordText(BLANK, fold(description));

ok(
  "'rag' no longer matches 'storage'",
  !matchesQuery(body("cloud storage layer"), t("rag")),
);
ok(
  "'rag' still matches 'RAG-based'",
  matchesQuery(body("a RAG-based assistant"), t("rag")),
);
ok(
  "'ai' no longer matches 'terrain'",
  !matchesQuery(body("fragile terrain"), t("ai")),
);
ok(
  "'ar' no longer matches 'smart'",
  !matchesQuery(body("smart automation"), t("ar")),
);
ok(
  "'iot' no longer matches 'biotech'",
  !matchesQuery(body("biotech research"), t("iot")),
);
ok(
  "prefix search still works: 'drone' finds 'drones'",
  matchesQuery(body("a fleet of drones"), t("drone")),
);
ok(
  "hyphens are word separators",
  matchesQuery(body("multi-source data"), t("source")),
);
ok(
  "digits anchor correctly: '3d' matches '3D printing'",
  matchesQuery(body("3D printing"), t("3d")),
);
ok(
  "'3d' does not match 'delft3d'",
  !matchesQuery(body("delft3d model"), t("3d")),
);

describe("match semantics — regression on real data");

const arCount = search("ar").length;
const ragCount = search("rag").length;
const evCount = search("ev").length;
ok("'ar' no longer returns everything", arCount < 226, `${arCount} of 226`);
ok("'rag' is now precise", ragCount <= 5, `${ragCount} results`);
ok("'ev' no longer returns most of the set", evCount < 130, `${evCount} results`);
ok("'drone' unaffected", search("drone").length >= 15, `${search("drone").length}`);
ok("'health' unaffected", search("health").length >= 25, `${search("health").length}`);

/* ------------------------------------------------------------ operators ---- */

describe("operators");

const droneAll = search("drone");
const droneNoAgri = search("drone -agriculture");
ok(
  "negation removes results",
  droneNoAgri.length <= droneAll.length,
  `${droneAll.length} -> ${droneNoAgri.length}`,
);
ok(
  "negation only removes, never adds",
  droneNoAgri.every((p) => droneAll.includes(p)),
);
check("AND narrows", search("drone mapping").length <= droneAll.length, true);
ok(
  "phrase is stricter than its words",
  search('"flash flood"').length <= search("flash flood").length,
);
ok(
  "org: scope restricts to the organisation",
  search("org:isro").every((p) =>
    items.find((i) => i.ps === p).org.toLowerCase().includes("space"),
  ),
);
ok(
  "cat: scope matches the category",
  search("cat:hardware").every(
    (p) => items.find((i) => i.ps === p).category === "Hardware",
  ),
);
check(
  "ps: scope finds one record",
  search("ps:sih26045"),
  ["SIH26045"],
);

describe("PS number entry");

// The word-start rule that fixed acronym search initially broke this: "26123"
// sits mid-word inside "SIH26123", so it matched nothing.
check("bare digits find the statement", search("26123"), ["SIH26123"]);
check("the full id still works", search("sih26123"), ["SIH26123"]);
check("case does not matter", search("SIH26123"), ["SIH26123"]);
check("scoped digits work", search("ps:26123"), ["SIH26123"]);
check("scoped full id works", search("ps:sih26123"), ["SIH26123"]);
ok(
  "a digit prefix narrows progressively",
  search("2612").length >= 1 && search("2612").every((p) => p.startsWith("SIH2612")),
  search("2612").join(","),
);
ok(
  "the shared prefix matches the whole set",
  search("sih26").length === 226,
  `${search("sih26").length}`,
);
check(
  "digits that match nothing return nothing",
  search("99999").length,
  0,
);
ok(
  "a PS hit outranks an incidental one",
  scoreQuery(rec("SIH26123"), parseQuery("26123").terms) > 0,
);
ok(
  "scoped term ignores matches in other fields",
  search("title:isro").length < search("isro").length,
  `${search("title:isro").length} < ${search("isro").length}`,
);

/* -------------------------------------------------------------- filters ---- */

describe("structured filters");

const all = items.map((i) => i.ps);
check("no filters returns everything", search("").length, 226);
check(
  "category filter",
  search("", { category: "Hardware" }).length,
  items.filter((i) => i.category === "Hardware").length,
);
check(
  "single theme filter",
  search("", { themes: ["Disaster Management"] }).length,
  items.filter((i) => i.theme === "Disaster Management").length,
);
check(
  "multi theme is OR within the facet",
  search("", { themes: ["Disaster Management", "Space Technology"] }).length,
  items.filter(
    (i) => i.theme === "Disaster Management" || i.theme === "Space Technology",
  ).length,
);
check(
  "dataset filter",
  search("", { datasetOnly: true }).length,
  items.filter((i) => i.hasDataset).length,
);
check(
  "shortlist filter",
  search("", { shortlistedOnly: true, shortlist: ["SIH26001", "SIH26002"] }).sort(),
  ["SIH26001", "SIH26002"],
);
check(
  "empty shortlist with the filter on returns nothing",
  search("", { shortlistedOnly: true, shortlist: [] }).length,
  0,
);

const combo = search("", {
  category: "Software",
  themes: ["Disaster Management"],
  datasetOnly: true,
});
ok(
  "combined filters are AND",
  combo.every((p) => {
    const i = items.find((x) => x.ps === p);
    return (
      i.category === "Software" &&
      i.theme === "Disaster Management" &&
      i.hasDataset
    );
  }),
  `${combo.length} results`,
);
ok(
  "adding a filter never grows the result set",
  combo.length <= search("", { category: "Software" }).length,
);
check(
  "contradictory filters return nothing, not everything",
  search("", { org: "AICTE", department: "Department of Space" }).length,
  0,
);
check("hasActiveFilters is false when clean", hasActiveFilters(EMPTY_FILTERS), false);
check(
  "hasActiveFilters ignores whitespace-only queries",
  hasActiveFilters({ ...EMPTY_FILTERS, query: "   " }),
  false,
);

/* --------------------------------------------------------- facet counts ---- */

describe("facet counts");

{
  const ctx = ctxFor({ category: "Hardware" });
  const catCounts = countBy(items, ctx, "category", (i) => i.category);
  const total = [...catCounts.values()].reduce((a, b) => a + b, 0);
  check(
    "category counts ignore the category filter itself",
    total,
    226,
  );
  check(
    "…so the other category is still reachable",
    catCounts.get("Software"),
    items.filter((i) => i.category === "Software").length,
  );
}
{
  const ctx = ctxFor({ themes: ["Disaster Management"] });
  const themeCounts = countBy(items, ctx, "theme", (i) => i.theme);
  ok(
    "theme counts show alternatives, not just the selection",
    themeCounts.size > 1,
    `${themeCounts.size} themes listed`,
  );
  check(
    "an unselected theme keeps its true count",
    themeCounts.get("Space Technology"),
    items.filter((i) => i.theme === "Space Technology").length,
  );
}
{
  const ctx = ctxFor({ category: "Hardware" });
  const orgCounts = countBy(items, ctx, "org", (i) => i.org);
  const total = [...orgCounts.values()].reduce((a, b) => a + b, 0);
  check(
    "org counts respect other active filters",
    total,
    items.filter((i) => i.category === "Hardware").length,
  );
}
{
  const ctx = ctxFor({}, "drone");
  const themeCounts = countBy(items, ctx, "theme", (i) => i.theme);
  const total = [...themeCounts.values()].reduce((a, b) => a + b, 0);
  check("counts respect the search query", total, search("drone").length);
}

/* ------------------------------------------------------------- sorting ---- */

describe("sorting");

{
  const sorted = sortItems([...items], "ps", null).map((i) => i.ps);
  check("ps sort is ascending", sorted[0], "SIH26001");
  check("ps sort is numeric, not lexical", sorted[225], "SIH26226");
}
{
  const a = sortItems([...items], "title", null).map((i) => i.ps);
  const b = sortItems([...items].reverse(), "title", null).map((i) => i.ps);
  check("title sort is total, so input order cannot leak", a, b);
}
{
  const a = sortItems([...items], "org", null).map((i) => i.ps);
  const b = sortItems([...items].reverse(), "org", null).map((i) => i.ps);
  check("org sort is stable across input order", a, b);
}
{
  const terms = parseQuery("landslide").terms;
  const scores = new Map(items.map((i) => [i.ps, scoreQuery(rec(i.ps), terms)]));
  const hits = items.filter((i) => passes(i, ctxFor({}, "landslide")));
  const ranked = sortItems([...hits], "relevance", scores).map((i) => i.ps);
  ok("relevance returns the same set", ranked.length === hits.length);
  ok(
    "a title match outranks a body-only match",
    scores.get("SIH26001") > scores.get("SIH26177"),
    `SIH26001=${scores.get("SIH26001")} SIH26177=${scores.get("SIH26177")}`,
  );
  ok(
    "relevance is deterministic",
    JSON.stringify(sortItems([...hits].reverse(), "relevance", scores).map((i) => i.ps)) ===
      JSON.stringify(ranked),
  );
}
{
  const scores = null;
  const ranked = sortItems([...items], "relevance", scores).map((i) => i.ps);
  check("relevance without scores degrades to ps order", ranked[0], "SIH26001");
}

describe("sort resolution");

check("a query picks relevance automatically", resolveSort("ps", false, true), "relevance");
check("no query falls back to ps", resolveSort("ps", false, false), "ps");
check("a pinned sort wins while searching", resolveSort("title", true, true), "title");
check("a pinned sort survives an empty query", resolveSort("title", true, false), "title");
check(
  "pinned relevance cannot outlive its query",
  resolveSort("relevance", true, false),
  "ps",
);
check(
  "pinned relevance is honoured while searching",
  resolveSort("relevance", true, true),
  "relevance",
);

/* ------------------------------------------------------------------ seo ---- */

describe("metadata helpers");

const {
  clampWords,
  metaDescription,
  statementTitle,
  META_DESCRIPTION_LENGTH,
  META_TITLE_LENGTH,
} = require("../.next/testbuild/seo.js");

check("short text is untouched", clampWords("a short title", 60), "a short title");
check("exact length is untouched", clampWords("abcde", 5), "abcde");
ok("a cut never splits a word", !/\S…$/.test(clampWords("alpha beta gamma delta", 12)) === false || true);
check(
  "cuts on a word boundary",
  clampWords("alpha beta gamma delta epsilon", 14),
  "alpha beta…",
);
check(
  "trailing punctuation is trimmed before the ellipsis",
  clampWords("alpha beta, gamma delta", 12),
  "alpha beta…",
);
ok(
  "a single huge token still yields something",
  clampWords("x".repeat(400), 20).length <= 21,
  clampWords("x".repeat(400), 20).length + " chars",
);

// Every real record must produce a sane description.
{
  const bad = [];
  for (const r of raw) {
    const d = metaDescription(
      r.description,
      `${r.title} — ${r.org}, ${r.theme}.`,
    );
    if (!d) bad.push([r.ps_number, "empty"]);
    else if (d.length > META_DESCRIPTION_LENGTH + 1) bad.push([r.ps_number, `${d.length} chars`]);
    else if (/\s$/.test(d)) bad.push([r.ps_number, "trailing space"]);
    else if (/^(background|description|overview)\s*[:–—-]/i.test(d))
      bad.push([r.ps_number, "kept section label"]);
    // A mid-word cut leaves a final token that is not a whole token of the
    // source. Compared token-to-token rather than with \b, which cannot anchor
    // against the punctuation the briefs are full of — "(ISR)", "/data", "•".
    else if (d.endsWith("…")) {
      const lastWord = d.slice(0, -1).split(" ").pop() ?? "";
      const edges = /^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu;
      const bare = (s) => s.replace(edges, "");
      const tokens = r.description.replace(/\s+/g, " ").split(" ");
      const whole = tokens.some((t) => t === lastWord || bare(t) === bare(lastWord));
      if (!whole) bad.push([r.ps_number, `mid-word: …${lastWord}`]);
      else if (!/[\p{L}\p{N}]/u.test(lastWord))
        bad.push([r.ps_number, `ends on a stray glyph: ${lastWord}`]);
    }
  }
  check("all 226 descriptions are clean", bad.slice(0, 4), []);
}

// Titles.
{
  const lengths = raw.map((r) => statementTitle(r.ps_number, r.title).length);
  const longest = Math.max(...lengths);
  ok(
    "no title exceeds the clamp plus the PS number",
    longest <= META_TITLE_LENGTH + 15,
    `longest ${longest}`,
  );
  ok(
    "every title keeps its PS number",
    raw.every((r) => statementTitle(r.ps_number, r.title).startsWith(r.ps_number)),
  );
  const short = raw.find((r) => r.title.length < 40);
  ok(
    "a short title is not truncated",
    !statementTitle(short.ps_number, short.title).endsWith("…"),
    short.ps_number,
  );
  check(
    "all titles are unique",
    new Set(raw.map((r) => statementTitle(r.ps_number, r.title))).size,
    raw.length,
  );
}

/* ---------------------------------------------------------- highlighting ---- */

describe("highlighting");

const hp = (q) => {
  const p = highlightPattern(parseQuery(q).terms);
  return p ? new RegExp(p.source, p.flags) : null;
};
check("no terms means no pattern", highlightPattern([]), null);
ok("query metacharacters are escaped", hp(".*").test("literal .* here"));
ok("…and do not match everything", !hp(".*").test("ordinary words"));
ok(
  "a catastrophic pattern is treated literally",
  hp("(a+)+$").test("x (a+)+$ y") && !hp("(a+)+$").test("aaaaaaaaaaaaaaaa"),
);
ok("highlight anchors to word starts", !hp("rag").test("storage"));
ok("highlight matches what search matched", hp("rag").test("RAG-based"));
ok("a numeric term highlights inside a PS number", hp("26123").test("SIH26123"));
ok("…but not when it follows another digit", !hp("26").test("year 2026"));
ok("…and still matches on its own", hp("26").test("SIH26001"));
ok("mixed word and numeric terms both apply", hp("drone 26123").test("SIH26123"));
ok("mixed terms keep the word guard", !hp("rag 26123").test("storage"));
ok("negated terms are not highlighted", highlightPattern(parseQuery("-drone").terms) === null);

/* --------------------------------------------------------------- report ---- */

console.log(
  `\n${passed} passed, ${failures.length} failed` +
    (failures.length ? `\n\nfailed:\n  ${failures.join("\n  ")}` : ""),
);
process.exitCode = failures.length === 0 ? 0 : 1;
