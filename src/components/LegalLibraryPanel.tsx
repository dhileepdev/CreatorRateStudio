import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  BookOpen,
  CheckSquare,
  Copy,
  RotateCcw,
  Search,
  ShieldAlert,
  Square,
  X,
} from 'lucide-react';
import { CONTRACT_RED_FLAGS } from '../data/benchmarks';
import {
  FEATURED_LEGAL_SEARCH_TERMS,
  LEGAL_LIBRARY_ENTRIES,
} from '../data/legalLibrary';
import { ClauseCategory, LegalTermAuditEvaluation } from '../types/calculator';
import { searchAndEvaluateLegalLibrary } from '../utils/pricingEngine';

interface LegalLibraryPanelProps {
  flaggedClauseIds: number[];
  onToggleClause: (clauseId: number) => void;
  onInspectClauseInScanner: (clauseId: number) => void;
  onCopyText: (text: string, label: string) => void;
}

const CATEGORIES: Array<'All' | ClauseCategory> = [
  'All',
  'Payment',
  'Rights & IP',
  'Exclusivity',
  'Liability & Scope',
];

export const LegalLibraryPanel: React.FC<LegalLibraryPanelProps> = ({
  flaggedClauseIds,
  onToggleClause,
  onInspectClauseInScanner,
  onCopyText,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'All' | ClauseCategory>('All');
  const [selectedEntryId, setSelectedEntryId] = useState<string>('indemnification');

  const results = useMemo<LegalTermAuditEvaluation[]>(
    () =>
      searchAndEvaluateLegalLibrary({
        entries: LEGAL_LIBRARY_ENTRIES,
        allClauses: CONTRACT_RED_FLAGS,
        flaggedClauseIds,
        query: searchQuery,
        categoryFilter,
      }),
    [flaggedClauseIds, searchQuery, categoryFilter]
  );

  const activeEvaluation = useMemo(() => {
    if (results.length === 0) return null;
    return (
      results.find((item) => item.entry.id === selectedEntryId) ?? results[0]
    );
  }, [results, selectedEntryId]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setCategoryFilter('All');
  };

  const handleQuickLookup = (term: string) => {
    setCategoryFilter('All');
    setSearchQuery(term);
  };

  return (
    <section
      aria-label="Legal Library"
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden"
    >
      {/* Header + Search Toolbar */}
      <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0" aria-hidden="true" />
              <h3 className="font-display text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100">
                Legal Library
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-0.5">
              Search standard contract terms to review plain-English definitions, balanced creator standards, and typical red-flag warnings from the 15-clause audit engine.
            </p>
          </div>
          <div className="text-xs font-mono text-slate-600 dark:text-slate-400 tabular-nums shrink-0">
            {results.length} of {LEGAL_LIBRARY_ENTRIES.length} terms
          </div>
        </div>

        {/* Search Input + Category Filter Row */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="relative flex-1 min-w-0">
            <Search
              className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search legal library contract terms"
              placeholder="Search contract terms (e.g., Indemnification, Termination for Convenience, Work Made for Hire, Net-60)..."
              className="w-full pl-9 pr-9 py-2 text-xs sm:text-sm bg-slate-50/70 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-950 focus:outline-none focus:border-blue-600 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search query"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            )}
          </div>

          <div
            role="tablist"
            aria-label="Filter legal library by category"
            className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg shrink-0"
          >
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                role="tab"
                aria-selected={categoryFilter === cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  categoryFilter === cat
                    ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Common Lookup Shortcuts */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mr-1">
            Quick lookup:
          </span>
          {FEATURED_LEGAL_SEARCH_TERMS.map((term) => {
            const isActive =
              searchQuery.trim().toLowerCase() === term.toLowerCase();
            return (
              <button
                key={term}
                type="button"
                onClick={() =>
                  isActive ? setSearchQuery('') : handleQuickLookup(term)
                }
                className={`px-2.5 py-1 text-[11px] font-medium rounded-md border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'border-blue-700 dark:border-blue-600 bg-blue-700 dark:bg-blue-600 text-white'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                {term}
              </button>
            );
          })}
        </div>
      </div>

      {/* Results Area */}
      {results.length === 0 || !activeEvaluation ? (
        <div className="p-8 text-center space-y-2.5">
          <BookOpen className="w-7 h-7 text-slate-400 dark:text-slate-500 mx-auto" aria-hidden="true" />
          <h4 className="font-display text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100">
            No Matching Contract Terms Found
          </h4>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
            No entries matched{' '}
            {searchQuery.trim() ? `"${searchQuery.trim()}"` : 'your current filter'}
            {categoryFilter !== 'All' ? ` in ${categoryFilter}` : ''}. Try searching for terms like Indemnification, Termination for Convenience, Exclusivity, or Net-60.
          </p>
          <button
            type="button"
            onClick={handleResetFilters}
            className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-slate-900 dark:bg-blue-600 rounded-lg hover:bg-slate-800 dark:hover:bg-blue-500 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            Reset Search
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-slate-800">
          {/* Left Column: Searchable Legal Terms List */}
          <div className="lg:col-span-5 divide-y divide-slate-100 dark:divide-slate-800 max-h-[480px] overflow-y-auto">
            {results.map((item) => {
              const isSelected = activeEvaluation.entry.id === item.entry.id;
              return (
                <button
                  key={item.entry.id}
                  type="button"
                  onClick={() => setSelectedEntryId(item.entry.id)}
                  className={`w-full text-left p-3.5 transition-colors cursor-pointer flex items-start justify-between gap-3 ${
                    isSelected
                      ? 'bg-blue-50/60 dark:bg-blue-950/40'
                      : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="min-w-0 space-y-0.5">
                    <div className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {item.entry.term}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-1.5">
                      <span>{item.entry.category}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">
                        Clause #{item.clause.clauseId}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span
                        className={
                          item.clause.severity === 'critical'
                            ? 'text-red-700 dark:text-red-400 font-medium'
                            : 'text-amber-700 dark:text-amber-400 font-medium'
                        }
                      >
                        {item.clause.severity === 'critical'
                          ? 'Critical'
                          : 'Warning'}
                      </span>
                      {item.isFlaggedInAudit && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-blue-700 dark:text-blue-400 font-medium">
                            Flagged in audit
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0 tabular-nums">
                    <div className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">
                      +{item.clauseWeightPoints} wt
                    </div>
                    <div className="font-mono text-[10px] text-slate-500 dark:text-slate-400">
                      {item.standaloneScore}/100
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right Column: Definition, Audit Risk Warning & Redline Standard */}
          <div className="lg:col-span-7 p-5 sm:p-6 space-y-5 bg-white dark:bg-slate-900">
            {/* Term Title & Audit Controls */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                  <span>{activeEvaluation.entry.category}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono">
                    Audit Clause #{activeEvaluation.clause.clauseId}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span
                    className={`inline-flex items-center gap-1 font-semibold ${
                      activeEvaluation.clause.severity === 'critical'
                        ? 'text-red-700 dark:text-red-400'
                        : 'text-amber-700 dark:text-amber-400'
                    }`}
                  >
                    {activeEvaluation.clause.severity === 'critical' ? (
                      <ShieldAlert className="w-3.5 h-3.5" aria-hidden="true" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                    )}
                    {activeEvaluation.clause.severity === 'critical'
                      ? 'Critical Red Flag'
                      : 'Warning Red Flag'}
                  </span>
                </div>
                <h4 className="font-display text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {activeEvaluation.entry.term}
                </h4>
                {activeEvaluation.entry.aliases.length > 0 && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Commonly phrased as:{' '}
                    <span className="text-slate-700 dark:text-slate-300">
                      {activeEvaluation.entry.aliases.join(' · ')}
                    </span>
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    onToggleClause(activeEvaluation.clause.clauseId)
                  }
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    activeEvaluation.isFlaggedInAudit
                      ? 'border-blue-700 dark:border-blue-500 bg-blue-50 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50'
                      : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {activeEvaluation.isFlaggedInAudit ? (
                    <CheckSquare className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" aria-hidden="true" />
                  ) : (
                    <Square className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" aria-hidden="true" />
                  )}
                  {activeEvaluation.isFlaggedInAudit
                    ? 'Flagged in Audit'
                    : 'Flag in Audit'}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    onInspectClauseInScanner(activeEvaluation.clause.clauseId)
                  }
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/70 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  Open in Scanner
                  <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* Standard Definition & Balanced Practice */}
            <div className="space-y-3 text-xs sm:text-sm">
              <div>
                <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                  Standard Legal Definition
                </div>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  {activeEvaluation.entry.standardDefinition}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                  Balanced Creator Standard
                </div>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  {activeEvaluation.entry.balancedStandard}
                </p>
              </div>
            </div>

            {/* Existing Contract Audit Red Flag Warning & Score Impact */}
            <div
              className={`rounded-lg border p-4 space-y-2.5 ${
                activeEvaluation.clause.severity === 'critical'
                  ? 'bg-red-50/50 dark:bg-red-950/35 border-red-200 dark:border-red-800/70'
                  : 'bg-amber-50/50 dark:bg-amber-950/35 border-amber-200 dark:border-amber-800/70'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-900 dark:text-slate-100">
                  {activeEvaluation.clause.severity === 'critical' ? (
                    <ShieldAlert className="w-4 h-4 text-red-700 dark:text-red-400 shrink-0" aria-hidden="true" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" aria-hidden="true" />
                  )}
                  <span>
                    Typical Red-Flag Warning: {activeEvaluation.clause.clauseTitle}
                  </span>
                </div>
                <div className="font-mono text-[11px] text-slate-700 dark:text-slate-300 tabular-nums">
                  Standalone Risk: <strong>{activeEvaluation.standaloneScore}/100</strong>{' '}
                  ·{' '}
                  {activeEvaluation.isFlaggedInAudit ? (
                    <span className="text-blue-800 dark:text-blue-400 font-semibold">
                      Active (+{activeEvaluation.auditScoreDelta} pts in audit)
                    </span>
                  ) : (
                    <span>
                      +{activeEvaluation.auditScoreDelta} pts if flagged
                    </span>
                  )}
                </div>
              </div>

              <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed">
                <strong className="font-semibold">Predatory Pattern: </strong>
                {activeEvaluation.clause.redFlagPattern}
              </p>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                <strong className="font-semibold">Audit Guidance: </strong>
                {activeEvaluation.clause.advice}
              </p>
            </div>

            {/* Recommended Replacement Language */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Copy-Ready Replacement Language
                </span>
                <button
                  type="button"
                  onClick={() =>
                    onCopyText(
                      activeEvaluation.clause.replacementText,
                      `${activeEvaluation.entry.term} replacement clause`
                    )
                  }
                  className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Copy className="w-3 h-3" aria-hidden="true" />
                  Copy Clause Fix
                </button>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-mono">
                {activeEvaluation.clause.replacementText}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
