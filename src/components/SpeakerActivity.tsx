import { useMemo } from 'react';
import { MonthlyBucket } from '../types';

interface SpeakerActivityProps {
  monthlyData: MonthlyBucket[];
  onSpeakerClick?: (speaker: string) => void;
  onMonthClick?: (month: string) => void;
}

export function SpeakerActivity({ monthlyData, onSpeakerClick, onMonthClick }: SpeakerActivityProps) {
  // Get top 8 speakers across all months
  const topSpeakers = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const bucket of monthlyData) {
      for (const [speaker, count] of Object.entries(bucket.speakerCounts)) {
        totals[speaker] = (totals[speaker] || 0) + count;
      }
    }
    return Object.entries(totals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([speaker]) => speaker);
  }, [monthlyData]);

  // Find max count for color scaling
  const maxCount = useMemo(() => {
    let max = 0;
    for (const bucket of monthlyData) {
      for (const speaker of topSpeakers) {
        const c = bucket.speakerCounts[speaker] || 0;
        if (c > max) max = c;
      }
    }
    return max || 1;
  }, [monthlyData, topSpeakers]);

  const getCellColor = (count: number) => {
    if (count === 0) return 'bg-gray-50';
    const intensity = count / maxCount;
    if (intensity > 0.75) return 'bg-blue-600 text-white';
    if (intensity > 0.5) return 'bg-blue-400 text-white';
    if (intensity > 0.25) return 'bg-blue-300 text-blue-900';
    return 'bg-blue-100 text-blue-800';
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow flex-1">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Speaker Activity</h3>
      <div className="overflow-x-auto">
        <table className="text-xs">
          <thead>
            <tr>
              <th className="text-left pr-2 py-1 font-medium text-gray-500 sticky left-0 bg-white">Speaker</th>
              {monthlyData.map((bucket) => (
                <th
                  key={bucket.month}
                  className="px-1 py-1 font-normal text-gray-400 cursor-pointer hover:text-gray-700 min-w-[40px] text-center"
                  onClick={() => onMonthClick?.(bucket.month)}
                >
                  {bucket.label.split(' ')[0].substring(0, 3)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {topSpeakers.map((speaker) => (
              <tr key={speaker}>
                <td
                  className="pr-2 py-1 font-medium text-gray-700 whitespace-nowrap sticky left-0 bg-white cursor-pointer hover:text-blue-600"
                  onClick={() => onSpeakerClick?.(speaker)}
                >
                  {speaker.length > 20 ? speaker.substring(0, 18) + '...' : speaker}
                </td>
                {monthlyData.map((bucket) => {
                  const count = bucket.speakerCounts[speaker] || 0;
                  return (
                    <td
                      key={bucket.month}
                      className={`px-1 py-1 text-center rounded cursor-pointer hover:ring-1 hover:ring-blue-400 ${getCellColor(count)}`}
                      title={`${speaker}: ${count} statements in ${bucket.label}`}
                      onClick={() => {
                        onSpeakerClick?.(speaker);
                        onMonthClick?.(bucket.month);
                      }}
                    >
                      {count || ''}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Legend */}
      <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
        <span>Less</span>
        <div className="flex gap-0.5">
          <div className="w-4 h-4 rounded bg-gray-50 border border-gray-200" />
          <div className="w-4 h-4 rounded bg-blue-100" />
          <div className="w-4 h-4 rounded bg-blue-300" />
          <div className="w-4 h-4 rounded bg-blue-400" />
          <div className="w-4 h-4 rounded bg-blue-600" />
        </div>
        <span>More</span>
      </div>
    </div>
  );
}
