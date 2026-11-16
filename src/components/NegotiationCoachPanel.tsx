import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckSquare,
  Copy,
  Loader2,
  MessageSquareQuote,
  RefreshCw,
  Sparkles,
  Square,
} from 'lucide-react';
import {
  EXCLUSIVITY_SPECS,
  NICHE_BENCHMARKS,
  PLATFORM_SPECS,
  USAGE_RIGHTS_SPECS,
} from '../data/benchmarks';
import {
  NegotiationCoachAnalysis,
  NegotiationCoachFocus,
  SavedDealSnapshot,
} from '../types/calculator';
import { formatCurrencyExact } from '../utils/pricingEngine';

interface NegotiationCoachPanelProps {
  deals: SavedDealSnapshot[];
  onNotify: (message: string) => void;
}

const FOCUS_OPTIONS: Array<{
  id: NegotiationCoachFocus;
  label: string;
  hint: string;
}> = [
  {
    id: 'balanced',
    label: 'Balanced Counter',
    hint: 'Protect rate while offering scope options',
  },
  {
    id: 'defend_scope',
    label: 'Defend Scope',
    hint: 'Trim riders instead of cutting base rate',
  },
  {
    id: 'anchor_up',
    label: 'Anchor Up',
    hint: 'Lead with ER, CPM & ROI leverage',
  },
  {
    id: 'rights_exclusivity',
    label: 'Rights & Exclusivity',
    hint: 'Monetize usage, whitelisting & lockouts',
  },
];

export const NegotiationCoachPanel: React.FC<NegotiationCoachPanelProps> = ({
  deals,
  onNotify,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    deals.slice(0, Math.min(3, deals.length)).map((d) => d.id)
  );
  const [focus, setFocus] = useState<NegotiationCoachFocus>('balanced');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<NegotiationCoachAnalysis | null>(null);
  const [analyzedSignature, setAnalyzedSignature] = useState<string | null>(null);
  const [copiedScriptIdx, setCopiedScriptIdx] = useState<number | null>(null);

  // Keep selectedIds synced with currently available deals
  useEffect(() => {
    const validIds = new Set(deals.map((d) => d.id));
    setSelectedIds((prev) => {
      const kept = prev.filter((id) => validIds.has(id));
      if (kept.length >= Math.min(2, deals.length)) {
        return kept;
      }
      const next = [...kept];
      for (const d of deals) {
        if (next.length >= Math.min(3, deals.length)) break;
        if (!next.includes(d.id)) {
          next.push(d.id);
        }
      }
      return next;
    });
  }, [deals]);

  const selectedDeals = useMemo(
    () => deals.filter((d) => selectedIds.includes(d.id)),
    [deals, selectedIds]
  );

  const currentSignature = useMemo(
    () =>
      JSON.stringify({
        focus,
        deals: selectedDeals.map((d) => ({
          id: d.id,
          rate: d.result.breakdown.totalRecommendedRate,
          notes: d.notes ?? '',
          tags: d.tags ?? [],
        })),
      }),
    [focus, selectedDeals]
  );

  const isStale = Boolean(
    analysis && analyzedSignature !== null && analyzedSignature !== currentSignature
  );

  const selectionSummary = useMemo(() => {
    if (selectedDeals.length < 2) return null;
    const rates = selectedDeals.map((d) => d.result.breakdown.totalRecommendedRate);
    const minRate = Math.min(...rates);
    const maxRate = Math.max(...rates);
    const spread = maxRate - minRate;
    const notesCount = selectedDeals.filter(
      (d) => typeof d.notes === 'string' && d.notes.trim().length > 0
    ).length;
    return { minRate, maxRate, spread, notesCount };
  }, [selectedDeals]);

  const toggleDealSelection = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      }
      if (prev.length >= 6) {
        onNotify('Select up to 6 deals for AI Negotiating Coach analysis.');
        return prev;
      }
      return [...prev, id];
    });
  };

  const handleAnalyze = async () => {
    if (selectedDeals.length < 2 || loading) return;
    setLoading(true);
    setError(null);

    const payloadDeals = selectedDeals.map((d) => ({
      id: d.id,
      name: d.name,
      tags: d.tags ?? [],
      notes: d.notes,
      savedAt: d.savedAt,
      platform: PLATFORM_SPECS[d.profile.platform].label,
      niche: NICHE_BENCHMARKS[d.profile.niche].label,
      followerTier: d.result.followerTier.label,
      followerCount: d.profile.followerCount,
      medianViews: d.profile.medianViews,
      engagementRate: d.result.breakdown.calculatedER,
      activeCpm: d.result.breakdown.activeCpm,
      baseCreationFee: d.result.breakdown.baseCreationFee,
      usageRightsLabel: USAGE_RIGHTS_SPECS[d.scope.usageRightsTerm].label,
      usageRightsFee: d.result.breakdown.usageRightsFee,
      whitelistingEnabled: d.scope.whitelistingEnabled,
      whitelistingExpirationDays: d.scope.whitelistingExpirationDays,
      whitelistingFee: d.result.breakdown.whitelistingFee,
      exclusivityLabel: EXCLUSIVITY_SPECS[d.scope.exclusivityType].label,
      exclusivityFee: d.result.breakdown.exclusivityFee,
      turnaroundLabel:
        d.scope.turnaroundWindow === 'rush_under_5d'
          ? 'Rush (<5 business days)'
          : 'Standard (14 days)',
      rushFee: d.result.breakdown.rushFee,
      includedRevisionRounds: d.scope.includedRevisionRounds,
      excessRevisionsFee: d.result.breakdown.excessRevisionsFee,
      totalCommercialRiders: d.result.breakdown.totalCommercialRiders,
      totalRecommendedRate: d.result.breakdown.totalRecommendedRate,
      targetCpa: d.targetCpa,
      targetMonthlyRevenue: d.targetMonthlyRevenue,
    }));

    try {
      const response = await fetch('/api/negotiation-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deals: payloadDeals,
          focus,
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

      setAnalysis(data as NegotiationCoachAnalysis);
      setAnalyzedSignature(currentSignature);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Unable to reach AI Negotiating Coach service.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyScript = async (idx: number, script: string) => {
    try {
      await navigator.clipboard.writeText(script);
      setCopiedScriptIdx(idx);
      onNotify('Copied counter-negotiation talking point script.');
      setTimeout(() => {
        setCopiedScriptIdx((prev) => (prev === idx ? null : prev));
      }, 2000);
    } catch {
      onNotify('Unable to access clipboard in this browser context.');
    }
  };

  const handleCopyBrief = async () => {
    if (!analysis) return;
    const lines: string[] = [
      '# AI Negotiating Coach Brief',
      '',
      `**Compared Deals (${selectedDeals.length}):** ${selectedDeals.map((d) => d.name).join(' vs. ')}`,
      `**Recommended Anchor:** ${formatCurrencyExact(analysis.counterOfferRecommendation.recommendedAnchorRate)}`,
      `**Walk-Away Floor:** ${formatCurrencyExact(analysis.counterOfferRecommendation.recommendedFloorRate)}`,
      '',
      '## Executive Assessment',
      analysis.executiveSummary,
      '',
      '## Key Fee & Scope Discrepancies',
      ...analysis.keyDiscrepancies.map(
        (item) => `- **${item.dimension}** (${item.deltaSummary}): ${item.strategicImpact}`
      ),
      '',
      '## Counter-Negotiation Talking Points',
      ...analysis.talkingPoints.flatMap((tp, i) => [
        `### ${i + 1}. ${tp.title} (Target: ${tp.targetDealName})`,
        `Rationale: ${tp.rationale}`,
        `> "${tp.scriptQuote}"`,
        '',
      ]),
      '## Concession Playbook',
      analysis.counterOfferRecommendation.concessionPlaybook,
    ];

    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      onNotify('Copied full AI Negotiating Coach brief to clipboard.');
    } catch {
      onNotify('Unable to access clipboard in this browser context.');
    }
  };

  return (
    <section
      aria-label="AI Negotiating Coach"
      className="bg-white border border-slate-200 rounded-xl overflow-hidden"
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/70 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-700 shrink-0" aria-hidden="true" />
            <h2 className="font-display text-base font-semibold text-slate-900">
              AI Negotiating Coach
            </h2>
          </div>
          <p className="text-xs text-slate-600 mt-0.5">
            Select 2 or more saved deals to analyze fee discrepancies, commercial rights gaps, and negotiation notes into tailored counter-offer talking points.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {analysis && (
            <button
              type="button"
              onClick={handleCopyBrief}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" aria-hidden="true" />
              Copy Brief
            </button>
          )}
          <button
            type="button"
            onClick={handleAnalyze}
            disabled={selectedDeals.length < 2 || loading}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 disabled:bg-slate-300 disabled:text-slate-600 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                Analyzing Discrepancies...
              </>
            ) : analysis ? (
              <>
                <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                Refresh Talking Points
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                Generate Talking Points
              </>
            )}
          </button>
        </div>
      </div>

      {/* Deal Selection & Strategy Focus */}
      <div className="p-5 sm:p-6 space-y-5 border-b border-slate-100">
        {deals.length < 2 ? (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs text-slate-600">
            Save or display at least <strong>2 deals</strong> in the comparison view to unlock AI discrepancy analysis and counter-negotiation talking points.
          </div>
        ) : (
          <>
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-slate-700">
                  1. Select Deals to Compare ({selectedDeals.length} selected, min 2)
                </span>
                {selectionSummary && (
                  <span className="font-mono text-slate-600 tabular-nums">
                    Rate spread:{' '}
                    <strong className="text-slate-900">
                      {formatCurrencyExact(selectionSummary.spread)}
                    </strong>{' '}
                    ({formatCurrencyExact(selectionSummary.minRate)} →{' '}
                    {formatCurrencyExact(selectionSummary.maxRate)}) ·{' '}
                    {selectionSummary.notesCount}/{selectedDeals.length} with notes
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {deals.map((deal) => {
                  const isSelected = selectedIds.includes(deal.id);
                  const hasNotes = Boolean(deal.notes && deal.notes.trim().length > 0);
                  return (
                    <button
                      key={`coach-select-${deal.id}`}
                      type="button"
                      onClick={() => toggleDealSelection(deal.id)}
                      aria-pressed={isSelected}
                      className={`text-left p-3.5 rounded-lg border transition-colors cursor-pointer flex items-start gap-2.5 ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/40'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <span className="mt-0.5 shrink-0">
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-blue-700" aria-hidden="true" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400" aria-hidden="true" />
                        )}
                      </span>
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-xs font-semibold text-slate-900 truncate">
                            {deal.name}
                          </span>
                          <span className="font-mono text-xs font-bold text-slate-900 shrink-0 tabular-nums">
                            {formatCurrencyExact(deal.result.breakdown.totalRecommendedRate)}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono tabular-nums">
                          {PLATFORM_SPECS[deal.profile.platform].shortLabel} · Base{' '}
                          {formatCurrencyExact(deal.result.breakdown.baseCreationFee)} · Riders{' '}
                          {formatCurrencyExact(deal.result.breakdown.totalCommercialRiders)}
                        </div>
                        {deal.tags && deal.tags.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1">
                            {deal.tags.map((tag) => (
                              <span
                                key={`coach-tag-${deal.id}-${tag}`}
                                className="px-1.5 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200 rounded-sm"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                        <p
                          className={`text-[11px] leading-snug line-clamp-2 ${
                            hasNotes ? 'text-slate-700' : 'text-slate-400 italic'
                          }`}
                        >
                          {hasNotes
                            ? `Notes: ${deal.notes}`
                            : 'No negotiation notes — add notes in matrix below'}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Strategy Focus */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
              <div>
                <div className="text-xs font-semibold text-slate-700">
                  2. Counter-Negotiation Posture
                </div>
                <div className="text-[11px] text-slate-500">
                  {FOCUS_OPTIONS.find((f) => f.id === focus)?.hint}
                </div>
              </div>
              <div
                role="group"
                aria-label="Counter-negotiation focus"
                className="inline-flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg"
              >
                {FOCUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    aria-pressed={focus === opt.id}
                    onClick={() => setFocus(opt.id)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                      focus === opt.id
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Error Banner */}
        {error && (
          <div
            role="alert"
            className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start justify-between gap-3 text-xs text-red-900"
          >
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <div className="font-semibold">Unable to generate coaching analysis</div>
                <div className="text-red-800 mt-0.5">{error}</div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={selectedDeals.length < 2 || loading}
              className="px-3 py-1.5 text-xs font-medium text-red-800 bg-white border border-red-300 rounded-md hover:bg-red-50 cursor-pointer shrink-0"
            >
              Retry
            </button>
          </div>
        )}
      </div>

      {/* Analysis Output */}
      {analysis && (
        <div className="p-5 sm:p-6 space-y-6 bg-white">
          {isStale && (
            <div className="px-3.5 py-2.5 bg-amber-50 border border-amber-200 rounded-lg flex flex-wrap items-center justify-between gap-2 text-xs text-amber-900">
              <span>
                Deal selection, notes, or negotiation posture changed since this brief was generated.
              </span>
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={selectedDeals.length < 2 || loading}
                className="font-semibold text-amber-950 underline hover:no-underline cursor-pointer"
              >
                Re-analyze with updated inputs
              </button>
            </div>
          )}

          {/* Executive Summary + Counter-Offer Targets */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-7 border border-slate-200 rounded-lg p-4 bg-slate-50/50 space-y-2">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Executive Discrepancy Assessment
              </div>
              <p className="text-sm text-slate-800 leading-relaxed">
                {analysis.executiveSummary}
              </p>
              <div className="pt-2 border-t border-slate-200/80 text-xs text-slate-700 leading-relaxed">
                <strong className="text-slate-900">Concession Playbook: </strong>
                {analysis.counterOfferRecommendation.concessionPlaybook}
              </div>
            </div>

            <div className="lg:col-span-5 grid grid-cols-2 gap-3 tabular-nums">
              <div className="border border-blue-200 bg-blue-50/50 rounded-lg p-4 flex flex-col justify-between">
                <div className="text-[11px] font-semibold text-blue-900 uppercase tracking-wide">
                  Recommended Anchor
                </div>
                <div className="font-mono text-xl font-bold text-blue-900 mt-1">
                  {formatCurrencyExact(
                    analysis.counterOfferRecommendation.recommendedAnchorRate
                  )}
                </div>
                <div className="text-[11px] text-blue-800 mt-1">
                  Opening counter-offer quote
                </div>
              </div>

              <div className="border border-slate-200 bg-slate-50 rounded-lg p-4 flex flex-col justify-between">
                <div className="text-[11px] font-semibold text-slate-700 uppercase tracking-wide">
                  Walk-Away Floor
                </div>
                <div className="font-mono text-xl font-bold text-slate-900 mt-1">
                  {formatCurrencyExact(
                    analysis.counterOfferRecommendation.recommendedFloorRate
                  )}
                </div>
                <div className="text-[11px] text-slate-600 mt-1">
                  Minimum cash before trimming scope
                </div>
              </div>
            </div>
          </div>

          {/* Detected Fee & Scope Discrepancies */}
          <div className="space-y-3">
            <h3 className="font-display text-sm font-semibold text-slate-900">
              Analyzed Fee &amp; Scope Discrepancies
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {analysis.keyDiscrepancies.map((item, idx) => (
                <div
                  key={`disc-${idx}`}
                  className="border border-slate-200 rounded-lg p-3.5 bg-white space-y-1"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-900">
                      {item.dimension}
                    </span>
                    <span className="font-mono text-[11px] font-semibold text-blue-700 shrink-0">
                      {item.deltaSummary}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {item.strategicImpact}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Counter-Negotiation Talking Points */}
          <div className="space-y-3">
            <h3 className="font-display text-sm font-semibold text-slate-900">
              Counter-Negotiation Talking Points
            </h3>
            <div className="space-y-3">
              {analysis.talkingPoints.map((tp, idx) => (
                <div
                  key={`tp-${idx}`}
                  className="border border-slate-200 rounded-lg p-4 bg-white space-y-2.5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="text-xs sm:text-sm font-semibold text-slate-900">
                        {idx + 1}. {tp.title}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Applies to: <strong className="text-slate-700">{tp.targetDealName}</strong>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCopyScript(idx, tp.scriptQuote)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors cursor-pointer shrink-0"
                    >
                      {copiedScriptIdx === idx ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                          Copy Script
                        </>
                      )}
                    </button>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    <strong className="text-slate-800">Why it works: </strong>
                    {tp.rationale}
                  </p>

                  <div className="bg-slate-50 border border-slate-200/90 rounded-lg p-3 flex items-start gap-2.5">
                    <MessageSquareQuote
                      className="w-4 h-4 text-blue-700 shrink-0 mt-0.5"
                      aria-hidden="true"
                    />
                    <p className="text-xs sm:text-[13px] text-slate-800 leading-relaxed">
                      &ldquo;{tp.scriptQuote}&rdquo;
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
