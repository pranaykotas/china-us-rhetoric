#!/usr/bin/env python3
"""
Validation script for extracted statements.

Three checks:
1. Coverage & distribution stats (always runs)
2. Grounding check — do extracted quotes share key words with source article?
3. Random sample report — human spot-check of positive and negative cases

Usage:
    python validate.py                        # stats + grounding check
    python validate.py --sample 20            # also print 20 random spot-checks
    python validate.py --sample 10 --seed 42  # reproducible sample
    python validate.py --grounding-threshold 0.15  # flag below 15% word overlap
"""

import argparse
import json
import random
import re
from collections import Counter, defaultdict
from pathlib import Path

ARTICLES_FILE = Path("data/articles.json")
STATEMENTS_FILE = Path("data/statements.json")

# Words too common to be meaningful for grounding checks
STOPWORDS = {
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "that", "this", "is", "are", "was", "were",
    "has", "have", "had", "will", "would", "should", "could", "may", "might",
    "not", "also", "its", "their", "our", "his", "her", "we", "us", "as",
    "it", "be", "been", "being", "said", "says", "china", "chinese", "must",
    "all", "any", "about", "into", "than", "more", "such", "when", "which",
    "there", "they", "what", "who", "how", "can", "do", "does", "did",
}

VALID_TONES = {
    "confrontational", "assertive", "cautious", "neutral", "cooperative", "conciliatory",
}

VALID_TOPICS = {
    "diplomacy", "trade", "taiwan", "military", "technology", "human rights",
    "belt and road", "belt & road", "multilateral", "other",
    "economy", "us-china relations", "international relations",  # common variants
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def load_data():
    with open(ARTICLES_FILE, encoding="utf-8") as f:
        articles = json.load(f)
    with open(STATEMENTS_FILE, encoding="utf-8") as f:
        statements = json.load(f)
    article_map = {a["url"]: a for a in articles}
    return articles, statements, article_map


def tokenize(text: str) -> set[str]:
    """Lower-case words longer than 3 chars, excluding stopwords."""
    words = re.findall(r"[a-z]{4,}", text.lower())
    return {w for w in words if w not in STOPWORDS}


def grounding_score(quote: str, article_text: str) -> float:
    """
    Fraction of significant words in the quote that appear in the article.
    Score of 1.0 = all quote words found; 0.0 = none found.
    Paraphrases score lower than direct quotes — that's expected.
    Threshold for flagging: < 0.10 (very few shared words → possible hallucination).
    """
    q_words = tokenize(quote)
    if not q_words:
        return 1.0
    a_words = tokenize(article_text)
    return len(q_words & a_words) / len(q_words)


# ---------------------------------------------------------------------------
# Check 1: Coverage & distribution stats
# ---------------------------------------------------------------------------

def print_coverage_stats(articles, statements):
    total_articles = len(articles)
    articles_with_stmts = len(statements)
    articles_no_stmts = total_articles - articles_with_stmts
    total_stmts = sum(len(e["statements"]) for e in statements)

    dates = sorted(a["date"] for a in articles if a.get("date"))

    print("\n" + "=" * 60)
    print("COVERAGE")
    print("=" * 60)
    print(f"  Total articles scraped       : {total_articles}")
    print(f"  Articles with statements     : {articles_with_stmts} ({articles_with_stmts/total_articles:.0%})")
    print(f"  Articles with no statements  : {articles_no_stmts} ({articles_no_stmts/total_articles:.0%})")
    print(f"  Total statements extracted   : {total_stmts}")
    print(f"  Avg statements per article   : {total_stmts/articles_with_stmts:.1f}")
    if dates:
        print(f"  Date range                   : {dates[0]} to {dates[-1]}")

    # Tone distribution
    tone_counts: Counter = Counter()
    topic_counts: Counter = Counter()
    importance_counts: Counter = Counter()
    speaker_counts: Counter = Counter()
    speaker_type_counts: Counter = Counter()
    intensity_counts: Counter = Counter()

    for entry in statements:
        for s in entry["statements"]:
            tone_counts[s.get("tone", "unknown")] += 1
            topic_counts[s.get("topic", "unknown")] += 1
            importance_counts[s.get("speaker_importance", "?")] += 1
            speaker_counts[s.get("speaker", "unknown")] += 1
            speaker_type_counts[s.get("speaker_type", "unknown")] += 1
            intensity_counts[s.get("tone_intensity", "?")] += 1

    print("\n" + "=" * 60)
    print("TONE DISTRIBUTION")
    print("=" * 60)
    for tone, count in sorted(tone_counts.items(), key=lambda x: -x[1]):
        bar = "█" * int(count / total_stmts * 40)
        print(f"  {tone:<20} {count:>5}  {count/total_stmts:>5.1%}  {bar}")

    print("\n" + "=" * 60)
    print("TOP 15 TOPICS (raw)")
    print("=" * 60)
    for topic, count in topic_counts.most_common(15):
        print(f"  {topic:<35} {count:>5}  {count/total_stmts:>5.1%}")

    print("\n" + "=" * 60)
    print("SPEAKER TYPE")
    print("=" * 60)
    for stype, count in sorted(speaker_type_counts.items(), key=lambda x: -x[1]):
        print(f"  {stype:<20} {count:>5}  {count/total_stmts:>5.1%}")

    print("\n" + "=" * 60)
    print("TOP 20 SPEAKERS")
    print("=" * 60)
    for speaker, count in speaker_counts.most_common(20):
        print(f"  {speaker:<40} {count:>5}")

    print("\n" + "=" * 60)
    print("SPEAKER IMPORTANCE DISTRIBUTION (1=junior, 5=top leadership)")
    print("=" * 60)
    for level in [5, 4, 3, 2, 1, "?"]:
        count = importance_counts.get(level, 0)
        print(f"  Level {level}: {count:>5}  {count/total_stmts:>5.1%}")

    print("\n" + "=" * 60)
    print("TONE INTENSITY DISTRIBUTION (1=mild, 5=strong)")
    print("=" * 60)
    for level in [1, 2, 3, 4, 5, "?"]:
        count = intensity_counts.get(level, 0)
        print(f"  Intensity {level}: {count:>5}  {count/total_stmts:>5.1%}")


# ---------------------------------------------------------------------------
# Check 2: Grounding check
# ---------------------------------------------------------------------------

def run_grounding_check(statements, article_map, threshold: float = 0.10):
    """
    For each extracted statement, compute how many key words from the
    quote_or_paraphrase appear in the source article text.

    Low-scoring statements are likely hallucinations or severe paraphrases.
    """
    print("\n" + "=" * 60)
    print(f"GROUNDING CHECK (threshold: {threshold:.0%} word overlap)")
    print("=" * 60)

    scores = []
    flagged = []

    for entry in statements:
        article = article_map.get(entry["article_url"])
        if not article:
            continue
        article_text = article.get("text", "")

        for s in entry["statements"]:
            quote = s.get("quote_or_paraphrase", "")
            score = grounding_score(quote, article_text)
            scores.append(score)
            if score < threshold:
                flagged.append({
                    "score": score,
                    "date": entry["article_date"],
                    "article": entry["article_title"][:60],
                    "speaker": s.get("speaker", ""),
                    "quote": quote[:120],
                })

    if not scores:
        print("  No statements to check.")
        return

    avg = sum(scores) / len(scores)
    above_50 = sum(1 for s in scores if s >= 0.50)
    above_25 = sum(1 for s in scores if s >= 0.25)
    above_10 = sum(1 for s in scores if s >= 0.10)

    print(f"  Statements checked           : {len(scores)}")
    print(f"  Avg word-overlap score       : {avg:.2%}")
    print(f"  ≥50% overlap (likely quotes) : {above_50} ({above_50/len(scores):.0%})")
    print(f"  ≥25% overlap (paraphrase OK) : {above_25} ({above_25/len(scores):.0%})")
    print(f"  ≥10% overlap (borderline)    : {above_10} ({above_10/len(scores):.0%})")
    print(f"  Below threshold (flagged)    : {len(flagged)} ({len(flagged)/len(scores):.0%})")

    if flagged:
        flagged.sort(key=lambda x: x["score"])
        print(f"\n  --- Lowest-scoring statements (possible hallucinations) ---")
        for f in flagged[:20]:
            print(f"\n  [{f['score']:.0%}] {f['date']} | {f['article']}")
            print(f"  Speaker: {f['speaker']}")
            print(f"  Quote  : {f['quote']}")
    else:
        print("\n  No statements flagged. All above threshold.")


# ---------------------------------------------------------------------------
# Check 3: Random sample for manual spot-check
# ---------------------------------------------------------------------------

def run_domestic_leakage_check(statements, article_map, sample_size: int = 30, seed: int = 42):
    """
    Check for domestic statements leaking into the dataset.

    A statement is suspicious if neither the quote, context, nor article title
    contain any international signal — no foreign country, no diplomatic venue,
    no foreign-policy language. These are likely purely domestic statements
    that Claude mistakenly treated as US-relevant.

    Note: "the West", "western powers", "western values" are intentionally NOT
    flagged — China uses these to mean the US/Western bloc, which is correct
    to include.
    """

    # Strong international signals — if any appear, statement is clearly external
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

    # Strong domestic-only signals — presence suggests purely internal matter
    DOMESTIC_SIGNALS = re.compile(
        r"\b("
        r"anti.?corruption|ccdi|discipline inspection|political bureau standing|"
        r"five.?year plan|common prosperity|rural revitalization|poverty alleviation|"
        r"party congress|plenum|politburo|cpc central|party discipline|"
        r"provincial|prefecture|county.level|village|township|"
        r"pension|social security|healthcare reform|education reform|"
        r"carbon neutral|ecological civili|green development|"
        r"western region development|western.{0,15}develop"  # 西部大开发
        r")\b",
        re.IGNORECASE,
    )

    flagged = []
    clean = 0

    for entry in statements:
        article = article_map.get(entry["article_url"])
        article_title = entry.get("article_title", "")

        for s in entry["statements"]:
            quote = s.get("quote_or_paraphrase", "")
            context = s.get("context", "")
            topic = s.get("topic", "")

            # Check all text fields together
            combined = f"{quote} {context} {topic} {article_title}"

            has_intl = bool(INTL_SIGNALS.search(combined))
            has_domestic = bool(DOMESTIC_SIGNALS.search(combined))

            if not has_intl:
                flagged.append({
                    "has_domestic_signal": has_domestic,
                    "date": entry["article_date"],
                    "article": article_title[:70],
                    "url": entry["article_url"],
                    "speaker": s.get("speaker", ""),
                    "context": context[:100],
                    "topic": topic,
                    "quote": quote[:200],
                })
            else:
                clean += 1

    total = clean + len(flagged)
    print("\n" + "=" * 60)
    print("DOMESTIC LEAKAGE CHECK")
    print("Flags statements with no detectable international signal")
    print("(quote + context + topic + article title)")
    print("=" * 60)
    print(f"  Statements with clear international signal : {clean} ({clean/total:.0%})")
    print(f"  Statements with NO international signal    : {len(flagged)} ({len(flagged)/total:.0%})")

    domestic_flagged = [f for f in flagged if f["has_domestic_signal"]]
    ambiguous = [f for f in flagged if not f["has_domestic_signal"]]
    print(f"    ↳ Also have domestic signal (higher risk) : {len(domestic_flagged)}")
    print(f"    ↳ Ambiguous (neither signal detected)     : {len(ambiguous)}")

    if not flagged:
        print("\n  No leakage detected.")
        return

    # Show domestic-signal cases first (highest risk), then ambiguous
    ordered = domestic_flagged + ambiguous
    random.seed(seed)
    domestic_show = domestic_flagged[:sample_size]
    remaining_slots = max(0, sample_size - len(domestic_show))
    ambiguous_show = random.sample(ambiguous, min(remaining_slots, len(ambiguous)))
    sample = domestic_show + ambiguous_show

    print(f"\n  --- Showing {len(sample)} flagged statements for review ---")
    print("  Mark each: [OK] legitimately international | [FP] false positive\n")

    for i, f in enumerate(sample, 1):
        risk = "DOMESTIC SIGNAL" if f["has_domestic_signal"] else "ambiguous"
        print(f"  [{i}] {f['date']} | {risk}")
        print(f"  Article : {f['article']}")
        print(f"  Speaker : {f['speaker']}")
        print(f"  Topic   : {f['topic']}")
        print(f"  Context : {f['context']}")
        print(f"  Quote   : {f['quote']}")
        print()


def print_random_sample(statements, article_map, n: int, seed: int):
    """Print N random (article, statement) pairs for human review."""
    random.seed(seed)

    # Collect all (entry, statement) pairs
    pairs = [
        (entry, s)
        for entry in statements
        for s in entry["statements"]
    ]

    sample = random.sample(pairs, min(n, len(pairs)))

    print("\n" + "=" * 60)
    print(f"RANDOM SAMPLE — {len(sample)} statements (seed={seed})")
    print("Verify: does the article text support the extracted statement?")
    print("=" * 60)

    for i, (entry, s) in enumerate(sample, 1):
        article = article_map.get(entry["article_url"])
        article_text = article.get("text", "") if article else ""
        score = grounding_score(s.get("quote_or_paraphrase", ""), article_text)

        print(f"\n[{i}/{len(sample)}] ── {entry['article_date']} ──────────────────")
        print(f"  Article  : {entry['article_title']}")
        print(f"  URL      : {entry['article_url']}")
        print(f"  Speaker  : {s.get('speaker')} ({s.get('speaker_title', '')}, importance={s.get('speaker_importance')})")
        print(f"  Context  : {s.get('context', '')}")
        print(f"  Tone     : {s.get('tone')} (intensity {s.get('tone_intensity')})")
        print(f"  Topic    : {s.get('topic')}")
        print(f"  Framing  : {s.get('framing')}")
        print(f"  Quote    : {s.get('quote_or_paraphrase', '')}")
        print(f"  Grounding: {score:.0%} word overlap with source")

        # Show the most relevant excerpt from the article (50 words around first shared word)
        if article_text:
            q_words = tokenize(s.get("quote_or_paraphrase", ""))
            a_tokens = re.findall(r"\S+", article_text)
            found_idx = next(
                (j for j, w in enumerate(a_tokens) if w.lower().strip(".,;:\"'") in q_words),
                None,
            )
            if found_idx is not None:
                start = max(0, found_idx - 20)
                end = min(len(a_tokens), found_idx + 30)
                excerpt = " ".join(a_tokens[start:end])
                print(f"  Source ↓ : ...{excerpt}...")


def print_negative_sample(articles, statements, article_map, n: int, seed: int):
    """Print N articles marked 'no statements found' for false-negative check."""
    random.seed(seed + 1)

    processed_urls = {e["article_url"] for e in statements}
    no_stmt_articles = [a for a in articles if a["url"] not in processed_urls and a.get("text")]

    sample = random.sample(no_stmt_articles, min(n, len(no_stmt_articles)))

    print("\n" + "=" * 60)
    print(f"FALSE-NEGATIVE CHECK — {len(sample)} 'no statements' articles (seed={seed+1})")
    print("Verify: should any of these have had statements extracted?")
    print("=" * 60)

    for i, a in enumerate(sample, 1):
        print(f"\n[{i}/{len(sample)}] {a['date']} | {a['title']}")
        print(f"  URL    : {a['url']}")
        # Print first 300 chars of text
        preview = a.get("text", "")[:400].replace("\n", " ")
        print(f"  Text   : {preview}...")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Validate statement extraction quality")
    parser.add_argument("--sample", type=int, default=0,
                        help="Number of random statements to spot-check (default: 0 = skip)")
    parser.add_argument("--neg-sample", type=int, default=10,
                        help="Number of 'no statements' articles to spot-check for false negatives (default: 10)")
    parser.add_argument("--seed", type=int, default=42,
                        help="Random seed for reproducible samples (default: 42)")
    parser.add_argument("--grounding-threshold", type=float, default=0.10,
                        help="Flag statements with word-overlap below this fraction (default: 0.10)")
    parser.add_argument("--domestic-sample", type=int, default=30,
                        help="Max flagged statements to show in domestic leakage check (default: 30)")
    args = parser.parse_args()

    print("Loading data...")
    articles, statements, article_map = load_data()

    print_coverage_stats(articles, statements)
    run_grounding_check(statements, article_map, threshold=args.grounding_threshold)
    run_domestic_leakage_check(statements, article_map, sample_size=args.domestic_sample, seed=args.seed)

    if args.sample > 0:
        print_random_sample(statements, article_map, n=args.sample, seed=args.seed)

    if args.neg_sample > 0:
        print_negative_sample(articles, statements, article_map, n=args.neg_sample, seed=args.seed)

    print("\n" + "=" * 60)
    print("Done.")
    print("=" * 60)


if __name__ == "__main__":
    main()
