import { useState } from 'react';
import {
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  Legend,
  TooltipProps,
} from 'recharts';
import { MonthlyBucket, CanonicalTone } from '../types';
import { TONE_COLORS, TONE_STACK_ORDER } from '../utils/colors';
import { aggregateQuarterly } from '../utils/dataProcessing';

interface SentimentTimelineProps {
  monthlyData: MonthlyBucket[];
  onMonthClick?: (month: string) => void;
}

export function SentimentTimeline({ monthlyData, onMonthClick }: SentimentTimelineProps) {
  const [granularity, setGranularity] = useState<'monthly' | 'quarterly'>('monthly');

  const displayData = granularity === 'quarterly'
    ? aggregateQuarterly(monthlyData)
    : monthlyData;

  // Build chart data with normalized 100% stacked percentages
  const chartData = displayData.map((bucket) => {
    const entry: Record<string, unknown> = {
      label: bucket.label,
      month: bucket.month,
      sentimentIndex: bucket.sentimentIndex,
      total: bucket.total,
    };
    for (const tone of TONE_STACK_ORDER) {
      entry[tone] = bucket.tonePercents[tone];
    }
    return entry;
  });

  const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
    if (!active || !payload || payload.length === 0) return null;
    const bucket = displayData.find((b) => b.label === label);
    if (!bucket) return null;

    return (
      <div className="bg-white p-3 shadow-lg rounded-lg border text-sm">
        <p className="font-medium text-gray-900 mb-2">{label} ({bucket.total} statements)</p>
        <div className="space-y-1">
          {TONE_STACK_ORDER.slice().reverse().map((tone) => (
            <div key={tone} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: TONE_COLORS[tone] }} />
              <span className="capitalize text-gray-700">{tone}</span>
              <span className="ml-auto font-medium">{bucket.tonePercents[tone]}%</span>
            </div>
          ))}
        </div>
        <div className="mt-2 pt-2 border-t border-gray-200">
          <span className="text-gray-500">Sentiment Index: </span>
          <span className="font-medium">{bucket.sentimentIndex}</span>
        </div>
      </div>
    );
  };

  const handleClick = (data: { activeLabel?: string }) => {
    if (data?.activeLabel && onMonthClick) {
      const bucket = displayData.find((b) => b.label === data.activeLabel);
      if (bucket) onMonthClick(bucket.month);
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-900">Rhetoric Sentiment Index</h3>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setGranularity('monthly')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              granularity === 'monthly' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setGranularity('quarterly')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              granularity === 'quarterly' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Quarterly
          </button>
        </div>
      </div>

      <div className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} onClick={handleClick} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11 }}
              interval={granularity === 'monthly' ? 1 : 0}
              angle={-30}
              textAnchor="end"
              height={50}
            />
            <YAxis
              yAxisId="percent"
              domain={[0, 100]}
              tick={{ fontSize: 11 }}
              label={{ value: 'Tone %', angle: -90, position: 'insideLeft', style: { fontSize: 11 } }}
            />
            <YAxis
              yAxisId="sentiment"
              orientation="right"
              domain={[-2, 2]}
              tick={{ fontSize: 11 }}
              label={{ value: 'Sentiment', angle: 90, position: 'insideRight', style: { fontSize: 11 } }}
            />
            <Tooltip content={<CustomTooltip />} />

            {/* Stacked areas — cooperative on bottom, confrontational on top */}
            {TONE_STACK_ORDER.map((tone) => (
              <Area
                key={tone}
                yAxisId="percent"
                type="monotone"
                dataKey={tone}
                stackId="tone"
                fill={TONE_COLORS[tone as CanonicalTone]}
                stroke={TONE_COLORS[tone as CanonicalTone]}
                fillOpacity={0.7}
                strokeWidth={0}
              />
            ))}

            {/* Sentiment line overlay */}
            <Line
              yAxisId="sentiment"
              type="monotone"
              dataKey="sentimentIndex"
              stroke="#1e293b"
              strokeWidth={2.5}
              dot={{ r: 3, fill: '#1e293b' }}
              name="Sentiment Index"
            />

            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value: string) => (
                <span className="text-xs capitalize">{value === 'sentimentIndex' ? 'Sentiment Index' : value}</span>
              )}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
