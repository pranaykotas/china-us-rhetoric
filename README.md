# Tracking People's Daily — China-US Rhetoric Dashboard

An interactive dashboard tracking how Chinese government officials characterize the United States over time, based on systematic analysis of the [Tracking People's Daily](https://trackingpeoplesdaily.substack.com/) newsletter.

**Live dashboard**: https://pranaykotas.github.io/china-us-rhetoric/

**Project by**: Manoj Kewalramani and Pranay Kotasthane (Takshashila Institution)

---

## What This Is

People's Daily is China's official government newspaper. The newsletter summarizes its contents daily, translating and contextualizing statements by Chinese leaders, ministers, and official institutions. This project extracts every statement about the US from that archive, classifies it by tone and topic, and visualizes the patterns.

The dashboard lets you explore:
- How China's rhetoric toward the US has shifted across topics (Taiwan, trade, technology, diplomacy)
- Which officials speak most frequently and how their tone varies
- Month-by-month sentiment trends since January 2021

---

## Data & Methodology

See **[METHODOLOGY.md](METHODOLOGY.md)** for full documentation of the pipeline, including:
- How articles are scraped from the Substack archive
- How Claude AI extracts and classifies statements
- The six-tone taxonomy (confrontational → conciliatory)
- How domestic false positives are detected and removed
- Validation procedures and known limitations

**Short version**: Claude Haiku reads each newsletter article and extracts structured records for every statement a Chinese official makes about the US — speaker, tone, topic, and the quote itself. A second cleanup pass removes statements about purely domestic matters that were incorrectly included. All decisions are logged in `data/cleanup_log.json`.

---

## Repository Structure

```
├── scraper.py              # Scrapes articles from Substack archive API
├── extract.py              # Uses Claude API to extract statements from articles
├── cleanup.py              # Removes domestic false positives via Claude classifier
├── validate.py             # Quality checks: grounding, leakage, random sampling
├── requirements.txt        # Python dependencies
├── METHODOLOGY.md          # Full methodology documentation
│
├── data/
│   ├── statements.json     # Extracted statements (committed, version-controlled)
│   ├── cleanup_log.json    # Audit log of every cleanup decision
│   └── articles.json       # Raw scraped articles (gitignored, large)
│
├── app/                    # React + TypeScript dashboard
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/     # Chart and UI components
│   │   └── utils/          # Data processing and normalization
│   └── public/
│       ├── statements.json # Copy of data for deployment
│       └── commentary.json # Analyst commentary entries
│
├── .github/workflows/
│   └── deploy.yml          # GitHub Pages deploy on push to main
│
└── scripts/
    └── weekly-update.sh    # Local launchd-driven weekly update
```

---

## Running Locally

**Dashboard:**
```bash
cd app
npm install
npm run dev
```

**Data pipeline** (requires `ANTHROPIC_API_KEY`):
```bash
pip install -r requirements.txt

# Full scrape (first time)
python scraper.py

# Extract statements
python extract.py

# Remove domestic false positives
python cleanup.py --dry-run   # preview
python cleanup.py             # apply

# Validate quality
python validate.py --sample 50
```

**Incremental update** (weekly, after initial run):
```bash
python scraper.py --incremental
python extract.py
cp data/statements.json app/public/statements.json
```

---

## Adding Commentary

Analyst commentary appears in the dashboard's "Analysis & Commentary" section. To add an entry, edit `app/public/commentary.json`:

```json
[
  {
    "id": "2026-04-14-01",
    "date": "2026-04-14",
    "author": "Manoj",
    "title": "Your title here",
    "body": "Commentary text. Plain text, newlines preserved.",
    "tags": ["diplomacy", "trade"]
  }
]
```

Commit and push — the site deploys automatically.

---

## Automated Weekly Updates

Substack blocks GitHub Actions IPs, so the weekly update runs **locally on Pranay's Mac** via `launchd`, not in CI.

**Pipeline** (`scripts/weekly-update.sh`):
1. Sources `ANTHROPIC_API_KEY` from `.env` (gitignored)
2. `python3 scraper.py --incremental` — fetches new articles via Substack RSS
3. `python3 extract.py` — extracts statements from new articles only
4. Copies `data/statements.json` → `app/public/statements.json`
5. Commits + pushes; GitHub Pages auto-deploys via `deploy.yml`

**Schedule**: Every Monday 06:00 local, defined in `~/Library/LaunchAgents/com.pranay.tpd-weekly.plist`. Mac must be awake (set wake schedule with `sudo pmset repeat wakeorpoweron M 05:55:00` if needed).

**Logs**: `scripts/logs/YYYY-MM-DD.log` (gitignored).

**Manual run**:
```bash
./scripts/weekly-update.sh
```

**Setup on a new machine**:
```bash
echo 'ANTHROPIC_API_KEY=sk-ant-...' > .env
launchctl load ~/Library/LaunchAgents/com.pranay.tpd-weekly.plist
```
