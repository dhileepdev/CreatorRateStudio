import React from 'react';
import { ArrowRight, CheckCircle2, ListChecks, RotateCcw } from 'lucide-react';

interface AuditProgressBarProps {
  totalClauses: number;
  reviewedCount: number;
  flaggedCount: number;
  hasManualReviews: boolean;
  onJumpToNextPending: () => void;
  onMarkAllReviewed: () => void;
  onResetReviewed: () => void;
}

export const AuditProgressBar: React.FC<AuditProgressBarProps> = ({
  totalClauses,
  reviewedCount,
  flaggedCount,
  hasManualReviews,
  onJumpToNextPending,
  onMarkAllReviewed,
  onResetReviewed,
}) => {
  const safeTotal = Math.max(1, totalClauses);
  const clampedReviewed = Math.min(safeTotal, Math.max(0, reviewedCount));
  const pendingCount = Math.max(0, safeTotal - clampedReviewed);
  const clearedCount = Math.max(0, clampedReviewed - flaggedCount);
  const completionPct = Math.round((clampedReviewed / safeTotal) * 100);
  const flaggedBarPct = Math.min(100, (flaggedCount / safeTotal) * 100);
  const clearedBarPct = Math.min(100 - flaggedBarPct, (clearedCount / safeTotal) * 100);
  const isComplete = pendingCount === 0;

  const statusGuidance = isComplete
    ? 'All 15 clauses reviewed — ready to finalize redlines or export your contract.'
    : completionPct >= 50
      ? `Over halfway through your audit — ${pendingCount} ${
          pendingCount === 1 ? 'clause' : 'clauses'
        } left to check.`
      : clampedReviewed === 0
        ? 'Flag red-flag clauses or mark safe clauses as reviewed to track your audit completion.'
        : `${pendingCount} ${
            pendingCount === 1 ? 'clause' : 'clauses'
          } still pending review.`;

  return (
    <div
      aria-label="Contract review progress"
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-5 py-4 space-y-3 transition-colors"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 min-w-0">
          <div className="inline-flex items-center gap-1.5">
            {isComplete ? (
              <CheckCircle2
                className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0"
                aria-hidden="true"
              />
            ) : (
              <ListChecks
                className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0"
                aria-hidden="true"
              />
            )}
            <span className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
              Audit Review Progress
            </span>
          </div>

          <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">
            ·
          </span>

          <span className="text-xs font-mono tabular-nums text-slate-700 dark:text-slate-300">
            <strong className="font-semibold text-slate-900 dark:text-slate-100">
              {clampedReviewed}
            </strong>{' '}
            reviewed
            <span className="text-slate-400 dark:text-slate-500"> · </span>
            <strong className="font-semibold text-slate-900 dark:text-slate-100">
              {pendingCount}
            </strong>{' '}
            still pending
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          <span
            className={`font-mono tabular-nums text-sm font-bold ${
              isComplete
                ? 'text-emerald-700 dark:text-emerald-400'
                : 'text-blue-700 dark:text-blue-400'
            }`}
          >
            {completionPct}% Complete
          </span>

          {!isComplete && (
            <button
              type="button"
              onClick={onJumpToNextPending}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 rounded-md hover:bg-blue-100/80 dark:hover:bg-blue-900/60 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              Next Pending
              <ArrowRight className="w-3 h-3" aria-hidden="true" />
            </button>
          )}

          {!isComplete && (
            <button
              type="button"
              onClick={onMarkAllReviewed}
              className="text-[11px] font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 underline cursor-pointer whitespace-nowrap shrink-0"
            >
              Mark All Reviewed
            </button>
          )}

          {hasManualReviews && (
            <button
              type="button"
              onClick={onResetReviewed}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3 h-3" aria-hidden="true" />
              Reset Review
            </button>
          )}
        </div>
      </div>

      {/* Segmented Progress Track */}
      <div
        role="progressbar"
        aria-label="Contract clauses review completion"
        aria-valuenow={completionPct}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex"
      >
        {clearedBarPct > 0 && (
          <div
            className="h-full bg-emerald-600 dark:bg-emerald-500 transition-all duration-300"
            style={{ width: `${clearedBarPct}%` }}
          />
        )}
        {flaggedBarPct > 0 && (
          <div
            className="h-full bg-blue-700 dark:bg-blue-500 transition-all duration-300"
            style={{ width: `${flaggedBarPct}%` }}
          />
        )}
      </div>

      {/* Quiet Legend + Motivational Guidance */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
        <span>{statusGuidance}</span>
        <span className="font-mono tabular-nums">
          {clearedCount} cleared · {flaggedCount} flagged · {pendingCount} pending
        </span>
      </div>
    </div>
  );
};
