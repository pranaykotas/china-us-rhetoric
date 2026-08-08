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
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-white border border-tk-rule max-w-2xl w-full max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b-2 border-tk-wine p-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-normal text-tk-ink tracking-[-0.01em]">{speaker}</h2>
              {speakerTitle && <p className="text-sm text-[var(--tk-ink-70)] mt-0.5">{speakerTitle}</p>}
              <p className="tk-meta-muted mt-1">{total} statements in dataset</p>
            </div>
            <div className="flex gap-2 items-center">
              <button
                onClick={() => { onFilterBySpeaker(speaker); onClose(); }}
                className="text-xs font-mono uppercase tracking-wider text-tk-wine border border-tk-wine px-3 py-1 hover:bg-tk-wine hover:text-white transition-colors"
              >
                Filter
              </button>
              <button onClick={onClose} className="text-[var(--tk-ink-50)] hover:text-tk-ink">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Hostility summary */}
          <div className="mb-5 p-3 bg-tk-cream border-l-2 border-tk-wine flex items-center gap-2">
            <span className="font-medium text-tk-ink font-mono text-lg">{hostilityRate}%</span>
            <span className="text-sm text-[var(--tk-ink-70)]">hostile</span>
            <span className={`text-sm font-mono ${hostilityDelta > 0 ? 'text-red-600' : 'text-green-700'}`}>
              {hostilityDelta >= 0 ? `+${hostilityDelta}pp` : `${hostilityDelta}pp`}
            </span>
            <span className="tk-meta-muted ml-auto">avg: {globalHostilityRate}%</span>
          </div>

          {/* Tone distribution bars */}
          <div className="mb-5">
            <h3 className="tk-eyebrow mb-2">Tone distribution</h3>
            <div className="space-y-1.5">
              {CANONICAL_TONES.map((tone) => {
                const pct = total > 0 ? Math.round((toneCounts[tone] / total) * 100) : 0;
                return (
                  <div key={tone} className="flex items-center gap-2 text-xs">
                    <span className="w-24 capitalize text-[var(--tk-ink-70)]">{tone}</span>
                    <div className="flex-1 bg-tk-cream h-4 overflow-hidden">
                      <div
                        className="h-full"
                        style={{ width: `${pct}%`, backgroundColor: TONE_COLORS[tone] }}
                      />
                    </div>
                    <span className="w-16 text-right text-[var(--tk-ink-50)] font-mono">
                      {pct}% ({toneCounts[tone]})
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top topics */}
          <div className="mb-5">
            <h3 className="tk-eyebrow mb-2">Top topics</h3>
            <div className="flex flex-wrap gap-2">
              {topTopics.map(([topic, count]) => (
                <span key={topic} className="px-2 py-1 bg-tk-cream text-tk-ink text-xs font-mono border border-tk-rule">
                  {topic} ({count})
                </span>
              ))}
            </div>
          </div>

          {/* 12-month hostility sparkline */}
          {sparklineData.length > 1 && (
            <div className="mb-5">
              <h3 className="tk-eyebrow mb-2">Hostility rate (last 12 months)</h3>
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
                      stroke="#620d3c"
                      strokeWidth={2}
                      dot={{ r: 3, fill: '#620d3c' }}
                      name="Hostility %"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Notable statements */}
          <div>
            <h3 className="tk-eyebrow mb-2">Notable statements</h3>
            <div className="space-y-3">
              {notableQuotes.map((s, i) => (
                <div key={i} className="border-l-2 border-tk-wine pl-3">
                  <p className="text-sm text-[var(--tk-ink-70)] italic">"{s.quote_or_paraphrase}"</p>
                  <div className="flex items-center flex-wrap gap-2 mt-1">
                    <span className="tk-meta-muted">{s.article_date}</span>
                    <span className={`px-1.5 py-0.5 text-xs font-mono ${TONE_BG_CLASSES[s.canonicalTone]}`}>
                      {s.canonicalTone}
                    </span>
                    <a
                      href={s.article_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-tk-wine hover:underline"
                    >
                      source ↗
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
