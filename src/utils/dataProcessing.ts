import {
  CanonicalTone,
  TopicCategory,
  FlattenedStatement,
  EnrichedStatement,
  MonthlyBucket,
} from '../types';

const CANONICAL_TONES: CanonicalTone[] = [
  'confrontational', 'assertive', 'cautious', 'neutral', 'cooperative', 'conciliatory',
];

const TOPIC_CATEGORIES: TopicCategory[] = [
  'Diplomacy', 'Trade & Economy', 'Taiwan', 'Technology',
  'Military & Security', 'Human Rights & Governance', 'Belt & Road',
  'Multilateral & Global', 'Other',
];

// Tone sentiment scores for weighted index: -2 (hostile) to +2 (friendly)
const TONE_SCORES: Record<CanonicalTone, number> = {
  confrontational: -2,
  assertive: -1,
  cautious: 0,
  neutral: 0,
  cooperative: 1,
  conciliatory: 2,
};

/**
 * Normalize composite/variant tone strings to one of 6 canonical tones.
 * Priority: confrontational > conciliatory > cooperative > assertive > cautious > neutral
 */
export function normalizeTone(raw: string): CanonicalTone {
  const lower = raw.toLowerCase().trim();

  if (lower.includes('confrontational')) return 'confrontational';
  if (lower.includes('conciliatory')) return 'conciliatory';
  if (lower.includes('cooperative') || lower.includes('constructive') || lower.includes('encouraging') || lower.includes('supportive')) return 'cooperative';
  if (lower.includes('assertive') || lower.includes('confident')) return 'assertive';
  if (lower.includes('cautious')) return 'cautious';
  if (lower.includes('neutral')) return 'neutral';

  return 'neutral';
}

/**
 * Map raw topic strings (936 variants) to ~9 categories using keyword matching.
 */
export function normalizeTopic(raw: string): TopicCategory {
  const lower = raw.toLowerCase();

  // Taiwan first — very specific
  if (lower.includes('taiwan') || lower.includes('one-china') || lower.includes('separatism') || lower.includes('reunification') || lower.includes('cross-strait')) {
    return 'Taiwan';
  }

  // Technology
  if (lower.includes('tech') || lower.includes('ai ') || lower.includes('artificial intelligence') || lower.includes('semiconductor') || lower.includes('cyber') || lower.includes('digital') || lower.includes('innovation') || lower.includes('5g') || lower.includes('chip')) {
    return 'Technology';
  }

  // Military & Security
  if (lower.includes('military') || lower.includes('defense') || lower.includes('defence') || lower.includes('security') || lower.includes('south china sea') || lower.includes('arms') || lower.includes('nuclear') || lower.includes('navy') || lower.includes('army') || lower.includes('pla') || lower.includes('weapon')) {
    return 'Military & Security';
  }

  // Human Rights & Governance
  if (lower.includes('human rights') || lower.includes('xinjiang') || lower.includes('hong kong') || lower.includes('tibet') || lower.includes('uyghur') || lower.includes('democracy') || lower.includes('governance') || lower.includes('sanction')) {
    return 'Human Rights & Governance';
  }

  // Belt & Road
  if (lower.includes('belt and road') || lower.includes('bri') || lower.includes('silk road') || lower.includes('connectivity') || lower.includes('infrastructure')) {
    return 'Belt & Road';
  }

  // Trade & Economy
  if (lower.includes('trade') || lower.includes('tariff') || lower.includes('econom') || lower.includes('commerce') || lower.includes('investment') || lower.includes('financial') || lower.includes('market') || lower.includes('supply chain') || lower.includes('export') || lower.includes('import') || lower.includes('fiscal') || lower.includes('gdp') || lower.includes('growth')) {
    return 'Trade & Economy';
  }

  // Multilateral & Global
  if (lower.includes('multilateral') || lower.includes('brics') || lower.includes('united nations') || lower.includes('un ') || lower.includes('global governance') || lower.includes('international order') || lower.includes('g20') || lower.includes('sco') || lower.includes('apec') || lower.includes('wto') || lower.includes('climate') || lower.includes('developing countries') || lower.includes('global south')) {
    return 'Multilateral & Global';
  }

  // Diplomacy — broad catch for bilateral relations, diplomatic meetings, etc.
  if (lower.includes('bilateral') || lower.includes('diplom') || lower.includes('relations') || lower.includes('cooperation') || lower.includes('summit') || lower.includes('visit') || lower.includes('dialogue') || lower.includes('engagement') || lower.includes('foreign') || lower.includes('partnership') || lower.includes('strategic') || lower.includes('sovereignty') || lower.includes('core interests')) {
    return 'Diplomacy';
  }

  return 'Other';
}

// Positive signals that a statement is about US-China relations (direct or indirect).
// Checked across topic + context + quote_or_paraphrase.
const US_POSITIVE_SIGNALS = [
  // Explicit US references
  'united states', 'u.s.', ' us ', 'america', 'washington', 'trump', 'biden',
  'us-china', 'china-us', 'china-u.s.', 'u.s.-china', 'sino-american',
  // Trade war / economic coercion
  'tariff', 'trade war', 'economic coercion', 'section 232', 'section 301',
  'entity list', 'export control', 'reciprocal',
  'protectionism', 'trade barrier', 'trade friction', 'trade dispute',
  // Coded anti-US language
  'hegemony', 'hegemonism', 'unilateralism', 'unilateral',
  'cold war mentality', 'cold-war', 'containment', 'zero-sum', 'zero sum',
  'power politics', 'bloc confrontation', 'bloc politics',
  'decoupling', 'de-risking', 'de-coupling',
  'long-arm jurisdiction', 'extraterritorial',
  'small yard', 'high fence', 'small circles',
  // Alliance system
  'nato', 'aukus', 'quad', 'five eyes', 'indo-pacific', 'indo pacific',
  'alliance system', 'military alliance', 'expand alliance',
  // Taiwan as US issue
  'taiwan', 'one-china', 'one china principle',
  // Tech competition
  'semiconductor', 'chip war', 'tech war', 'technology blockade',
  'ai governance', 'technology restriction',
  // Multipolar / anti-hegemonic order
  'multipolar', 'multi-polar', 'unipolarity', 'unipolar',
  'true multilateralism', 'democratization of international relations',
  'reform of global governance', 'reform global governance',
  // Security / military
  'south china sea', 'freedom of navigation', 'thaad', 'missile defense',
  'missile defence', 'arms sales',
  // Specific bilateral issues
  'fentanyl', 'counternarcotics', 'counter-narcotics',
  // Strategic response language
  'self-reliance', 'dual circulation', 'breaking the encirclement',
  'break the encirclement', 'external containment', 'external suppression',
  'breaking chains', 'breaking of chains',
];

// Non-US bilateral topics — only exclude if NO positive signal is found
const NON_US_EXCLUSION_PATTERNS = [
  'china-pakistan', 'china-sri lanka', 'china-nepal', 'china-bangladesh',
  'china-cambodia', 'china-laos', 'china-myanmar', 'china-thailand',
  'china-vietnam', 'china-singapore', 'china-malaysia', 'china-indonesia',
  'china-kazakhstan', 'china-uzbekistan', 'china-turkmenistan',
  'china-brazil', 'china-argentina', 'china-mexico', 'china-cuba',
  'china-saudi', 'china-iran', 'china-iraq', 'china-africa',
  'china-egypt', 'china-nigeria', 'china-kenya', 'china-ethiopia',
  'anti-corruption', 'party discipline', 'party governance',
  'internal party', 'political rectification', 'inspection work',
  'sister city', 'people-to-people', 'cultural exchange',
  'pandas', 'panda diplomacy',
];

/**
 * Determine if a statement is about US-China relations (directly or indirectly).
 * Uses a positive-signal approach: checks topic, context, and quote for any
 * US-related keyword (explicit or coded language like "hegemony", "unilateralism").
 *
 * Statements about China-Pakistan friendship, internal party discipline,
 * cultural exchanges, etc. are excluded — unless they also contain a US signal.
 */
export function isUSRelevant(s: FlattenedStatement): boolean {
  const text = `${s.topic} ${s.context} ${s.quote_or_paraphrase}`.toLowerCase();

  // Check for any positive US-relevance signal
  const hasPositiveSignal = US_POSITIVE_SIGNALS.some((kw) => text.includes(kw));
  if (hasPositiveSignal) return true;

  // If the topic explicitly names a non-US bilateral relationship or domestic issue,
  // and there's no positive signal, exclude it
  const topicLower = s.topic.toLowerCase();
  const hasExclusion = NON_US_EXCLUSION_PATTERNS.some((kw) => topicLower.includes(kw));
  if (hasExclusion) return false;

  // For ambiguous statements (generic "diplomacy", "bilateral relations" without
  // country-specific topic), check the broader text for common US-adjacent themes.
  // These are softer signals that still indicate US-relevance in context.
  const softSignals = [
    'major power', 'great power', 'superpower', 'international order',
    'new type of international relations', 'community with a shared future',
    'win-win', 'mutual respect', 'peaceful coexistence',
    'non-interference', 'core interests', 'sovereignty',
    'developing countries', 'global south',
  ];
  const hasSoftSignal = softSignals.some((kw) => text.includes(kw));
  if (hasSoftSignal) return true;

  // Default: include if we can't clearly exclude
  // (Better to include borderline statements than miss relevant ones)
  return true;
}

/**
 * Enrich flattened statements with normalized tone, topic, and US-relevance flag.
 */
export function enrichStatements(statements: FlattenedStatement[]): EnrichedStatement[] {
  return statements.map((s) => ({
    ...s,
    canonicalTone: normalizeTone(s.tone),
    topicCategory: normalizeTopic(s.topic),
    isUSRelevant: isUSRelevant(s),
  }));
}

function emptyToneCounts(): Record<CanonicalTone, number> {
  return { confrontational: 0, assertive: 0, cautious: 0, neutral: 0, cooperative: 0, conciliatory: 0 };
}

function emptyTopicCounts(): Record<TopicCategory, number> {
  const counts = {} as Record<TopicCategory, number>;
  for (const cat of TOPIC_CATEGORIES) counts[cat] = 0;
  return counts;
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Aggregate enriched statements into monthly buckets for trend charts.
 */
export function aggregateMonthly(statements: EnrichedStatement[]): MonthlyBucket[] {
  const bucketMap = new Map<string, {
    statements: EnrichedStatement[];
    toneCounts: Record<CanonicalTone, number>;
    topicCounts: Record<TopicCategory, number>;
    speakerCounts: Record<string, number>;
    intensitySum: number;
    sentimentWeightedSum: number;
    sentimentWeightSum: number;
  }>();

  for (const s of statements) {
    const date = s.article_date;
    if (!date) continue;
    const month = date.substring(0, 7); // "YYYY-MM"

    if (!bucketMap.has(month)) {
      bucketMap.set(month, {
        statements: [],
        toneCounts: emptyToneCounts(),
        topicCounts: emptyTopicCounts(),
        speakerCounts: {},
        intensitySum: 0,
        sentimentWeightedSum: 0,
        sentimentWeightSum: 0,
      });
    }

    const bucket = bucketMap.get(month)!;
    bucket.statements.push(s);
    bucket.toneCounts[s.canonicalTone]++;
    bucket.topicCounts[s.topicCategory]++;
    bucket.speakerCounts[s.speaker] = (bucket.speakerCounts[s.speaker] || 0) + 1;
    bucket.intensitySum += s.tone_intensity;

    const weight = s.speaker_importance ?? 3;
    bucket.sentimentWeightedSum += TONE_SCORES[s.canonicalTone] * weight;
    bucket.sentimentWeightSum += weight;
  }

  const months = [...bucketMap.keys()].sort();

  return months.map((month) => {
    const b = bucketMap.get(month)!;
    const total = b.statements.length;
    const [year, m] = month.split('-');
    const label = `${MONTH_LABELS[parseInt(m, 10) - 1]} ${year}`;

    const tonePercents = {} as Record<CanonicalTone, number>;
    for (const tone of CANONICAL_TONES) {
      tonePercents[tone] = total > 0 ? Math.round((b.toneCounts[tone] / total) * 1000) / 10 : 0;
    }

    const hostileCount = b.toneCounts.confrontational + b.toneCounts.assertive;
    const cooperativeCount = b.toneCounts.cooperative + b.toneCounts.conciliatory;

    return {
      month,
      label,
      total,
      toneCounts: b.toneCounts,
      tonePercents,
      topicCounts: b.topicCounts,
      avgIntensity: total > 0 ? Math.round((b.intensitySum / total) * 100) / 100 : 0,
      sentimentIndex: b.sentimentWeightSum > 0
        ? Math.round((b.sentimentWeightedSum / b.sentimentWeightSum) * 100) / 100
        : 0,
      hostilityRate: total > 0 ? Math.round((hostileCount / total) * 1000) / 10 : 0,
      cooperationRate: total > 0 ? Math.round((cooperativeCount / total) * 1000) / 10 : 0,
      speakerCounts: b.speakerCounts,
    };
  });
}

/**
 * Aggregate into quarterly buckets by grouping monthly data.
 */
export function aggregateQuarterly(monthlyBuckets: MonthlyBucket[]): MonthlyBucket[] {
  const quarterMap = new Map<string, MonthlyBucket[]>();

  for (const bucket of monthlyBuckets) {
    const [year, m] = bucket.month.split('-');
    const q = Math.ceil(parseInt(m, 10) / 3);
    const key = `${year}-Q${q}`;
    if (!quarterMap.has(key)) quarterMap.set(key, []);
    quarterMap.get(key)!.push(bucket);
  }

  const quarters = [...quarterMap.keys()].sort();
  return quarters.map((key) => {
    const buckets = quarterMap.get(key)!;
    const total = buckets.reduce((s, b) => s + b.total, 0);

    const toneCounts = emptyToneCounts();
    const topicCounts = emptyTopicCounts();
    const speakerCounts: Record<string, number> = {};

    let intensitySum = 0;
    let sentWeightedSum = 0;
    let sentWeightTotalSum = 0;

    for (const b of buckets) {
      for (const tone of CANONICAL_TONES) toneCounts[tone] += b.toneCounts[tone];
      for (const cat of TOPIC_CATEGORIES) topicCounts[cat] += b.topicCounts[cat];
      for (const [sp, c] of Object.entries(b.speakerCounts)) {
        speakerCounts[sp] = (speakerCounts[sp] || 0) + c;
      }
      intensitySum += b.avgIntensity * b.total;
      sentWeightedSum += b.sentimentIndex * b.total;
      sentWeightTotalSum += b.total;
    }

    const tonePercents = {} as Record<CanonicalTone, number>;
    for (const tone of CANONICAL_TONES) {
      tonePercents[tone] = total > 0 ? Math.round((toneCounts[tone] / total) * 1000) / 10 : 0;
    }

    const hostileCount = toneCounts.confrontational + toneCounts.assertive;
    const cooperativeCount = toneCounts.cooperative + toneCounts.conciliatory;

    return {
      month: key,
      label: key,
      total,
      toneCounts,
      tonePercents,
      topicCounts,
      avgIntensity: total > 0 ? Math.round((intensitySum / total) * 100) / 100 : 0,
      sentimentIndex: sentWeightTotalSum > 0
        ? Math.round((sentWeightedSum / sentWeightTotalSum) * 100) / 100
        : 0,
      hostilityRate: total > 0 ? Math.round((hostileCount / total) * 1000) / 10 : 0,
      cooperationRate: total > 0 ? Math.round((cooperativeCount / total) * 1000) / 10 : 0,
      speakerCounts,
    };
  });
}
