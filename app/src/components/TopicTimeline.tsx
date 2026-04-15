import {
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  TooltipProps,
} from 'recharts';
import { MonthlyBucket, TopicCategory } from '../types';
import { TOPIC_COLORS, TOPIC_LIST } from '../utils/colors';

interface TopicTimelineProps {
  monthlyData: MonthlyBucket[];
  onTopicClick?: (topic: TopicCategory) => void;
  onMonthClick?: (month: string) => void;
}

export function TopicTimeline({ monthlyData, onTopicClick, onMonthClick }: TopicTimelineProps) {
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
      <div className="bg-white p-3 shadow-lg rounded-lg border text-sm">
        <p className="font-medium text-gray-900 mb-2">{label}</p>
        <div className="space-y-1">
          {items.map(({ cat, count }) => (
            <div key={cat} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: TOPIC_COLORS[cat] }} />
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

  return (
    <div className="bg-white p-4 rounded-lg shadow flex-1">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Topic Evolution</h3>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} onClick={handleClick} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={50} />
            <YAxis tick={{ fontSize: 11 }} label={{ value: 'Count', angle: -90, position: 'insideLeft', style: { fontSize: 11 } }} />
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
      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-3 justify-center">
        {TOPIC_LIST.map((cat) => (
          <button
            key={cat}
            onClick={() => onTopicClick?.(cat)}
            className="flex items-center gap-1 hover:opacity-70 transition-opacity"
          >
            <div className="w-3 h-3 rounded" style={{ backgroundColor: TOPIC_COLORS[cat] }} />
            <span className="text-xs text-gray-600">{cat}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
