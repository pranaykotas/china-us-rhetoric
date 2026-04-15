import { CommentaryEntry } from '../types';

interface CommentaryProps {
  entries: CommentaryEntry[];
  onTagClick?: (tag: string) => void;
}

const TAG_COLORS: Record<string, string> = {
  diplomacy: 'bg-blue-100 text-blue-800',
  trade: 'bg-yellow-100 text-yellow-800',
  taiwan: 'bg-red-100 text-red-800',
  technology: 'bg-purple-100 text-purple-800',
  military: 'bg-orange-100 text-orange-800',
  'human rights': 'bg-pink-100 text-pink-800',
  'belt & road': 'bg-green-100 text-green-800',
  multilateral: 'bg-teal-100 text-teal-800',
};

function tagColor(tag: string): string {
  return TAG_COLORS[tag.toLowerCase()] ?? 'bg-gray-100 text-gray-700';
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
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
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        Analysis &amp; Commentary
      </h2>

      {sorted.length === 0 ? (
        <p className="text-gray-400 text-sm italic">No commentary yet.</p>
      ) : (
        <div className="space-y-6">
          {sorted.map((entry) => (
            <article key={entry.id} className="border-l-4 border-blue-400 pl-4">
              <div className="flex items-baseline justify-between gap-4 flex-wrap">
                <h3 className="font-medium text-gray-900">{entry.title}</h3>
                <span className="text-xs text-gray-400 whitespace-nowrap">
                  {formatDate(entry.date)} · {entry.author}
                </span>
              </div>

              {entry.tags && entry.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {entry.tags.map((tag) => (
                    onTagClick ? (
                      <button
                        key={tag}
                        onClick={() => onTagClick(tag)}
                        className={`px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer hover:opacity-75 transition-opacity ${tagColor(tag)}`}
                        title="Click to filter dashboard"
                      >
                        {tag}
                      </button>
                    ) : (
                      <span
                        key={tag}
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${tagColor(tag)}`}
                      >
                        {tag}
                      </span>
                    )
                  ))}
                </div>
              )}

              <p className="mt-2 text-gray-700 text-sm whitespace-pre-wrap leading-relaxed">
                {entry.body}
              </p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
