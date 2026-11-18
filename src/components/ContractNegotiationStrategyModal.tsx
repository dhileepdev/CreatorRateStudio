import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Check,
  Copy,
  Loader2,
  Mail,
  MessageSquareQuote,
  RefreshCw,
  Scale,
  ShieldAlert,
  X,
} from 'lucide-react';
import {
  CONTRACT_RED_FLAGS,
  EXCLUSIVITY_SPECS,
  NICHE_BENCHMARKS,
  PLATFORM_SPECS,
  USAGE_RIGHTS_SPECS,
} from '../data/benchmarks';
import { useCurrency } from '../context/CurrencyContext';
import {
  CalculatedDealResult,
  ContractClause,
  ContractCounterpartyType,
  ContractNegotiationStrategy,
  ContractNegotiationTone,
  ContractRiskAssessment,
  CreatorProfile,
  DealScope,
} from '../types/calculator';
import { formatCurrencyExact } from '../utils/pricingEngine';

interface ContractNegotiationStrategyModalProps {
  open: boolean;
  onClose: () => void;
  profile: CreatorProfile;
  scope: DealScope;
  result: CalculatedDealResult;
  flaggedClauses: ContractClause[];
  riskAssessment: ContractRiskAssessment;
  initialBrandName?: string;
  onFlagPresetClauses: (clauseIds: number[]) => void;
  onCopyText: (text: string, label: string) => void;
}

const TONE_OPTIONS: Array<{ id: ContractNegotiationTone; label: string }> = [
  { id: 'collaborative', label: 'Collaborative' },
  { id: 'firm_commercial', label: 'Firm Commercial' },
  { id: 'tiered_tradeoff', label: 'Scope Trade-Off' },
];

const COUNTERPARTY_OPTIONS: Array<{ id: ContractCounterpartyType; label: string }> = [
  { id: 'direct_brand', label: 'Direct Brand' },
  { id: 'agency', label: 'Media Agency' },
];

export const ContractNegotiationStrategyModal: React.FC<
  ContractNegotiationStrategyModalProps
> = ({
  open,
  onClose,
  profile,
  scope,
  result,
  flaggedClauses,
  riskAssessment,
  initialBrandName = '',
  onFlagPresetClauses,
  onCopyText,
}) => {
  const { currency, currencySpec } = useCurrency();
  const [tone, setTone] = useState<ContractNegotiationTone>('collaborative');
  const [counterparty, setCounterparty] =
    useState<ContractCounterpartyType>('direct_brand');
  const [brandName, setBrandName] = useState(initialBrandName);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [strategy, setStrategy] = useState<ContractNegotiationStrategy | null>(null);
  const [generatedSignature, setGeneratedSignature] = useState<string | null>(null);
  const [copiedClauseId, setCopiedClauseId] = useState<number | null>(null);
  const [copiedCombined, setCopiedCombined] = useState(false);

  const autoTriggeredForSigRef = useRef<string | null>(null);

  useEffect(() => {
    if (open && initialBrandName && !brandName) {
      setBrandName(initialBrandName);
    }
  }, [open, initialBrandName, brandName]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  const currentSignature = useMemo(
    () =>
      JSON.stringify({
        clauseIds: flaggedClauses.map((c) => c.clauseId),
        platform: profile.platform,
        niche: profile.niche,
        usage: scope.usageRightsTerm,
        whitelisting: scope.whitelistingEnabled,
        whitelistingDays: scope.whitelistingExpirationDays,
        exclusivity: scope.exclusivityType,
        turnaround: scope.turnaroundWindow,
        revisions: scope.includedRevisionRounds,
        totalRate: Math.round(result.breakdown.totalRecommendedRate),
        tone,
        counterparty,
        brandName: brandName.trim(),
        currency,
      }),
    [
      flaggedClauses,
      profile.platform,
      profile.niche,
      scope.usageRightsTerm,
      scope.whitelistingEnabled,
      scope.whitelistingExpirationDays,
      scope.exclusivityType,
      scope.turnaroundWindow,
      scope.includedRevisionRounds,
      result.breakdown.totalRecommendedRate,
      tone,
      counterparty,
      brandName,
      currency,
    ]
  );

  const isStale = Boolean(
    strategy && generatedSignature !== null && generatedSignature !== currentSignature
  );

  const handleGenerateStrategy = useCallback(async () => {
    if (flaggedClauses.length === 0 || loading) return;

    setLoading(true);
    setError(null);

    const requestSignature = currentSignature;

    try {
      const response = await fetch('/api/contract-negotiation-strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clauses: flaggedClauses,
          dealContext: {
            platformLabel: PLATFORM_SPECS[profile.platform].label,
            deliverableUnit: PLATFORM_SPECS[profile.platform].deliverableUnit,
            nicheLabel: NICHE_BENCHMARKS[profile.niche].label,
            followerTierLabel: result.followerTier.label,
            followerCount: profile.followerCount,
            medianViews: profile.medianViews,
            engagementRatePct: result.breakdown.calculatedER,
            usageRightsLabel: USAGE_RIGHTS_SPECS[scope.usageRightsTerm].label,
            whitelistingEnabled: scope.whitelistingEnabled,
            whitelistingExpirationDays: scope.whitelistingExpirationDays,
            exclusivityLabel: EXCLUSIVITY_SPECS[scope.exclusivityType].label,
            turnaroundLabel:
              scope.turnaroundWindow === 'rush_under_5d'
                ? 'Rush (<5 business days)'
                : 'Standard (14 days)',
            includedRevisionRounds: scope.includedRevisionRounds,
            baseCreationFeeUsd: result.breakdown.baseCreationFee,
            usageRightsFeeUsd: result.breakdown.usageRightsFee,
            whitelistingFeeUsd: result.breakdown.whitelistingFee,
            exclusivityFeeUsd: result.breakdown.exclusivityFee,
            totalCommercialRidersUsd: result.breakdown.totalCommercialRiders,
            totalRecommendedRateUsd: result.breakdown.totalRecommendedRate,
          },
          tone,
          counterparty,
          brandName: brandName.trim(),
          currency: {
            code: currencySpec.code,
            symbol: currencySpec.symbol,
            rateFromUsd: currencySpec.rateFromUsd,
            decimals: currencySpec.decimals,
          },
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message =
          typeof data?.error === 'string'
            ? data.error
            : `Request failed with status ${response.status}.`;
        throw new Error(message);
      }

      setStrategy(data as ContractNegotiationStrategy);
      setGeneratedSignature(requestSignature);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Unable to reach AI Negotiation Strategy service.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [
    flaggedClauses,
    loading,
    currentSignature,
    profile,
    scope,
    result,
    tone,
    counterparty,
    brandName,
    currencySpec,
  ]);

  // Automatically generate strategy on first open when flagged clauses exist
  useEffect(() => {
    if (!open || flaggedClauses.length === 0 || loading) return;
    if (!strategy && !error && autoTriggeredForSigRef.current !== currentSignature) {
      autoTriggeredForSigRef.current = currentSignature;
      void handleGenerateStrategy();
    }
  }, [open, flaggedClauses.length, loading, strategy, error, currentSignature, handleGenerateStrategy]);

  const handleCopyClauseRebuttal = (clauseId: number, text: string) => {
    onCopyText(text, `Clause #${clauseId} AI rebuttal`);
    setCopiedClauseId(clauseId);
    window.setTimeout(() => {
      setCopiedClauseId((prev) => (prev === clauseId ? null : prev));
    }, 2000);
  };

  const handleCopyCombinedDraft = () => {
    if (!strategy?.combinedReplyDraft) return;
    onCopyText(strategy.combinedReplyDraft, 'combined contract redline email');
    setCopiedCombined(true);
    window.setTimeout(() => setCopiedCombined(false), 2000);
  };

  const clauseLookup = useMemo(() => {
    const map = new Map<number, ContractClause>();
    for (const c of CONTRACT_RED_FLAGS) {
      map.set(c.clauseId, c);
    }
    return map;
  }, []);

  if (!open) return null;

  const platformSpec = PLATFORM_SPECS[profile.platform];
  const usageSpec = USAGE_RIGHTS_SPECS[scope.usageRightsTerm];
  const exclusivitySpec = EXCLUSIVITY_SPECS[scope.exclusivityType];
  const nicheSpec = NICHE_BENCHMARKS[profile.niche];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/55 dark:bg-slate-950/75 backdrop-blur-xs"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="contract-negotiation-strategy-title"
        className="w-full max-w-4xl max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/70 flex items-start justify-between gap-4 shrink-0">
          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
              <span className="inline-flex items-center gap-1.5 font-semibold text-blue-700 dark:text-blue-400">
                <Scale className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                Contract Negotiation Strategy
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">
                Risk {riskAssessment.score}/100 ({riskAssessment.levelLabel})
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">
                {flaggedClauses.length} red-flag {flaggedClauses.length === 1 ? 'clause' : 'clauses'}
              </span>
            </div>
            <h2
              id="contract-negotiation-strategy-title"
              className="font-display text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 [text-wrap:balance]"
            >
              AI Red-Flag Rebuttals for {platformSpec.shortLabel} Deal
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Negotiation Strategy modal"
            className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Active Deal Type Summary Strip */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-4 bg-slate-50/60 dark:bg-slate-950/60 grid grid-cols-2 lg:grid-cols-4 gap-4 text-xs tabular-nums">
            <div>
              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Deal Deliverable &amp; Niche
              </div>
              <div className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                {platformSpec.label}
              </div>
              <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 truncate">
                {nicheSpec.label} · {result.followerTier.label}
              </div>
            </div>

            <div>
              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Rights &amp; Whitelisting
              </div>
              <div className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5 truncate">
                {usageSpec.label}
              </div>
              <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                {scope.whitelistingEnabled
                  ? `Whitelisting (${scope.whitelistingExpirationDays}d cap)`
                  : 'No ad whitelisting'}
              </div>
            </div>

            <div>
              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Exclusivity &amp; Delivery
              </div>
              <div className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5 truncate">
                {exclusivitySpec.label}
              </div>
              <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                {scope.turnaroundWindow === 'rush_under_5d' ? 'Rush (<5d)' : 'Standard 14d'} ·{' '}
                {scope.includedRevisionRounds} rev rounds
              </div>
            </div>

            <div>
              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Calculated Quote Anchor
              </div>
              <div className="font-mono text-sm font-bold text-blue-700 dark:text-blue-400 mt-0.5">
                {formatCurrencyExact(result.breakdown.totalRecommendedRate, currency)}
              </div>
              <div className="text-[11px] font-mono text-slate-600 dark:text-slate-400 mt-0.5">
                Base {formatCurrencyExact(result.breakdown.baseCreationFee, currency)} + Riders{' '}
                {formatCurrencyExact(result.breakdown.totalCommercialRiders, currency)}
              </div>
            </div>
          </div>

          {/* Strategy Configuration Bar */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Rebuttal Tone
                </div>
                <div
                  role="group"
                  aria-label="Negotiation tone"
                  className="inline-flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg"
                >
                  {TONE_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      aria-pressed={tone === opt.id}
                      onClick={() => setTone(opt.id)}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                        tone === opt.id
                          ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Counterparty
                </div>
                <div
                  role="group"
                  aria-label="Contract counterparty"
                  className="inline-flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg"
                >
                  {COUNTERPARTY_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      aria-pressed={counterparty === opt.id}
                      onClick={() => setCounterparty(opt.id)}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                        counterparty === opt.id
                          ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="min-w-[180px]">
                <label
                  htmlFor="strategy-brand-name"
                  className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Brand / Agency Name (Optional)
                </label>
                <input
                  id="strategy-brand-name"
                  type="text"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="e.g., Acme FinTech"
                  className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-lg focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleGenerateStrategy}
              disabled={flaggedClauses.length === 0 || loading}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-700 dark:bg-blue-600 rounded-lg hover:bg-blue-800 dark:hover:bg-blue-500 disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:text-slate-600 dark:disabled:text-slate-500 disabled:cursor-not-allowed transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                  Drafting Rebuttals...
                </>
              ) : strategy ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                  Regenerate Strategy
                </>
              ) : (
                <>
                  <Scale className="w-3.5 h-3.5" aria-hidden="true" />
                  Generate AI Rebuttals
                </>
              )}
            </button>
          </div>

          {/* Empty Flagged Clauses State */}
          {flaggedClauses.length === 0 && (
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-6 text-center bg-slate-50/50 dark:bg-slate-950/50 space-y-3">
              <ShieldAlert
                className="w-7 h-7 text-slate-400 dark:text-slate-500 mx-auto"
                aria-hidden="true"
              />
              <div className="space-y-1 max-w-md mx-auto">
                <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
                  No Red-Flag Clauses Flagged in Audit
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Flag one or more predatory terms in the 15-clause scanner—or load a common clause bundle below—to generate rebuttals tailored to your {platformSpec.shortLabel} deal.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => onFlagPresetClauses([1, 5, 12])}
                  className="px-3.5 py-2 text-xs font-medium text-white bg-slate-900 dark:bg-blue-600 rounded-lg hover:bg-slate-800 dark:hover:bg-blue-500 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  Flag Top 3 Critical (#1, #5, #12)
                </button>
                <button
                  type="button"
                  onClick={() => onFlagPresetClauses([1, 4, 5, 8, 12, 14])}
                  className="px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  Flag 6 Common Agency Red Flags
                </button>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div
              role="alert"
              className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/70 rounded-lg flex items-start justify-between gap-3 text-xs text-red-900 dark:text-red-200"
            >
              <div className="flex items-start gap-2.5">
                <AlertCircle
                  className="w-4 h-4 text-red-700 dark:text-red-400 shrink-0 mt-0.5"
                  aria-hidden="true"
                />
                <div>
                  <div className="font-semibold">Unable to generate negotiation strategy</div>
                  <div className="text-red-800 dark:text-red-300 mt-0.5">{error}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleGenerateStrategy}
                disabled={flaggedClauses.length === 0 || loading}
                className="px-3 py-1.5 text-xs font-medium text-red-800 dark:text-red-200 bg-white dark:bg-slate-900 border border-red-300 dark:border-red-700 rounded-md hover:bg-red-50 dark:hover:bg-red-950/60 cursor-pointer shrink-0 whitespace-nowrap"
              >
                Retry
              </button>
            </div>
          )}

          {/* Loading Skeleton */}
          {loading && (
            <div className="space-y-4" aria-busy="true" aria-label="Generating contract rebuttals">
              <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-2.5 animate-pulse">
                <div className="h-3.5 w-48 bg-slate-200 dark:bg-slate-800 rounded" />
                <div className="h-3 w-full bg-slate-200 dark:bg-slate-800 rounded" />
                <div className="h-3 w-5/6 bg-slate-200 dark:bg-slate-800 rounded" />
              </div>
              {flaggedClauses.slice(0, 3).map((c) => (
                <div
                  key={`skel-${c.clauseId}`}
                  className="border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-3 animate-pulse"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="h-4 w-56 bg-slate-200 dark:bg-slate-800 rounded" />
                    <div className="h-7 w-24 bg-slate-200 dark:bg-slate-800 rounded-md" />
                  </div>
                  <div className="h-3 w-full bg-slate-200 dark:bg-slate-800 rounded" />
                  <div className="h-16 w-full bg-slate-100 dark:bg-slate-800/70 rounded-lg" />
                </div>
              ))}
            </div>
          )}

          {/* Generated Strategy Content */}
          {!loading && strategy && flaggedClauses.length > 0 && (
            <div className="space-y-6">
              {isStale && (
                <div className="px-3.5 py-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/70 rounded-lg flex flex-wrap items-center justify-between gap-2 text-xs text-amber-900 dark:text-amber-200">
                  <span>
                    Flagged clauses, deal configuration, or rebuttal tone changed since this strategy was generated.
                  </span>
                  <button
                    type="button"
                    onClick={handleGenerateStrategy}
                    className="font-semibold text-amber-950 dark:text-amber-100 underline hover:no-underline cursor-pointer whitespace-nowrap"
                  >
                    Regenerate with updated terms
                  </button>
                </div>
              )}

              {/* Deal-Type Leverage & Priority Order */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                <div className="lg:col-span-7 border border-slate-200 dark:border-slate-800 rounded-lg p-4 bg-slate-50/50 dark:bg-slate-800/40 space-y-2.5">
                  <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Deal-Type Leverage Assessment
                  </h3>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    {strategy.dealTypeSummary}
                  </p>
                  <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700/80 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    <strong className="text-slate-900 dark:text-slate-100">Posture &amp; Sequencing: </strong>
                    {strategy.negotiationPosture}
                  </div>
                </div>

                <div className="lg:col-span-5 border border-slate-200 dark:border-slate-800 rounded-lg p-4 bg-white dark:bg-slate-950/50 space-y-2">
                  <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Redline Priority Order
                  </h3>
                  <ol className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                    {strategy.priorityOrder.map((step, i) => (
                      <li key={`prio-${i}`} className="flex items-start gap-2 leading-relaxed">
                        <span className="font-mono font-semibold text-blue-700 dark:text-blue-400 shrink-0 tabular-nums">
                          {i + 1}.
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>

              {/* Clause-by-Clause Rebuttals */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Clause-by-Clause AI Rebuttals ({strategy.clauseRebuttals.length})
                  </h3>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Tailored to {platformSpec.shortLabel} · {usageSpec.label.split(' ')[0]} ·{' '}
                    {nicheSpec.label}
                  </span>
                </div>

                <div className="space-y-4">
                  {strategy.clauseRebuttals.map((item) => {
                    const meta = clauseLookup.get(item.clauseId);
                    const isCritical = meta?.severity === 'critical';
                    const isCopied = copiedClauseId === item.clauseId;

                    return (
                      <article
                        key={`rebuttal-${item.clauseId}`}
                        className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 bg-white dark:bg-slate-950/50 space-y-3.5"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="space-y-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 text-[11px]">
                              <span className="font-mono font-semibold text-slate-500 dark:text-slate-400 tabular-nums">
                                Clause #{item.clauseId}
                              </span>
                              {meta && (
                                <>
                                  <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">
                                    ·
                                  </span>
                                  <span className="text-slate-600 dark:text-slate-400">
                                    {meta.category}
                                  </span>
                                  <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">
                                    ·
                                  </span>
                                  <span
                                    className={`inline-flex items-center gap-1 font-semibold ${
                                      isCritical
                                        ? 'text-red-700 dark:text-red-400'
                                        : 'text-amber-700 dark:text-amber-400'
                                    }`}
                                  >
                                    {isCritical ? (
                                      <ShieldAlert className="w-3 h-3" aria-hidden="true" />
                                    ) : (
                                      <AlertTriangle className="w-3 h-3" aria-hidden="true" />
                                    )}
                                    {isCritical ? 'Critical' : 'Warning'}
                                  </span>
                                </>
                              )}
                            </div>
                            <h4 className="font-display text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100">
                              {item.clauseTitle}
                            </h4>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              handleCopyClauseRebuttal(item.clauseId, item.emailRebuttal)
                            }
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0"
                          >
                            {isCopied ? (
                              <>
                                <Check
                                  className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400"
                                  aria-hidden="true"
                                />
                                Copied
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                                Copy Rebuttal
                              </>
                            )}
                          </button>
                        </div>

                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                          <strong className="text-slate-800 dark:text-slate-200">
                            Deal-Type Risk:{' '}
                          </strong>
                          {item.leveragePoint}
                        </p>

                        {/* Copy-Ready Rebuttal Script */}
                        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-lg p-3.5 flex items-start gap-2.5">
                          <MessageSquareQuote
                            className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0 mt-0.5"
                            aria-hidden="true"
                          />
                          <p className="text-xs sm:text-[13px] text-slate-800 dark:text-slate-200 leading-relaxed">
                            &ldquo;{item.emailRebuttal}&rdquo;
                          </p>
                        </div>

                        {/* Fallback Concession & Walk-Away Boundary */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
                          <div className="border border-slate-200/80 dark:border-slate-800 rounded-lg p-3 bg-slate-50/40 dark:bg-slate-900/60">
                            <div className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-400 mb-1">
                              Fallback Commercial Trade-Off
                            </div>
                            <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                              {item.fallbackConcession}
                            </p>
                          </div>
                          <div className="border border-slate-200/80 dark:border-slate-800 rounded-lg p-3 bg-slate-50/40 dark:bg-slate-900/60">
                            <div className="text-[11px] font-semibold text-red-800 dark:text-red-400 mb-1">
                              Walk-Away Boundary
                            </div>
                            <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                              {item.walkAwayTrigger}
                            </p>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>

              {/* Combined Ready-to-Send Redline Reply */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 bg-slate-50/50 dark:bg-slate-950/60 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="inline-flex items-center gap-2">
                    <Mail
                      className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0"
                      aria-hidden="true"
                    />
                    <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Combined Contract Redline Reply
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={handleCopyCombinedDraft}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-slate-900 dark:bg-blue-600 rounded-lg hover:bg-slate-800 dark:hover:bg-blue-500 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    {copiedCombined ? (
                      <>
                        <Check className="w-3.5 h-3.5" aria-hidden="true" />
                        Copied Reply
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                        Copy Combined Reply
                      </>
                    )}
                  </button>
                </div>

                <textarea
                  readOnly
                  rows={8}
                  aria-label="Combined contract redline reply email"
                  value={strategy.combinedReplyDraft}
                  className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-800 dark:text-slate-200 leading-relaxed focus:outline-none resize-y"
                />
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/70 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Educational negotiation strategy — not formal legal representation.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
