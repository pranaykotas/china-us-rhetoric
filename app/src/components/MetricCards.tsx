import { useState } from 'react';
import { MonthlyBucket } from '../types';
import {
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  TooltipProps,
} from 'recharts';

interface MetricCardsProps {
  monthlyData: MonthlyBucket[];
}

type MetricKey = 'convergence' | 'hostility' | 'cooperation' | 'intensity' | 'volume';

interface MetricDef {
  key: MetricKey;
  title: string;
  value: string;
  suffix?: string;
  color: string;
  sparkData: { v: number }[];
  detailData: { label: string; v: number }[];
  description: string;
  format: (v: number) => string;
}

function weightedSentiment(buckets: MonthlyBucket[]): number | null {
  const totalW = buckets.reduce((s, m) => s + m.total, 0);
  if (totalW === 0) return null;
  return buckets.reduce((s, m) => s + m.sentimentIndex * m.total, 0) / totalW;
}

function DetailModal({
  metric,
  onClose,
}: {
  metric: MetricDef;
  onClose: () => void;
}) {
  const data = metric.detailData;
  const values = data.map((d) => d.v);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const latest = values[values.length - 1];
  const prev = values.length > 1 ? values[values.length - 2] : latest;
  const delta = latest - prev;
  const avg3 =
    values.length >= 3
      ? Math.round(
          (values.slice(-3).reduce((s, v) => s + v, 0) / 3) * 10
        ) / 10
      : latest;

  const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
    if (!active || !payload || payload.length === 0) return null;
    return (
      <div className="bg-white p-2 border border-tk-rule text-xs">
        <p className="font-mono text-[var(--tk-ink-70)]">{label}</p>
        <p className="font-mono font-medium" style={{ color: metric.color }}>
          {metric.format(payload[0].value as number)}
        </p>
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-white border border-tk-rule max-w-2xl w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b-2 border-tk-wine px-6 py-4 flex justify-between items-start">
          <div>
            <h2 className="text-lg font-normal text-tk-ink tracking-[-0.01em]">
              {metric.title}
            </h2>
            <p className="text-sm text-[var(--tk-ink-70)] mt-1">
              {metric.description}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--tk-ink-50)] hover:text-tk-ink ml-4"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {/* Summary stats row */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div>
              <div className="tk-meta-muted mb-1">Current</div>
              <div
                className="text-2xl font-mono tracking-[-0.02em]"
                style={{ color: metric.color, fontVariantNumeric: 'tabular-nums' }}
              >
                {metric.format(latest)}
              </div>
            </div>
            <div>
              <div className="tk-meta-muted mb-1">Change</div>
              <div
                className={`text-2xl font-mono tracking-[-0.02em] ${
                  delta > 0 ? 'text-red-600' : delta < 0 ? 'text-green-700' : 'text-[var(--tk-ink-50)]'
                }`}
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {delta > 0 ? '+' : ''}
                {metric.format(Math.round(delta * 10) / 10)}
              </div>
            </div>
            <div>
              <div className="tk-meta-muted mb-1">3m Avg</div>
              <div
                className="text-2xl font-mono tracking-[-0.02em] text-tk-ink"
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {metric.format(avg3)}
              </div>
            </div>
            <div>
              <div className="tk-meta-muted mb-1">Range</div>
              <div
                className="text-2xl font-mono tracking-[-0.02em] text-[var(--tk-ink-70)]"
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {metric.format(Math.round(min * 10) / 10)}–
                {metric.format(Math.round(max * 10) / 10)}
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={data}
                margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
              >
                <XAxis
                  dataKey="label"
                  tick={{
                    fontSize: 10,
                    fontFamily: '"Roboto Mono", monospace',
                    fill: 'rgba(23,20,19,0.7)',
                  }}
                  angle={-45}
                  textAnchor="end"
                  height={50}
                  stroke="rgba(23,20,19,0.16)"
                />
                <YAxis
                  tick={{
                    fontSize: 10,
                    fontFamily: '"Roboto Mono", monospace',
                    fill: 'rgba(23,20,19,0.7)',
                  }}
                  width={36}
                  stroke="rgba(23,20,19,0.16)"
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="v"
                  stroke={metric.color}
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: metric.color }}
                  activeDot={{ r: 5, fill: metric.color }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MetricCards({ monthlyData }: MetricCardsProps) {
  const [expandedMetric, setExpandedMetric] = useState<MetricKey | null>(null);

  const last12 = monthlyData.slice(-12);

  const totalStatements = monthlyData.reduce((s, m) => s + m.total, 0);
  const avgHostilityRate =
    totalStatements > 0
      ? Math.round(
          (monthlyData.reduce((s, m) => s + m.hostilityRate * m.total, 0) /
            totalStatements) *
            10
        ) / 10
      : 0;
  const avgCooperationRate =
    totalStatements > 0
      ? Math.round(
          (monthlyData.reduce((s, m) => s + m.cooperationRate * m.total, 0) /
            totalStatements) *
            10
        ) / 10
      : 0;
  const avgIntensity =
    totalStatements > 0
      ? Math.round(
          (monthlyData.reduce((s, m) => s + m.avgIntensity * m.total, 0) /
            totalStatements) *
            100
        ) / 100
      : 0;

  const last3 = monthlyData.slice(-3);
  const prev3 = monthlyData.slice(-6, -3);
  const curr3mSentiment = weightedSentiment(last3);
  const prev3mSentiment = weightedSentiment(prev3);

  const convergencePct =
    curr3mSentiment !== null
      ? Math.round(((curr3mSentiment + 2) / 4) * 100)
      : 0;

  const trend =
    curr3mSentiment !== null && prev3mSentiment !== null
      ? curr3mSentiment > prev3mSentiment + 0.05
        ? ' ↑'
        : curr3mSentiment < prev3mSentiment - 0.05
          ? ' ↓'
          : ' →'
      : '';

  const fmtPct = (v: number) => `${v}%`;
  const fmtNum = (v: number) => `${v}`;

  const metrics: MetricDef[] = [
    {
      key: 'convergence',
      title: 'Convergence Signal (3m)',
      value: `${convergencePct}${trend}`,
      suffix: '%',
      color: '#620d3c',
      sparkData: monthlyData.map((m) => ({
        v: Math.round(((m.sentimentIndex + 2) / 4) * 100),
      })),
      detailData: last12.map((m) => ({
        label: m.label,
        v: Math.round(((m.sentimentIndex + 2) / 4) * 100),
      })),
      description:
        'Maps the 3-month rolling sentiment index to 0–100%. Higher values indicate more cooperative rhetoric; lower values indicate more confrontational.',
      format: fmtPct,
    },
    {
      key: 'hostility',
      title: 'Hostility Rate',
      value: `${avgHostilityRate}`,
      suffix: '%',
      color: '#ef4444',
      sparkData: monthlyData.map((m) => ({ v: m.hostilityRate })),
      detailData: last12.map((m) => ({
        label: m.label,
        v: Math.round(m.hostilityRate * 10) / 10,
      })),
      description:
        'Share of statements classified as confrontational or assertive. Weighted average across the selected period.',
      format: fmtPct,
    },
    {
      key: 'cooperation',
      title: 'Cooperation Rate',
      value: `${avgCooperationRate}`,
      suffix: '%',
      color: '#620d3c',
      sparkData: monthlyData.map((m) => ({ v: m.cooperationRate })),
      detailData: last12.map((m) => ({
        label: m.label,
        v: Math.round(m.cooperationRate * 10) / 10,
      })),
      description:
        'Share of statements classified as cooperative or conciliatory. Weighted average across the selected period.',
      format: fmtPct,
    },
    {
      key: 'intensity',
      title: 'Avg Intensity',
      value: `${avgIntensity}`,
      color: '#f1a222',
      sparkData: monthlyData.map((m) => ({ v: m.avgIntensity })),
      detailData: last12.map((m) => ({
        label: m.label,
        v: Math.round(m.avgIntensity * 100) / 100,
      })),
      description:
        'Average tone intensity across all statements (1–5 scale). Higher values indicate stronger rhetorical force regardless of direction.',
      format: fmtNum,
    },
    {
      key: 'volume',
      title: 'Statement Volume',
      value: `${totalStatements}`,
      color: '#620d3c',
      sparkData: monthlyData.map((m) => ({ v: m.total })),
      detailData: last12.map((m) => ({
        label: m.label,
        v: m.total,
      })),
      description:
        'Total statements extracted per month. Spikes often correspond to major bilateral events or policy announcements.',
      format: fmtNum,
    },
  ];

  const expandedDef = expandedMetric
    ? metrics.find((m) => m.key === expandedMetric) ?? null
    : null;

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-px bg-tk-rule">
        {metrics.map((m) => (
          <button
            key={m.key}
            onClick={() => setExpandedMetric(m.key)}
            className="bg-white border border-tk-rule p-3 sm:p-4 flex-1 min-w-0 hover:bg-tk-cream transition-colors duration-150 cursor-pointer text-left"
          >
            <div className="tk-meta-muted mb-1.5 truncate">{m.title}</div>
            <div className="flex items-end justify-between gap-2">
              <div
                className="text-2xl sm:text-3xl font-normal text-tk-gold tracking-[-0.02em] whitespace-nowrap"
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {m.value}
                {m.suffix && (
                  <span className="text-xs sm:text-sm font-normal text-[var(--tk-ink-50)] ml-0.5">
                    {m.suffix}
                  </span>
                )}
              </div>
              <div className="w-16 sm:w-24 h-8 sm:h-10 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={m.sparkData}>
                    <Line
                      type="monotone"
                      dataKey="v"
                      stroke={m.color}
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </button>
        ))}
      </div>

      {expandedDef && (
        <DetailModal
          metric={expandedDef}
          onClose={() => setExpandedMetric(null)}
        />
      )}
    </>
  );
}
