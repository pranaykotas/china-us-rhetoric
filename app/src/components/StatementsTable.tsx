import { useState } from 'react';
import { EnrichedStatement, SortField, SortDirection } from '../types';
import { TONE_BG_CLASSES } from '../utils/colors';

interface StatementsTableProps {
  statements: EnrichedStatement[];
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
  currentPage: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onStatementClick: (statement: EnrichedStatement) => void;
  onSpeakerProfileClick?: (speaker: string) => void;
}

function CopyRowButton({ statement }: { statement: EnrichedStatement }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    const text = `"${statement.quote_or_paraphrase}"
— ${statement.speaker}${statement.speaker_title ? ', ' + statement.speaker_title : ''}, ${statement.context}
${statement.article_date} | Source: ${statement.article_url}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <button
      onClick={handleCopy}
      title="Copy quote with citation"
      className="opacity-0 group-hover:opacity-100 ml-1 shrink-0 text-gray-400 hover:text-gray-700 transition-all"
    >
      {copied ? (
        <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
        </svg>
      )}
    </button>
  );
}

export function StatementsTable({
  statements,
  sortField,
  sortDirection,
  onSort,
  currentPage,
  itemsPerPage,
  onPageChange,
  onStatementClick,
  onSpeakerProfileClick,
}: StatementsTableProps) {
  const totalPages = Math.ceil(statements.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const visibleStatements = statements.slice(startIndex, endIndex);

  const SortHeader = ({ field, label, className = '' }: { field: SortField; label: string; className?: string }) => (
    <th
      className={`px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 ${className}`}
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        {sortField === field && (
          <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
        )}
      </div>
    </th>
  );

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <SortHeader field="date" label="Date" />
              <SortHeader field="speaker" label="Speaker" />
              <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Quote / Paraphrase
              </th>
              {/* Hide Category + Intensity on mobile */}
              <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <SortHeader field="tone" label="Tone" />
              <SortHeader field="tone_intensity" label="Int." className="hidden md:table-cell" />
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {visibleStatements.map((statement, index) => (
              <tr
                key={`${statement.article_url}-${index}`}
                className="hover:bg-gray-50 cursor-pointer group"
                onClick={() => onStatementClick(statement)}
              >
                <td className="px-3 sm:px-4 py-3 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                  {statement.article_date}
                </td>
                <td className="px-3 sm:px-4 py-3 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900">
                  <div className="flex items-center gap-1">
                    <span>{statement.speaker}</span>
                    {onSpeakerProfileClick && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onSpeakerProfileClick(statement.speaker); }}
                        title={`View ${statement.speaker} profile`}
                        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-blue-600 transition-all"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </button>
                    )}
                  </div>
                </td>
                <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm text-gray-700">
                  <div className="flex items-start gap-1">
                    <span className="line-clamp-2 sm:line-clamp-1">{statement.quote_or_paraphrase}</span>
                    <CopyRowButton statement={statement} />
                  </div>
                </td>
                <td className="hidden md:table-cell px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                  {statement.topicCategory}
                </td>
                <td className="px-3 sm:px-4 py-3 whitespace-nowrap">
                  <span
                    className={`px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs rounded-full ${
                      TONE_BG_CLASSES[statement.canonicalTone] || 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {statement.canonicalTone}
                  </span>
                </td>
                <td className="hidden md:table-cell px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                  <div className="flex items-center">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <div
                        key={level}
                        className={`w-2 h-4 mx-0.5 rounded ${
                          level <= statement.tone_intensity ? 'bg-blue-500' : 'bg-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="bg-white px-3 sm:px-4 py-3 border-t border-gray-200">
          {/* Mobile pagination */}
          <div className="flex items-center justify-between sm:hidden">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1.5 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
            >
              ← Prev
            </button>
            <span className="text-xs text-gray-600">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
            >
              Next →
            </button>
          </div>
          {/* Desktop pagination */}
          <div className="hidden sm:flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {startIndex + 1}–{Math.min(endIndex, statements.length)} of{' '}
              {statements.length} statements
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
              >
                Previous
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => onPageChange(pageNum)}
                    className={`px-3 py-1 text-sm border rounded ${
                      currentPage === pageNum ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
