#!/usr/bin/env python3
"""
Extractor for Chinese government official statements about the US.
Uses Anthropic Claude API to analyze articles and extract structured data.
"""

import json
import os
import re
import sys
import time
from pathlib import Path

import anthropic

INPUT_FILE = Path("data/articles.json")
OUTPUT_FILE = Path("data/statements.json")
REQUEST_DELAY = 1  # seconds between requests

EXTRACTION_PROMPT = """Analyze this article and extract any statements about the United States, US-China relations, or US policy made by:
1. Named Chinese government officials at all levels — top leaders, ministers, military officers, diplomats, spokespersons, provincial officials, and any other government-affiliated figures.
2. Chinese government ministries, departments, agencies, or organizations (e.g., Ministry of Foreign Affairs, Ministry of Commerce, Ministry of National Defense, State Council, People's Liberation Army, Xinhua, People's Daily editorial, China's Supreme Court, National Development and Reform Commission, etc.) — including official statements, readouts, editorials, or communiqués attributed to the institution rather than a specific individual.

IMPORTANT — what to INCLUDE:
- Statements that explicitly address the US, US actions, US policy, or the China-US relationship
- Statements about "the West", "western countries", or "western powers" — China uses these terms to mean the US-led Western bloc; include them
- Statements about Taiwan, South China Sea, trade wars, technology competition, or sanctions where a foreign adversary (implicitly the US) is the clear subject

IMPORTANT — what to EXCLUDE:
- Purely domestic statements: internal party governance, anti-corruption campaigns, party discipline, domestic economic policy targets, provincial development plans, rural revitalization, Five-Year Plan targets — even if the topic (technology, military, economy) has a potential US dimension
- Statements about military readiness, anti-corruption, or ideological campaigns that make no reference to a foreign actor
- Domestic industrial policy (e.g., "develop future industries", "support domestic enterprises") with no explicit foreign competition or adversary framing
- Statements about China's relations with non-Western countries (Africa, Southeast Asia, Pakistan, Iran) that do not involve the US

The test: ask whether the statement would appear in a briefing on China-US relations. If it is purely about China's internal affairs, exclude it.

For each statement found, provide:
- speaker: Name of the Chinese official OR the name of the ministry/organization making the statement
- speaker_type: Either "individual" or "institution"
- speaker_title: Their official title/role (for individuals) or type of institution (for institutions, e.g., "Ministry", "State media", "Military branch", "Party organ")
- speaker_importance: 1-5 scale based on seniority and influence:
  5 = Top leadership (e.g., Xi Jinping, Li Qiang, Politburo Standing Committee) or top-level party/state organs (e.g., State Council, CPC Central Committee)
  4 = Senior officials (e.g., State Councilors, Vice Premiers, Foreign/Defense Ministers, Wang Yi) or major ministries (e.g., Ministry of Foreign Affairs, Ministry of National Defense)
  3 = Ministers, ambassadors, senior military officers, heads of major agencies, or their respective organizations
  2 = Vice ministers, spokespersons, provincial leaders, or secondary agencies/departments
  1 = Lower-level officials, local government figures, minor agencies
- context: Where/when the statement was made (e.g., press conference, state media, meeting)
- quote_or_paraphrase: The actual statement or accurate paraphrase
- topic: Main subject (e.g., trade, Taiwan, diplomacy, military, technology, economy)
- framing: How the statement frames the issue (e.g., defensive, accusatory, constructive)
- tone: One of: confrontational, assertive, cautious, neutral, cooperative, conciliatory
- tone_intensity: 1-5 scale (1=mild, 5=strong)

Return ONLY a JSON array. If no relevant statements are found, return an empty array [].

Example output format:
[
  {
    "speaker": "Xi Jinping",
    "speaker_type": "individual",
    "speaker_title": "President",
    "speaker_importance": 5,
    "context": "Speech at APEC summit",
    "quote_or_paraphrase": "The US and China must find ways to coexist peacefully",
    "topic": "diplomacy",
    "framing": "constructive",
    "tone": "cooperative",
    "tone_intensity": 3
  },
  {
    "speaker": "Mao Ning",
    "speaker_type": "individual",
    "speaker_title": "Foreign Ministry Spokesperson",
    "speaker_importance": 2,
    "context": "Regular press briefing",
    "quote_or_paraphrase": "China urges the US to stop interfering in China's internal affairs",
    "topic": "diplomacy",
    "framing": "accusatory",
    "tone": "assertive",
    "tone_intensity": 3
  },
  {
    "speaker": "Ministry of Commerce",
    "speaker_type": "institution",
    "speaker_title": "Ministry",
    "speaker_importance": 4,
    "context": "Official statement on trade measures",
    "quote_or_paraphrase": "China will take necessary countermeasures against US tariff increases",
    "topic": "trade",
    "framing": "defensive",
    "tone": "assertive",
    "tone_intensity": 4
  }
]

Article to analyze:

"""


def get_api_key() -> str:
    """Get Anthropic API key from environment."""
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if api_key:
        return api_key

    print("Error: No API key found.")
    print("Please set ANTHROPIC_API_KEY environment variable.")
    sys.exit(1)


def _recover_partial_json(text: str) -> list[dict]:
    """Salvage complete statement objects from a truncated JSON array.

    Finds the last complete `}` at the top level of the array and closes
    the array there, then parses what we have.
    """
    text = text.strip()
    if not text.startswith("["):
        return []

    # Walk backwards from the end to find the last `}` that closes a top-level object
    depth = 0
    last_complete = -1
    in_string = False
    escape_next = False

    for i, ch in enumerate(text):
        if escape_next:
            escape_next = False
            continue
        if ch == "\\" and in_string:
            escape_next = True
            continue
        if ch == '"':
            in_string = not in_string
            continue
        if in_string:
            continue
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                last_complete = i

    if last_complete == -1:
        return []

    candidate = text[: last_complete + 1] + "]"
    # Fix trailing commas
    candidate = re.sub(r",\s*\]", "]", candidate)
    try:
        result = json.loads(candidate)
        return result if isinstance(result, list) else []
    except json.JSONDecodeError:
        return []


def extract_statements_from_article(client: anthropic.Anthropic, article: dict, max_retries: int = 3) -> list[dict]:
    """Use Claude to extract statements from a single article with retry logic."""
    article_text = article.get("text", "")

    if not article_text or len(article_text.strip()) < 100:
        return []

    prompt = EXTRACTION_PROMPT + article_text

    for attempt in range(max_retries):
        try:
            message = client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=8192,
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )

            response_text = message.content[0].text

            # Parse JSON from response
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0]
            elif "```" in response_text:
                response_text = response_text.split("```")[1].split("```")[0]

            response_text = response_text.strip()
            # Fix trailing commas before ] or } (common LLM JSON error)
            response_text = re.sub(r',\s*([}\]])', r'\1', response_text)

            statements = json.loads(response_text)

            if not isinstance(statements, list):
                return []

            return statements

        except json.JSONDecodeError as e:
            print(f"  JSON parsing error: {e} — attempting partial recovery")
            # Response was likely truncated mid-token. Try to salvage complete
            # statement objects that appeared before the truncation point.
            recovered = _recover_partial_json(response_text)
            if recovered:
                print(f"  Recovered {len(recovered)} statement(s) from truncated response")
                return recovered
            print("  Recovery failed, skipping article")
            return []
        except anthropic.RateLimitError:
            wait_time = 30 * (attempt + 1)
            print(f"  Rate limited. Waiting {wait_time}s before retry {attempt + 1}/{max_retries}...")
            time.sleep(wait_time)
        except anthropic.APIError as e:
            print(f"  API error: {e}")
            return []

    print("  Max retries exceeded, skipping article")
    return []


def load_existing_results() -> tuple[list[dict], set[str]]:
    """Load previously saved results to support resuming."""
    if OUTPUT_FILE.exists():
        with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
            results = json.load(f)
        processed_urls = {r["article_url"] for r in results}
        return results, processed_urls
    return [], set()


def save_results(results: list[dict]):
    """Save results to output file."""
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)


def process_all_articles(articles: list[dict]) -> list[dict]:
    """Process all articles and extract statements, resuming from previous progress."""
    api_key = get_api_key()
    client = anthropic.Anthropic(api_key=api_key)

    # Load existing results to resume
    results, processed_urls = load_existing_results()
    if processed_urls:
        print(f"Resuming: {len(processed_urls)} articles already processed")

    total_statements = sum(len(r["statements"]) for r in results)
    skipped = 0

    for i, article in enumerate(articles, 1):
        title = article.get("title", "Unknown")
        url = article.get("url", "")

        # Skip already processed articles
        if url in processed_urls:
            skipped += 1
            continue

        print(f"\nProcessing article {i}/{len(articles)}: {title[:50]}...")

        statements = extract_statements_from_article(client, article)

        if statements:
            result = {
                "article_url": url,
                "article_date": article.get("date", ""),
                "article_title": article.get("title", ""),
                "statements": statements,
            }
            results.append(result)
            total_statements += len(statements)
            print(f"  Found {len(statements)} statement(s)")
        else:
            print("  No relevant statements found")

        # Save progress every 10 articles
        if (i - skipped) % 10 == 0:
            save_results(results)
            print(f"  [Progress saved: {total_statements} statements so far]")

        time.sleep(REQUEST_DELAY)

    print(f"\n{'=' * 50}")
    print(f"Total: {total_statements} statements from {len(results)} articles")

    return results


def main():
    """Run the extraction pipeline."""
    print("Starting statement extraction...")
    print("=" * 50)

    # Load articles
    if not INPUT_FILE.exists():
        print(f"Error: {INPUT_FILE} not found. Run scraper.py first.")
        sys.exit(1)

    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        articles = json.load(f)

    print(f"Loaded {len(articles)} articles from {INPUT_FILE}")

    # Process articles
    results = process_all_articles(articles)

    # Save final results
    save_results(results)
    print(f"\nSaved to {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
