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
      <div className="bg-white p-2 sm:p-3 border border-tk-rule text-xs sm:text-sm max-w-[200px] sm:max-w-none">
        <p className="font-medium text-tk-ink mb-1 sm:mb-2">{label} <span className="tk-meta-muted">({bucket.total})</span></p>
        <div className="space-y-0.5 sm:space-y-1">
          {TONE_STACK_ORDER.slice().reverse().map((tone) => (
            <div key={tone} className="flex items-center gap-1 sm:gap-2">
              <div className="w-2 h-2 sm:w-3 sm:h-3 shrink-0" style={{ backgroundColor: TONE_COLORS[tone] }} />
              <span className="capitalize text-[var(--tk-ink-70)]">{tone}</span>
              <span className="ml-auto font-medium font-mono">{bucket.tonePercents[tone]}%</span>
            </div>
          ))}
        </div>
        <div className="mt-1 sm:mt-2 pt-1 sm:pt-2 border-t border-tk-rule">
          <span className="text-[var(--tk-ink-50)]">Sentiment: </span>
          <span className="font-medium font-mono">{bucket.sentimentIndex}</span>
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
  const chartMargin = { top: 10, right: isMobile ? 15 : 30, left: 4, bottom: isMobile ? 10 : 5 };

  return (
    <div id="sentiment-timeline" className="bg-white p-3 sm:p-4 border border-tk-rule">
      <div className="flex flex-wrap justify-between items-start gap-2 mb-3 sm:mb-4">
        <h3 className="text-base sm:text-lg font-normal text-tk-ink tracking-[-0.01em]">Rhetoric Sentiment Index</h3>
        <div className="flex flex-wrap gap-1">
          <div className="flex gap-px border border-tk-rule">
            <button
              onClick={() => setGranularity('monthly')}
              className={`px-2 sm:px-3 py-1 text-xs font-mono uppercase tracking-wider transition-colors ${
                granularity === 'monthly' ? 'bg-tk-wine text-white' : 'text-[var(--tk-ink-50)] hover:bg-tk-cream'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setGranularity('quarterly')}
              className={`px-2 sm:px-3 py-1 text-xs font-mono uppercase tracking-wider transition-colors ${
                granularity === 'quarterly' ? 'bg-tk-wine text-white' : 'text-[var(--tk-ink-50)] hover:bg-tk-cream'
              }`}
            >
              Quarterly
            </button>
          </div>
          <button
            onClick={() => setShowEvents((v) => !v)}
            className={`px-2 sm:px-3 py-1 text-xs font-mono uppercase tracking-wider border border-tk-rule transition-colors ml-1 ${
              showEvents ? 'bg-tk-wine text-white border-tk-wine' : 'text-[var(--tk-ink-50)] hover:bg-tk-cream'
            }`}
          >
            Events
          </button>
        </div>
      </div>

      <div className="h-56 sm:h-72 lg:h-96">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} onClick={handleClick} margin={chartMargin}>
            <XAxis
              dataKey="label"
              tick={{ fontSize: tickFontSize, fontFamily: '"Roboto Mono", monospace', fill: 'rgba(23,20,19,0.7)' }}
              interval={xAxisInterval}
              angle={-45}
              textAnchor="end"
              height={xAxisHeight}
              stroke="rgba(23,20,19,0.16)"
            />
            <YAxis
              yAxisId="percent"
              domain={[0, 100]}
              ticks={[0, 25, 50, 75]}
              tick={{ fontSize: tickFontSize, fontFamily: '"Roboto Mono", monospace', fill: 'rgba(23,20,19,0.7)' }}
              width={28}
              stroke="rgba(23,20,19,0.16)"
            />
            <YAxis
              yAxisId="sentiment"
              orientation="right"
              domain={[-2, 2]}
              tick={{ fontSize: tickFontSize, fontFamily: '"Roboto Mono", monospace', fill: 'rgba(23,20,19,0.7)' }}
              width={24}
              stroke="rgba(23,20,19,0.16)"
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
              stroke="#171413"
              strokeWidth={3}
              dot={{ r: isMobile ? 2 : 3, fill: '#171413' }}
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
                  stroke="rgba(23,20,19,0.3)"
                  strokeDasharray="4 2"
                  label={{
                    value: event.label,
                    angle: -90,
                    position: 'insideTopRight',
                    fontSize: isMobile ? 7 : 9,
                    fill: 'rgba(23,20,19,0.5)',
                  }}
                />
              );
            })}

            <Legend
              verticalAlign="bottom"
              height={isMobile ? 48 : 36}
              formatter={(value: string) => (
                <span style={{ fontSize: isMobile ? 10 : 12, fontFamily: '"Roboto Mono", monospace', color: '#171413' }} className="capitalize">
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
