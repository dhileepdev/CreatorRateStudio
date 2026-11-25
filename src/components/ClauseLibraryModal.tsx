import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeftRight,
  BookMarked,
  Check,
  Copy,
  RotateCcw,
  Search,
  X,
} from 'lucide-react';
import { CONTRACT_RED_FLAGS } from '../data/benchmarks';
import {
  ClauseVariantPosture,
  getClauseLibraryVariants,
  resolveClauseVariant,
} from '../data/clauseLibraryAlternatives';
import { ClauseCategory } from '../types/calculator';

interface ClauseLibraryModalProps {
  open: boolean;
  initialClauseId: number;
  onClose: () => void;
  selectedVariants: Partial<Record<number, string>>;
  flaggedClauseIds: number[];
  onSwapClauseVariant: (clauseId: number, variantId: string, variantLabel: string) => void;
  onApplyPostureToAll: (posture: ClauseVariantPosture) => void;
  onResetAllVariants: () => void;
  onToggleFlagClause: (clauseId: number) => void;
  onCopyText: (text: string, label: string) => void;
}

const POSTURE_META: Record<
  ClauseVariantPosture,
  { label: string; textClass: string; activeBorderClass: string }
> = {
  creator_friendly: {
    label: 'Creator-Friendly',
    textClass: 'text-emerald-700 dark:text-emerald-400',
    activeBorderClass:
      'border-emerald-600 dark:border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/30',
  },
  standard: {
    label: 'Standard',
    textClass: 'text-blue-700 dark:text-blue-400',
    activeBorderClass:
      'border-blue-600 dark:border-blue-500 bg-blue-50/40 dark:bg-blue-950/30',
  },
  balanced_compromise: {
    label: 'Balanced Compromise',
    textClass: 'text-amber-700 dark:text-amber-400',
    activeBorderClass:
      'border-amber-600 dark:border-amber-500 bg-amber-50/40 dark:bg-amber-950/30',
  },
};

const CATEGORIES: Array<'All' | ClauseCategory> = [
  'All',
  'Payment',
  'Rights & IP',
  'Exclusivity',
  'Liability & Scope',
];

export const ClauseLibraryModal: React.FC<ClauseLibraryModalProps> = ({
  open,
  initialClauseId,
  onClose,
  selectedVariants,
  flaggedClauseIds,
  onSwapClauseVariant,
  onApplyPostureToAll,
  onResetAllVariants,
  onToggleFlagClause,
  onCopyText,
}) => {
  const [selectedClauseId, setSelectedClauseId] = useState<number>(initialClauseId);
  const [categoryFilter, setCategoryFilter] = useState<'All' | ClauseCategory>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedVariantKey, setCopiedVariantKey] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setSelectedClauseId(initialClauseId);
    }
  }, [open, initialClauseId]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  const swappedCount = useMemo(
    () =>
      Object.entries(selectedVariants).filter(
        ([, variantId]) => Boolean(variantId) && variantId !== 'standard'
      ).length,
    [selectedVariants]
  );

  const filteredClauses = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return CONTRACT_RED_FLAGS.filter((clause) => {
      if (categoryFilter !== 'All' && clause.category !== categoryFilter) {
        return false;
      }
      if (!q) return true;
      const variants = getClauseLibraryVariants(clause.clauseId);
      const variantBlob = variants
        .map((v) => `${v.label} ${v.bestFor} ${v.clauseText}`)
        .join(' ');
      const haystack =
        `${clause.clauseId} #${clause.clauseId} ${clause.clauseTitle} ${clause.category} ${variantBlob}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [categoryFilter, searchQuery]);

  const activeClause =
    CONTRACT_RED_FLAGS.find((c) => c.clauseId === selectedClauseId) ??
    CONTRACT_RED_FLAGS[0];
  const activeVariants = useMemo(
    () => getClauseLibraryVariants(activeClause.clauseId),
    [activeClause.clauseId]
  );
  const activeVariantId = selectedVariants[activeClause.clauseId] ?? 'standard';
  const isClauseFlagged = flaggedClauseIds.includes(activeClause.clauseId);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="clause-library-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-blue-700 dark:text-blue-400">
              <BookMarked className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Pre-Vetted Clause Library</span>
              <span className="text-slate-300 dark:text-slate-600" aria-hidden="true">
                ·
              </span>
              <span className="font-mono tabular-nums text-slate-600 dark:text-slate-300">
                {swappedCount} / {CONTRACT_RED_FLAGS.length} swapped
              </span>
            </div>
            <h3
              id="clause-library-modal-title"
              className="font-display text-lg font-bold text-slate-900 dark:text-slate-100 mt-0.5"
            >
              Browse &amp; Swap Standard Contract Terms
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Swap any standard clause with a Creator-Friendly or Balanced Compromise alternative. Active swaps automatically sync to your redlines, emails, and plain-text contract export.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Clause Library modal"
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Filter & Bulk Posture Toolbar */}
        <div className="px-5 sm:px-6 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[240px]">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search
                className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search indemnity, kill fee, Net-14..."
                aria-label="Search clause library alternatives"
                className="w-full pl-8 pr-7 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-blue-600"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear library search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1">
              {CATEGORIES.map((cat) => (
                <button
                  key={`lib-cat-${cat}`}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    categoryFilter === cat
                      ? 'bg-slate-900 dark:bg-blue-600 text-white'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="font-semibold text-slate-500 dark:text-slate-400 mr-0.5">
              Apply All:
            </span>
            <button
              type="button"
              onClick={() => onApplyPostureToAll('creator_friendly')}
              className="px-2.5 py-1 font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-md hover:bg-emerald-100/80 dark:hover:bg-emerald-900/60 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              Creator-Friendly
            </button>
            <button
              type="button"
              onClick={() => onApplyPostureToAll('balanced_compromise')}
              className="px-2.5 py-1 font-semibold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 rounded-md hover:bg-amber-100/80 dark:hover:bg-amber-900/60 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              Compromise
            </button>
            {swappedCount > 0 && (
              <button
                type="button"
                onClick={onResetAllVariants}
                className="inline-flex items-center gap-1 px-2 py-1 font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer whitespace-nowrap shrink-0"
              >
                <RotateCcw className="w-3 h-3" aria-hidden="true" />
                Reset
              </button>
            )}
          </div>
        </div>

        {/* 2-Column Browser Body */}
        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-slate-800 overflow-hidden">
          {/* Left: 15-Clause Selector List */}
          <div className="md:col-span-4 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 max-h-56 md:max-h-none">
            {filteredClauses.length === 0 ? (
              <div className="p-5 text-center space-y-2">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  No clauses match &ldquo;{searchQuery}&rdquo;.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setCategoryFilter('All');
                  }}
                  className="text-xs font-medium text-blue-700 dark:text-blue-400 underline cursor-pointer"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              filteredClauses.map((clause) => {
                const isSelected = clause.clauseId === activeClause.clauseId;
                const currentVar = resolveClauseVariant(
                  clause.clauseId,
                  selectedVariants[clause.clauseId]
                );
                const postureMeta = POSTURE_META[currentVar.posture];
                const flagged = flaggedClauseIds.includes(clause.clauseId);

                return (
                  <button
                    key={`lib-row-${clause.clauseId}`}
                    type="button"
                    onClick={() => setSelectedClauseId(clause.clauseId)}
                    className={`w-full text-left px-4 py-3 space-y-1 transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50/70 dark:bg-blue-950/50'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                        #{clause.clauseId}. {clause.clauseTitle}
                      </span>
                      {flagged && (
                        <span className="text-[10px] font-semibold text-blue-700 dark:text-blue-400 shrink-0">
                          Flagged
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="text-slate-500 dark:text-slate-400 truncate">
                        {clause.category}
                      </span>
                      <span className={`font-medium shrink-0 ${postureMeta.textClass}`}>
                        {postureMeta.label}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Right: Pre-Vetted Alternatives for Selected Clause */}
          <div className="md:col-span-8 overflow-y-auto p-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Clause #{activeClause.clauseId} · {activeClause.category}
                </div>
                <h4 className="font-display text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                  {activeClause.clauseTitle}
                </h4>
              </div>

              <button
                type="button"
                onClick={() => onToggleFlagClause(activeClause.clauseId)}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-md border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  isClauseFlagged
                    ? 'border-blue-600 dark:border-blue-500 bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {isClauseFlagged ? 'Flagged in Audit' : '+ Flag in Audit'}
              </button>
            </div>

            <div className="space-y-3.5">
              {activeVariants.map((variant) => {
                const isActive = activeVariantId === variant.id;
                const postureMeta = POSTURE_META[variant.posture];
                const copyKey = `${activeClause.clauseId}-${variant.id}`;

                return (
                  <div
                    key={variant.id}
                    className={`p-4 rounded-xl border transition-colors space-y-2.5 ${
                      isActive
                        ? postureMeta.activeBorderClass
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`text-[11px] font-semibold ${postureMeta.textClass}`}
                          >
                            {postureMeta.label}
                          </span>
                          <span
                            className="text-slate-300 dark:text-slate-600"
                            aria-hidden="true"
                          >
                            ·
                          </span>
                          <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                            {variant.label}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {variant.bestFor}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            onCopyText(
                              variant.clauseText,
                              `Clause #${activeClause.clauseId} (${variant.label})`
                            );
                            setCopiedVariantKey(copyKey);
                            window.setTimeout(() => setCopiedVariantKey(null), 1500);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer whitespace-nowrap"
                        >
                          {copiedVariantKey === copyKey ? (
                            <Check className="w-3 h-3 text-emerald-700 dark:text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          {copiedVariantKey === copyKey ? 'Copied' : 'Copy'}
                        </button>

                        <button
                          type="button"
                          disabled={isActive}
                          onClick={() =>
                            onSwapClauseVariant(
                              activeClause.clauseId,
                              variant.id,
                              variant.label
                            )
                          }
                          className={`inline-flex items-center gap-1 px-3 py-1.5 text-[11px] font-semibold rounded-md transition-colors whitespace-nowrap ${
                            isActive
                              ? 'bg-emerald-700 dark:bg-emerald-600 text-white cursor-default'
                              : 'bg-slate-900 dark:bg-blue-600 text-white hover:bg-slate-800 dark:hover:bg-blue-500 cursor-pointer'
                          }`}
                        >
                          {isActive ? (
                            <>
                              <Check className="w-3 h-3" aria-hidden="true" />
                              Active Term
                            </>
                          ) : (
                            <>
                              <ArrowLeftRight className="w-3 h-3" aria-hidden="true" />
                              Swap In
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono text-slate-800 dark:text-slate-200 leading-relaxed">
                      {variant.clauseText}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Swapped terms are saved locally and applied across Redlines, Email Scripts, and Plain-Text Export.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 font-semibold text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 rounded-lg hover:bg-slate-800 dark:hover:bg-white transition-colors cursor-pointer whitespace-nowrap"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
