import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { EnrichedStatement, CanonicalTone } from '../types';
import { TONE_COLORS, TONE_BG_CLASSES } from '../utils/colors';

const CANONICAL_TONES: CanonicalTone[] = [
  'confrontational', 'assertive', 'cautious', 'neutral', 'cooperative', 'conciliatory',
];

interface SpeakerProfileProps {
  speaker: string;
  allStatements: EnrichedStatement[];
  onClose: () => void;
  onFilterBySpeaker: (speaker: string) => void;
}

export function SpeakerProfile({ speaker, allStatements, onClose, onFilterBySpeaker }: SpeakerProfileProps) {
  const speakerStatements = useMemo(
    () => allStatements.filter((s) => s.speaker === speaker),
    [allStatements, speaker]
  );

  const speakerTitle = useMemo(() => {
    const sorted = [...speakerStatements].sort((a, b) => b.article_date.localeCompare(a.article_date));
    return sorted[0]?.speaker_title ?? '';
  }, [speakerStatements]);

  const total = speakerStatements.length;

  const toneCounts = useMemo(() => {
    const counts: Record<CanonicalTone, number> = {
      confrontational: 0, assertive: 0, cautious: 0, neutral: 0, cooperative: 0, conciliatory: 0,
    };
    for (const s of speakerStatements) counts[s.canonicalTone]++;
    return counts;
  }, [speakerStatements]);

  const hostilityRate = total > 0
    ? Math.round(((toneCounts.confrontational + toneCounts.assertive) / total) * 100)
    : 0;

  const globalHostilityRate = useMemo(() => {
    const hostile = allStatements.filter(
      (s) => s.canonicalTone === 'confrontational' || s.canonicalTone === 'assertive'
    ).length;
    return allStatements.length > 0 ? Math.round((hostile / allStatements.length) * 100) : 0;
  }, [allStatements]);

  const hostilityDelta = hostilityRate - globalHostilityRate;

  const topTopics = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of speakerStatements) {
      counts[s.topicCategory] = (counts[s.topicCategory] || 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3);
  }, [speakerStatements]);

  // 12-month hostility sparkline
  const sparklineData = useMemo(() => {
    const monthMap: Record<string, { hostile: number; total: number }> = {};
    const now = new Date();
    for (const s of speakerStatements) {
      if (!s.article_date) continue;
      const month = s.article_date.substring(0, 7);
      const monthDate = new Date(month + '-01');
      const diffMonths =
        (now.getFullYear() - monthDate.getFullYear()) * 12 + now.getMonth() - monthDate.getMonth();
      if (diffMonths > 12) continue;
      if (!monthMap[month]) monthMap[month] = { hostile: 0, total: 0 };
      monthMap[month].total++;
      if (s.canonicalTone === 'confrontational' || s.canonicalTone === 'assertive') {
        monthMap[month].hostile++;
      }
    }
    return Object.entries(monthMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, { hostile, total: t }]) => ({
        month,
        hostilityRate: t > 0 ? Math.round((hostile / t) * 100) : 0,
      }));
  }, [speakerStatements]);

  // 3 notable quotes — highest speaker_importance × tone_intensity
  const notableQuotes = useMemo(() => {
    return [...speakerStatements]
      .sort((a, b) => {
        const scoreA = (a.speaker_importance ?? 3) * (a.tone_intensity ?? 3);
        const scoreB = (b.speaker_importance ?? 3) * (b.tone_intensity ?? 3);
        return scoreB - scoreA;
      })
      .slice(0, 3);
  }, [speakerStatements]);

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{speaker}</h2>
              {speakerTitle && <p className="text-sm text-gray-500 mt-0.5">{speakerTitle}</p>}
              <p className="text-xs text-gray-400 mt-1">{total} statements in dataset</p>
            </div>
            <div className="flex gap-2 items-center">
              <button
                onClick={() => { onFilterBySpeaker(speaker); onClose(); }}
                className="text-sm text-blue-600 hover:text-blue-800 border border-blue-200 px-3 py-1 rounded"
              >
                Filter
              </button>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Hostility summary */}
          <div className="mb-4 p-3 bg-gray-50 rounded-lg flex items-center gap-2">
            <span className="font-semibold text-gray-900">{hostilityRate}% hostile</span>
            <span className={`text-sm ${hostilityDelta > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {hostilityDelta >= 0 ? `(+${hostilityDelta}pp vs avg)` : `(${hostilityDelta}pp vs avg)`}
            </span>
            <span className="text-xs text-gray-400 ml-auto">dataset avg: {globalHostilityRate}%</span>
          </div>

          {/* Tone distribution bars */}
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Tone distribution</h3>
            <div className="space-y-1.5">
              {CANONICAL_TONES.map((tone) => {
                const pct = total > 0 ? Math.round((toneCounts[tone] / total) * 100) : 0;
                return (
                  <div key={tone} className="flex items-center gap-2 text-xs">
                    <span className="w-24 capitalize text-gray-600">{tone}</span>
                    <div className="flex-1 bg-gray-100 rounded h-4 overflow-hidden">
                      <div
                        className="h-full rounded"
                        style={{ width: `${pct}%`, backgroundColor: TONE_COLORS[tone] }}
                      />
                    </div>
                    <span className="w-16 text-right text-gray-500">
                      {pct}% ({toneCounts[tone]})
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top topics */}
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Top topics</h3>
            <div className="flex flex-wrap gap-2">
              {topTopics.map(([topic, count]) => (
                <span key={topic} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                  {topic} ({count})
                </span>
              ))}
            </div>
          </div>

          {/* 12-month hostility sparkline */}
          {sparklineData.length > 1 && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Hostility rate (last 12 months)</h3>
              <div className="h-20">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sparklineData}>
                    <XAxis dataKey="month" hide />
                    <Tooltip
                      formatter={(val: number) => [`${val}%`, 'Hostility']}
                      labelFormatter={(label: string) => label}
                    />
                    <Line
                      type="monotone"
                      dataKey="hostilityRate"
                      stroke="#ef4444"
                      strokeWidth={2}
                      dot={{ r: 3, fill: '#ef4444' }}
                      name="Hostility %"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Notable statements */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Notable statements</h3>
            <div className="space-y-3">
              {notableQuotes.map((s, i) => (
                <div key={i} className="border-l-2 border-gray-200 pl-3">
                  <p className="text-sm text-gray-800 italic">"{s.quote_or_paraphrase}"</p>
                  <div className="flex items-center flex-wrap gap-2 mt-1">
                    <span className="text-xs text-gray-400">{s.article_date}</span>
                    <span className={`px-1.5 py-0.5 text-xs rounded-full ${TONE_BG_CLASSES[s.canonicalTone]}`}>
                      {s.canonicalTone}
                    </span>
                    <a
                      href={s.article_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-500 hover:underline"
                    >
                      source →
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
