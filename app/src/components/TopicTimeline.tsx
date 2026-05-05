import {
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  TooltipProps,
} from 'recharts';
import { MonthlyBucket, TopicCategory } from '../types';
import { TOPIC_COLORS, TOPIC_LIST } from '../utils/colors';
import { useIsMobile } from '../hooks/useWindowSize';

interface TopicTimelineProps {
  monthlyData: MonthlyBucket[];
  onTopicClick?: (topic: TopicCategory) => void;
  onMonthClick?: (month: string) => void;
}

export function TopicTimeline({ monthlyData, onTopicClick, onMonthClick }: TopicTimelineProps) {
  const isMobile = useIsMobile();

  const chartData = monthlyData.map((bucket) => {
    const entry: Record<string, unknown> = {
      label: bucket.label,
      month: bucket.month,
    };
    for (const cat of TOPIC_LIST) {
      entry[cat] = bucket.topicCounts[cat];
    }
    return entry;
  });

  const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
    if (!active || !payload || payload.length === 0) return null;
    const bucket = monthlyData.find((b) => b.label === label);
    if (!bucket) return null;

    const items = TOPIC_LIST
      .map((cat) => ({ cat, count: bucket.topicCounts[cat] }))
      .filter((x) => x.count > 0)
      .sort((a, b) => b.count - a.count);

    return (
      <div className="bg-white p-2 sm:p-3 shadow-lg rounded-lg border text-xs sm:text-sm max-w-[180px] sm:max-w-none">
        <p className="font-medium text-gray-900 mb-1 sm:mb-2">{label}</p>
        <div className="space-y-0.5 sm:space-y-1">
          {items.map(({ cat, count }) => (
            <div key={cat} className="flex items-center gap-1 sm:gap-2">
              <div className="w-2 h-2 sm:w-3 sm:h-3 rounded shrink-0" style={{ backgroundColor: TOPIC_COLORS[cat] }} />
              <span className="text-gray-700">{cat}</span>
              <span className="ml-auto font-medium">{count}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const handleClick = (data: { activeLabel?: string }) => {
    if (data?.activeLabel && onMonthClick) {
      const bucket = monthlyData.find((b) => b.label === data.activeLabel);
      if (bucket) onMonthClick(bucket.month);
    }
  };

  const tickFontSize = isMobile ? 9 : 10;
  const xAxisInterval = isMobile ? 3 : 'preserveStartEnd';

  return (
    <div className="bg-white p-3 sm:p-4 rounded-lg shadow flex-1">
      <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4">Topic Evolution</h3>
      <div className="h-48 sm:h-60 lg:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            onClick={handleClick}
            margin={{ top: 10, right: 10, left: 0, bottom: isMobile ? 45 : 5 }}
          >
            <XAxis
              dataKey="label"
              tick={{ fontSize: tickFontSize }}
              interval={xAxisInterval}
              angle={-30}
              textAnchor="end"
              height={isMobile ? 50 : 40}
            />
            <YAxis tick={{ fontSize: tickFontSize }} width={24} />
            <Tooltip content={<CustomTooltip />} />
            {TOPIC_LIST.map((cat) => (
              <Area
                key={cat}
                type="monotone"
                dataKey={cat}
                stackId="topic"
                fill={TOPIC_COLORS[cat]}
                stroke={TOPIC_COLORS[cat]}
                fillOpacity={0.7}
                strokeWidth={0}
                onClick={() => onTopicClick?.(cat)}
                cursor="pointer"
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap gap-2 sm:gap-3 mt-2 sm:mt-3 justify-center">
        {TOPIC_LIST.map((cat) => (
          <button
            key={cat}
            onClick={() => onTopicClick?.(cat)}
            className="flex items-center gap-1 hover:opacity-70 transition-opacity"
          >
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded" style={{ backgroundColor: TOPIC_COLORS[cat] }} />
            <span className="text-xs text-gray-600">{cat}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
