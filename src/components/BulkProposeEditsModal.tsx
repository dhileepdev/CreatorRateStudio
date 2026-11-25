import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Check,
  Copy,
  FilePenLine,
  Loader2,
  MessageSquarePlus,
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
  ClauseRiskWeight,
  ContractClause,
  CreatorProfile,
  DealScope,
} from '../types/calculator';
import { resolveClauseRiskWeight } from '../utils/pricingEngine';

export interface BulkProposedClauseEdit {
  clauseId: number;
  clauseTitle: string;
  riskWeight: 'critical' | 'moderate';
  editSummary: string;
  proposedClauseText: string;
  negotiationNote: string;
}

export interface BulkProposeEditsResponse {
  packageOverview: string;
  proposedEdits: BulkProposedClauseEdit[];
  combinedRedlineDocument: string;
}

interface BulkProposeEditsModalProps {
  open: boolean;
  onClose: () => void;
  profile: CreatorProfile;
  scope: DealScope;
  result: CalculatedDealResult;
  flaggedClauses: ContractClause[];
  clauseRiskWeights: Partial<Record<number, ClauseRiskWeight>>;
  brandName: string;
  onFlagPresetClauses: (clauseIds: number[]) => void;
  onAppendToCustomClauses: (text: string) => void;
  onLogProposedEdits: (edits: BulkProposedClauseEdit[]) => void;
  onCopyText: (text: string, label: string) => void;
}

export const BulkProposeEditsModal: React.FC<BulkProposeEditsModalProps> = ({
  open,
  onClose,
  profile,
  scope,
  result,
  flaggedClauses,
  clauseRiskWeights,
  brandName,
  onFlagPresetClauses,
  onAppendToCustomClauses,
  onLogProposedEdits,
  onCopyText,
}) => {
  const { currencySpec } = useCurrency();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proposal, setProposal] = useState<BulkProposeEditsResponse | null>(null);
  const [generatedSig, setGeneratedSig] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [appendedToCustom, setAppendedToCustom] = useState(false);
  const [loggedToHistory, setLoggedToHistory] = useState(false);

  const eligibleClauses = useMemo(() => {
    return flaggedClauses
      .map((clause) => ({
        clause,
        riskWeight: resolveClauseRiskWeight(clause, clauseRiskWeights),
      }))
      .filter(
        (item): item is { clause: ContractClause; riskWeight: 'critical' | 'moderate' } =>
          item.riskWeight === 'critical' || item.riskWeight === 'moderate'
      );
  }, [flaggedClauses, clauseRiskWeights]);

  const criticalCount = eligibleClauses.filter(
    (c) => c.riskWeight === 'critical'
  ).length;
  const moderateCount = eligibleClauses.filter(
    (c) => c.riskWeight === 'moderate'
  ).length;
  const skippedLowCount = Math.max(0, flaggedClauses.length - eligibleClauses.length);

  const currentSig = useMemo(
    () =>
      JSON.stringify({
        items: eligibleClauses.map((i) => `${i.clause.clauseId}:${i.riskWeight}`),
        platform: profile.platform,
        usage: scope.usageRightsTerm,
        exclusivity: scope.exclusivityType,
        turnaround: scope.turnaroundWindow,
        revisions: scope.includedRevisionRounds,
        rate: Math.round(result.breakdown.totalRecommendedRate),
        currency: currencySpec.code,
        brand: brandName.trim(),
      }),
    [eligibleClauses, profile.platform, scope, result.breakdown.totalRecommendedRate, currencySpec.code, brandName]
  );

  const isStale = Boolean(proposal && generatedSig && generatedSig !== currentSig);

  const handleGenerateBulkEdits = useCallback(async () => {
    if (eligibleClauses.length === 0 || loading) return;
    setLoading(true);
    setError(null);
    setAppendedToCustom(false);
    setLoggedToHistory(false);

    const reqSig = currentSig;

    try {
      const resp = await fetch('/api/contract-bulk-propose-edits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clauses: eligibleClauses.map((item) => ({
            ...item.clause,
            riskWeight: item.riskWeight,
          })),
          dealContext: {
            platformLabel: PLATFORM_SPECS[profile.platform].label,
            deliverableUnit: PLATFORM_SPECS[profile.platform].deliverableUnit,
            nicheLabel: NICHE_BENCHMARKS[profile.niche].label,
            usageRightsLabel: USAGE_RIGHTS_SPECS[scope.usageRightsTerm].label,
            whitelistingEnabled: scope.whitelistingEnabled,
            whitelistingExpirationDays: scope.whitelistingExpirationDays,
            exclusivityLabel: EXCLUSIVITY_SPECS[scope.exclusivityType].label,
            turnaroundLabel:
              scope.turnaroundWindow === 'rush_under_5d'
                ? 'Rush (<5 business days)'
                : 'Standard (14 days)',
            includedRevisionRounds: scope.includedRevisionRounds,
            excessRevisionFeePerRoundUsd: scope.excessRevisionFeePerRound,
            baseCreationFeeUsd: result.breakdown.baseCreationFee,
            totalRecommendedRateUsd: result.breakdown.totalRecommendedRate,
          },
          brandName: brandName.trim(),
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

      setProposal(data as BulkProposeEditsResponse);
      setGeneratedSig(reqSig);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [eligibleClauses, loading, currentSig, profile, scope, result, brandName, currencySpec]);

  useEffect(() => {
    if (!open) return;
    if (eligibleClauses.length > 0 && !proposal && !loading && !error) {
      handleGenerateBulkEdits();
    }
  }, [open, eligibleClauses.length, proposal, loading, error, handleGenerateBulkEdits]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bulk-propose-edits-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-blue-700 dark:text-blue-400">
              <FilePenLine className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>AI Bulk Propose Edits</span>
              <span className="text-slate-300 dark:text-slate-600" aria-hidden="true">
                ·
              </span>
              <span className="font-mono tabular-nums text-slate-600 dark:text-slate-300">
                {criticalCount} Critical · {moderateCount} Moderate
                {skippedLowCount > 0 ? ` (${skippedLowCount} Low excluded)` : ''}
              </span>
            </div>
            <h3
              id="bulk-propose-edits-title"
              className="font-display text-lg font-bold text-slate-900 dark:text-slate-100 mt-0.5"
            >
              Creator-Friendly Replacement Clause Package
            </h3>
          </div>

          <div className="flex items-center gap-2">
            {eligibleClauses.length > 0 && (
              <button
                type="button"
                disabled={loading}
                onClick={handleGenerateBulkEdits}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-700 dark:bg-blue-600 rounded-lg hover:bg-blue-800 dark:hover:bg-blue-500 disabled:opacity-50 transition-colors cursor-pointer whitespace-nowrap"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`}
                  aria-hidden="true"
                />
                {proposal ? 'Regenerate Edits' : 'Generate Edits'}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Bulk Propose Edits modal"
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {eligibleClauses.length === 0 ? (
            <div className="py-10 text-center space-y-3 max-w-md mx-auto">
              <ShieldAlert
                className="w-7 h-7 text-slate-400 dark:text-slate-500 mx-auto"
                aria-hidden="true"
              />
              <h4 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                No Critical or Moderate Flags Selected
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Bulk Propose Edits drafts cohesive creator-friendly legal language for every flagged clause weighted as <strong>Critical</strong> or <strong>Moderate</strong>. Flag clauses in the scanner or load a common red-flag bundle below.
              </p>
              <button
                type="button"
                onClick={() => onFlagPresetClauses([1, 4, 5, 8, 12])}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 dark:bg-blue-600 rounded-lg hover:bg-blue-800 dark:hover:bg-blue-500 cursor-pointer"
              >
                Flag Top 5 Common Red Flags (#1, #4, #5, #8, #12)
              </button>
            </div>
          ) : loading ? (
            <div className="py-14 flex flex-col items-center justify-center text-center gap-3">
              <Loader2
                className="w-6 h-6 text-blue-700 dark:text-blue-400 animate-spin"
                aria-hidden="true"
              />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Drafting creator-friendly replacement language for {eligibleClauses.length}{' '}
                  {eligibleClauses.length === 1 ? 'clause' : 'clauses'}...
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Aligning payment terms, licensing windows, and fee protection with your{' '}
                  {PLATFORM_SPECS[profile.platform].shortLabel} scope.
                </p>
              </div>
            </div>
          ) : error ? (
            <div className="p-4 rounded-lg border border-red-200 dark:border-red-800/80 bg-red-50/70 dark:bg-red-950/40 space-y-3">
              <div className="flex items-start gap-2.5 text-xs text-red-900 dark:text-red-200">
                <AlertCircle
                  className="w-4 h-4 text-red-700 dark:text-red-400 shrink-0 mt-0.5"
                  aria-hidden="true"
                />
                <div className="space-y-1">
                  <div className="font-semibold">Unable to generate bulk edits</div>
                  <p className="leading-relaxed">{error}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleGenerateBulkEdits}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-red-700 hover:bg-red-800 rounded-md cursor-pointer"
              >
                Retry Generation
              </button>
            </div>
          ) : proposal ? (
            <>
              {isStale && (
                <div className="p-3 rounded-lg border border-amber-200 dark:border-amber-800/80 bg-amber-50/70 dark:bg-amber-950/40 flex flex-wrap items-center justify-between gap-2 text-xs text-amber-900 dark:text-amber-200">
                  <span>
                    Your flagged clauses or deal terms changed since this package was drafted.
                  </span>
                  <button
                    type="button"
                    onClick={handleGenerateBulkEdits}
                    className="font-semibold underline cursor-pointer whitespace-nowrap"
                  >
                    Refresh Package
                  </button>
                </div>
              )}

              {/* Overview */}
              <div className="pb-4 border-b border-slate-100 dark:border-slate-800 space-y-1">
                <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  Redline Package Overview
                </div>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {proposal.packageOverview}
                </p>
              </div>

              {/* Per-Clause Proposed Language */}
              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {proposal.proposedEdits.map((edit) => (
                  <div key={`bulk-edit-${edit.clauseId}`} className="py-4 first:pt-0 space-y-2.5">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 text-xs">
                          <span
                            className={`font-mono font-semibold uppercase text-[11px] ${
                              edit.riskWeight === 'critical'
                                ? 'text-red-700 dark:text-red-400'
                                : 'text-amber-700 dark:text-amber-400'
                            }`}
                          >
                            {edit.riskWeight}
                          </span>
                          <span className="text-slate-300 dark:text-slate-600" aria-hidden="true">
                            ·
                          </span>
                          <span className="font-semibold text-slate-900 dark:text-slate-100">
                            Clause #{edit.clauseId} · {edit.clauseTitle}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {edit.editSummary}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          onCopyText(
                            edit.proposedClauseText,
                            `Clause #${edit.clauseId} proposed language`
                          );
                          setCopiedId(edit.clauseId);
                          window.setTimeout(() => setCopiedId(null), 1500);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 rounded-md hover:bg-blue-100/80 dark:hover:bg-blue-900/60 cursor-pointer whitespace-nowrap shrink-0"
                      >
                        {copiedId === edit.clauseId ? (
                          <Check className="w-3 h-3 text-emerald-700 dark:text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        {copiedId === edit.clauseId ? 'Copied' : 'Copy Clause'}
                      </button>
                    </div>

                    <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono text-slate-900 dark:text-slate-100 leading-relaxed whitespace-pre-wrap">
                      {edit.proposedClauseText}
                    </div>

                    <div className="text-[11px] text-slate-600 dark:text-slate-400">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        Margin Comment Note:
                      </span>{' '}
                      {edit.negotiationNote}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </div>

        {/* Footer Actions */}
        {proposal && eligibleClauses.length > 0 && !loading && (
          <div className="px-5 sm:px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 flex flex-wrap items-center justify-between gap-2.5">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Non-Markdown plain text ready for Word, Google Docs, or contract addenda.
            </span>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={loggedToHistory}
                onClick={() => {
                  onLogProposedEdits(proposal.proposedEdits);
                  setLoggedToHistory(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-60 cursor-pointer whitespace-nowrap"
              >
                {loggedToHistory ? (
                  <Check className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                ) : (
                  <MessageSquarePlus className="w-3.5 h-3.5" />
                )}
                {loggedToHistory ? 'Logged to History' : 'Log to Negotiation Log'}
              </button>

              <button
                type="button"
                disabled={appendedToCustom}
                onClick={() => {
                  onAppendToCustomClauses(proposal.combinedRedlineDocument);
                  setAppendedToCustom(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-blue-800 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100/80 dark:hover:bg-blue-900/60 disabled:opacity-60 cursor-pointer whitespace-nowrap"
              >
                {appendedToCustom ? (
                  <Check className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                ) : (
                  <FilePenLine className="w-3.5 h-3.5" />
                )}
                {appendedToCustom ? 'Added to Custom Clauses' : 'Add All to Custom Clauses'}
              </button>

              <button
                type="button"
                onClick={() =>
                  onCopyText(
                    proposal.combinedRedlineDocument,
                    `bulk proposed edits (${proposal.proposedEdits.length} clauses)`
                  )
                }
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-blue-600 rounded-lg hover:bg-slate-800 dark:hover:bg-blue-500 transition-colors cursor-pointer whitespace-nowrap"
              >
                <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                Copy All Proposed Edits
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
