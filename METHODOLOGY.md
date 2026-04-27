# Methodology: Tracking People's Daily — Statement Extraction

## Overview

This project systematically extracts and classifies statements made by Chinese government officials about the United States, drawing from the [Tracking People's Daily](https://trackingpeoplesdaily.substack.com/) newsletter by Manoj Kewalramani. The newsletter provides daily summaries of China's official state media and government communications.

The goal is to track how China's leadership characterizes the US across topics and over time — creating a structured, queryable record of official Chinese rhetoric.

**Dataset summary (as of April 2026)**:
- 1,153 newsletter articles scraped (January 2021 – April 2026)
- 969 articles contained at least one relevant statement (84%)
- 6,905 statements extracted after cleanup
- 546 domestic false positives removed in cleanup pass
- Residual domestic leakage rate: 8% (down from 15% pre-cleanup)

---

## Data Source

**Newsletter**: Tracking People's Daily (Substack)  
**Coverage**: January 2021 to present  
**Frequency**: Daily (weekdays)  
**Content**: Summaries and translations of Chinese state media (People's Daily, Xinhua, Global Times, CCTV), diplomatic readouts, and official press briefings  
**Collector**: Manoj Kewalramani, Fellow at the Takshashila Institution

The newsletter is chosen as the source because it is already filtered and curated by a domain expert, reducing noise from raw state media scraping. It is publicly available and cited in academic and policy work.

---

## Step 1: Scraping

Articles are scraped from the Substack archive API (`/api/v1/archive`) using pagination (12 posts per page, newest-first). Full article text is extracted from each post's HTML using BeautifulSoup.

**Incremental updates**: In weekly update mode, the scraper compares fetched URLs against already-processed articles and stops pagination when it reaches a page of entirely known posts, avoiding redundant scraping.

**Output**: `data/articles.json` — array of `{date, title, url, text}` objects.

---

## Step 2: Statement Extraction

Each article is passed to **Claude Haiku** (Anthropic, `claude-haiku-4-5-20251001`) with a structured extraction prompt. The model is asked to identify and classify statements made by:

1. Named Chinese government officials (any level — top leadership to spokespersons)
2. Chinese government institutions (ministries, military branches, party organs, state media editorials)

The model returns a JSON array. If no relevant statements are found, it returns `[]`.

### Extraction fields

| Field | Description |
|-------|-------------|
| `speaker` | Name of the official or institution |
| `speaker_type` | `"individual"` or `"institution"` |
| `speaker_title` | Official role (individual) or institution type |
| `speaker_importance` | 1–5 seniority scale (see below) |
| `context` | Where/when the statement was made |
| `quote_or_paraphrase` | Direct quote or accurate paraphrase |
| `topic` | Subject matter (free-form, normalized in frontend) |
| `framing` | How the issue is framed (e.g., defensive, accusatory, constructive) |
| `tone` | One of six canonical tones (see below) |
| `tone_intensity` | 1–5 scale (1 = mild, 5 = strong) |

### Speaker importance scale

| Level | Who |
|-------|-----|
| 5 | Xi Jinping, Politburo Standing Committee, State Council, CPC Central Committee |
| 4 | State Councilors, Vice Premiers, Foreign/Defense Ministers, major ministries (MFA, MND) |
| 3 | Ministers, ambassadors, senior military officers, heads of major agencies |
| 2 | Vice ministers, spokespersons, provincial leaders, secondary departments |
| 1 | Lower-level officials, local government figures, minor agencies |

### Tone taxonomy

Six mutually exclusive tones, ordered from most hostile to most conciliatory:

| Tone | Meaning |
|------|---------|
| Confrontational | Direct accusation, threat, or hostile framing toward the US |
| Assertive | Strong, uncompromising position; firm demands or warnings |
| Cautious | Hedged or restrained language; emphasis on uncertainty or risk |
| Neutral | Factual or procedural; no clear positive or negative valence |
| Cooperative | Openness to dialogue, partnership framing, constructive engagement |
| Conciliatory | Explicit de-escalation, accommodation, or goodwill signaling |

The frontend maps raw tone strings to these six canonical categories to handle LLM variation (e.g., "constructive" → cooperative).

### Topic normalization

Raw topics (free-form from Claude) are normalized to nine categories in the frontend:

Taiwan · Technology · Military & Security · Human Rights & Governance · Belt & Road · Trade & Economy · Multilateral & Global · Diplomacy · Other

Priority ordering ensures specific topics (Taiwan, Technology) override generic ones (Diplomacy).

---

## Step 3: US-Relevance Filtering

The frontend applies an optional filter to retain only statements with a clear US dimension. Positive signals include explicit mentions of "US", "Trump", "tariffs", "hegemony", "decoupling", "AUKUS", "Taiwan". Exclusions include purely bilateral items unrelated to the US (China-Pakistan, panda diplomacy, sister-city exchanges, domestic anti-corruption). Borderline cases are included by default (false positive preferred over false negative).

---

## Step 4: Domestic False-Positive Cleanup

After initial extraction, a second Claude pass re-evaluates statements that lack explicit international signals (no mention of the US, foreign countries, or diplomatic contexts). Each flagged statement is classified as INTERNATIONAL (keep) or DOMESTIC (remove).

**What is excluded in this pass:**
- Internal party governance and anti-corruption statements
- Domestic economic policy (Five-Year Plans, industrial targets) with no foreign adversary framing
- Military discipline and ideological campaigns with no external reference

**What is retained:**
- Statements about "the West" or "western countries/powers" — China uses these to mean the US-led bloc; these are intentionally kept
- Technology or military statements where foreign competition or adversarial framing is implied

This pass is run once after full extraction (`python cleanup.py`) and produces `data/cleanup_log.json` logging every decision and reason. The log is committed to the repository for full transparency.

---

## Dashboard Metrics

The dashboard computes four summary metrics from the extracted statements:

| Metric | Definition |
|--------|------------|
| **Convergence Signal** | 3-month rolling weighted average of the Sentiment Index, mapped to a 0–100% scale. Measures the current likelihood of US-China diplomatic convergence based on sustained rhetoric direction (not single-month spikes). Includes a trend arrow (↑↓→) vs. the prior 3-month window. |
| **Hostility Rate** | Percentage of statements classified as confrontational or assertive, weighted by statement volume across months. |
| **Cooperation Rate** | Percentage of statements classified as cooperative or conciliatory, weighted by statement volume across months. |
| **Avg Intensity** | Weighted average tone intensity (1–5 scale) across all statements in the period. |

### Sentiment Index (underlying calculation)

Each statement is assigned a tone score on a [-2, +2] scale:

| Tone | Score |
|------|-------|
| Confrontational | −2 |
| Assertive | −1 |
| Cautious / Neutral | 0 |
| Cooperative | +1 |
| Conciliatory | +2 |

The monthly Sentiment Index is a **speaker-importance-weighted** average of these scores — statements from Xi Jinping (importance 5) carry more weight than spokesperson statements (importance 2).

### Convergence Signal formula

```
3m_sentiment = Σ(sentimentIndex_month × statements_month) / Σ(statements_month)
               over the last 3 months of the selected period

convergence_pct = round((3m_sentiment + 2) / 4 × 100)
```

A value of 50% indicates neutral rhetoric; above 50% signals a sustained cooperative lean; below 50% indicates sustained hostility.

---

## Known Limitations

1. **Source dependency**: The newsletter covers what Manoj deems newsworthy. Statements he does not include are absent from the dataset.

2. **LLM extraction error**: Claude may occasionally misattribute a statement, hallucinate a quote not in the source, or miss a statement in a dense article. The `validate.py` script checks for these using word-overlap grounding scores.

3. **Truncation**: Very long articles (500+ statements' worth of content) may exceed the model's output token limit (8192 tokens). A partial-recovery algorithm salvages complete statements from truncated responses.

4. **Tone subjectivity**: The six-tone taxonomy requires judgment. Two human coders may classify the same statement differently. The model applies the taxonomy consistently but may not match all expert judgments.

5. **Topic normalization**: Raw topics from Claude vary widely. Frontend normalization uses keyword matching and may misclassify edge cases.

6. **Paraphrase fidelity**: The newsletter often paraphrases rather than directly quotes Chinese officials. The model extracts these paraphrases, which may slightly alter nuance.

---

## Validation

Run `validate.py` to check extraction quality:

```bash
python validate.py --sample 50 --neg-sample 20 --seed 42
```

This produces:
- **Coverage stats**: articles processed, statement counts, tone/topic/speaker distributions
- **Grounding check**: word-overlap between extracted quotes and source article text (low overlap flags possible hallucinations)
- **Random sample**: 50 human-reviewable (article, statement) pairs with source text excerpts
- **False-negative check**: 20 articles classified as "no statements" for manual review

---

## Weekly Update Pipeline

1. Scraper fetches new articles since last run (incremental mode)
2. Extractor processes only new articles (resume logic via URL deduplication)
3. Updated `statements.json` committed to GitHub
4. GitHub Pages site rebuilds automatically

Automated via GitHub Actions (`.github/workflows/update-data.yml`), runs every Monday 6am UTC.
