import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  Loader2,
  RefreshCw,
  ShieldAlert,
  X,
} from 'lucide-react';
import {
  EXCLUSIVITY_SPECS,
  NICHE_BENCHMARKS,
  PLATFORM_SPECS,
  USAGE_RIGHTS_SPECS,
} from '../data/benchmarks';
import { useCurrency } from '../context/CurrencyContext';
import {
  CalculatedDealResult,
  ContractClause,
  CreatorProfile,
  DealScope,
} from '../types/calculator';

export interface ClauseAiExplanation {
  plainEnglishSummary: string;
  longTermBusinessImpact: string;
  potentialTraps: string[];
  potentialBenefitsOrFairUse: string[];
  bottomLineVerdict: string;
}

interface ClauseAiExplainModalProps {
  clause: ContractClause | null;
  onClose: () => void;
  profile: CreatorProfile;
  scope: DealScope;
  result: CalculatedDealResult;
}

export const ClauseAiExplainModal: React.FC<ClauseAiExplainModalProps> = ({
  clause,
  onClose,
  profile,
  scope,
  result,
}) => {
  const { currencySpec } = useCurrency();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<ClauseAiExplanation | null>(null);
  const cacheRef = useRef<Map<string, ClauseAiExplanation>>(new Map());

  const cacheKey = clause
    ? `${clause.clauseId}:${profile.platform}:${profile.niche}:${Math.round(
        result.breakdown.totalRecommendedRate
      )}:${currencySpec.code}`
    : '';

  const fetchExplanation = useCallback(
    async (forceRefresh = false) => {
      if (!clause) return;

      if (!forceRefresh && cacheRef.current.has(cacheKey)) {
        setExplanation(cacheRef.current.get(cacheKey)!);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const resp = await fetch('/api/contract-clause-explain', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clause,
            dealContext: {
              platformLabel: PLATFORM_SPECS[profile.platform].label,
              deliverableUnit: PLATFORM_SPECS[profile.platform].deliverableUnit,
              nicheLabel: NICHE_BENCHMARKS[profile.niche].label,
              followerTierLabel: result.followerTier.label,
              usageRightsLabel: USAGE_RIGHTS_SPECS[scope.usageRightsTerm].label,
              exclusivityLabel: EXCLUSIVITY_SPECS[scope.exclusivityType].label,
              baseCreationFeeUsd: result.breakdown.baseCreationFee,
              totalRecommendedRateUsd: result.breakdown.totalRecommendedRate,
            },
            currency: {
              code: currencySpec.code,
              rateFromUsd: currencySpec.rateFromUsd,
              decimals: currencySpec.decimals,
            },
          }),
        });

        const data = await resp.json().catch(() => ({}));
        if (!resp.ok) {
          throw new Error(
            typeof data?.error === 'string'
              ? data.error
              : `Request failed with status ${resp.status}.`
          );
        }

        const parsed = data as ClauseAiExplanation;
        cacheRef.current.set(cacheKey, parsed);
        setExplanation(parsed);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    },
    [clause, cacheKey, profile, scope, result, currencySpec]
  );

  useEffect(() => {
    if (!clause) return;
    fetchExplanation(false);
  }, [clause, fetchExplanation]);

  useEffect(() => {
    if (!clause) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [clause, onClose]);

  if (!clause) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-explain-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[88vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl p-5 sm:p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 dark:text-blue-400">
              <Lightbulb className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>AI Plain-English Clause Breakdown</span>
              <span className="text-slate-300 dark:text-slate-600" aria-hidden="true">
                ·
              </span>
              <span className="text-slate-500 dark:text-slate-400 font-normal">
                Clause #{clause.clauseId} · {clause.category}
              </span>
            </div>
            <h3
              id="ai-explain-modal-title"
              className="font-display text-lg font-bold text-slate-900 dark:text-slate-100 mt-1"
            >
              {clause.clauseTitle}
            </h3>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              disabled={loading}
              onClick={() => fetchExplanation(true)}
              aria-label="Regenerate AI explanation"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 cursor-pointer whitespace-nowrap"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
              Refresh
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close AI Explain dialog"
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="py-10 flex flex-col items-center justify-center text-center gap-3">
            <Loader2
              className="w-6 h-6 text-blue-700 dark:text-blue-400 animate-spin"
              aria-hidden="true"
            />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Analyzing Clause #{clause.clauseId} for your creator business...
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tailoring long-term traps, fair-use scenarios, and business impact to your{' '}
                {PLATFORM_SPECS[profile.platform].shortLabel} ({NICHE_BENCHMARKS[profile.niche].label}) deal.
              </p>
            </div>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="p-4 rounded-lg border border-red-200 dark:border-red-800/80 bg-red-50/70 dark:bg-red-950/40 space-y-3">
            <div className="flex items-start gap-2.5 text-xs text-red-900 dark:text-red-200">
              <AlertCircle
                className="w-4 h-4 text-red-700 dark:text-red-400 shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <div className="space-y-1">
                <div className="font-semibold">Unable to generate AI explanation</div>
                <p className="leading-relaxed">{error}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => fetchExplanation(true)}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-red-700 hover:bg-red-800 rounded-md cursor-pointer"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Generated Explanation Content */}
        {!loading && !error && explanation && (
          <div className="space-y-4">
            {/* Plain English Summary */}
            <div className="space-y-1">
              <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                What This Clause Means in Plain English
              </h4>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                {explanation.plainEnglishSummary}
              </p>
            </div>

            {/* Long-Term Business Impact */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1">
              <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                Long-Term Impact on Your Creator Business
              </h4>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {explanation.longTermBusinessImpact}
              </p>
            </div>

            {/* Traps vs Benefits Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 dark:text-red-400">
                  <ShieldAlert className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  Potential Traps to Watch Out For
                </div>
                <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                  {explanation.potentialTraps.map((trap, i) => (
                    <li key={i} className="flex items-start gap-2 leading-relaxed">
                      <AlertTriangle
                        className="w-3.5 h-3.5 text-red-600 dark:text-red-400 shrink-0 mt-0.5"
                        aria-hidden="true"
                      />
                      <span>{trap}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2 sm:pl-4 sm:border-l sm:border-slate-100 sm:dark:border-slate-800">
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  Fair-Use Upside &amp; How It Can Work for You
                </div>
                <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                  {explanation.potentialBenefitsOrFairUse.map((benefit, i) => (
                    <li key={i} className="flex items-start gap-2 leading-relaxed">
                      <CheckCircle2
                        className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5"
                        aria-hidden="true"
                      />
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Bottom Line Verdict */}
            <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
              <div className="text-[11px] font-semibold text-blue-700 dark:text-blue-400">
                Bottom-Line Verdict
              </div>
              <p className="text-xs font-medium text-slate-900 dark:text-slate-100 leading-relaxed">
                {explanation.bottomLineVerdict}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
