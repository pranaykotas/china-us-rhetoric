import { useMemo } from 'react';
import {
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  TooltipProps,
} from 'recharts';
import { EnrichedStatement, CanonicalTone } from '../types';
import { TONE_COLORS, TONE_STACK_ORDER } from '../utils/colors';

interface SpeakerToneChartProps {
  statements: EnrichedStatement[];
  onSpeakerClick?: (speaker: string) => void;
  onToneClick?: (tone: CanonicalTone) => void;
}

interface SpeakerToneData {
  speaker: string;
  total: number;
  [key: string]: unknown;
}

export function SpeakerToneChart({ statements, onSpeakerClick, onToneClick }: SpeakerToneChartProps) {
  const chartData: SpeakerToneData[] = useMemo(() => {
    // Count tones per speaker
    const speakerTones: Record<string, Record<CanonicalTone, number>> = {};
    const speakerTotals: Record<string, number> = {};

    for (const s of statements) {
      if (!speakerTones[s.speaker]) {
        speakerTones[s.speaker] = {
          confrontational: 0, assertive: 0, cautious: 0,
          neutral: 0, cooperative: 0, conciliatory: 0,
        };
        speakerTotals[s.speaker] = 0;
      }
      speakerTones[s.speaker][s.canonicalTone]++;
      speakerTotals[s.speaker]++;
    }

    // Top 10 speakers
    const top10 = Object.entries(speakerTotals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([speaker]) => speaker);

    return top10.map((speaker) => {
      const total = speakerTotals[speaker];
      const entry: SpeakerToneData = { speaker, total };
      for (const tone of TONE_STACK_ORDER) {
        entry[tone] = Math.round((speakerTones[speaker][tone] / total) * 1000) / 10;
      }
      return entry;
    }).reverse(); // Reverse so #1 is at top of horizontal bar chart
  }, [statements]);

  const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
    if (!active || !payload || payload.length === 0) return null;
    const data = chartData.find((d) => d.speaker === label);
    if (!data) return null;

    return (
      <div className="bg-white p-3 shadow-lg rounded-lg border text-sm">
        <p className="font-medium text-gray-900 mb-2">{label} ({data.total} statements)</p>
        <div className="space-y-1">
          {TONE_STACK_ORDER.slice().reverse().map((tone) => {
            const val = data[tone] as number;
            return val > 0 ? (
              <div key={tone} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: TONE_COLORS[tone] }} />
                <span className="capitalize text-gray-700">{tone}</span>
                <span className="ml-auto font-medium">{val}%</span>
              </div>
            ) : null;
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Tone Distribution by Speaker</h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
            <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
            <YAxis
              type="category"
              dataKey="speaker"
              tick={{ fontSize: 11 }}
              width={95}
              onClick={(data) => onSpeakerClick?.((data as { value: string }).value)}
            />
            <Tooltip content={<CustomTooltip />} />
            {TONE_STACK_ORDER.map((tone) => (
              <Bar
                key={tone}
                dataKey={tone}
                stackId="tone"
                fill={TONE_COLORS[tone]}
                cursor="pointer"
                onClick={(_data, _index) => onToneClick?.(tone)}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-3 justify-center">
        {TONE_STACK_ORDER.slice().reverse().map((tone) => (
          <button
            key={tone}
            onClick={() => onToneClick?.(tone)}
            className="flex items-center gap-1 hover:opacity-70 transition-opacity"
          >
            <div className="w-3 h-3 rounded" style={{ backgroundColor: TONE_COLORS[tone] }} />
            <span className="text-xs text-gray-600 capitalize">{tone}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
