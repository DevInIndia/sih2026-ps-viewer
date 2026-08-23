# SIH 2026 Problem Statements

A browser for the scraped Smart India Hackathon 2026 problem statements — search,
filter, shortlist and read all 226 briefs.

Originally a Python-generated single-file HTML viewer; now a Next.js App Router
app that deploys to Vercel as a fully static site.

---

## Layout

```
sih_scraper.py        scrapes sih.gov.in/sih2026PS → JSON / CSV / XLSX
build_viewer.py       the original standalone HTML viewer (still works)
sih2026_ps.json       the dataset — the app's single source of truth
sih2026_ps.csv/.xlsx  the same data for spreadsheets

app/                  routes
  (workspace)/          masthead + filter rail + results list (persists across navigation)
    page.tsx              the "pick a statement" placeholder
    ps/[ps]/page.tsx      one problem statement, prerendered per PS number
  search-index/route.ts   statically generated full-text index
  robots.ts, sitemap.ts, icon.svg, error.tsx, not-found.tsx
components/           UI
lib/                  data loading, validation, text normalisation, URL safety
scripts/              safety regression checks
```

## Running it

```bash
npm install
npm run dev
```

Then open <http://localhost:3000>.

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build (prerenders 226 statement pages) |
| `npm start` | Serve the production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test:safety` | Runs the sanitiser regression checks in `scripts/` |

## Deploying to Vercel

The repo root *is* the Next.js project, so there is nothing to configure:

1. Push to GitHub / GitLab / Bitbucket.
2. **New Project** on Vercel → import the repo → **Deploy**.
   Framework is detected as Next.js; leave Root Directory as `./`.
3. Optionally set `NEXT_PUBLIC_SITE_URL` to your final domain so `sitemap.xml`,
   `robots.txt` and the Open Graph tags carry absolute URLs. Without it the app
   falls back to Vercel's own deployment URL.

Everything is prerendered at build time — there are no server routes, no
database and no runtime environment variables, so the deployment is a static
site on the CDN.

### Refreshing the data

```bash
python sih_scraper.py     # rewrites sih2026_ps.json in place
npm run build
```

The app imports `sih2026_ps.json` directly, so a new scrape plus a redeploy is
the whole update path.

## What the app does

Everything the original viewer did, plus the additions marked **new**:

- Full-text search across PS number, title, organisation, department, theme,
  category and the complete description, with matches highlighted in the list
- Category filter (All / Software / Hardware) with live counts
- Multi-select theme filter with counts that update against the other filters
- Organisation and department filters, both with live counts **new**
- "Has a dataset link" and "Shortlisted only" refinements
- Sort by PS number, title, organisation or theme
- Shortlist, saved in `localStorage`, toggleable from the list as well as the
  detail view **new**, synced across tabs **new**, exportable as CSV **new**
- Detail view: facts grid, linkified dataset links, contact and video fields,
  the problem brief rendered with its headings and sub-points **new**, and the
  raw scraped record
- Copy PS number, copy a shareable link **new**, open the source portal
- Three-way theme control — system / light / dark — remembered across visits **new**
- Keyboard: `/` search, `↑`/`↓` through results, `Enter` to open, `s` to
  shortlist **new**, `Esc` to close, `?` for the shortcut list **new**
- Drawer filters and a full-screen detail sheet on narrow screens
- Real URLs: every statement lives at `/ps/SIH26001`, prerendered with its own
  title and description, so links are shareable and indexable **new** (the
  original used a `#hash`)
- Active filter chips above the results **new**

## Safety

The dataset is third-party content scraped from a portal we do not control, so
it is treated as untrusted throughout.

**No HTML injection path.** Every scraped value reaches the page as a React text
child. `dangerouslySetInnerHTML` is used exactly once, on a fixed
theme-bootstrap string in `app/layout.tsx`, and never with data. The original
viewer built HTML strings by concatenation; that whole class of bug is gone.

**Entity decoding without the DOM.** The portal double-escapes several fields,
so `<br>` and `&#8226;` arrive as literal text. `lib/text.ts` decodes them with a
pure string transform. The usual shortcut — assigning to `innerHTML` and reading
`textContent` back — executes `<img onerror>` payloads during the assignment.

**URL allow-listing.** `lib/safe-url.ts` parses every candidate link and only
emits an anchor for `http:`/`https:`. `javascript:`, `data:`, `vbscript:` and
`file:` URLs, and URLs carrying embedded credentials, stay inert text. External
anchors get `rel="noopener noreferrer nofollow ugc"`.

**Bounded search.** Query terms are escaped, length-capped and count-capped
before they are compiled into a highlight regex, so a crafted query cannot build
a catastrophically backtracking pattern.

**Validated input.** `lib/schema.ts` validates the JSON with Zod at build time.
Rows that cannot be repaired are dropped with a warning, PS numbers are
restricted to a URL-safe character set, and duplicates are rejected. A malformed
file fails the build instead of reaching users.

**Hardened storage.** The `localStorage` shortlist is re-validated on every read:
it must be a JSON array of strings, each one a PS number this build knows about,
under a size cap.

**CSV injection guarded.** Exported cells beginning with `=`, `+`, `-` or `@` are
prefixed so a spreadsheet treats them as text, not formulas.

**Security headers** (`next.config.ts`): a `'self'`-only Content-Security-Policy
— fonts are self-hosted by `next/font`, so no third-party origin is allowed at
all — plus `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`,
`Permissions-Policy`, HSTS and `Cross-Origin-Opener/Resource-Policy`.

`script-src` keeps `'unsafe-inline'`, because Next.js emits an inline hydration
bootstrap and removing it requires a per-request nonce, which would take every
page out of static generation. Given that no scraped text is ever injected as
HTML, there is no injection point for it to protect.

**Server/client boundary.** `lib/records.ts` imports `server-only`, so a stray
import of the full dataset into a client component is a build error rather than
a 700 KB regression in the browser bundle.

**Unknown routes 404.** `/ps/[ps]` sets `dynamicParams = false`, so anything not
in the prerendered list is a 404 and never reaches application code.

Run the regression checks with:

```bash
npm run test:safety
```

## The original viewer

`build_viewer.py` is unchanged and still produces the self-contained
`sih2026_ps.html` that works offline from the filesystem:

```bash
python build_viewer.py
```
