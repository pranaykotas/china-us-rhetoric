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
      <span className="tk-meta-muted">Era:</span>
      {ERA_PRESETS.map((preset) => (
        <button
          key={preset.id}
          onClick={() => onPresetSelect(preset)}
          className={`px-3 py-1 text-xs font-mono uppercase tracking-wider border transition-colors duration-150 ${
            activePreset === preset.id
              ? 'bg-tk-wine text-white border-tk-wine'
              : 'bg-white text-tk-ink border-tk-rule hover:bg-tk-cream'
          }`}
        >
          {preset.label}
        </button>
      ))}
    </div>
  );
}
