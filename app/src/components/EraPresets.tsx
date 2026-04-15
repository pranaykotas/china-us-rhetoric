export interface EraPreset {
  id: string;
  label: string;
  dateRange: { start: string; end: string } | null;
}

export const ERA_PRESETS: EraPreset[] = [
  { id: 'all', label: 'All time', dateRange: null },
  { id: 'biden', label: 'Biden era', dateRange: { start: '2021-01-20', end: '2025-01-19' } },
  { id: 'trump2', label: 'Trump 2.0', dateRange: { start: '2025-01-20', end: '9999-12-31' } },
  { id: 'tariff', label: 'Tariff shock', dateRange: { start: '2025-04-01', end: '2025-09-30' } },
];

interface EraPresetsProps {
  activePreset: string;
  onPresetSelect: (preset: EraPreset) => void;
}

export function EraPresets({ activePreset, onPresetSelect }: EraPresetsProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Era:</span>
      {ERA_PRESETS.map((preset) => (
        <button
          key={preset.id}
          onClick={() => onPresetSelect(preset)}
          className={`px-3 py-1 text-sm rounded-full border transition-colors ${
            activePreset === preset.id
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:text-blue-600'
          }`}
        >
          {preset.label}
        </button>
      ))}
    </div>
  );
}
