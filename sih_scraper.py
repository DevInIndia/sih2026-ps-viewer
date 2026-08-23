#!/usr/bin/env python3
"""
Scrape Smart India Hackathon 2026 problem statements from https://sih.gov.in/sih2026PS

The page renders every problem statement server-side inside <table id="dataTablePS">.
DataTables only paginates on the client, so one GET returns the full set.
Each title cell also contains a hidden modal div (id="ViewProblemStatement...")
holding Description, Department, Dataset Link, Contact info and Youtube Link.

Outputs (written next to this script by default):
    sih2026_ps.json
    sih2026_ps.csv
    sih2026_ps.xlsx      (only if openpyxl is installed)

Usage:
    pip install requests beautifulsoup4 lxml pandas openpyxl

    python sih_scraper.py                      # fetch live, save raw HTML, export
    python sih_scraper.py --cache page.html    # parse a previously saved HTML file
    python sih_scraper.py --outdir ./out       # choose output folder
"""

import argparse
import csv
import json
import re
import sys
import time
from datetime import date, datetime
from pathlib import Path

import requests
from bs4 import BeautifulSoup

URL = "https://sih.gov.in/sih2026PS"
SCRAPE_DATE = date.today().isoformat()

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Connection": "keep-alive",
}

# The portal serves UTF-8 that was already decoded as CP1252 once, so smart
# quotes and dashes arrive as mojibake. This table repairs the common cases.
MOJIBAKE_FIX = {
    "â€“": "–",   # en dash
    "â€”": "—",   # em dash
    "â€™": "’",   # right single quote
    "â€˜": "‘",   # left single quote
    "â€œ": "“",   # left double quote
    "â€Œ": "”",   # right double quote
    "â€¦": "…",   # ellipsis
    "Â°": "°",         # degree sign
    "Âµ": "µ",         # micro sign
    "Â·": "·",         # middle dot
    "Â ": " ",              # non-breaking space
    "Ã±": "ñ",
    "Ã ": "à",
    "Ã©": "é",
}

FIELDNAMES = [
    "sno", "ps_number", "title", "org", "department", "category", "theme",
    "deadline", "deadline_date", "ideas", "dataset_link", "contact",
    "youtube", "description", "scraped_at",
]


# Characters cp1252 produces from a UTF-8 continuation byte (0x80-0xBF). Bytes
# 0x80-0x9F map to punctuation rather than to the matching code point, which is
# why the mojibake looks like "Ã—" instead of something regular.
_CONTINUATION = (
    "-ÿ€‚ƒ„…†‡ˆ‰"
    "Š‹ŒŽ‘’“”•–—"
    "˜™š›œžŸ"
)
# A two-byte UTF-8 sequence (lead byte 0xC2/0xC3) misread as cp1252.
MOJIBAKE_SEQ = re.compile(f"[ÂÃ][{_CONTINUATION}]")


def _undo_misdecode(match):
    """Re-encode one mojibake sequence as cp1252 and read it back as UTF-8."""
    seq = match.group()
    try:
        return seq.encode("cp1252", "strict").decode("utf-8", "strict")
    except (UnicodeEncodeError, UnicodeDecodeError):
        # Not a misdecode after all — leave the characters alone.
        return seq


def fix_text(text):
    """Repair mojibake and collapse stray whitespace."""
    if not text:
        return ""
    for bad, good in MOJIBAKE_FIX.items():
        text = text.replace(bad, good)
    # The table above only covers sequences seen so far. This catches the rest
    # of the same class generically: the portal stores text that was decoded as
    # cp1252 once before being saved, so reversing that on each affected
    # sequence recovers the original character. Applied per sequence rather than
    # per string, because a field may also hold characters cp1252 cannot encode,
    # which would make a whole-string round trip fail and silently repair
    # nothing.
    text = MOJIBAKE_SEQ.sub(_undo_misdecode, text)
    return re.sub(r"[ \t]+", " ", text).strip()


def fetch_html(url=URL, attempts=4, timeout=60):
    """GET the page with retries. Returns decoded HTML."""
    session = requests.Session()
    session.headers.update(HEADERS)
    last_err = None
    for i in range(attempts):
        try:
            resp = session.get(url, timeout=timeout)
            resp.raise_for_status()
            resp.encoding = resp.encoding or "utf-8"
            return resp.text
        except Exception as err:
            last_err = err
            wait = 8 * (i + 1)
            print(f"  attempt {i + 1}/{attempts} failed ({err}), retrying in {wait}s")
            time.sleep(wait)
    raise RuntimeError(f"Could not fetch {url}: {last_err}")


def parse_modal(title_cell):
    """Pull the extra fields out of the hidden detail modal, if present."""
    fields = {"description": "", "department": "", "dataset_link": "",
              "contact": "", "youtube": ""}
    modal = title_cell.find("div", id=re.compile(r"^ViewProblemStatement"))
    if not modal:
        return fields

    key_map = {
        "Description": "description",
        "Department": "department",
        "Dataset Link": "dataset_link",
        "Contact info": "contact",
        "Youtube Link": "youtube",
    }
    for row in modal.find_all("tr"):
        th, td = row.find("th"), row.find("td")
        if not th or not td:
            continue
        key = key_map.get(th.get_text(strip=True))
        if not key:
            continue
        if key == "description":
            inner = td.find("div", class_="style-2") or td
            fields[key] = fix_text(inner.get_text("\n", strip=True))
        else:
            fields[key] = fix_text(td.get_text(" ", strip=True))
    return fields


def parse(html_text):
    """Parse the problem statement table into a list of dicts."""
    soup = BeautifulSoup(html_text, "lxml")
    table = soup.find("table", id="dataTablePS")
    if table is None:
        # Fall back to the largest table on the page if the id ever changes.
        tables = soup.find_all("table")
        if not tables:
            sys.exit("No table found. The page layout has changed, or the "
                     "response was a bot-check page rather than the real page.")
        table = max(tables, key=lambda t: len(t.find_all("tr")))
        print("  warning: #dataTablePS not found, using the largest table instead")

    body = table.find("tbody") or table
    records = []
    for tr in body.find_all("tr"):
        tds = tr.find_all("td", recursive=False)
        if len(tds) < 8:
            continue

        title_cell = tds[2]
        link = title_cell.find("a")
        title = fix_text((link or title_cell).get_text(strip=True))

        deadline = fix_text(tds[7].get_text(strip=True))
        try:
            deadline_date = datetime.strptime(deadline, "%d %B %Y").date().isoformat()
        except ValueError:
            deadline_date = None

        sno_raw = tds[0].get_text(strip=True)

        record = {
            "sno": int(sno_raw) if sno_raw.isdigit() else sno_raw,
            "ps_number": fix_text(tds[4].get_text(strip=True)),
            "title": title,
            "org": fix_text(tds[1].get_text(strip=True)),
            "category": fix_text(tds[3].get_text(strip=True)),
            "theme": fix_text(tds[6].get_text(strip=True)),
            "deadline": deadline,
            "deadline_date": deadline_date,
            "ideas": fix_text(tds[5].get_text(strip=True)),
            "scraped_at": SCRAPE_DATE,
        }
        record.update(parse_modal(title_cell))
        records.append(record)

    return records


def export(records, outdir):
    outdir = Path(outdir)
    outdir.mkdir(parents=True, exist_ok=True)

    json_path = outdir / "sih2026_ps.json"
    json_path.write_text(
        json.dumps(records, indent=2, ensure_ascii=False), encoding="utf-8"
    )

    csv_path = outdir / "sih2026_ps.csv"
    with csv_path.open("w", newline="", encoding="utf-8-sig") as fh:
        writer = csv.DictWriter(fh, fieldnames=FIELDNAMES, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(records)

    written = [json_path, csv_path]

    try:
        import pandas as pd
        xlsx_path = outdir / "sih2026_ps.xlsx"
        pd.DataFrame(records)[FIELDNAMES].to_excel(xlsx_path, index=False)
        written.append(xlsx_path)
    except ImportError:
        print("  pandas or openpyxl missing, skipping the Excel export")

    return written


def summarise(records):
    print(f"\nParsed {len(records)} problem statements")
    for field in ("category", "theme"):
        counts = {}
        for r in records:
            counts[r[field]] = counts.get(r[field], 0) + 1
        top = sorted(counts.items(), key=lambda kv: -kv[1])[:8]
        print(f"\nBy {field}:")
        for key, count in top:
            print(f"  {count:4d}  {key}")
    missing = [r["ps_number"] for r in records if not r["description"]]
    if missing:
        print(f"\n{len(missing)} records have an empty description: "
              f"{', '.join(missing[:10])}")


def main():
    ap = argparse.ArgumentParser(description="Scrape SIH 2026 problem statements")
    ap.add_argument("--cache", help="parse this saved HTML file instead of fetching")
    ap.add_argument("--outdir", default=".", help="output folder (default: current)")
    ap.add_argument("--url", default=URL, help="override the source URL")
    args = ap.parse_args()

    if args.cache:
        print(f"Reading cached HTML from {args.cache}")
        html_text = Path(args.cache).read_text(encoding="utf-8", errors="replace")
    else:
        print(f"Fetching {args.url}")
        html_text = fetch_html(args.url)
        raw_path = Path(args.outdir) / "sih2026PS_raw.html"
        raw_path.parent.mkdir(parents=True, exist_ok=True)
        raw_path.write_text(html_text, encoding="utf-8")
        print(f"  raw HTML saved to {raw_path} (reuse it with --cache)")

    records = parse(html_text)
    if not records:
        sys.exit("Zero rows parsed. Open the saved HTML and check the table markup.")

    for path in export(records, args.outdir):
        print(f"  wrote {path}")
    summarise(records)


if __name__ == "__main__":
    main()
