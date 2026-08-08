import { useMemo } from 'react';
import { MonthlyBucket } from '../types';
import { useIsMobile } from '../hooks/useWindowSize';

interface SpeakerActivityProps {
  monthlyData: MonthlyBucket[];
  onSpeakerClick?: (speaker: string) => void;
  onMonthClick?: (month: string) => void;
}

export function SpeakerActivity({ monthlyData, onSpeakerClick, onMonthClick }: SpeakerActivityProps) {
  const isMobile = useIsMobile();

  const displayData = useMemo(
    () => isMobile ? monthlyData.slice(-12) : monthlyData,
    [monthlyData, isMobile]
  );

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

  const maxCount = useMemo(() => {
    let max = 0;
    for (const bucket of displayData) {
      for (const speaker of topSpeakers) {
        const c = bucket.speakerCounts[speaker] || 0;
        if (c > max) max = c;
      }
    }
    return max || 1;
  }, [displayData, topSpeakers]);

  const getCellColor = (count: number) => {
    if (count === 0) return 'bg-white';
    const intensity = count / maxCount;
    if (intensity > 0.75) return 'bg-tk-wine text-white';
    if (intensity > 0.5) return 'bg-tk-wine/70 text-white';
    if (intensity > 0.25) return 'bg-tk-wine/30 text-tk-ink';
    return 'bg-tk-wine-soft text-tk-ink';
  };

  const maxNameLen = isMobile ? 14 : 20;
  const cellClass = isMobile ? 'px-0.5 py-0.5 min-w-[28px]' : 'px-1 py-1 min-w-[40px]';
  const nameCellClass = isMobile ? 'pr-1 py-0.5 text-[10px]' : 'pr-2 py-1 text-xs';

  return (
    <div className="bg-white p-3 sm:p-4 border border-tk-rule flex-1">
      <h3 className="text-base sm:text-lg font-normal text-tk-ink tracking-[-0.01em] mb-3 sm:mb-4">Speaker Activity</h3>
      {isMobile && (
        <p className="tk-meta-muted mb-2">Last 12 months · scroll →</p>
      )}
      <div className="overflow-x-auto">
        <table className={isMobile ? 'text-[10px]' : 'text-xs'}>
          <thead>
            <tr>
              <th className={`text-left font-medium text-[var(--tk-ink-50)] sticky left-0 bg-white font-mono uppercase tracking-wider ${nameCellClass}`}>
                Speaker
              </th>
              {displayData.map((bucket) => (
                <th
                  key={bucket.month}
                  className={`font-normal text-[var(--tk-ink-50)] cursor-pointer hover:text-tk-ink text-center font-mono ${cellClass}`}
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
                  className={`font-medium text-tk-ink whitespace-nowrap sticky left-0 bg-white cursor-pointer hover:text-tk-wine ${nameCellClass}`}
                  onClick={() => onSpeakerClick?.(speaker)}
                >
                  {speaker.length > maxNameLen ? speaker.substring(0, maxNameLen - 1) + '…' : speaker}
                </td>
                {displayData.map((bucket) => {
                  const count = bucket.speakerCounts[speaker] || 0;
                  return (
                    <td
                      key={bucket.month}
                      className={`text-center cursor-pointer hover:ring-1 hover:ring-tk-wine font-mono ${cellClass} ${getCellColor(count)}`}
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
      <div className="flex items-center gap-2 sm:gap-3 mt-2 sm:mt-3 text-xs text-[var(--tk-ink-50)] font-mono">
        <span>Less</span>
        <div className="flex gap-0.5">
          <div className="w-3 h-3 sm:w-4 sm:h-4 bg-white border border-tk-rule" />
          <div className="w-3 h-3 sm:w-4 sm:h-4 bg-tk-wine-soft" />
          <div className="w-3 h-3 sm:w-4 sm:h-4 bg-tk-wine/30" />
          <div className="w-3 h-3 sm:w-4 sm:h-4 bg-tk-wine/70" />
          <div className="w-3 h-3 sm:w-4 sm:h-4 bg-tk-wine" />
        </div>
        <span>More</span>
      </div>
    </div>
  );
}
