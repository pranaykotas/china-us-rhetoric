import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ArticleStatements,
  CommentaryEntry,
  FlattenedStatement,
  EnrichedStatement,
  CanonicalTone,
  TopicCategory,
  SortField,
  SortDirection,
} from './types';
import { SearchBar } from './components/SearchBar';
import { FilterPanel } from './components/FilterPanel';
import { StatementsTable } from './components/StatementsTable';
import { MetricCards } from './components/MetricCards';
import { SentimentTimeline } from './components/SentimentTimeline';
import { TopicTimeline } from './components/TopicTimeline';
import { SpeakerActivity } from './components/SpeakerActivity';
import { SpeakerToneChart } from './components/SpeakerToneChart';
import { Commentary } from './components/Commentary';
import { DataNotes } from './components/DataNotes';
import { EraPresets, EraPreset } from './components/EraPresets';
import { SpeakerProfile } from './components/SpeakerProfile';
import { enrichStatements, aggregateMonthly } from './utils/dataProcessing';

// Map commentary tags → filter presets
const TAG_TO_FILTER: Record<string, {
  topicCategories?: TopicCategory[];
  dateRange?: { start: string; end: string };
  presetId?: string;
}> = {
  taiwan:     { topicCategories: ['Taiwan'] },
  trade:      { topicCategories: ['Trade & Economy'] },
  diplomacy:  { topicCategories: ['Diplomacy'] },
  technology: { topicCategories: ['Technology'] },
  trump2:     { dateRange: { start: '2025-01-20', end: '9999-12-31' }, presetId: 'trump2' },
  biden:      { dateRange: { start: '2021-01-20', end: '2025-01-19' }, presetId: 'biden' },
};

function App() {
  const [data, setData] = useState<ArticleStatements[]>([]);
  const [commentary, setCommentary] = useState<CommentaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [searchText, setSearchText] = useState('');
  const [selectedSpeakers, setSelectedSpeakers] = useState<string[]>([]);
  const [selectedTopicCategories, setSelectedTopicCategories] = useState<TopicCategory[]>([]);
  const [selectedTones, setSelectedTones] = useState<string[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null);
  const [activePreset, setActivePreset] = useState<string>('all');
  const [showUSOnly, setShowUSOnly] = useState(true);

  // Sort state
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Selected statement for detail view
  const [selectedStatement, setSelectedStatement] = useState<EnrichedStatement | null>(null);

  // Speaker profile modal
  const [selectedSpeakerProfile, setSelectedSpeakerProfile] = useState<string | null>(null);

  // Methodology note expanded state
  const [methodologyExpanded, setMethodologyExpanded] = useState(false);

  // Intro banner — dismissed state persisted in localStorage
  const [introDismissed, setIntroDismissed] = useState(
    () => localStorage.getItem('tpd-intro-dismissed') === '1'
  );

  const dismissIntro = useCallback(() => {
    localStorage.setItem('tpd-intro-dismissed', '1');
    setIntroDismissed(true);
  }, []);

  // Copy state for modal
  const [modalCopied, setModalCopied] = useState(false);

  // Load data
  useEffect(() => {
    const base = import.meta.env.BASE_URL;
    Promise.all([
      fetch(`${base}statements.json`).then((res) => {
        if (!res.ok) throw new Error('Failed to load statements data');
        return res.json();
      }),
      fetch(`${base}commentary.json`)
        .then((res) => (res.ok ? res.json() : []))
        .catch(() => []),
    ])
      .then(([statementsData, commentaryData]) => {
        setData(statementsData);
        setCommentary(commentaryData);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  // Flatten and enrich all statements (computed once)
  const allEnriched = useMemo((): EnrichedStatement[] => {
    const flat: FlattenedStatement[] = data.flatMap((article) =>
      article.statements.map((statement) => ({
        ...statement,
        article_url: article.article_url,
        article_date: article.article_date,
        article_title: article.article_title,
      }))
    );
    return enrichStatements(flat);
  }, [data]);

  // Apply US-relevance + date range filters as the base dataset
  const enrichedStatements = useMemo(() => {
    let base = showUSOnly ? allEnriched.filter((s) => s.isUSRelevant) : allEnriched;
    if (dateRange) {
      base = base.filter(
        (s) => s.article_date >= dateRange.start && s.article_date <= dateRange.end
      );
    }
    return base;
  }, [allEnriched, showUSOnly, dateRange]);

  // Monthly aggregation (on base dataset, not user-filtered)
  const monthlyData = useMemo(
    () => aggregateMonthly(enrichedStatements),
    [enrichedStatements]
  );

  // Get unique speakers sorted by statement count descending (top speakers first for FilterPanel)
  const allSpeakers = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of enrichedStatements) {
      counts[s.speaker] = (counts[s.speaker] || 0) + 1;
    }
    return Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
  }, [enrichedStatements]);
  const allCanonicalTones = useMemo(
    () => [...new Set(enrichedStatements.map((s) => s.canonicalTone))].sort(),
    [enrichedStatements]
  );

  const usRelevantCount = useMemo(
    () => allEnriched.filter((s) => s.isUSRelevant).length,
    [allEnriched]
  );

  // Filtered and sorted statements
  const filteredStatements = useMemo(() => {
    let result = [...enrichedStatements];

    if (searchText) {
      const search = searchText.toLowerCase();
      result = result.filter(
        (s) =>
          s.quote_or_paraphrase.toLowerCase().includes(search) ||
          s.context.toLowerCase().includes(search) ||
          s.speaker.toLowerCase().includes(search)
      );
    }

    if (selectedSpeakers.length > 0) {
      result = result.filter((s) => selectedSpeakers.includes(s.speaker));
    }

    if (selectedTopicCategories.length > 0) {
      result = result.filter((s) => selectedTopicCategories.includes(s.topicCategory));
    }

    if (selectedTones.length > 0) {
      result = result.filter((s) => selectedTones.includes(s.canonicalTone));
    }

    if (selectedMonth) {
      result = result.filter((s) => s.article_date && s.article_date.startsWith(selectedMonth));
    }

    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'date':
          comparison = a.article_date.localeCompare(b.article_date);
          break;
        case 'speaker':
          comparison = a.speaker.localeCompare(b.speaker);
          break;
        case 'topic':
          comparison = a.topicCategory.localeCompare(b.topicCategory);
          break;
        case 'tone':
          comparison = a.canonicalTone.localeCompare(b.canonicalTone);
          break;
        case 'tone_intensity':
          comparison = a.tone_intensity - b.tone_intensity;
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [
    enrichedStatements,
    searchText,
    selectedSpeakers,
    selectedTopicCategories,
    selectedTones,
    selectedMonth,
    sortField,
    sortDirection,
  ]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchText, selectedSpeakers, selectedTopicCategories, selectedTones, selectedMonth, showUSOnly, dateRange]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Cross-chart interaction handlers
  const handleMonthClick = useCallback((month: string) => {
    setSelectedMonth((prev) => (prev === month ? null : month));
  }, []);

  const handleSpeakerClick = useCallback((speaker: string) => {
    setSelectedSpeakers((prev) =>
      prev.includes(speaker) ? prev.filter((s) => s !== speaker) : [speaker]
    );
  }, []);

  const handleToneClick = useCallback((tone: CanonicalTone) => {
    setSelectedTones((prev) =>
      prev.includes(tone) ? prev.filter((t) => t !== tone) : [tone]
    );
  }, []);

  const handleTopicClick = useCallback((topic: TopicCategory) => {
    setSelectedTopicCategories((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [topic]
    );
  }, []);

  const handlePresetSelect = useCallback((preset: EraPreset) => {
    setActivePreset(preset.id);
    setDateRange(preset.dateRange);
    setSelectedMonth(null);
  }, []);

  const handleCommentaryTagClick = useCallback((tag: string) => {
    const mapping = TAG_TO_FILTER[tag.toLowerCase()];
    if (!mapping) return;
    if (mapping.topicCategories) {
      setSelectedTopicCategories(mapping.topicCategories);
    }
    if (mapping.dateRange) {
      setDateRange(mapping.dateRange);
      setActivePreset(mapping.presetId ?? 'all');
      setSelectedMonth(null);
    }
    document.getElementById('sentiment-timeline')?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const clearAllFilters = useCallback(() => {
    setSearchText('');
    setSelectedSpeakers([]);
    setSelectedTopicCategories([]);
    setSelectedTones([]);
    setSelectedMonth(null);
    setDateRange(null);
    setActivePreset('all');
  }, []);

  const handleModalCopy = useCallback((statement: EnrichedStatement) => {
    const text = `"${statement.quote_or_paraphrase}"
— ${statement.speaker}${statement.speaker_title ? ', ' + statement.speaker_title : ''}, ${statement.context}
${statement.article_date} | Source: ${statement.article_url}`;
    navigator.clipboard.writeText(text).then(() => {
      setModalCopied(true);
      setTimeout(() => setModalCopied(false), 1500);
    });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-[var(--tk-ink-50)] font-mono text-sm uppercase tracking-wider">Loading…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="border border-tk-rule p-6">
          <h2 className="text-tk-wine font-medium">Error loading data</h2>
          <p className="text-[var(--tk-ink-70)] mt-2">{error}</p>
          <p className="text-sm text-[var(--tk-ink-50)] mt-4">
            Make sure statements.json is in the public folder.
          </p>
        </div>
      </div>
    );
  }

  const hasActiveFilters =
    searchText ||
    selectedSpeakers.length > 0 ||
    selectedTopicCategories.length > 0 ||
    selectedTones.length > 0 ||
    selectedMonth ||
    dateRange;

  return (
    <div className="min-h-screen">
      {/* Wine navbar */}
      <header className="bg-tk-wine">
        <div className="max-w-7xl mx-auto py-4 sm:py-5 px-4 sm:px-10">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-normal text-white tracking-[-0.02em]">
                Tracking People's Daily
              </h1>
              <p className="text-white/70 mt-1 text-sm">
                Chinese leader statements about the United States
              </p>
              <p className="font-mono text-[10.5px] tracking-wider uppercase text-white/80 mt-1.5">
                Data:{' '}
                <a
                  href="https://trackingpeoplesdaily.substack.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-tk-gold hover:text-tk-gold/80 underline"
                >
                  Tracking People's Daily ↗
                </a>
                {' '}by Manoj Kewalramani · Project by Pranay Kotasthane and Manoj Kewalramani
                {' · '}
                <button
                  onClick={() => setMethodologyExpanded((v) => !v)}
                  className="text-white hover:text-white/90 underline"
                >
                  {methodologyExpanded ? '▲ methodology' : 'methodology →'}
                </button>
              </p>
              {methodologyExpanded && (
                <div className="mt-3 text-sm text-white/85 max-w-2xl border-l-2 border-tk-gold pl-4">
                  <p>
                    Claude Haiku reads each newsletter article and extracts every statement a Chinese official
                    makes about the US — recording speaker, tone (confrontational → conciliatory), topic, and
                    the quote itself. A second cleanup pass removes domestic false positives. Dataset covers
                    January 2021 to present (~{(Math.round(enrichedStatements.length / 100) * 100).toLocaleString()} statements, updated weekly).
                    {' '}
                    <a
                      href="https://github.com/pranaykotas/china-us-rhetoric/blob/main/METHODOLOGY.md"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-tk-gold hover:text-tk-gold/80 underline"
                    >
                      Full methodology ↗
                    </a>
                  </p>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3 sm:mt-1 shrink-0">
              <label className="flex items-center gap-2 cursor-pointer">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={showUSOnly}
                    onChange={(e) => setShowUSOnly(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-white/20 peer-focus:ring-2 peer-focus:ring-tk-gold/50 peer-checked:bg-tk-gold after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full" />
                </div>
                <span className="text-sm text-white/85">
                  US-focused only
                  <span className="font-mono text-[10.5px] tracking-wider text-white/70 ml-1.5">
                    ({usRelevantCount}/{allEnriched.length})
                  </span>
                </span>
              </label>
            </div>
          </div>
        </div>
      </header>

      {!introDismissed && (
        <div className="bg-tk-gold-soft border-b border-tk-rule">
          <div className="max-w-7xl mx-auto px-4 sm:px-10 py-4 flex gap-4 items-start">
            <div className="flex-1 text-sm text-tk-ink leading-relaxed">
              <span className="font-medium">What is this?</span>{' '}
              People's Daily is the official newspaper of the Central Committee of the Communist Party of China.
              This dashboard tracks how Chinese officials have characterised the United States since January 2021,
              extracted from the{' '}
              <a
                href="https://trackingpeoplesdaily.substack.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-tk-wine hover:text-tk-wine-dark"
              >
                Tracking People's Daily
              </a>
              {' '}newsletter by Manoj Kewalramani.
              Every statement is classified by speaker, tone (confrontational → conciliatory), and topic.
              Use the era presets and filters to explore patterns — or scroll down to read the commentary.
            </div>
            <button
              onClick={dismissIntro}
              className="shrink-0 text-[var(--tk-ink-50)] hover:text-tk-ink transition-colors mt-0.5"
              aria-label="Dismiss"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-10 space-y-8">
        {/* 1. Metric Sparkline Cards */}
        <MetricCards monthlyData={monthlyData} />

        {/* Era preset buttons */}
        <div className="border border-tk-rule bg-white px-4 py-3">
          <EraPresets activePreset={activePreset} onPresetSelect={handlePresetSelect} />
        </div>

        {/* 2. Rhetoric Sentiment Index (hero chart) */}
        <SentimentTimeline
          monthlyData={monthlyData}
          onMonthClick={handleMonthClick}
        />

        {/* 3. Topic Evolution + Speaker Activity (side by side) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TopicTimeline
            monthlyData={monthlyData}
            onTopicClick={handleTopicClick}
            onMonthClick={handleMonthClick}
          />
          <SpeakerActivity
            monthlyData={monthlyData}
            onSpeakerClick={handleSpeakerClick}
            onMonthClick={handleMonthClick}
          />
        </div>

        {/* 4. Tone Distribution by Speaker */}
        <SpeakerToneChart
          statements={enrichedStatements}
          onSpeakerClick={handleSpeakerClick}
          onToneClick={handleToneClick}
        />

        {/* 5. Data caveats + Analysis & Commentary */}
        <DataNotes />
        <Commentary entries={commentary} onTagClick={handleCommentaryTagClick} />

        {/* Active filters indicator */}
        {hasActiveFilters && (
          <div className="bg-tk-wine-soft border border-tk-rule px-4 py-3 flex items-center justify-between">
            <div className="flex flex-wrap gap-2 items-center text-sm">
              <span className="text-tk-wine font-medium font-mono text-xs uppercase tracking-wider">Active filters:</span>
              {dateRange && (
                <span className="px-2 py-0.5 bg-tk-wine text-white text-xs font-mono">
                  Era: {activePreset !== 'all' ? activePreset : `${dateRange.start} – ${dateRange.end}`}
                </span>
              )}
              {selectedMonth && (
                <span className="px-2 py-0.5 bg-tk-wine text-white text-xs font-mono">
                  {selectedMonth}
                </span>
              )}
              {selectedSpeakers.map((s) => (
                <span key={s} className="px-2 py-0.5 bg-tk-wine text-white text-xs font-mono">
                  {s}
                </span>
              ))}
              {selectedTopicCategories.map((t) => (
                <span key={t} className="px-2 py-0.5 bg-tk-wine-soft text-tk-wine text-xs font-mono border border-tk-wine/30">
                  {t}
                </span>
              ))}
              {selectedTones.map((t) => (
                <span key={t} className="px-2 py-0.5 bg-tk-wine-soft text-tk-wine text-xs font-mono capitalize border border-tk-wine/30">
                  {t}
                </span>
              ))}
              {searchText && (
                <span className="px-2 py-0.5 bg-tk-cream text-tk-ink text-xs font-mono border border-tk-rule">
                  "{searchText}"
                </span>
              )}
              <span className="text-tk-wine ml-2 font-mono text-xs">
                {filteredStatements.length} / {enrichedStatements.length}
              </span>
            </div>
            <button
              onClick={clearAllFilters}
              className="text-sm text-tk-wine hover:text-tk-wine-dark font-mono text-xs uppercase tracking-wider whitespace-nowrap ml-4"
            >
              Clear all
            </button>
          </div>
        )}

        {/* 6. Search and Filters */}
        <div className="bg-white border border-tk-rule p-4 space-y-4">
          <SearchBar value={searchText} onChange={setSearchText} />
          <FilterPanel
            speakers={allSpeakers}
            tones={allCanonicalTones}
            selectedSpeakers={selectedSpeakers}
            selectedTopics={selectedTopicCategories}
            selectedTones={selectedTones}
            onSpeakersChange={setSelectedSpeakers}
            onTopicsChange={setSelectedTopicCategories}
            onTonesChange={setSelectedTones}
          />
        </div>

        {/* 7. Statements Table */}
        <StatementsTable
          statements={filteredStatements}
          sortField={sortField}
          sortDirection={sortDirection}
          onSort={handleSort}
          currentPage={currentPage}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onStatementClick={setSelectedStatement}
          onSpeakerProfileClick={setSelectedSpeakerProfile}
        />

        {/* Statement Detail Modal */}
        {selectedStatement && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => setSelectedStatement(null)}
          >
            <div
              className="bg-white border border-tk-rule max-w-2xl w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="border-b-2 border-tk-wine px-6 py-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-normal text-tk-ink tracking-[-0.01em]">
                      {selectedStatement.speaker}
                    </h2>
                    {selectedStatement.speaker_title && (
                      <p className="text-sm text-[var(--tk-ink-70)] mt-0.5">{selectedStatement.speaker_title}</p>
                    )}
                  </div>
                  <button
                    onClick={() => setSelectedStatement(null)}
                    className="text-[var(--tk-ink-50)] hover:text-tk-ink"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <p className="tk-meta-muted mt-1">{selectedStatement.article_date}</p>
              </div>

              <div className="p-6">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="tk-eyebrow">Quote / Paraphrase</h3>
                    <button
                      onClick={() => handleModalCopy(selectedStatement)}
                      className="flex items-center gap-1 text-xs text-[var(--tk-ink-50)] hover:text-tk-ink border border-tk-rule px-2 py-0.5 font-mono uppercase tracking-wider"
                    >
                      {modalCopied ? (
                        <>
                          <svg className="w-3.5 h-3.5 text-tk-wine" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Copied
                        </>
                      ) : (
                        <>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                          </svg>
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                  <p className="mt-2 text-tk-ink italic border-l-2 border-tk-wine pl-4">
                    "{selectedStatement.quote_or_paraphrase}"
                  </p>
                </div>

                <div className="mt-5">
                  <h3 className="tk-eyebrow mb-1">Context</h3>
                  <p className="text-[var(--tk-ink-70)]">{selectedStatement.context}</p>
                </div>

                <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <h3 className="tk-eyebrow mb-1">Topic Category</h3>
                    <p className="text-tk-ink">{selectedStatement.topicCategory}</p>
                  </div>
                  <div>
                    <h3 className="tk-eyebrow mb-1">Raw Topic</h3>
                    <p className="text-tk-ink">{selectedStatement.topic}</p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <h3 className="tk-eyebrow mb-1">Framing</h3>
                    <p className="text-tk-ink">{selectedStatement.framing}</p>
                  </div>
                  <div>
                    <h3 className="tk-eyebrow mb-1">Speaker Importance</h3>
                    <p className="text-tk-ink font-mono">{selectedStatement.speaker_importance ?? 'N/A'}/5</p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <h3 className="tk-eyebrow mb-1">Tone</h3>
                    <p className="text-tk-ink capitalize">
                      {selectedStatement.canonicalTone}
                      {selectedStatement.tone !== selectedStatement.canonicalTone && (
                        <span className="tk-meta-muted ml-2">(raw: {selectedStatement.tone})</span>
                      )}
                    </p>
                  </div>
                  <div>
                    <h3 className="tk-eyebrow mb-1">Intensity</h3>
                    <p className="text-tk-ink font-mono">{selectedStatement.tone_intensity}/5</p>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-tk-rule flex items-center gap-4">
                  <a
                    href={selectedStatement.article_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-tk-wine hover:text-tk-wine-dark text-sm"
                  >
                    Read original article ↗
                  </a>
                  <button
                    onClick={() => {
                      setSelectedStatement(null);
                      setSelectedSpeakerProfile(selectedStatement.speaker);
                    }}
                    className="text-sm text-[var(--tk-ink-50)] hover:text-tk-ink"
                  >
                    View speaker profile →
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Speaker Profile Modal */}
        {selectedSpeakerProfile && (
          <SpeakerProfile
            speaker={selectedSpeakerProfile}
            allStatements={enrichedStatements}
            onClose={() => setSelectedSpeakerProfile(null)}
            onFilterBySpeaker={handleSpeakerClick}
          />
        )}
      </main>

      {/* Takshashila footer ribbon */}
      <footer className="bg-tk-wine mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-10 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-white/85 text-sm text-center sm:text-left">
            A research project by the{' '}
            <a
              href="https://takshashila.org.in"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white font-medium hover:text-tk-gold transition-colors"
            >
              Takshashila Institution ↗
            </a>
          </div>
          <a
            href="https://takshashila.org.in"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-5 py-2 bg-tk-gold text-tk-ink font-mono text-xs uppercase tracking-wider font-semibold hover:bg-tk-gold/90 transition-colors"
          >
            Visit Takshashila →
          </a>
        </div>
      </footer>
    </div>
  );
}

export default App;
