#!/bin/bash
set -euo pipefail

REPO="/Users/pranay-karma/Projects/TrackingPeoplesDaily"
LOG_DIR="$REPO/scripts/logs"
mkdir -p "$LOG_DIR"
LOG="$LOG_DIR/$(date +%Y-%m-%d).log"

exec >> "$LOG" 2>&1
echo "===== Run at $(date) ====="

# Run daily until 2026-05-19 (Trump-Xi window), then weekly Mon only
DAILY_UNTIL="20260519"
TODAY=$(date +%Y%m%d)
DOW=$(date +%u)  # 1=Mon ... 7=Sun
if [ "$TODAY" -gt "$DAILY_UNTIL" ] && [ "$DOW" -ne 1 ]; then
  echo "Past daily window and not Monday — skipping"
  exit 0
fi

cd "$REPO"

if [ -f .env ]; then
  set -a
  . ./.env
  set +a
fi

if [ -z "${ANTHROPIC_API_KEY:-}" ]; then
  echo "ERROR: ANTHROPIC_API_KEY not set"
  exit 1
fi

PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"
export PATH

echo "--- scraper ---"
python3 scraper.py --incremental

echo "--- extract ---"
python3 extract.py

echo "--- sync ---"
cp data/statements.json app/public/statements.json

echo "--- git ---"
git add data/statements.json app/public/statements.json
if git diff --staged --quiet; then
  echo "No changes to commit"
  exit 0
fi
git commit -m "chore: weekly data update $(date +%Y-%m-%d)"
git push

echo "===== Done ====="
