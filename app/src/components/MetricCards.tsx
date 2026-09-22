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
  // How to color a positive change. 'increase' = up is more cooperative (green up, red down),
  // 'decrease' = up is more hostile (red up, green down), 'neutral' = no value judgement.
  deltaDirection: 'increase' | 'decrease' | 'neutral';
}

function weightedSentiment(buckets: MonthlyBucket[]): number | null {
  const totalW = buckets.reduce((s, m) => s + m.total, 0);
  if (totalW === 0) return null;
  return buckets.reduce((s, m) => s + m.sentimentIndex * m.total, 0) / totalW;
}

// Trailing 3-month volume-weighted convergence %, one value per month —
// matches the definition used for the headline tile, so the modal's
// "Current" always agrees with what's shown on the card.
function rollingConvergenceSeries(monthlyData: MonthlyBucket[]): number[] {
  return monthlyData.map((_, i) => {
    const window = monthlyData.slice(Math.max(0, i - 2), i + 1);
    const w = weightedSentiment(window);
    return w !== null ? Math.round(((w + 2) / 4) * 100) : 0;
  });
}

// Trailing 3-month volume-weighted average of any per-month rate/score,
// one value per month. Used so a tile's headline number and its modal's
// "Current" figure are always the same quantity, computed the same way.
function rollingWeightedSeries(
  monthlyData: MonthlyBucket[],
  accessor: (m: MonthlyBucket) => number,
  decimals: number
): number[] {
  const mult = 10 ** decimals;
  return monthlyData.map((_, i) => {
    const window = monthlyData.slice(Math.max(0, i - 2), i + 1);
    const totalW = window.reduce((s, m) => s + m.total, 0);
    if (totalW === 0) return 0;
    const v = window.reduce((s, m) => s + accessor(m) * m.total, 0) / totalW;
    return Math.round(v * mult) / mult;
  });
}

// Cumulative statement count, one value per month — so the volume tile's
// all-time total and the modal's "Current" are the same running total.
function cumulativeVolumeSeries(monthlyData: MonthlyBucket[]): number[] {
  let running = 0;
  return monthlyData.map((m) => {
    running += m.total;
    return running;
  });
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
                  metric.deltaDirection === 'neutral' || delta === 0
                    ? 'text-[var(--tk-ink-50)]'
                    : metric.deltaDirection === 'increase'
                      ? delta > 0
                        ? 'text-green-700'
                        : 'text-red-600'
                      : delta > 0
                        ? 'text-red-600'
                        : 'text-green-700'
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

  const totalStatements = monthlyData.reduce((s, m) => s + m.total, 0);

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

  const convergenceSeries = rollingConvergenceSeries(monthlyData);
  const convergenceDetail = convergenceSeries
    .map((v, i) => ({ label: monthlyData[i].label, v }))
    .slice(-12);

  const hostilitySeries = rollingWeightedSeries(monthlyData, (m) => m.hostilityRate, 1);
  const hostilityDetail = hostilitySeries
    .map((v, i) => ({ label: monthlyData[i].label, v }))
    .slice(-12);
  const avgHostilityRate = hostilitySeries[hostilitySeries.length - 1] ?? 0;

  const cooperationSeries = rollingWeightedSeries(monthlyData, (m) => m.cooperationRate, 1);
  const cooperationDetail = cooperationSeries
    .map((v, i) => ({ label: monthlyData[i].label, v }))
    .slice(-12);
  const avgCooperationRate = cooperationSeries[cooperationSeries.length - 1] ?? 0;

  const intensitySeries = rollingWeightedSeries(monthlyData, (m) => m.avgIntensity, 2);
  const intensityDetail = intensitySeries
    .map((v, i) => ({ label: monthlyData[i].label, v }))
    .slice(-12);
  const avgIntensity = intensitySeries[intensitySeries.length - 1] ?? 0;

  const volumeSeries = cumulativeVolumeSeries(monthlyData);
  const volumeDetail = volumeSeries
    .map((v, i) => ({ label: monthlyData[i].label, v }))
    .slice(-12);

  const metrics: MetricDef[] = [
    {
      key: 'convergence',
      title: 'Convergence Signal (3m)',
      value: `${convergencePct}${trend}`,
      suffix: '%',
      color: '#620d3c',
      sparkData: convergenceSeries.map((v) => ({ v })),
      detailData: convergenceDetail,
      description:
        'Maps the 3-month rolling sentiment index to 0–100%. Higher values indicate more cooperative rhetoric; lower values indicate more confrontational.',
      format: fmtPct,
      deltaDirection: 'increase',
    },
    {
      key: 'hostility',
      title: 'Hostility Rate (3m)',
      value: `${avgHostilityRate}`,
      suffix: '%',
      color: '#ef4444',
      sparkData: hostilitySeries.map((v) => ({ v })),
      detailData: hostilityDetail,
      description:
        'Share of statements classified as confrontational or assertive. 3-month rolling weighted average.',
      format: fmtPct,
      deltaDirection: 'decrease',
    },
    {
      key: 'cooperation',
      title: 'Cooperation Rate (3m)',
      value: `${avgCooperationRate}`,
      suffix: '%',
      color: '#620d3c',
      sparkData: cooperationSeries.map((v) => ({ v })),
      detailData: cooperationDetail,
      description:
        'Share of statements classified as cooperative or conciliatory. 3-month rolling weighted average.',
      format: fmtPct,
      deltaDirection: 'increase',
    },
    {
      key: 'intensity',
      title: 'Avg Intensity (3m)',
      value: `${avgIntensity}`,
      color: '#f1a222',
      sparkData: intensitySeries.map((v) => ({ v })),
      detailData: intensityDetail,
      description:
        'Average tone intensity across all statements (1–5 scale). 3-month rolling weighted average; higher values indicate stronger rhetorical force regardless of direction.',
      format: fmtNum,
      deltaDirection: 'neutral',
    },
    {
      key: 'volume',
      title: 'Statement Volume',
      value: `${totalStatements}`,
      color: '#620d3c',
      sparkData: volumeSeries.map((v) => ({ v })),
      detailData: volumeDetail,
      description:
        'Cumulative statements extracted to date. "Change" is net new statements added since the previous month.',
      format: fmtNum,
      deltaDirection: 'neutral',
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
