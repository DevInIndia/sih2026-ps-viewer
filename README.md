<div align="center">

# SIH 2026 Problem Statements

**Search, filter and shortlist all 226 Smart India Hackathon 2026 problem statements.**

### [→ Open the live site](https://sih2026-ps-viewer.vercel.app)

[![Live](https://img.shields.io/badge/live-sih2026--ps--viewer.vercel.app-2947c8)](https://sih2026-ps-viewer.vercel.app)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38bdf8?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Deployed on Vercel](https://img.shields.io/badge/deployed-Vercel-000000?logo=vercel&logoColor=white)](https://vercel.com)

</div>

---

The official [sih.gov.in](https://sih.gov.in/sih2026PS) listing is a single
paginated table: no full-text search, no way to compare themes, no way to keep
track of the statements you are actually considering.

This is a scraper plus a reading interface for the same data. Every statement is
prerendered as its own page, the whole dataset filters instantly in the browser,
and your shortlist persists between visits.

**226 statements · 172 software · 54 hardware · 18 themes · 30 organisations · 41 departments**

## Features

**Finding things**

- Full-text search across PS number, title, organisation, department, theme,
  category and the complete brief — matches are highlighted in the results
- Filter by category, theme (multi-select), organisation and department, with
  counts that update live against whatever else is already selected
- Narrow to statements that publish a dataset link, or to your shortlist
- Sort by PS number, title, organisation or theme
- Active filters show as removable chips above the results

**Reading**

- Facts grid: organisation, department, category, theme, deadline, ideas
  submitted, serial number and capture date
- The brief rendered with its real structure — section headings, lettered
  sub-points and bullet lists, instead of one undifferentiated wall of text
- Dataset and video links parsed out of the portal's markup and linkified,
  including bare hostnames like `tkdl.res.in`

**Keeping track**

- Shortlist any statement from the list or the detail view; it is saved locally
  and stays in sync across tabs
- Export the shortlist as CSV
- Copy a PS number, or a shareable link to the statement

**Getting around**

| Key | Action |
| --- | --- |
| `/` | Focus search |
| `↑` `↓` | Move through results |
| `Enter` | Open the highlighted statement |
| `s` | Shortlist the open statement |
| `Esc` | Close the filters drawer or detail sheet |
| `?` | Show all shortcuts |

Every statement has a real URL (`/ps/SIH26001`) with its own title and
description, so links are shareable and indexable. System / light / dark theme,
remembered across visits. Filter rail collapses to a drawer and the detail view
to a full-screen sheet on narrow screens.

## Getting started

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build — prerenders 233 pages |
| `npm start` | Serve the production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test:safety` | 26 regression checks on the sanitisers |

## Deploying

The repo root is the Next.js project, so there is nothing to configure:

1. Import the repo at [vercel.com/new](https://vercel.com/new)
2. Leave the defaults — Next.js is detected, Root Directory is `./`
3. Deploy

Everything is prerendered at build time. No server routes, no database, no
runtime environment variables — the deployment is a static site on the CDN.
`sitemap.xml` and the Open Graph tags pick up the deployment domain
automatically; set `NEXT_PUBLIC_SITE_URL` only if you attach a custom domain.

### Refreshing the data

```bash
python sih_scraper.py     # rewrites sih2026_ps.json in place
git commit -am "Refresh dataset" && git push
```

The app imports `sih2026_ps.json` directly, so a new scrape plus a push is the
whole update path — Vercel rebuilds on its own.

## Project layout

```
sih_scraper.py         scrapes sih.gov.in/sih2026PS → JSON / CSV / XLSX
build_viewer.py        the original standalone HTML viewer (still works)
sih2026_ps.json        the dataset — the app's single source of truth
sih2026_ps.csv/.xlsx   the same data for spreadsheets

app/
  (workspace)/         masthead, filter rail and results list, kept mounted
                       across navigation so filters and scroll survive
    ps/[ps]/           one statement, prerendered per PS number
  search-index/        statically generated full-text index
components/            UI
lib/                   data loading, validation, text normalisation, URL safety
scripts/               safety regression checks
```

The descriptions are ~185 KB gzipped, so they are kept out of the initial
payload and fetched in the background as `/search-index`. Until it arrives,
search runs against metadata already in memory — the box is never dead. The home
page is **41 KB gzipped**; the original single-file viewer was 721 KB.

## Safety

The dataset is third-party content scraped from a portal nobody here controls,
so it is treated as untrusted throughout.

- **No HTML-injection path.** Every scraped value reaches the DOM as a React
  text child. `dangerouslySetInnerHTML` appears once, on a fixed theme-bootstrap
  string, never with data.
- **Entity decoding without the DOM.** The portal double-escapes several fields,
  so `<br>` and `&#8226;` arrive as literal text. They are decoded by pure string
  transform. The usual shortcut — assigning to `innerHTML` and reading
  `textContent` back — fires `<img onerror>` payloads during the assignment.
- **URL allow-listing.** Only `http:` / `https:` links become anchors.
  `javascript:`, `data:`, `vbscript:`, `file:` and credentialed URLs stay inert
  text. External anchors carry `rel="noopener noreferrer nofollow ugc"`.
- **Bounded search.** Query terms are escaped, length-capped and count-capped
  before being compiled into a highlight regex, so a crafted query cannot build a
  catastrophically backtracking pattern.
- **Validated input.** Zod validates the dataset at build time; unrepairable rows
  are dropped with a warning, PS numbers are restricted to a URL-safe character
  set, and duplicates are rejected.
- **Hardened storage.** The `localStorage` shortlist is re-validated on every
  read — a JSON array of strings, each a known PS number, under a size cap.
- **CSV injection guarded.** Exported cells starting with `=`, `+`, `-` or `@`
  are prefixed so spreadsheets treat them as text, not formulas.
- **Security headers.** A `'self'`-only CSP — fonts are self-hosted by
  `next/font`, so no third-party origin is permitted at all — plus HSTS,
  `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`
  and COOP/CORP.
- **Server/client boundary.** `lib/records.ts` imports `server-only`, so a stray
  import of the full dataset into a client component is a build error rather than
  a 700 KB regression in the browser bundle.
- **Unknown routes 404.** `/ps/[ps]` sets `dynamicParams = false`, so anything
  outside the prerendered list never reaches application code.

`script-src` keeps `'unsafe-inline'`: Next.js emits an inline hydration
bootstrap, and removing it needs a per-request nonce, which would take every page
out of static generation. Since no scraped text is ever injected as HTML, there
is no injection point for it to protect.

```bash
npm run test:safety
```

## The original viewer

`build_viewer.py` is unchanged and still produces the self-contained
`sih2026_ps.html`, which works offline straight from the filesystem:

```bash
python build_viewer.py
```

## Author

**Shashank Chauhan**

- Email — [shashankchauhan2518@gmail.com](mailto:shashankchauhan2518@gmail.com)
- LinkedIn — [shashank-chauhan](https://www.linkedin.com/in/shashank-chauhan-b492a1311)
- GitHub — [@DevInIndia](https://github.com/DevInIndia)

---

<div align="center">
<sub>Problem statement data belongs to the Smart India Hackathon organisers and is reproduced here for easier reading.</sub>
</div>
