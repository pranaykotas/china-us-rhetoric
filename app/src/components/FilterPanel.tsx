import { useState, useRef, useEffect } from 'react';
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
        <h3 className="tk-eyebrow mb-2">Topic Category</h3>
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {TOPIC_LIST.map((cat) => (
            <button
              key={cat}
              onClick={() => toggleItem(cat, selectedTopics, onTopicsChange)}
              className={`px-2 sm:px-3 py-1 text-xs sm:text-sm border transition-colors duration-150 ${
                selectedTopics.includes(cat)
                  ? 'bg-tk-wine text-white border-tk-wine'
                  : 'bg-white text-tk-ink border-tk-rule hover:bg-tk-cream'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Tones Filter */}
      <div>
        <h3 className="tk-eyebrow mb-2">Tone</h3>
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {tones.map((tone) => (
            <button
              key={tone}
              onClick={() => toggleItem(tone, selectedTones, onTonesChange)}
              className={`px-2 sm:px-3 py-1 text-xs sm:text-sm border transition-colors duration-150 capitalize ${
                selectedTones.includes(tone)
                  ? 'bg-tk-wine text-white border-tk-wine'
                  : 'bg-white text-tk-ink border-tk-rule hover:bg-tk-cream'
              }`}
            >
              {tone}
            </button>
          ))}
        </div>
      </div>

      {/* Speakers Filter */}
      <div>
        <h3 className="tk-eyebrow mb-2">Speakers</h3>

        {selectedSpeakers.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {selectedSpeakers.map((s) => (
              <span
                key={s}
                className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-tk-wine text-white font-mono"
              >
                {s}
                <button
                  onClick={() => removeSpeaker(s)}
                  className="hover:text-tk-gold font-bold leading-none"
                  aria-label={`Remove ${s}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-1.5 mb-2">
          {top10.map((speaker) => (
            <button
              key={speaker}
              onClick={() => toggleItem(speaker, selectedSpeakers, onSpeakersChange)}
              className={`px-2 sm:px-3 py-1 text-xs sm:text-sm border transition-colors duration-150 ${
                selectedSpeakers.includes(speaker)
                  ? 'bg-tk-wine text-white border-tk-wine'
                  : 'bg-white text-tk-ink border-tk-rule hover:bg-tk-cream'
              }`}
            >
              {speaker}
            </button>
          ))}
        </div>

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
            className="w-full sm:w-64 px-3 py-1.5 text-sm border border-tk-rule focus:outline-none focus:ring-1 focus:ring-tk-wine"
          />
          {dropdownOpen && speakerSearch.length >= 2 && searchResults.length > 0 && (
            <ul className="absolute z-20 mt-0 w-full sm:w-64 bg-white border border-tk-rule max-h-48 overflow-y-auto text-sm">
              {searchResults.map((speaker) => (
                <li
                  key={speaker}
                  onClick={() => addSpeaker(speaker)}
                  className={`px-3 py-2 cursor-pointer hover:bg-tk-cream flex items-center justify-between border-b border-tk-rule last:border-b-0 ${
                    selectedSpeakers.includes(speaker) ? 'text-tk-wine font-medium' : 'text-tk-ink'
                  }`}
                >
                  <span>{speaker}</span>
                  {selectedSpeakers.includes(speaker) && (
                    <span className="text-tk-wine text-xs">✓</span>
                  )}
                </li>
              ))}
            </ul>
          )}
          {dropdownOpen && speakerSearch.length >= 2 && searchResults.length === 0 && (
            <div className="absolute z-20 mt-0 w-full sm:w-64 bg-white border border-tk-rule px-3 py-2 text-sm text-[var(--tk-ink-50)]">
              No speakers found
            </div>
          )}
        </div>
      </div>

      {hasFilters && (
        <button
          onClick={() => {
            onSpeakersChange([]);
            onTopicsChange([]);
            onTonesChange([]);
          }}
          className="text-sm text-tk-wine hover:text-tk-wine-dark font-mono uppercase tracking-wider"
        >
          Clear all filters
        </button>
      )}
    </div>
  );
}
