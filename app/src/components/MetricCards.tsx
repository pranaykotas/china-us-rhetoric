import { MonthlyBucket } from '../types';
import { Line, ResponsiveContainer, LineChart } from 'recharts';

interface MetricCardsProps {
  monthlyData: MonthlyBucket[];
}

interface SparklineCardProps {
  title: string;
  value: string;
  data: { v: number }[];
  color: string;
  suffix?: string;
}

function SparklineCard({ title, value, data, color, suffix }: SparklineCardProps) {
  return (
    <div className="bg-white rounded-lg shadow p-3 sm:p-4 flex-1 min-w-0">
      <div className="text-xs sm:text-sm text-gray-500 mb-1 truncate">{title}</div>
      <div className="flex items-end justify-between gap-2">
        <div className="text-xl sm:text-2xl font-bold text-gray-900 whitespace-nowrap">
          {value}{suffix && <span className="text-xs sm:text-sm font-normal text-gray-400 ml-0.5">{suffix}</span>}
        </div>
        <div className="w-16 sm:w-24 h-8 sm:h-10 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <Line
                type="monotone"
                dataKey="v"
                stroke={color}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function weightedSentiment(buckets: MonthlyBucket[]): number | null {
  const totalW = buckets.reduce((s, m) => s + m.total, 0);
  if (totalW === 0) return null;
  return buckets.reduce((s, m) => s + m.sentimentIndex * m.total, 0) / totalW;
}

export function MetricCards({ monthlyData }: MetricCardsProps) {
  const hostilityData = monthlyData.map((m) => ({ v: m.hostilityRate }));
  const cooperationData = monthlyData.map((m) => ({ v: m.cooperationRate }));
  const intensityData = monthlyData.map((m) => ({ v: m.avgIntensity }));
  const volumeData = monthlyData.map((m) => ({ v: m.total }));
  const convergenceData = monthlyData.map((m) => ({
    v: Math.round(((m.sentimentIndex + 2) / 4) * 100),
  }));

  // Weighted averages across all months in the filtered period (not just the last month)
  const totalStatements = monthlyData.reduce((s, m) => s + m.total, 0);
  const avgHostilityRate = totalStatements > 0
    ? Math.round(monthlyData.reduce((s, m) => s + m.hostilityRate * m.total, 0) / totalStatements * 10) / 10
    : 0;
  const avgCooperationRate = totalStatements > 0
    ? Math.round(monthlyData.reduce((s, m) => s + m.cooperationRate * m.total, 0) / totalStatements * 10) / 10
    : 0;
  const avgIntensity = totalStatements > 0
    ? Math.round(monthlyData.reduce((s, m) => s + m.avgIntensity * m.total, 0) / totalStatements * 100) / 100
    : 0;

  // Convergence Signal: 3-month rolling average of sentimentIndex mapped to 0–100%
  const last3 = monthlyData.slice(-3);
  const prev3 = monthlyData.slice(-6, -3);
  const curr3mSentiment = weightedSentiment(last3);
  const prev3mSentiment = weightedSentiment(prev3);

  const convergencePct = curr3mSentiment !== null
    ? Math.round(((curr3mSentiment + 2) / 4) * 100)
    : 0;

  const trend =
    curr3mSentiment !== null && prev3mSentiment !== null
      ? curr3mSentiment > prev3mSentiment + 0.05 ? ' ↑'
      : curr3mSentiment < prev3mSentiment - 0.05 ? ' ↓'
      : ' →'
    : '';

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      <SparklineCard
        title="Convergence Signal (3m)"
        value={`${convergencePct}${trend}`}
        suffix="%"
        data={convergenceData}
        color="#10b981"
      />
      <SparklineCard
        title="Hostility Rate"
        value={`${avgHostilityRate}`}
        suffix="%"
        data={hostilityData}
        color="#ef4444"
      />
      <SparklineCard
        title="Cooperation Rate"
        value={`${avgCooperationRate}`}
        suffix="%"
        data={cooperationData}
        color="#3b82f6"
      />
      <SparklineCard
        title="Avg Intensity"
        value={`${avgIntensity}`}
        data={intensityData}
        color="#f97316"
      />
      <SparklineCard
        title="Statement Volume"
        value={`${totalStatements}`}
        data={volumeData}
        color="#6366f1"
      />
    </div>
  );
}
