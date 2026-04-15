import { CanonicalTone, TopicCategory } from '../types';

export const TONE_COLORS: Record<CanonicalTone, string> = {
  confrontational: '#ef4444',
  assertive: '#f97316',
  cautious: '#eab308',
  neutral: '#6b7280',
  cooperative: '#3b82f6',
  conciliatory: '#22c55e',
};

export const TONE_BG_CLASSES: Record<CanonicalTone, string> = {
  confrontational: 'bg-red-100 text-red-800',
  assertive: 'bg-orange-100 text-orange-800',
  cautious: 'bg-yellow-100 text-yellow-800',
  neutral: 'bg-gray-100 text-gray-800',
  cooperative: 'bg-blue-100 text-blue-800',
  conciliatory: 'bg-green-100 text-green-800',
};

export const TOPIC_COLORS: Record<TopicCategory, string> = {
  'Diplomacy': '#3b82f6',
  'Trade & Economy': '#f97316',
  'Taiwan': '#ef4444',
  'Technology': '#8b5cf6',
  'Military & Security': '#dc2626',
  'Human Rights & Governance': '#ec4899',
  'Belt & Road': '#14b8a6',
  'Multilateral & Global': '#6366f1',
  'Other': '#9ca3af',
};

// Ordered from hostile (bottom) to cooperative (top) for stacked area
export const TONE_STACK_ORDER: CanonicalTone[] = [
  'cooperative',
  'conciliatory',
  'neutral',
  'cautious',
  'assertive',
  'confrontational',
];

export const TOPIC_LIST: TopicCategory[] = [
  'Diplomacy',
  'Trade & Economy',
  'Taiwan',
  'Technology',
  'Military & Security',
  'Human Rights & Governance',
  'Belt & Road',
  'Multilateral & Global',
  'Other',
];
