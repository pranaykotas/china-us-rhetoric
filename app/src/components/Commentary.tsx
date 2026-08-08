import { CommentaryEntry } from '../types';

interface CommentaryProps {
  entries: CommentaryEntry[];
  onTagClick?: (tag: string) => void;
}

function tagColor(tag: string): string {
  const key = tag.toLowerCase();
  if (key === 'diplomacy') return 'bg-tk-wine-soft text-tk-wine border border-tk-wine/20';
  if (key === 'trade') return 'bg-tk-gold-soft text-tk-ink border border-tk-gold/30';
  if (key === 'taiwan') return 'bg-red-50 text-red-800 border border-red-200';
  if (key === 'technology') return 'bg-purple-50 text-purple-800 border border-purple-200';
  return 'bg-tk-cream text-[var(--tk-ink-70)] border border-tk-rule';
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function Commentary({ entries, onTagClick }: CommentaryProps) {
  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="bg-white border border-tk-rule p-6">
      <h2 className="text-lg font-normal text-tk-ink tracking-[-0.01em] mb-4">
        Analysis &amp; Commentary
      </h2>

      {sorted.length === 0 ? (
        <p className="text-[var(--tk-ink-50)] text-sm italic">No commentary yet.</p>
      ) : (
        <div className="space-y-6">
          {sorted.map((entry) => (
            <article key={entry.id} className="border-l-2 border-tk-wine pl-4">
              <div className="flex items-baseline justify-between gap-4 flex-wrap">
                <h3 className="font-medium text-tk-ink">{entry.title}</h3>
                <span className="tk-meta-muted whitespace-nowrap">
                  {formatDate(entry.date)} · {entry.author}
                </span>
              </div>

              {entry.tags && entry.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {entry.tags.map((tag) => (
                    onTagClick ? (
                      <button
                        key={tag}
                        onClick={() => onTagClick(tag)}
                        className={`px-2 py-0.5 text-xs font-mono uppercase tracking-wider cursor-pointer hover:opacity-75 transition-opacity ${tagColor(tag)}`}
                        title="Click to filter dashboard"
                      >
                        {tag}
                      </button>
                    ) : (
                      <span
                        key={tag}
                        className={`px-2 py-0.5 text-xs font-mono uppercase tracking-wider ${tagColor(tag)}`}
                      >
                        {tag}
                      </span>
                    )
                  ))}
                </div>
              )}

              <p className="mt-2 text-[var(--tk-ink-70)] text-sm whitespace-pre-wrap leading-relaxed">
                {entry.body}
              </p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
