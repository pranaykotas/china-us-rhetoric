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
    <div className="bg-white rounded-lg shadow p-4 flex-1 min-w-[180px]">
      <div className="text-sm text-gray-500 mb-1">{title}</div>
      <div className="flex items-end justify-between gap-3">
        <div className="text-2xl font-bold text-gray-900">
          {value}{suffix && <span className="text-sm font-normal text-gray-400 ml-0.5">{suffix}</span>}
        </div>
        <div className="w-24 h-10">
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

export function MetricCards({ monthlyData }: MetricCardsProps) {
  const latest = monthlyData[monthlyData.length - 1];

  const hostilityData = monthlyData.map((m) => ({ v: m.hostilityRate }));
  const cooperationData = monthlyData.map((m) => ({ v: m.cooperationRate }));
  const intensityData = monthlyData.map((m) => ({ v: m.avgIntensity }));
  const volumeData = monthlyData.map((m) => ({ v: m.total }));

  return (
    <div className="flex gap-4 flex-wrap">
      <SparklineCard
        title="Hostility Rate"
        value={latest ? `${latest.hostilityRate}` : '0'}
        suffix="%"
        data={hostilityData}
        color="#ef4444"
      />
      <SparklineCard
        title="Cooperation Rate"
        value={latest ? `${latest.cooperationRate}` : '0'}
        suffix="%"
        data={cooperationData}
        color="#3b82f6"
      />
      <SparklineCard
        title="Avg Intensity"
        value={latest ? `${latest.avgIntensity}` : '0'}
        data={intensityData}
        color="#f97316"
      />
      <SparklineCard
        title="Statement Volume"
        value={latest ? `${latest.total}` : '0'}
        data={volumeData}
        color="#6366f1"
      />
    </div>
  );
}
