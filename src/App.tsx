import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ArticleStatements,
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
import { enrichStatements, aggregateMonthly } from './utils/dataProcessing';

function App() {
  const [data, setData] = useState<ArticleStatements[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [searchText, setSearchText] = useState('');
  const [selectedSpeakers, setSelectedSpeakers] = useState<string[]>([]);
  const [selectedTopicCategories, setSelectedTopicCategories] = useState<TopicCategory[]>([]);
  const [selectedTones, setSelectedTones] = useState<string[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [showUSOnly, setShowUSOnly] = useState(true);

  // Sort state
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Selected statement for detail view
  const [selectedStatement, setSelectedStatement] =
    useState<EnrichedStatement | null>(null);

  // Load data
  useEffect(() => {
    fetch('/statements.json')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load data');
        return res.json();
      })
      .then((data) => {
        setData(data);
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

  // Apply US-relevance filter as the base dataset
  const enrichedStatements = useMemo(
    () => (showUSOnly ? allEnriched.filter((s) => s.isUSRelevant) : allEnriched),
    [allEnriched, showUSOnly]
  );

  // Monthly aggregation (on base dataset, not user-filtered)
  const monthlyData = useMemo(
    () => aggregateMonthly(enrichedStatements),
    [enrichedStatements]
  );

  // Get unique values for filters (from base dataset)
  const allSpeakers = useMemo(
    () => [...new Set(enrichedStatements.map((s) => s.speaker))].sort(),
    [enrichedStatements]
  );
  const allCanonicalTones = useMemo(
    () => [...new Set(enrichedStatements.map((s) => s.canonicalTone))].sort(),
    [enrichedStatements]
  );

  // Count for display
  const usRelevantCount = useMemo(
    () => allEnriched.filter((s) => s.isUSRelevant).length,
    [allEnriched]
  );

  // Filtered and sorted statements
  const filteredStatements = useMemo(() => {
    let result = [...enrichedStatements];

    // Search filter
    if (searchText) {
      const search = searchText.toLowerCase();
      result = result.filter(
        (s) =>
          s.quote_or_paraphrase.toLowerCase().includes(search) ||
          s.context.toLowerCase().includes(search) ||
          s.speaker.toLowerCase().includes(search)
      );
    }

    // Speaker filter
    if (selectedSpeakers.length > 0) {
      result = result.filter((s) => selectedSpeakers.includes(s.speaker));
    }

    // Topic category filter
    if (selectedTopicCategories.length > 0) {
      result = result.filter((s) => selectedTopicCategories.includes(s.topicCategory));
    }

    // Tone filter (on canonical tone)
    if (selectedTones.length > 0) {
      result = result.filter((s) => selectedTones.includes(s.canonicalTone));
    }

    // Month filter
    if (selectedMonth) {
      result = result.filter((s) => s.article_date && s.article_date.startsWith(selectedMonth));
    }

    // Sort
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
  }, [searchText, selectedSpeakers, selectedTopicCategories, selectedTones, selectedMonth, showUSOnly]);

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

  const clearAllFilters = useCallback(() => {
    setSearchText('');
    setSelectedSpeakers([]);
    setSelectedTopicCategories([]);
    setSelectedTones([]);
    setSelectedMonth(null);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-red-600 font-medium">Error loading data</h2>
          <p className="text-gray-600 mt-2">{error}</p>
          <p className="text-sm text-gray-500 mt-4">
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
    selectedMonth;

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Tracking People's Daily - Statement Analysis
              </h1>
              <p className="text-gray-600 mt-1">
                Chinese leader statements about the United States
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Data source:{' '}
                <a
                  href="https://trackingpeoplesdaily.substack.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:text-blue-700 underline"
                >
                  Tracking People's Daily
                </a>
                {' '}by Manoj Kewalramani. Project by Pranay Kotasthane and Manoj Kewalramani.
              </p>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={showUSOnly}
                    onChange={(e) => setShowUSOnly(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all" />
                </div>
                <span className="text-sm text-gray-700">
                  US-focused only
                  <span className="text-xs text-gray-400 ml-1">
                    ({usRelevantCount}/{allEnriched.length})
                  </span>
                </span>
              </label>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 px-4 space-y-6">
        {/* 1. Metric Sparkline Cards */}
        <MetricCards monthlyData={monthlyData} />

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

        {/* Active filters indicator */}
        {hasActiveFilters && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 flex items-center justify-between">
            <div className="flex flex-wrap gap-2 items-center text-sm">
              <span className="text-blue-700 font-medium">Active filters:</span>
              {selectedMonth && (
                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs">
                  Month: {selectedMonth}
                </span>
              )}
              {selectedSpeakers.map((s) => (
                <span key={s} className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs">
                  {s}
                </span>
              ))}
              {selectedTopicCategories.map((t) => (
                <span key={t} className="px-2 py-0.5 bg-green-100 text-green-800 rounded-full text-xs">
                  {t}
                </span>
              ))}
              {selectedTones.map((t) => (
                <span key={t} className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded-full text-xs capitalize">
                  {t}
                </span>
              ))}
              {searchText && (
                <span className="px-2 py-0.5 bg-gray-100 text-gray-800 rounded-full text-xs">
                  Search: "{searchText}"
                </span>
              )}
              <span className="text-blue-600 ml-2">
                {filteredStatements.length} of {enrichedStatements.length} statements
              </span>
            </div>
            <button
              onClick={clearAllFilters}
              className="text-sm text-red-600 hover:text-red-800 whitespace-nowrap ml-4"
            >
              Clear all
            </button>
          </div>
        )}

        {/* 5. Search and Filters */}
        <div className="bg-white rounded-lg shadow p-4 space-y-4">
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

        {/* 6. Statements Table */}
        <StatementsTable
          statements={filteredStatements}
          sortField={sortField}
          sortDirection={sortDirection}
          onSort={handleSort}
          currentPage={currentPage}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onStatementClick={setSelectedStatement}
        />

        {/* Statement Detail Modal */}
        {selectedStatement && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={() => setSelectedStatement(null)}
          >
            <div
              className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex justify-between items-start">
                  <h2 className="text-xl font-bold text-gray-900">
                    {selectedStatement.speaker}
                  </h2>
                  <button
                    onClick={() => setSelectedStatement(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>

                <p className="text-sm text-gray-500 mt-1">
                  {selectedStatement.article_date}
                </p>

                <div className="mt-4">
                  <h3 className="text-sm font-medium text-gray-500">
                    Quote / Paraphrase
                  </h3>
                  <p className="mt-1 text-gray-900 italic">
                    "{selectedStatement.quote_or_paraphrase}"
                  </p>
                </div>

                <div className="mt-4">
                  <h3 className="text-sm font-medium text-gray-500">Context</h3>
                  <p className="mt-1 text-gray-900">
                    {selectedStatement.context}
                  </p>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Topic Category</h3>
                    <p className="mt-1 text-gray-900">
                      {selectedStatement.topicCategory}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Raw Topic</h3>
                    <p className="mt-1 text-gray-900">
                      {selectedStatement.topic}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">
                      Framing
                    </h3>
                    <p className="mt-1 text-gray-900">
                      {selectedStatement.framing}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">
                      Speaker Importance
                    </h3>
                    <p className="mt-1 text-gray-900">
                      {selectedStatement.speaker_importance ?? 'N/A'}/5
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Tone</h3>
                    <p className="mt-1 text-gray-900 capitalize">
                      {selectedStatement.canonicalTone}
                      {selectedStatement.tone !== selectedStatement.canonicalTone && (
                        <span className="text-xs text-gray-400 ml-2">(raw: {selectedStatement.tone})</span>
                      )}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">
                      Intensity
                    </h3>
                    <p className="mt-1 text-gray-900">
                      {selectedStatement.tone_intensity}/5
                    </p>
                  </div>
                </div>

                <div className="mt-6">
                  <a
                    href={selectedStatement.article_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Read original article →
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
