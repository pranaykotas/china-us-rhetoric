#!/usr/bin/env python3
"""
Cleanup script: removes domestic false positives from statements.json.

Uses Claude to re-evaluate each flagged statement (those with no international
signal detected by validate.py) and removes confirmed-domestic ones.

Run AFTER extraction is complete. Safe to interrupt and resume.

Usage:
    python cleanup.py                  # process all flagged statements
    python cleanup.py --dry-run        # show what would be removed, don't save
    python cleanup.py --batch-size 20  # tune API batch size
"""

import argparse
import json
import os
import re
import sys
import time
from pathlib import Path

import anthropic

STATEMENTS_FILE = Path("data/statements.json")
CLEANUP_LOG = Path("data/cleanup_log.json")
REQUEST_DELAY = 0.5

# ── Same signal regexes as validate.py ──────────────────────────────────────

INTL_SIGNALS = re.compile(
    r"\b("
    r"united states|u\.s\.|u\.s\.a\.|usa|america[hn]?|trump|biden|washington|"
    r"pentagon|state department|white house|congress|senate|cia|fbi|"
    r"nato|g7|g20|quad|aukus|five eyes|"
    r"taiwan|hong kong|xinjiang|tibet|south china sea|"
    r"tariff|sanction|decoupl|tech.?war|chip.?ban|export.?control|"
    r"japan|korea|india|russia|europe|european|uk|britain|france|germany|"
    r"united nations|un security council|wto|imf|world bank|"
    r"foreign minister|state councilor|ambassador|bilateral|multilateral|"
    r"diplomatic|diplomacy|sovereignty|territorial integrity|"
    r"hegemony|hegemon|imperialism|cold war|containment|encirclement|"
    r"indo.?pacific|belt and road|bri|"
    r"western.{0,20}(countr|power|nation|world|bloc|alliance|pressure|sanction)|"
    r"(countr|power|nation|world|bloc).{0,20}western"
    r")\b",
    re.IGNORECASE,
)

DOMESTIC_SIGNALS = re.compile(
    r"\b("
    r"anti.?corruption|ccdi|discipline inspection|political bureau standing|"
    r"five.?year plan|common prosperity|rural revitalization|poverty alleviation|"
    r"party congress|plenum|politburo|cpc central|party discipline|"
    r"provincial|prefecture|county.level|village|township|"
    r"pension|social security|healthcare reform|education reform|"
    r"carbon neutral|ecological civili|green development|"
    r"western region development|western.{0,15}develop"
    r")\b",
    re.IGNORECASE,
)

CLASSIFIER_PROMPT = """You are helping clean a dataset of Chinese government statements about the United States.

For each statement below, decide: is it INTERNATIONAL (about the US, US-China relations, or foreign policy) or DOMESTIC (about China's internal affairs only)?

Rules:
- INTERNATIONAL: explicit mention of the US, US actions, US-China relations, Taiwan, trade war, western powers/countries (China uses "the West" to mean the US-led bloc), foreign adversary, sanctions, decoupling, tech war
- DOMESTIC: internal party governance, anti-corruption, domestic economic targets, Five-Year Plan, military discipline, party ideology — even if the topic (tech, military) could relate to the US, if no foreign actor is mentioned or implied, it's DOMESTIC

Return ONLY a JSON array with one object per statement, in the same order:
[
  {"id": <id>, "verdict": "INTERNATIONAL" or "DOMESTIC", "reason": "<one sentence>"},
  ...
]

Statements to classify:
"""


def load_data():
    with open(STATEMENTS_FILE, encoding="utf-8") as f:
        return json.load(f)


def load_cleanup_log() -> dict:
    """Load previously decided verdicts to allow resuming."""
    if CLEANUP_LOG.exists():
        with open(CLEANUP_LOG, encoding="utf-8") as f:
            return json.load(f)
    return {}


def save_cleanup_log(log: dict):
    CLEANUP_LOG.parent.mkdir(parents=True, exist_ok=True)
    with open(CLEANUP_LOG, "w", encoding="utf-8") as f:
        json.dump(log, f, indent=2, ensure_ascii=False)


def flag_candidates(data: list[dict]) -> list[dict]:
    """Return statements with no international signal (same logic as validate.py)."""
    candidates = []
    for entry in data:
        for i, s in enumerate(entry["statements"]):
            combined = " ".join([
                s.get("quote_or_paraphrase", ""),
                s.get("context", ""),
                s.get("topic", ""),
                entry.get("article_title", ""),
            ])
            if not INTL_SIGNALS.search(combined):
                candidates.append({
                    "article_url": entry["article_url"],
                    "statement_index": i,
                    "article_title": entry["article_title"],
                    "article_date": entry["article_date"],
                    "speaker": s.get("speaker", ""),
                    "context": s.get("context", ""),
                    "topic": s.get("topic", ""),
                    "quote": s.get("quote_or_paraphrase", ""),
                    "has_domestic_signal": bool(DOMESTIC_SIGNALS.search(combined)),
                })
    return candidates


def classify_batch(client: anthropic.Anthropic, batch: list[dict]) -> list[dict]:
    """Ask Claude to classify a batch of statements as INTERNATIONAL or DOMESTIC."""
    items_text = "\n\n".join(
        f'ID {i}:\n'
        f'  Article: {b["article_title"][:80]}\n'
        f'  Speaker: {b["speaker"]}\n'
        f'  Context: {b["context"][:120]}\n'
        f'  Topic: {b["topic"]}\n'
        f'  Quote: {b["quote"][:300]}'
        for i, b in enumerate(batch)
    )

    prompt = CLASSIFIER_PROMPT + items_text

    for attempt in range(3):
        try:
            message = client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=2048,
                messages=[{"role": "user", "content": prompt}],
            )
            text = message.content[0].text
            if "```json" in text:
                text = text.split("```json")[1].split("```")[0]
            elif "```" in text:
                text = text.split("```")[1].split("```")[0]
            text = re.sub(r",\s*([}\]])", r"\1", text.strip())
            results = json.loads(text)
            if isinstance(results, list) and len(results) == len(batch):
                return results
            print(f"  Warning: got {len(results)} results for {len(batch)} items, retrying...")
        except (json.JSONDecodeError, IndexError) as e:
            print(f"  Parse error on attempt {attempt+1}: {e}")
        except anthropic.RateLimitError:
            wait = 30 * (attempt + 1)
            print(f"  Rate limited, waiting {wait}s...")
            time.sleep(wait)
        except anthropic.APIError as e:
            print(f"  API error: {e}")
            return []

    print("  Max retries exceeded for this batch.")
    return []


def make_statement_key(article_url: str, statement_index: int) -> str:
    return f"{article_url}::{statement_index}"


def run_cleanup(dry_run: bool = False, batch_size: int = 15):
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("Error: ANTHROPIC_API_KEY not set.")
        sys.exit(1)

    client = anthropic.Anthropic(api_key=api_key)

    print("Loading statements...")
    data = load_data()
    log = load_cleanup_log()

    candidates = flag_candidates(data)
    print(f"Flagged {len(candidates)} statements for review")
    print(f"Already decided: {len(log)}")

    # Only process undecided candidates
    undecided = [
        c for c in candidates
        if make_statement_key(c["article_url"], c["statement_index"]) not in log
    ]
    print(f"Remaining to classify: {len(undecided)}")

    if not undecided:
        print("All candidates already classified.")
    else:
        # Process in batches
        for start in range(0, len(undecided), batch_size):
            batch = undecided[start:start + batch_size]
            end = min(start + batch_size, len(undecided))
            print(f"\nClassifying statements {start+1}–{end} of {len(undecided)}...")

            results = classify_batch(client, batch)

            for item, result in zip(batch, results):
                key = make_statement_key(item["article_url"], item["statement_index"])
                log[key] = {
                    "verdict": result.get("verdict", "UNKNOWN"),
                    "reason": result.get("reason", ""),
                    "speaker": item["speaker"],
                    "article": item["article_title"][:60],
                    "quote_preview": item["quote"][:100],
                }

            save_cleanup_log(log)
            time.sleep(REQUEST_DELAY)

    # Tally results
    domestic_keys = {k for k, v in log.items() if v.get("verdict") == "DOMESTIC"}
    intl_keys = {k for k, v in log.items() if v.get("verdict") == "INTERNATIONAL"}
    unknown_keys = {k for k, v in log.items() if v.get("verdict") not in ("DOMESTIC", "INTERNATIONAL")}

    print(f"\n{'='*60}")
    print(f"CLASSIFICATION RESULTS")
    print(f"{'='*60}")
    print(f"  INTERNATIONAL (keep) : {len(intl_keys)}")
    print(f"  DOMESTIC (remove)    : {len(domestic_keys)}")
    print(f"  UNKNOWN              : {len(unknown_keys)}")

    if domestic_keys:
        print(f"\nStatements to be removed:")
        for key in sorted(domestic_keys):
            v = log[key]
            print(f"  [{v['verdict']}] {v['article'][:50]} | {v['speaker']}")
            print(f"    Reason : {v['reason']}")
            print(f"    Quote  : {v['quote_preview']}")

    if dry_run:
        print(f"\n[DRY RUN] Would remove {len(domestic_keys)} statements. No changes saved.")
        return

    if not domestic_keys:
        print("\nNo domestic statements to remove. Dataset is clean.")
        return

    # Apply removals
    removed = 0
    new_data = []
    for entry in data:
        new_statements = []
        for i, s in enumerate(entry["statements"]):
            key = make_statement_key(entry["article_url"], i)
            if key in domestic_keys:
                removed += 1
            else:
                new_statements.append(s)

        # Only keep article entry if it still has statements
        if new_statements:
            new_entry = dict(entry)
            new_entry["statements"] = new_statements
            new_data.append(new_entry)

    # Save
    with open(STATEMENTS_FILE, "w", encoding="utf-8") as f:
        json.dump(new_data, f, indent=2, ensure_ascii=False)

    total_before = sum(len(e["statements"]) for e in data)
    total_after = sum(len(e["statements"]) for e in new_data)

    print(f"\nRemoved {removed} domestic statements.")
    print(f"statements.json: {total_before} → {total_after} statements")
    print(f"Cleanup log saved to {CLEANUP_LOG}")


def main():
    parser = argparse.ArgumentParser(description="Remove domestic false positives from statements.json")
    parser.add_argument("--dry-run", action="store_true",
                        help="Show what would be removed without saving")
    parser.add_argument("--batch-size", type=int, default=15,
                        help="Statements per API call (default: 15)")
    args = parser.parse_args()

    run_cleanup(dry_run=args.dry_run, batch_size=args.batch_size)


if __name__ == "__main__":
    main()
