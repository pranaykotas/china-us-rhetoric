#!/usr/bin/env python3
"""
Scraper for Tracking People's Daily Substack newsletter.
Extracts article metadata and full text from archive pages.
"""

import argparse
import json
import time
import xml.etree.ElementTree as ET
from email.utils import parsedate_to_datetime
from pathlib import Path

import requests
from bs4 import BeautifulSoup

BASE_URL = "https://trackingpeoplesdaily.substack.com"
FEED_URL = f"{BASE_URL}/feed"
OUTPUT_FILE = Path("data/articles.json")
STATEMENTS_FILE = Path("data/statements.json")
REQUEST_DELAY = 1  # seconds between requests

RSS_NS = {
    "content": "http://purl.org/rss/1.0/modules/content/",
    "dc": "http://purl.org/dc/elements/1.1/",
}


def get_session() -> requests.Session:
    """Create a session with appropriate headers."""
    session = requests.Session()
    session.headers.update({
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Referer": "https://trackingpeoplesdaily.substack.com/",
    })
    return session


def fetch_feed_items(session: requests.Session) -> list[dict]:
    """Fetch RSS feed and return list of post dicts with full content."""
    print(f"Fetching feed: {FEED_URL}")
    try:
        response = session.get(FEED_URL, timeout=30)
        response.raise_for_status()
    except requests.RequestException as e:
        print(f"Error fetching feed: {e}")
        return []

    try:
        root = ET.fromstring(response.content)
    except ET.ParseError as e:
        print(f"Error parsing feed XML: {e}")
        return []

    items = []
    for item in root.iter("item"):
        title = (item.findtext("title") or "").strip()
        link = (item.findtext("link") or "").strip()
        pub_date = (item.findtext("pubDate") or "").strip()
        content_html = item.findtext("content:encoded", default="", namespaces=RSS_NS) or ""
        items.append({
            "title": title,
            "canonical_url": link,
            "post_date": pub_date,
            "content_html": content_html,
        })
    print(f"  Found {len(items)} items in feed")
    return items


def load_processed_urls(statements_file: Path) -> set[str]:
    """Load URLs already processed in statements.json for incremental mode."""
    if not statements_file.exists():
        return set()
    try:
        with open(statements_file, encoding="utf-8") as f:
            data = json.load(f)
        return {entry["article_url"] for entry in data if "article_url" in entry}
    except (json.JSONDecodeError, KeyError):
        return set()


def fetch_all_archive_metadata(
    session: requests.Session,
    known_urls: set[str] | None = None,
) -> list[dict]:
    """Fetch article metadata + content from RSS feed."""
    return fetch_feed_items(session)


def extract_article_text(html: str) -> str:
    """Extract the main article text from an article page."""
    soup = BeautifulSoup(html, "lxml")

    # Find the main article body - Substack uses various classes
    article_body = None

    # Try different selectors
    selectors = [
        "div.body.markup",
        "div.post-content",
        "div.available-content",
        "article",
        "div.single-post",
    ]

    for selector in selectors:
        article_body = soup.select_one(selector)
        if article_body:
            break

    if not article_body:
        # Fallback: get all paragraphs
        paragraphs = soup.find_all("p")
        text = "\n\n".join(p.get_text(strip=True) for p in paragraphs if p.get_text(strip=True))
        return text

    # Get text from the article body
    # Remove script and style elements
    for element in article_body.find_all(["script", "style", "nav", "footer"]):
        element.decompose()

    # Extract text with paragraph breaks, removing consecutive duplicates
    text_parts = []
    for element in article_body.find_all(["p", "h1", "h2", "h3", "h4", "blockquote", "li"]):
        text = element.get_text(strip=True)
        if text and (not text_parts or text != text_parts[-1]):
            text_parts.append(text)

    return "\n\n".join(text_parts)


def fetch_article_content(session: requests.Session, url: str) -> str:
    """Fetch and extract text from a single article."""
    print(f"  Fetching article: {url}")

    try:
        response = session.get(url, timeout=30)
        response.raise_for_status()
    except requests.RequestException as e:
        print(f"  Error fetching article: {e}")
        return ""

    return extract_article_text(response.text)


def parse_date(date_str: str) -> str:
    """Parse date string to YYYY-MM-DD format."""
    if not date_str:
        return ""

    # RFC 822 (RSS pubDate): "Mon, 21 Apr 2025 12:00:00 GMT"
    try:
        return parsedate_to_datetime(date_str).strftime("%Y-%m-%d")
    except (TypeError, ValueError):
        pass

    # ISO format: "2025-02-05T12:00:00.000Z"
    if "T" in date_str and date_str[:4].isdigit():
        return date_str.split("T")[0]

    return date_str


def scrape_all_articles(incremental: bool = False) -> list[dict]:
    """Main function to scrape all articles.

    In incremental mode, loads already-processed URLs from statements.json
    and skips fetching article text for those URLs.
    """
    session = get_session()

    known_urls: set[str] = set()
    if incremental:
        known_urls = load_processed_urls(STATEMENTS_FILE)
        print(f"Incremental mode: {len(known_urls)} articles already processed")

    print("Fetching archive metadata...")
    posts_metadata = fetch_all_archive_metadata(session, known_urls or None)
    print(f"\nFound {len(posts_metadata)} articles in archive")

    # In incremental mode, load existing articles to preserve them
    existing_articles: list[dict] = []
    existing_urls: set[str] = set()
    if incremental and OUTPUT_FILE.exists():
        try:
            with open(OUTPUT_FILE, encoding="utf-8") as f:
                existing_articles = json.load(f)
            existing_urls = {a["url"] for a in existing_articles}
            print(f"Loaded {len(existing_articles)} existing articles")
        except (json.JSONDecodeError, KeyError):
            pass

    articles = list(existing_articles)
    new_count = 0

    for i, post in enumerate(posts_metadata, 1):
        title = post.get("title", "")
        canonical_url = post.get("canonical_url", "")
        post_date = post.get("post_date", "")
        content_html = post.get("content_html", "")

        if not canonical_url:
            print("  Skipping: no URL found")
            continue

        if incremental and canonical_url in existing_urls:
            continue

        print(f"\nProcessing article {i}/{len(posts_metadata)}: {title[:60]}")

        text = extract_article_text(content_html) if content_html else ""

        if not text:
            print("  Warning: no text extracted")

        article = {
            "date": parse_date(post_date),
            "title": title,
            "url": canonical_url,
            "text": text,
        }

        articles.append(article)
        new_count += 1

    if incremental:
        print(f"\nNew articles fetched: {new_count}")

    return articles


def main():
    """Run the scraper and save results."""
    parser = argparse.ArgumentParser(description="Scrape Tracking People's Daily")
    parser.add_argument(
        "--incremental",
        action="store_true",
        help="Only fetch articles not yet in statements.json",
    )
    args = parser.parse_args()

    print("Starting Tracking People's Daily scraper...")
    print("=" * 50)

    articles = scrape_all_articles(incremental=args.incremental)

    print("\n" + "=" * 50)
    print(f"Scraped {len(articles)} articles")

    # Ensure output directory exists
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)

    # Save to JSON
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(articles, f, indent=2, ensure_ascii=False)

    print(f"Saved to {OUTPUT_FILE}")

    # Print summary
    if articles:
        dates = [a["date"] for a in articles if a["date"]]
        if dates:
            print(f"Date range: {min(dates)} to {max(dates)}")


if __name__ == "__main__":
    main()
