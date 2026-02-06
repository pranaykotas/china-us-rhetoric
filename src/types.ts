export type CanonicalTone = 'confrontational' | 'assertive' | 'cautious' | 'neutral' | 'cooperative' | 'conciliatory';

export type TopicCategory =
  | 'Diplomacy'
  | 'Trade & Economy'
  | 'Taiwan'
  | 'Technology'
  | 'Military & Security'
  | 'Human Rights & Governance'
  | 'Belt & Road'
  | 'Multilateral & Global'
  | 'Other';

export interface Statement {
  speaker: string;
  speaker_type?: string;
  speaker_title?: string;
  speaker_importance?: number;
  context: string;
  quote_or_paraphrase: string;
  topic: string;
  framing: string;
  tone: string;
  tone_intensity: number;
}

export interface ArticleStatements {
  article_url: string;
  article_date: string;
  article_title: string;
  statements: Statement[];
}

export interface FlattenedStatement extends Statement {
  article_url: string;
  article_date: string;
  article_title: string;
}

export interface EnrichedStatement extends FlattenedStatement {
  canonicalTone: CanonicalTone;
  topicCategory: TopicCategory;
  isUSRelevant: boolean;
}

export interface MonthlyBucket {
  month: string; // "YYYY-MM"
  label: string; // "Sep 2024"
  total: number;
  toneCounts: Record<CanonicalTone, number>;
  tonePercents: Record<CanonicalTone, number>;
  topicCounts: Record<TopicCategory, number>;
  avgIntensity: number;
  sentimentIndex: number; // importance-weighted, -2 to +2
  hostilityRate: number;
  cooperationRate: number;
  speakerCounts: Record<string, number>;
}

export type SortField = 'date' | 'speaker' | 'topic' | 'tone' | 'tone_intensity';
export type SortDirection = 'asc' | 'desc';

export interface FilterState {
  speakers: string[];
  topics: string[];
  tones: string[];
  topicCategories: string[];
  searchText: string;
  selectedMonth: string | null;
}
