import { useState, useRef, useEffect } from 'react';
import { TopicCategory } from '../types';
import { TOPIC_LIST } from '../utils/colors';

interface FilterPanelProps {
  speakers: string[];  // sorted by statement count descending
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
  const [speakerSearch, setSpeakerSearch] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const top10 = speakers.slice(0, 10);

  const searchResults = speakerSearch.length >= 2
    ? speakers
        .filter((s) => s.toLowerCase().includes(speakerSearch.toLowerCase()))
        .slice(0, 10)
    : [];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

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

  const addSpeaker = (speaker: string) => {
    if (!selectedSpeakers.includes(speaker)) {
      onSpeakersChange([...selectedSpeakers, speaker]);
    }
    setSpeakerSearch('');
    setDropdownOpen(false);
  };

  const removeSpeaker = (speaker: string) => {
    onSpeakersChange(selectedSpeakers.filter((s) => s !== speaker));
  };

  const hasFilters = selectedSpeakers.length > 0 || selectedTopics.length > 0 || selectedTones.length > 0;

  return (
    <div className="space-y-4">
      {/* Topic Category Filter */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">Topic Category</h3>
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {TOPIC_LIST.map((cat) => (
            <button
              key={cat}
              onClick={() => toggleItem(cat, selectedTopics, onTopicsChange)}
              className={`px-2 sm:px-3 py-1 text-xs sm:text-sm rounded-full border transition-colors ${
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
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {tones.map((tone) => (
            <button
              key={tone}
              onClick={() => toggleItem(tone, selectedTones, onTonesChange)}
              className={`px-2 sm:px-3 py-1 text-xs sm:text-sm rounded-full border transition-colors capitalize ${
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

      {/* Speakers Filter — top 10 pills + typeahead */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">Speakers</h3>

        {/* Selected speaker chips */}
        {selectedSpeakers.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {selectedSpeakers.map((s) => (
              <span
                key={s}
                className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full"
              >
                {s}
                <button
                  onClick={() => removeSpeaker(s)}
                  className="hover:text-blue-600 font-bold leading-none"
                  aria-label={`Remove ${s}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Top 10 quick-select pills */}
        <div className="flex flex-wrap gap-1.5 mb-2">
          {top10.map((speaker) => (
            <button
              key={speaker}
              onClick={() => toggleItem(speaker, selectedSpeakers, onSpeakersChange)}
              className={`px-2 sm:px-3 py-1 text-xs sm:text-sm rounded-full border transition-colors ${
                selectedSpeakers.includes(speaker)
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-blue-300'
              }`}
            >
              {speaker}
            </button>
          ))}
        </div>

        {/* Typeahead for all 553 speakers */}
        <div className="relative" ref={searchRef}>
          <input
            type="text"
            placeholder="Search all speakers…"
            value={speakerSearch}
            onChange={(e) => {
              setSpeakerSearch(e.target.value);
              setDropdownOpen(true);
            }}
            onFocus={() => speakerSearch.length >= 2 && setDropdownOpen(true)}
            className="w-full sm:w-64 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
          {dropdownOpen && speakerSearch.length >= 2 && searchResults.length > 0 && (
            <ul className="absolute z-20 mt-1 w-full sm:w-64 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto text-sm">
              {searchResults.map((speaker) => (
                <li
                  key={speaker}
                  onClick={() => addSpeaker(speaker)}
                  className={`px-3 py-2 cursor-pointer hover:bg-blue-50 flex items-center justify-between ${
                    selectedSpeakers.includes(speaker) ? 'text-blue-600 font-medium' : 'text-gray-700'
                  }`}
                >
                  <span>{speaker}</span>
                  {selectedSpeakers.includes(speaker) && (
                    <span className="text-blue-400 text-xs">✓</span>
                  )}
                </li>
              ))}
            </ul>
          )}
          {dropdownOpen && speakerSearch.length >= 2 && searchResults.length === 0 && (
            <div className="absolute z-20 mt-1 w-full sm:w-64 bg-white border border-gray-200 rounded-md shadow-lg px-3 py-2 text-sm text-gray-400">
              No speakers found
            </div>
          )}
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
