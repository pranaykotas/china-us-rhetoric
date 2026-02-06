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
}: StatementsTableProps) {
  const totalPages = Math.ceil(statements.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const visibleStatements = statements.slice(startIndex, endIndex);

  const SortHeader = ({ field, label }: { field: SortField; label: string }) => (
    <th
      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
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
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Quote / Paraphrase
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <SortHeader field="tone" label="Tone" />
              <SortHeader field="tone_intensity" label="Intensity" />
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {visibleStatements.map((statement, index) => (
              <tr
                key={`${statement.article_url}-${index}`}
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => onStatementClick(statement)}
              >
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                  {statement.article_date}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                  {statement.speaker}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700 max-w-md truncate">
                  {statement.quote_or_paraphrase}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                  {statement.topicCategory}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      TONE_BG_CLASSES[statement.canonicalTone] || 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {statement.canonicalTone}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                  <div className="flex items-center">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <div
                        key={level}
                        className={`w-2 h-4 mx-0.5 rounded ${
                          level <= statement.tone_intensity
                            ? 'bg-blue-500'
                            : 'bg-gray-200'
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-white px-4 py-3 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing {startIndex + 1} to {Math.min(endIndex, statements.length)} of{' '}
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
                    currentPage === pageNum
                      ? 'bg-blue-500 text-white'
                      : 'hover:bg-gray-100'
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
      )}
    </div>
  );
}
