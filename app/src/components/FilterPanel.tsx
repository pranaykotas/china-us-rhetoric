import { TopicCategory } from '../types';
import { TOPIC_LIST } from '../utils/colors';

interface FilterPanelProps {
  speakers: string[];
  tones: string[];
  selectedSpeakers: string[];
  selectedTopics: TopicCategory[];
  selectedTones: string[];
  onSpeakersChange: (speakers: string[]) => void;
  onTopicsChange: (topics: TopicCategory[]) => void;
  onTonesChange: (tones: string[]) => void;
}

export function FilterPanel({
  speakers,
  tones,
  selectedSpeakers,
  selectedTopics,
  selectedTones,
  onSpeakersChange,
  onTopicsChange,
  onTonesChange,
}: FilterPanelProps) {
  const toggleItem = <T extends string>(
    item: T,
    selected: T[],
    onChange: (items: T[]) => void
  ) => {
    if (selected.includes(item)) {
      onChange(selected.filter((i) => i !== item));
    } else {
      onChange([...selected, item]);
    }
  };

  const hasFilters = selectedSpeakers.length > 0 || selectedTopics.length > 0 || selectedTones.length > 0;

  return (
    <div className="space-y-4">
      {/* Topic Category Filter */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">Topic Category</h3>
        <div className="flex flex-wrap gap-2">
          {TOPIC_LIST.map((cat) => (
            <button
              key={cat}
              onClick={() => toggleItem(cat, selectedTopics, onTopicsChange)}
              className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                selectedTopics.includes(cat)
                  ? 'bg-green-500 text-white border-green-500'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-green-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Tones Filter */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">Tone</h3>
        <div className="flex flex-wrap gap-2">
          {tones.map((tone) => (
            <button
              key={tone}
              onClick={() => toggleItem(tone, selectedTones, onTonesChange)}
              className={`px-3 py-1 text-sm rounded-full border transition-colors capitalize ${
                selectedTones.includes(tone)
                  ? 'bg-purple-500 text-white border-purple-500'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-purple-300'
              }`}
            >
              {tone}
            </button>
          ))}
        </div>
      </div>

      {/* Speakers Filter */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">Speakers</h3>
        <div className="flex flex-wrap gap-2">
          {speakers.map((speaker) => (
            <button
              key={speaker}
              onClick={() => toggleItem(speaker, selectedSpeakers, onSpeakersChange)}
              className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                selectedSpeakers.includes(speaker)
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-blue-300'
              }`}
            >
              {speaker}
            </button>
          ))}
        </div>
      </div>

      {/* Clear Filters */}
      {hasFilters && (
        <button
          onClick={() => {
            onSpeakersChange([]);
            onTopicsChange([]);
            onTonesChange([]);
          }}
          className="text-sm text-red-600 hover:text-red-800"
        >
          Clear all filters
        </button>
      )}
    </div>
  );
}
