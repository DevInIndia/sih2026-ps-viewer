#!/usr/bin/env python3
"""
Build a self-contained HTML browser for the scraped SIH 2026 problem statements.

Reads sih2026_ps.json (produced by sih_scraper.py) and writes sih2026_ps.html
with the full dataset embedded, so the page works offline with no server.

Usage:
    python build_viewer.py
    python build_viewer.py --json ./out/sih2026_ps.json --out ./out/sih2026_ps.html
"""

import argparse
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent

TEMPLATE = r"""<title>SIH 2026 Problem Statements</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&family=Newsreader:opsz,wght@6..72,400;6..72,500;6..72,600&display=swap">

<style>
/* ------------------------------------------------------------------ tokens */
:root{
  --ground:#EDF0F5;
  --surface:#FFFFFF;
  --surface-2:#F5F7FA;
  --surface-3:#E8ECF3;
  --ink:#131B2E;
  --ink-2:#3F4B69;
  --ink-3:#5A6482;
  --rule:#D0D6E2;
  --rule-soft:#E1E6EF;
  --accent:#2A46C0;
  --accent-ink:#2A46C0;
  --accent-soft:#E4E9FA;
  --gold:#7E5203;
  --gold-soft:#F6EAD1;
  --shadow:0 1px 2px rgba(19,27,46,.06), 0 8px 24px -12px rgba(19,27,46,.18);
  --sans:"Archivo", "Segoe UI", system-ui, sans-serif;
  --mono:"IBM Plex Mono", ui-monospace, "Cascadia Mono", Consolas, monospace;
  --read:"Newsreader", Georgia, "Times New Roman", serif;
}
@media (prefers-color-scheme: dark){
  :root:not([data-theme="light"]){
    --ground:#0D1120;
    --surface:#141A2B;
    --surface-2:#1A2135;
    --surface-3:#232C44;
    --ink:#E7EBF5;
    --ink-2:#A9B3CB;
    --ink-3:#8994B0;
    --rule:#2A3350;
    --rule-soft:#1E2639;
    --accent:#8AA2FF;
    --accent-ink:#A8B9FF;
    --accent-soft:#1D2547;
    --gold:#EDB44B;
    --gold-soft:#332810;
    --shadow:0 1px 2px rgba(0,0,0,.4), 0 8px 28px -12px rgba(0,0,0,.7);
  }
}
:root[data-theme="dark"]{
  --ground:#0D1120;
  --surface:#141A2B;
  --surface-2:#1A2135;
  --surface-3:#232C44;
  --ink:#E7EBF5;
  --ink-2:#A9B3CB;
  --ink-3:#8994B0;
  --rule:#2A3350;
  --rule-soft:#1E2639;
  --accent:#8AA2FF;
  --accent-ink:#A8B9FF;
  --accent-soft:#1D2547;
  --gold:#EDB44B;
  --gold-soft:#332810;
  --shadow:0 1px 2px rgba(0,0,0,.4), 0 8px 28px -12px rgba(0,0,0,.7);
}

/* ------------------------------------------------------------------- base */
*,*::before,*::after{ box-sizing:border-box; }
html,body{ height:100%; }
body{
  margin:0; padding:0;
  background:var(--ground);
  color:var(--ink);
  font-family:var(--sans);
  font-size:15px;
  line-height:1.5;
  -webkit-font-smoothing:antialiased;
}
a{ color:var(--accent-ink); text-underline-offset:.18em; }
a:hover{ text-decoration-thickness:2px; }
:focus-visible{ outline:2px solid var(--accent); outline-offset:2px; border-radius:3px; }
button,input,select{ font:inherit; color:inherit; }
.mono{ font-family:var(--mono); font-variant-numeric:tabular-nums; }
.micro{
  font-family:var(--mono); font-size:.66rem; font-weight:500;
  letter-spacing:.11em; text-transform:uppercase; color:var(--ink-3);
}

/* ------------------------------------------------------------------- shell */
.app{ display:grid; grid-template-rows:auto 1fr; height:100dvh; min-height:0; }

.masthead{
  display:flex; align-items:center; gap:1.5rem; flex-wrap:wrap;
  padding:.85rem 1.25rem;
  background:var(--surface);
  border-bottom:1px solid var(--rule);
}
.brand{ display:flex; align-items:baseline; gap:.7rem; margin-right:auto; }
.brand .sig{
  font-family:var(--mono); font-size:.7rem; font-weight:600; letter-spacing:.14em;
  color:var(--surface); background:var(--ink); padding:.32rem .5rem; border-radius:3px;
}
.brand h1{
  margin:0; font-size:1.12rem; font-weight:700; letter-spacing:-.015em;
  text-wrap:balance;
}
.brand .sub{ font-size:.78rem; color:var(--ink-3); }

.figures{ display:flex; gap:1.35rem; flex-wrap:wrap; align-items:flex-end; }
.figure{ display:flex; flex-direction:column; gap:.1rem; }
.figure b{
  font-family:var(--mono); font-size:1rem; font-weight:600;
  font-variant-numeric:tabular-nums; line-height:1.1;
}
.figure span{ font-size:.64rem; letter-spacing:.1em; text-transform:uppercase; color:var(--ink-3); }
.figure.sw b{ color:var(--accent-ink); }
.figure.hw b{ color:var(--gold); }

.iconbtn{
  display:inline-flex; align-items:center; justify-content:center; gap:.4rem;
  height:34px; padding:0 .7rem;
  background:var(--surface-2); color:var(--ink-2);
  border:1px solid var(--rule); border-radius:6px; cursor:pointer;
}
.iconbtn:hover{ background:var(--surface-3); color:var(--ink); }
.iconbtn svg{ width:15px; height:15px; }

/* --------------------------------------------------------------- workspace */
.workspace{
  display:grid;
  grid-template-columns:274px minmax(330px, 400px) 1fr;
  min-height:0;
}
.workspace > *{ min-height:0; overflow-y:auto; overscroll-behavior:contain; }

/* ------------------------------------------------------------------- rail */
.rail{
  background:var(--surface);
  border-right:1px solid var(--rule);
  padding:1.1rem 1.05rem 3rem;
  display:flex; flex-direction:column; gap:1.3rem;
}
.fieldset{ display:flex; flex-direction:column; gap:.55rem; }
.fieldset > .micro{ display:flex; justify-content:space-between; align-items:center; }

.search{ position:relative; display:flex; }
.search input{
  width:100%; height:38px; padding:0 2.1rem 0 .7rem;
  background:var(--surface-2); border:1px solid var(--rule);
  border-radius:6px; font-size:.88rem;
}
.search input::placeholder{ color:var(--ink-3); }
.search kbd{
  position:absolute; right:.5rem; top:50%; transform:translateY(-50%);
  font-family:var(--mono); font-size:.66rem; color:var(--ink-3);
  border:1px solid var(--rule); border-radius:3px; padding:.05rem .3rem;
  pointer-events:none;
}

.segmented{ display:grid; grid-template-columns:repeat(3,1fr); gap:3px;
  background:var(--surface-2); border:1px solid var(--rule); border-radius:6px; padding:3px; }
.segmented button{
  height:30px; background:transparent; border:0; border-radius:4px; cursor:pointer;
  font-size:.78rem; font-weight:500; color:var(--ink-2);
}
.segmented button:hover{ color:var(--ink); }
.segmented button[aria-pressed="true"]{ background:var(--surface); color:var(--ink); box-shadow:var(--shadow); font-weight:600; }

select{
  width:100%; height:36px; padding:0 .55rem;
  background:var(--surface-2); border:1px solid var(--rule);
  border-radius:6px; font-size:.82rem; cursor:pointer;
}

.themes{ display:flex; flex-direction:column; gap:1px; max-height:none; }
.check{
  display:grid; grid-template-columns:auto 1fr auto; align-items:center; gap:.5rem;
  padding:.32rem .4rem; border-radius:5px; cursor:pointer; font-size:.82rem;
  color:var(--ink-2);
}
.check:hover{ background:var(--surface-2); color:var(--ink); }
.check input{ accent-color:var(--accent); width:14px; height:14px; margin:0; cursor:pointer; }
.check .n{ font-family:var(--mono); font-size:.7rem; color:var(--ink-3); font-variant-numeric:tabular-nums; }
.check.on{ color:var(--ink); font-weight:500; }
.check.zero{ opacity:.42; }

.switch{ display:flex; align-items:center; gap:.55rem; padding:.3rem .4rem;
  border-radius:5px; cursor:pointer; font-size:.82rem; color:var(--ink-2); }
.switch:hover{ background:var(--surface-2); color:var(--ink); }
.switch input{ accent-color:var(--accent); width:14px; height:14px; margin:0; cursor:pointer; }

.linkbtn{ background:none; border:0; padding:0; cursor:pointer;
  font-family:var(--mono); font-size:.66rem; letter-spacing:.08em; text-transform:uppercase;
  color:var(--accent-ink); text-decoration:underline; text-underline-offset:3px; }

/* ------------------------------------------------------------------- list */
.listcol{ background:var(--ground); border-right:1px solid var(--rule); }
.listhead{
  position:sticky; top:0; z-index:5;
  display:flex; align-items:center; justify-content:space-between; gap:.5rem;
  padding:.6rem .95rem; background:var(--ground);
  border-bottom:1px solid var(--rule);
}
.results{ list-style:none; margin:0; padding:0; }
.row{
  display:block; width:100%; text-align:left; cursor:pointer;
  padding:.72rem .95rem .78rem;
  background:transparent; border:0; border-bottom:1px solid var(--rule-soft);
  border-left:3px solid transparent;
}
.row:hover{ background:var(--surface-2); }
.row .top{ display:flex; align-items:center; gap:.5rem; margin-bottom:.28rem; }
.row .ps{ font-family:var(--mono); font-size:.7rem; font-weight:600;
  letter-spacing:.05em; color:var(--ink-3); font-variant-numeric:tabular-nums; }
.row .star{ margin-left:auto; line-height:1; font-size:.85rem; color:var(--ink-3); }
.row .star.on{ color:var(--gold); }
.row h3{ margin:0 0 .3rem; font-size:.9rem; font-weight:600; line-height:1.34;
  letter-spacing:-.005em; color:var(--ink); text-wrap:pretty; }
.row .meta{ font-size:.74rem; color:var(--ink-3); line-height:1.4; }
.row[aria-current="true"]{
  background:var(--surface); border-left-color:var(--accent);
}
.row[aria-current="true"] .ps{ color:var(--accent-ink); }
.row mark{ background:var(--gold-soft); color:inherit; border-radius:2px; padding:0 .1em; }

.tag{
  display:inline-flex; align-items:center; gap:.32rem;
  font-family:var(--mono); font-size:.62rem; font-weight:500;
  letter-spacing:.07em; text-transform:uppercase;
  padding:.16rem .42rem; border-radius:3px; white-space:nowrap;
}
.tag.sw{ background:var(--accent-soft); color:var(--accent-ink); }
.tag.hw{ background:var(--gold-soft); color:var(--gold); }
.tag.theme{ background:var(--surface-3); color:var(--ink-2); }

.empty{ padding:3rem 1.5rem; text-align:center; color:var(--ink-3); font-size:.85rem; }

/* ----------------------------------------------------------------- detail */
.detail{ background:var(--surface); }
.detail-inner{ padding:1.6rem 2rem 5rem; max-width:74ch; }
.detail .closebtn{ display:none; }

.eyebrow{ display:flex; align-items:center; gap:.45rem; flex-wrap:wrap; margin-bottom:.75rem; }
.detail h2{
  margin:0 0 .2rem; font-size:clamp(1.3rem,2.3vw,1.65rem); font-weight:700;
  line-height:1.22; letter-spacing:-.02em; text-wrap:balance;
}
.detail .org{ font-size:.92rem; color:var(--ink-2); margin:0 0 1.4rem; }

.facts{
  display:grid; grid-template-columns:repeat(auto-fit, minmax(190px,1fr));
  gap:1px; background:var(--rule-soft);
  border:1px solid var(--rule-soft); border-radius:8px; overflow:hidden;
  margin-bottom:1.9rem;
}
.fact{ background:var(--surface-2); padding:.6rem .75rem; display:flex; flex-direction:column; gap:.2rem; }
.fact dt{ font-family:var(--mono); font-size:.62rem; font-weight:500;
  letter-spacing:.1em; text-transform:uppercase; color:var(--ink-3); }
.fact dd{ margin:0; font-size:.84rem; line-height:1.42; color:var(--ink); word-break:break-word; }
.fact dd.none{ color:var(--ink-3); font-style:italic; }
.fact dd .iso{ font-family:var(--mono); font-size:.72rem; color:var(--ink-3); }
.fact.wide{ grid-column:1 / -1; }
.fact dd ul{ margin:.15rem 0 0; padding-left:1.05rem; }
.fact dd li{ margin-bottom:.2rem; }

.prose h4{
  margin:1.9rem 0 .5rem; font-family:var(--sans); font-size:.7rem; font-weight:600;
  letter-spacing:.13em; text-transform:uppercase; color:var(--accent-ink);
  padding-bottom:.35rem; border-bottom:1px solid var(--rule-soft);
}
.prose h4:first-child{ margin-top:0; }
.prose p{
  margin:0 0 .95rem; font-family:var(--read); font-size:1.035rem; line-height:1.68;
  color:var(--ink-2); white-space:pre-wrap; text-wrap:pretty;
}
.prose p:last-child{ margin-bottom:0; }
.prose .muted{ color:var(--ink-3); font-style:italic; }

.section-label{
  display:flex; align-items:center; gap:.7rem;
  margin:0 0 .9rem; color:var(--ink-3);
}
.section-label::after{ content:""; flex:1; height:1px; background:var(--rule-soft); }

.raw{ margin-top:2.4rem; border-top:1px solid var(--rule-soft); padding-top:1.1rem; }
.raw summary{ cursor:pointer; font-family:var(--mono); font-size:.68rem;
  letter-spacing:.1em; text-transform:uppercase; color:var(--ink-3); }
.raw summary:hover{ color:var(--ink); }
.raw pre{
  margin:.8rem 0 0; padding:.9rem 1rem; overflow-x:auto;
  background:var(--surface-2); border:1px solid var(--rule-soft); border-radius:6px;
  font-family:var(--mono); font-size:.72rem; line-height:1.55; color:var(--ink-2);
  white-space:pre; tab-size:2;
}

.placeholder{
  display:flex; flex-direction:column; align-items:center; justify-content:center;
  gap:.6rem; height:100%; min-height:60vh; padding:2rem; text-align:center; color:var(--ink-3);
}
.placeholder .big{ font-family:var(--mono); font-size:2.4rem; font-weight:600; color:var(--rule); }
.placeholder p{ margin:0; font-size:.86rem; max-width:34ch; }

.actions{ display:flex; gap:.5rem; flex-wrap:wrap; margin-bottom:1.9rem; }
.actions .iconbtn.starred{ background:var(--gold-soft); border-color:var(--gold); color:var(--gold); }

/* ------------------------------------------------------------ responsive */
.mobilebar{ display:none; }
@media (max-width:1080px){
  .workspace{ grid-template-columns:1fr; }
  .mobilebar{
    display:flex; gap:.5rem; align-items:center;
    padding:.55rem .95rem; background:var(--surface);
    border-bottom:1px solid var(--rule);
  }
  .mobilebar .search{ flex:1; }
  .rail{
    position:fixed; inset:0 auto 0 0; width:min(310px, 86vw); z-index:60;
    transform:translateX(-101%); transition:transform .22s ease;
    box-shadow:var(--shadow);
  }
  body.rail-open .rail{ transform:translateX(0); }
  body.rail-open .scrim{ opacity:1; pointer-events:auto; }
  .scrim{
    position:fixed; inset:0; z-index:50; background:rgba(9,12,22,.5);
    opacity:0; pointer-events:none; transition:opacity .22s ease; border:0;
  }
  .listcol{ border-right:0; }
  .detail{
    position:fixed; inset:0; z-index:70; display:none;
    border-left:0; overflow-y:auto;
  }
  body.detail-open .detail{ display:block; }
  .detail .closebtn{
    display:inline-flex; position:sticky; top:.75rem; margin:.75rem 0 0 1rem; z-index:2;
  }
  .detail-inner{ padding:1rem 1.15rem 4rem; }
}
@media (min-width:1081px){ .scrim{ display:none; } }
@media (prefers-reduced-motion:reduce){
  *{ animation-duration:.01ms !important; transition-duration:.01ms !important; }
}
</style>

<div class="app">
  <header class="masthead">
    <div class="brand">
      <span class="sig">SIH 2026</span>
      <div>
        <h1>Problem Statements</h1>
        <div class="sub">Smart India Hackathon &middot; sih.gov.in</div>
      </div>
    </div>
    <div class="figures" id="figures"></div>
    <button class="iconbtn" id="theme-toggle" type="button" aria-label="Switch colour theme" title="Switch colour theme">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">
        <path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.6 6.6 0 0 0 9.8 9.8Z"/>
      </svg>
    </button>
  </header>

  <div class="mobilebar">
    <button class="iconbtn" id="rail-open" type="button">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">
        <path d="M4 6h16M4 12h16M4 18h10"/>
      </svg>
      Filters
    </button>
    <div class="search">
      <input type="search" id="q-mobile" placeholder="Search statements" aria-label="Search problem statements">
    </div>
  </div>

  <div class="workspace">
    <aside class="rail" id="rail" aria-label="Filters">
      <div class="fieldset">
        <div class="micro"><span>Search</span></div>
        <div class="search">
          <input type="search" id="q" placeholder="Title, description, org&hellip;" aria-label="Search problem statements">
          <kbd>/</kbd>
        </div>
      </div>

      <div class="fieldset">
        <div class="micro"><span>Category</span></div>
        <div class="segmented" role="group" aria-label="Category">
          <button type="button" data-cat="" aria-pressed="true">All</button>
          <button type="button" data-cat="Software" aria-pressed="false">Software</button>
          <button type="button" data-cat="Hardware" aria-pressed="false">Hardware</button>
        </div>
      </div>

      <div class="fieldset">
        <div class="micro"><span>Theme</span><button class="linkbtn" id="themes-clear" type="button">clear</button></div>
        <div class="themes" id="themes"></div>
      </div>

      <div class="fieldset">
        <div class="micro"><span>Organisation</span></div>
        <select id="org" aria-label="Filter by organisation"></select>
      </div>

      <div class="fieldset">
        <div class="micro"><span>Department</span></div>
        <select id="dept" aria-label="Filter by department"></select>
      </div>

      <div class="fieldset">
        <div class="micro"><span>Refine</span></div>
        <label class="switch"><input type="checkbox" id="f-dataset"> Has a dataset link</label>
        <label class="switch"><input type="checkbox" id="f-star"> Shortlisted only</label>
      </div>

      <div class="fieldset">
        <div class="micro"><span>Sort</span></div>
        <select id="sort" aria-label="Sort results">
          <option value="ps">PS number</option>
          <option value="title">Title A&ndash;Z</option>
          <option value="org">Organisation</option>
          <option value="theme">Theme</option>
        </select>
      </div>

      <button class="iconbtn" id="reset" type="button">Reset all filters</button>
    </aside>

    <section class="listcol" aria-label="Results">
      <div class="listhead">
        <span class="micro" id="count">&nbsp;</span>
        <span class="micro" id="shortcount"></span>
      </div>
      <ul class="results" id="results"></ul>
    </section>

    <main class="detail" id="detail" aria-live="polite">
      <div class="placeholder" id="placeholder">
        <div class="big">SIH</div>
        <p>Pick a statement from the list to read its full brief, dataset links and submission details.</p>
      </div>
      <div id="detail-body"></div>
    </main>
  </div>
</div>
<button class="scrim" id="scrim" type="button" aria-label="Close filters"></button>

<script id="ps-data" type="application/json">__PS_DATA__</script>
<script>
(function(){
  "use strict";

  var DATA = JSON.parse(document.getElementById("ps-data").textContent);

  /* --------------------------------------------------------------- helpers */
  function esc(s){
    return String(s == null ? "" : s)
      .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;");
  }

  // The portal stores some fields with HTML that was escaped twice, so the
  // scrape captures literal "<br>" and "&#8226;" as text. Undo that here and
  // leave the JSON itself untouched, so the raw record stays faithful.
  function unmangle(s){
    if(!s) return "";
    return String(s)
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/?(b|strong|i|em|u|p|span|div)\b[^>]*>/gi, "")
      .replace(/&#8226;/g, "•")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;|&apos;/gi, "'")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/[ \t]+\n/g, "\n")
      .trim();
  }

  // Split a dataset-link blob into readable items and linkify bare URLs.
  function linkify(text){
    var parts = unmangle(text).split(/\n+|(?=•\s)/).map(function(p){
      return p.replace(/^•\s*/, "").trim();
    }).filter(Boolean);
    if(!parts.length) return "";
    var html = parts.map(function(p){
      var out = esc(p).replace(/(https?:\/\/[^\s<]+[^\s<.,;:)\]])/g, function(u){
        return '<a href="' + u + '" target="_blank" rel="noopener noreferrer">' + u + "</a>";
      });
      return "<li>" + out + "</li>";
    }).join("");
    return parts.length === 1
      ? html.replace(/^<li>/, "").replace(/<\/li>$/, "")
      : "<ul>" + html + "</ul>";
  }

  // A line is a section heading only if it is a short label ending in a colon.
  // Descriptions are full of lead-in sentences that also end in a colon
  // ("A scalable platform with:"), so cap the word count and reject openers
  // that mark a continuing sentence rather than a new section.
  var HEAD_RE = /^[•\-\*●]?\s*([A-Z][^.!?]{2,58}):$/;
  var HEAD_STOP = /^(a|an|the|this|these|those|it|they|we|you|our|its|following|below|include|includes|including)\b/i;

  function headingOf(line){
    var m = line.match(HEAD_RE);
    if(!m) return null;
    var core = m[1].trim();
    if(core.split(/\s+/).length > 5) return null;
    if(HEAD_STOP.test(core)) return null;
    return core;
  }

  function renderProse(text){
    if(!text) return '<p class="muted">The portal lists no description for this statement.</p>';
    var lines = String(text).split("\n"), html = "", buf = [];
    function flush(){
      if(buf.length){ html += "<p>" + esc(buf.join("\n")) + "</p>"; buf = []; }
    }
    for(var i = 0; i < lines.length; i++){
      var line = lines[i].trim();
      if(!line){ flush(); continue; }
      var head = headingOf(line);
      if(head){ flush(); html += "<h4>" + esc(head) + "</h4>"; continue; }
      buf.push(line);
    }
    flush();
    return html || '<p class="muted">The portal lists no description for this statement.</p>';
  }

  function catClass(c){ return String(c).toLowerCase().indexOf("hard") === 0 ? "hw" : "sw"; }

  /* ----------------------------------------------------------------- index */
  DATA.forEach(function(r, i){
    r._i = i;
    r._hay = [r.ps_number, r.title, r.org, r.department, r.theme, r.category, r.description]
      .join("  ").toLowerCase();
  });

  var STORE_KEY = "sih2026.shortlist";
  var starred = new Set();
  try{
    var saved = JSON.parse(localStorage.getItem(STORE_KEY) || "[]");
    if(Array.isArray(saved)) saved.forEach(function(k){ starred.add(k); });
  }catch(e){ /* storage unavailable - shortlist just won't persist */ }
  function persist(){
    try{ localStorage.setItem(STORE_KEY, JSON.stringify(Array.from(starred))); }catch(e){}
  }

  var state = { q:"", cat:"", themes:new Set(), org:"", dept:"", dataset:false, star:false, sort:"ps" };
  var selected = null;

  var el = {
    q: document.getElementById("q"),
    qMobile: document.getElementById("q-mobile"),
    themes: document.getElementById("themes"),
    org: document.getElementById("org"),
    dept: document.getElementById("dept"),
    sort: document.getElementById("sort"),
    dataset: document.getElementById("f-dataset"),
    star: document.getElementById("f-star"),
    results: document.getElementById("results"),
    count: document.getElementById("count"),
    shortcount: document.getElementById("shortcount"),
    detailBody: document.getElementById("detail-body"),
    placeholder: document.getElementById("placeholder"),
    figures: document.getElementById("figures")
  };

  /* -------------------------------------------------------------- masthead */
  (function figures(){
    var sw = DATA.filter(function(r){ return catClass(r.category) === "sw"; }).length;
    var themes = new Set(DATA.map(function(r){ return r.theme; }));
    var orgs = new Set(DATA.map(function(r){ return r.org; }));
    var deadline = DATA.length ? DATA[0].deadline : "—";
    var captured = DATA.length ? DATA[0].scraped_at : "—";
    var rows = [
      ["figure", DATA.length, "statements"],
      ["figure sw", sw, "software"],
      ["figure hw", DATA.length - sw, "hardware"],
      ["figure", themes.size, "themes"],
      ["figure", orgs.size, "organisations"],
      ["figure", deadline, "submission closes"],
      ["figure", captured, "data captured"]
    ];
    el.figures.innerHTML = rows.map(function(r){
      return '<div class="' + r[0] + '"><b>' + esc(r[1]) + "</b><span>" + esc(r[2]) + "</span></div>";
    }).join("");
  })();

  /* --------------------------------------------------------------- filters */
  function passes(r, skip){
    if(skip !== "q" && state.q){
      var terms = state.q.toLowerCase().split(/\s+/).filter(Boolean);
      for(var i = 0; i < terms.length; i++){
        if(r._hay.indexOf(terms[i]) === -1) return false;
      }
    }
    if(skip !== "cat" && state.cat && r.category !== state.cat) return false;
    if(skip !== "theme" && state.themes.size && !state.themes.has(r.theme)) return false;
    if(skip !== "org" && state.org && r.org !== state.org) return false;
    if(skip !== "dept" && state.dept && r.department !== state.dept) return false;
    if(skip !== "dataset" && state.dataset && !r.dataset_link) return false;
    if(skip !== "star" && state.star && !starred.has(r.ps_number)) return false;
    return true;
  }

  var SORTS = {
    ps:    function(a,b){ return String(a.ps_number).localeCompare(String(b.ps_number), undefined, {numeric:true}); },
    title: function(a,b){ return a.title.localeCompare(b.title); },
    org:   function(a,b){ return a.org.localeCompare(b.org) || SORTS.ps(a,b); },
    theme: function(a,b){ return a.theme.localeCompare(b.theme) || SORTS.ps(a,b); }
  };

  function buildThemes(){
    var all = Array.from(new Set(DATA.map(function(r){ return r.theme; }))).sort();
    el.themes.innerHTML = all.map(function(t){
      return '<label class="check" data-theme-row="' + esc(t) + '">' +
             '<input type="checkbox" value="' + esc(t) + '">' +
             "<span>" + esc(t) + '</span><span class="n"></span></label>';
    }).join("");
    el.themes.addEventListener("change", function(ev){
      var box = ev.target;
      if(box.type !== "checkbox") return;
      if(box.checked) state.themes.add(box.value); else state.themes.delete(box.value);
      render();
    });
  }

  function buildSelect(node, field, label){
    var counts = {};
    DATA.forEach(function(r){ counts[r[field]] = (counts[r[field]] || 0) + 1; });
    var keys = Object.keys(counts).sort();
    node.innerHTML = '<option value="">' + label + " (" + DATA.length + ")</option>" +
      keys.map(function(k){
        return '<option value="' + esc(k) + '">' + esc(k) + " (" + counts[k] + ")</option>";
      }).join("");
  }

  function updateThemeCounts(){
    var base = DATA.filter(function(r){ return passes(r, "theme"); });
    var counts = {};
    base.forEach(function(r){ counts[r.theme] = (counts[r.theme] || 0) + 1; });
    var rows = el.themes.querySelectorAll("[data-theme-row]");
    for(var i = 0; i < rows.length; i++){
      var row = rows[i], name = row.getAttribute("data-theme-row"), n = counts[name] || 0;
      row.querySelector(".n").textContent = n;
      row.classList.toggle("zero", n === 0 && !state.themes.has(name));
      row.classList.toggle("on", state.themes.has(name));
    }
  }

  /* ------------------------------------------------------------- rendering */
  function highlight(text){
    var out = esc(text);
    if(!state.q) return out;
    var terms = state.q.split(/\s+/).filter(function(t){ return t.length > 1; });
    terms.forEach(function(t){
      var re = new RegExp("(" + t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "ig");
      out = out.replace(re, "<mark>$1</mark>");
    });
    return out;
  }

  var visible = [];

  function render(){
    visible = DATA.filter(function(r){ return passes(r); }).sort(SORTS[state.sort]);
    updateThemeCounts();

    el.count.textContent = visible.length === DATA.length
      ? DATA.length + " statements"
      : visible.length + " of " + DATA.length + " statements";
    el.shortcount.textContent = starred.size ? starred.size + " shortlisted" : "";

    if(!visible.length){
      el.results.innerHTML = '<li class="empty">No statement matches these filters.<br>Try clearing the search or theme selection.</li>';
      return;
    }

    el.results.innerHTML = visible.map(function(r){
      var cc = catClass(r.category);
      var on = starred.has(r.ps_number);
      return '<li><button class="row" type="button" data-i="' + r._i + '"' +
        (selected === r._i ? ' aria-current="true"' : "") + ">" +
          '<span class="top">' +
            '<span class="ps">' + highlight(r.ps_number) + "</span>" +
            '<span class="tag ' + cc + '">' + esc(r.category) + "</span>" +
            '<span class="star' + (on ? " on" : "") + '" aria-hidden="true">' + (on ? "★" : "") + "</span>" +
          "</span>" +
          "<h3>" + highlight(r.title) + "</h3>" +
          '<span class="meta">' + highlight(r.org) + " &middot; " + esc(r.theme) + "</span>" +
        "</button></li>";
    }).join("");
  }

  function fact(label, value, opts){
    opts = opts || {};
    var body;
    if(opts.html){ body = value; }
    else if(value === null || value === undefined || value === ""){
      body = '<dd class="none">' + esc(opts.blank || "Not listed on the portal") + "</dd>";
      return '<div class="fact' + (opts.wide ? " wide" : "") + '"><dt>' + esc(label) + "</dt>" + body + "</div>";
    } else { body = "<dd>" + esc(value) + (opts.extra || "") + "</dd>"; }
    return '<div class="fact' + (opts.wide ? " wide" : "") + '"><dt>' + esc(label) + "</dt>" +
           (opts.html ? "<dd>" + body + "</dd>" : body) + "</div>";
  }

  function renderDetail(r){
    var cc = catClass(r.category);
    var ds = linkify(r.dataset_link);
    var isoNote = r.deadline_date ? ' <span class="iso">' + esc(r.deadline_date) + "</span>" : "";
    var on = starred.has(r.ps_number);

    var facts =
      fact("Organisation", r.org) +
      fact("Department", r.department) +
      fact("Category", r.category) +
      fact("Theme", r.theme) +
      fact("Submission deadline", r.deadline, { extra:isoNote }) +
      fact("Ideas submitted", r.ideas) +
      fact("Serial number", r.sno) +
      fact("Data captured on", r.scraped_at) +
      (ds
        ? '<div class="fact wide"><dt>Dataset link</dt><dd>' + ds + "</dd></div>"
        : fact("Dataset link", "", { wide:true, blank:"No dataset link published" })) +
      fact("Contact info", unmangle(r.contact), { wide:true, blank:"No contact published" }) +
      (r.youtube
        ? '<div class="fact wide"><dt>Youtube link</dt><dd>' + linkify(r.youtube) + "</dd></div>"
        : fact("Youtube link", "", { wide:true, blank:"No video published" }));

    el.placeholder.style.display = "none";
    el.detailBody.innerHTML =
      '<button class="iconbtn closebtn" type="button" data-close>' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M15 19l-7-7 7-7"/></svg>' +
        "Back to list</button>" +
      '<div class="detail-inner">' +
        '<div class="eyebrow">' +
          '<span class="tag ' + cc + '">' + esc(r.category) + "</span>" +
          '<span class="tag theme">' + esc(r.theme) + "</span>" +
          '<span class="micro mono">' + esc(r.ps_number) + "</span>" +
        "</div>" +
        "<h2>" + esc(r.title) + "</h2>" +
        '<p class="org">' + esc(r.org) + "</p>" +
        '<div class="actions">' +
          '<button class="iconbtn' + (on ? " starred" : "") + '" type="button" data-star="' + esc(r.ps_number) + '">' +
            (on ? "★ Shortlisted" : "☆ Add to shortlist") + "</button>" +
          '<button class="iconbtn" type="button" data-copy="' + esc(r.ps_number) + '">Copy PS number</button>' +
          '<a class="iconbtn" href="https://sih.gov.in/sih2026PS" target="_blank" rel="noopener noreferrer">Open sih.gov.in</a>' +
        "</div>" +
        '<dl class="facts">' + facts + "</dl>" +
        '<div class="micro section-label">Problem brief</div>' +
        '<div class="prose">' + renderProse(r.description) + "</div>" +
        '<details class="raw"><summary>Raw scraped record</summary><pre>' +
          esc(JSON.stringify(stripInternal(r), null, 2)) + "</pre></details>" +
      "</div>";
    document.getElementById("detail").scrollTop = 0;
  }

  function stripInternal(r){
    var copy = {};
    Object.keys(r).forEach(function(k){ if(k.charAt(0) !== "_") copy[k] = r[k]; });
    return copy;
  }

  function select(i, push){
    selected = i;
    var r = DATA[i];
    renderDetail(r);
    document.body.classList.add("detail-open");
    var rows = el.results.querySelectorAll(".row");
    for(var n = 0; n < rows.length; n++){
      rows[n].setAttribute("aria-current", Number(rows[n].dataset.i) === i ? "true" : "false");
    }
    if(push !== false && r.ps_number){
      history.replaceState(null, "", "#" + encodeURIComponent(r.ps_number));
    }
  }

  /* ---------------------------------------------------------------- events */
  el.results.addEventListener("click", function(ev){
    var row = ev.target.closest(".row");
    if(row) select(Number(row.dataset.i));
  });

  el.detailBody.addEventListener("click", function(ev){
    var starBtn = ev.target.closest("[data-star]");
    if(starBtn){
      var key = starBtn.getAttribute("data-star");
      if(starred.has(key)) starred.delete(key); else starred.add(key);
      persist();
      render();
      if(selected !== null) renderDetail(DATA[selected]);
      return;
    }
    var copyBtn = ev.target.closest("[data-copy]");
    if(copyBtn){
      var text = copyBtn.getAttribute("data-copy");
      var done = function(){
        var was = copyBtn.textContent;
        copyBtn.textContent = "Copied";
        setTimeout(function(){ copyBtn.textContent = was; }, 1200);
      };
      if(navigator.clipboard){ navigator.clipboard.writeText(text).then(done, done); } else { done(); }
      return;
    }
    if(ev.target.closest("[data-close]")){
      document.body.classList.remove("detail-open");
    }
  });

  function onSearch(value, mirror){
    state.q = value.trim();
    if(mirror) mirror.value = value;
    render();
  }
  el.q.addEventListener("input", function(){ onSearch(el.q.value, el.qMobile); });
  el.qMobile.addEventListener("input", function(){ onSearch(el.qMobile.value, el.q); });

  document.querySelectorAll("[data-cat]").forEach(function(btn){
    btn.addEventListener("click", function(){
      state.cat = btn.getAttribute("data-cat");
      document.querySelectorAll("[data-cat]").forEach(function(b){
        b.setAttribute("aria-pressed", b === btn ? "true" : "false");
      });
      render();
    });
  });

  el.org.addEventListener("change", function(){ state.org = el.org.value; render(); });
  el.dept.addEventListener("change", function(){ state.dept = el.dept.value; render(); });
  el.sort.addEventListener("change", function(){ state.sort = el.sort.value; render(); });
  el.dataset.addEventListener("change", function(){ state.dataset = el.dataset.checked; render(); });
  el.star.addEventListener("change", function(){ state.star = el.star.checked; render(); });

  document.getElementById("themes-clear").addEventListener("click", function(){
    state.themes.clear();
    el.themes.querySelectorAll("input").forEach(function(b){ b.checked = false; });
    render();
  });

  document.getElementById("reset").addEventListener("click", function(){
    state = { q:"", cat:"", themes:new Set(), org:"", dept:"", dataset:false, star:false, sort:"ps" };
    el.q.value = ""; el.qMobile.value = "";
    el.org.value = ""; el.dept.value = ""; el.sort.value = "ps";
    el.dataset.checked = false; el.star.checked = false;
    el.themes.querySelectorAll("input").forEach(function(b){ b.checked = false; });
    document.querySelectorAll("[data-cat]").forEach(function(b){
      b.setAttribute("aria-pressed", b.getAttribute("data-cat") === "" ? "true" : "false");
    });
    render();
  });

  var rail = document.getElementById("rail-open"), scrim = document.getElementById("scrim");
  rail.addEventListener("click", function(){ document.body.classList.add("rail-open"); });
  scrim.addEventListener("click", function(){ document.body.classList.remove("rail-open"); });

  document.getElementById("theme-toggle").addEventListener("click", function(){
    var root = document.documentElement;
    var dark = root.getAttribute("data-theme") === "dark" ||
      (!root.getAttribute("data-theme") && matchMedia("(prefers-color-scheme: dark)").matches);
    root.setAttribute("data-theme", dark ? "light" : "dark");
  });

  document.addEventListener("keydown", function(ev){
    var typing = /^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement.tagName);
    if(ev.key === "/" && !typing){ ev.preventDefault(); el.q.focus(); el.q.select(); return; }
    if(ev.key === "Escape"){
      document.body.classList.remove("rail-open");
      if(matchMedia("(max-width:1080px)").matches) document.body.classList.remove("detail-open");
      return;
    }
    if(typing || !visible.length) return;
    if(ev.key === "ArrowDown" || ev.key === "ArrowUp"){
      ev.preventDefault();
      var at = visible.findIndex(function(r){ return r._i === selected; });
      var next = ev.key === "ArrowDown" ? at + 1 : at - 1;
      if(next < 0) next = 0;
      if(next > visible.length - 1) next = visible.length - 1;
      select(visible[next]._i);
      var row = el.results.querySelector('.row[data-i="' + visible[next]._i + '"]');
      if(row) row.scrollIntoView({ block:"nearest" });
    }
  });

  /* ------------------------------------------------------------------ boot */
  buildThemes();
  buildSelect(el.org, "org", "All organisations");
  buildSelect(el.dept, "department", "All departments");
  render();

  function openFromHash(){
    var hash = decodeURIComponent((location.hash || "").replace(/^#/, ""));
    if(!hash) return;
    var match = DATA.filter(function(r){ return r.ps_number === hash; })[0];
    if(match && match._i !== selected) select(match._i, false);
  }
  // Changing only the hash is a same-document navigation, so nothing reloads;
  // without this a shared link pasted into an open tab would do nothing.
  window.addEventListener("hashchange", openFromHash);
  openFromHash();
})();
</script>
"""


def main():
    ap = argparse.ArgumentParser(description="Build the SIH 2026 HTML browser")
    ap.add_argument("--json", default=str(HERE / "sih2026_ps.json"))
    ap.add_argument("--out", default=str(HERE / "sih2026_ps.html"))
    args = ap.parse_args()

    records = json.loads(Path(args.json).read_text(encoding="utf-8"))

    # Escaping < keeps a stray "</script>" inside a description from ending the
    # data block early; JSON parses the < escape back to the real character.
    payload = json.dumps(records, ensure_ascii=False, separators=(",", ":")).replace("<", "\\u003c")

    html = TEMPLATE.replace("__PS_DATA__", payload)
    out = Path(args.out)
    out.write_text(html, encoding="utf-8")

    kb = out.stat().st_size / 1024
    print(f"wrote {out}  ({len(records)} statements, {kb:.0f} KB)")


if __name__ == "__main__":
    main()
