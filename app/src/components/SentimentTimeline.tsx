import { useState } from 'react';
import {
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  Legend,
  TooltipProps,
  ReferenceLine,
} from 'recharts';
import { MonthlyBucket, CanonicalTone } from '../types';
import { TONE_COLORS, TONE_STACK_ORDER } from '../utils/colors';
import { aggregateQuarterly } from '../utils/dataProcessing';
import { useIsMobile } from '../hooks/useWindowSize';

const EVENTS = [
  { month: '2021-03', label: 'Anchorage Summit' },
  { month: '2022-02', label: 'Russia invades Ukraine' },
  { month: '2022-08', label: 'Pelosi Taiwan visit' },
  { month: '2022-11', label: 'Bali G20 / Xi-Biden' },
  { month: '2023-11', label: 'SF Xi-Biden' },
  { month: '2024-11', label: 'Trump elected' },
  { month: '2025-01', label: 'Trump 2.0 begins' },
  { month: '2025-04', label: 'US tariff escalation' },
  { month: '2025-07', label: 'Trade truce' },
  { month: '2026-01', label: 'Xi-Trump call' },
];

function findEventLabel(eventMonth: string, displayData: MonthlyBucket[]): string | null {
  const exact = displayData.find((b) => b.month === eventMonth);
  if (exact) return exact.label;

  const [year, m] = eventMonth.split('-');
  const q = Math.ceil(parseInt(m, 10) / 3);
  const quarterKey = `${year}-Q${q}`;
  const quarter = displayData.find((b) => b.month === quarterKey);
  if (quarter) return quarter.label;

  return null;
}

interface SentimentTimelineProps {
  monthlyData: MonthlyBucket[];
  onMonthClick?: (month: string) => void;
}

export function SentimentTimeline({ monthlyData, onMonthClick }: SentimentTimelineProps) {
  const isMobile = useIsMobile();

  const [granularity, setGranularity] = useState<'monthly' | 'quarterly'>(
    () => window.innerWidth < 640 ? 'quarterly' : 'monthly'
  );
  const [showEvents, setShowEvents] = useState(() => window.innerWidth >= 640);

  const displayData = granularity === 'quarterly'
    ? aggregateQuarterly(monthlyData)
    : monthlyData;

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
      <div className="bg-white p-2 sm:p-3 shadow-lg rounded-lg border text-xs sm:text-sm max-w-[200px] sm:max-w-none">
        <p className="font-medium text-gray-900 mb-1 sm:mb-2">{label} ({bucket.total} statements)</p>
        <div className="space-y-0.5 sm:space-y-1">
          {TONE_STACK_ORDER.slice().reverse().map((tone) => (
            <div key={tone} className="flex items-center gap-1 sm:gap-2">
              <div className="w-2 h-2 sm:w-3 sm:h-3 rounded shrink-0" style={{ backgroundColor: TONE_COLORS[tone] }} />
              <span className="capitalize text-gray-700">{tone}</span>
              <span className="ml-auto font-medium">{bucket.tonePercents[tone]}%</span>
            </div>
          ))}
        </div>
        <div className="mt-1 sm:mt-2 pt-1 sm:pt-2 border-t border-gray-200">
          <span className="text-gray-500">Sentiment: </span>
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

  const tickFontSize = isMobile ? 9 : 11;
  const xAxisInterval = granularity === 'monthly' ? (isMobile ? 3 : 1) : 0;
  const xAxisHeight = isMobile ? 55 : 50;
  const chartMargin = { top: 10, right: isMobile ? 15 : 30, left: 0, bottom: isMobile ? 10 : 5 };

  return (
    <div id="sentiment-timeline" className="bg-white p-3 sm:p-4 rounded-lg shadow">
      <div className="flex flex-wrap justify-between items-start gap-2 mb-3 sm:mb-4">
        <h3 className="text-base sm:text-lg font-medium text-gray-900">Rhetoric Sentiment Index</h3>
        <div className="flex flex-wrap gap-1">
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setGranularity('monthly')}
              className={`px-2 sm:px-3 py-1 text-xs sm:text-sm rounded-md transition-colors ${
                granularity === 'monthly' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setGranularity('quarterly')}
              className={`px-2 sm:px-3 py-1 text-xs sm:text-sm rounded-md transition-colors ${
                granularity === 'quarterly' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Quarterly
            </button>
          </div>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1 ml-1">
            <button
              onClick={() => setShowEvents((v) => !v)}
              className={`px-2 sm:px-3 py-1 text-xs sm:text-sm rounded-md transition-colors ${
                showEvents ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Events
            </button>
          </div>
        </div>
      </div>

      <div className="h-56 sm:h-72 lg:h-96">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} onClick={handleClick} margin={chartMargin}>
            <XAxis
              dataKey="label"
              tick={{ fontSize: tickFontSize }}
              interval={xAxisInterval}
              angle={-45}
              textAnchor="end"
              height={xAxisHeight}
            />
            <YAxis
              yAxisId="percent"
              domain={[0, 100]}
              tick={{ fontSize: tickFontSize }}
              width={28}
            />
            <YAxis
              yAxisId="sentiment"
              orientation="right"
              domain={[-2, 2]}
              tick={{ fontSize: tickFontSize }}
              width={24}
            />
            <Tooltip content={<CustomTooltip />} />

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

            <Line
              yAxisId="sentiment"
              type="monotone"
              dataKey="sentimentIndex"
              stroke="#000"
              strokeWidth={3}
              dot={{ r: isMobile ? 2 : 3, fill: '#000' }}
              name="Sentiment Index"
            />

            {showEvents && EVENTS.map((event) => {
              const xLabel = findEventLabel(event.month, displayData);
              if (!xLabel) return null;
              return (
                <ReferenceLine
                  key={event.month}
                  x={xLabel}
                  yAxisId="percent"
                  stroke="#9ca3af"
                  strokeDasharray="4 2"
                  label={{
                    value: event.label,
                    angle: -90,
                    position: 'insideTopRight',
                    fontSize: isMobile ? 7 : 9,
                    fill: '#6b7280',
                  }}
                />
              );
            })}

            <Legend
              verticalAlign="bottom"
              height={isMobile ? 48 : 36}
              formatter={(value: string) => (
                <span style={{ fontSize: isMobile ? 10 : 12 }} className="capitalize">
                  {value === 'sentimentIndex' ? 'Sentiment Index' : value}
                </span>
              )}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
