import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckSquare,
  Copy,
  Loader2,
  Mail,
  MessageSquareQuote,
  RefreshCw,
  RotateCcw,
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
  OutreachEmailTemplateId,
  SavedDealSnapshot,
} from '../types/calculator';
import { useCurrency } from '../context/CurrencyContext';
import {
  generateSponsorOutreachEmail,
  OUTREACH_TEMPLATE_OPTIONS,
} from '../utils/outreachEmailGenerator';
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
  const { currency, currencySpec } = useCurrency();
  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    deals.slice(0, Math.min(3, deals.length)).map((d) => d.id)
  );
  const [focus, setFocus] = useState<NegotiationCoachFocus>('balanced');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<NegotiationCoachAnalysis | null>(null);
  const [analyzedSignature, setAnalyzedSignature] = useState<string | null>(null);
  const [copiedScriptIdx, setCopiedScriptIdx] = useState<number | null>(null);

  // Sponsor Outreach Email Composer State
  const outreachSectionRef = useRef<HTMLDivElement | null>(null);
  const [emailTargetDealId, setEmailTargetDealId] = useState<string>(() => {
    const withNotes = deals.find((d) => d.notes && d.notes.trim().length > 0);
    return (withNotes ?? deals[0])?.id ?? '';
  });
  const [emailTemplateId, setEmailTemplateId] =
    useState<OutreachEmailTemplateId>('counter_offer');
  const [brandName, setBrandName] = useState('');
  const [contactName, setContactName] = useState('');
  const [creatorName, setCreatorName] = useState('');
  const [editedSubject, setEditedSubject] = useState('');
  const [editedBody, setEditedBody] = useState('');
  const [hasManualEmailEdit, setHasManualEmailEdit] = useState(false);
  const [copiedEmailType, setCopiedEmailType] = useState<'full' | 'body' | 'subject' | null>(null);

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

  // Keep emailTargetDealId synced with available deals
  useEffect(() => {
    if (deals.length === 0) {
      setEmailTargetDealId('');
      return;
    }
    const stillValid = deals.some((d) => d.id === emailTargetDealId);
    if (!stillValid) {
      const pool = selectedDeals.length > 0 ? selectedDeals : deals;
      const withNotes = pool.find((d) => d.notes && d.notes.trim().length > 0);
      setEmailTargetDealId((withNotes ?? pool[0]).id);
    }
  }, [deals, selectedDeals, emailTargetDealId]);

  const emailTargetDeal = useMemo(
    () => deals.find((d) => d.id === emailTargetDealId) ?? selectedDeals[0] ?? deals[0] ?? null,
    [deals, selectedDeals, emailTargetDealId]
  );

  const generatedOutreach = useMemo(() => {
    if (!emailTargetDeal) return null;
    const effectiveTemplate: OutreachEmailTemplateId =
      emailTemplateId === 'ai_coach_draft' && !analysis?.outreachEmail
        ? 'counter_offer'
        : emailTemplateId;
    return generateSponsorOutreachEmail({
      templateId: effectiveTemplate,
      targetDeal: emailTargetDeal,
      comparisonDeals: selectedDeals.length > 0 ? selectedDeals : deals,
      focus,
      analysis,
      brandName,
      contactName,
      creatorName,
      currency,
    });
  }, [
    emailTargetDeal,
    emailTemplateId,
    selectedDeals,
    deals,
    focus,
    analysis,
    brandName,
    contactName,
    creatorName,
    currency,
  ]);

  useEffect(() => {
    if (!generatedOutreach || hasManualEmailEdit) return;
    setEditedSubject(generatedOutreach.subject);
    setEditedBody(generatedOutreach.body);
  }, [generatedOutreach, hasManualEmailEdit]);

  const currentSignature = useMemo(
    () =>
      JSON.stringify({
        focus,
        currency,
        deals: selectedDeals.map((d) => ({
          id: d.id,
          rate: d.result.breakdown.totalRecommendedRate,
          notes: d.notes ?? '',
          tags: d.tags ?? [],
        })),
      }),
    [focus, currency, selectedDeals]
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
          currency: {
            code: currencySpec.code,
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

      const typedAnalysis = data as NegotiationCoachAnalysis;
      setAnalysis(typedAnalysis);
      setAnalyzedSignature(currentSignature);
      if (typedAnalysis.outreachEmail && !hasManualEmailEdit) {
        setEmailTemplateId('ai_coach_draft');
      }
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
      `# AI Negotiating Coach Brief (${currency})`,
      '',
      `**Compared Deals (${selectedDeals.length}):** ${selectedDeals.map((d) => d.name).join(' vs. ')}`,
      `**Recommended Anchor:** ${formatCurrencyExact(analysis.counterOfferRecommendation.recommendedAnchorRate, currency)}`,
      `**Walk-Away Floor:** ${formatCurrencyExact(analysis.counterOfferRecommendation.recommendedFloorRate, currency)}`,
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

  const handleCopyOutreachEmail = async (mode: 'full' | 'body' | 'subject') => {
    const subjectText = editedSubject.trim() || generatedOutreach?.subject || '';
    const bodyText = editedBody.trim() || generatedOutreach?.body || '';
    if (!subjectText && !bodyText) return;

    const payload =
      mode === 'subject'
        ? subjectText
        : mode === 'body'
        ? bodyText
        : `Subject: ${subjectText}\n\n${bodyText}`;

    const label =
      mode === 'subject'
        ? 'email subject line'
        : mode === 'body'
        ? 'email body'
        : 'sponsor outreach email';

    try {
      await navigator.clipboard.writeText(payload);
      setCopiedEmailType(mode);
      onNotify(`Copied ${label} to clipboard.`);
      window.setTimeout(() => {
        setCopiedEmailType((prev) => (prev === mode ? null : prev));
      }, 2000);
    } catch {
      onNotify('Unable to access clipboard in this browser context.');
    }
  };

  const handleResetOutreachDraft = () => {
    if (!generatedOutreach) return;
    setHasManualEmailEdit(false);
    setEditedSubject(generatedOutreach.subject);
    setEditedBody(generatedOutreach.body);
    onNotify('Refreshed outreach email from template & deal notes.');
  };

  return (
    <section
      aria-label="AI Negotiating Coach"
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden"
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/70 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0" aria-hidden="true" />
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              AI Negotiating Coach
            </h2>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            Select 2 or more saved deals to analyze fee discrepancies, commercial rights gaps, and negotiation notes into tailored counter-offer talking points.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {deals.length > 0 && (
            <button
              type="button"
              onClick={() =>
                outreachSectionRef.current?.scrollIntoView({
                  behavior: 'smooth',
                  block: 'start',
                })
              }
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Mail className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" aria-hidden="true" />
              Outreach Email
            </button>
          )}
          {analysis && (
            <button
              type="button"
              onClick={handleCopyBrief}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Copy className="w-3.5 h-3.5" aria-hidden="true" />
              Copy Brief
            </button>
          )}
          <button
            type="button"
            onClick={handleAnalyze}
            disabled={selectedDeals.length < 2 || loading}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-700 dark:bg-blue-600 rounded-lg hover:bg-blue-800 dark:hover:bg-blue-500 disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:text-slate-600 dark:disabled:text-slate-500 disabled:cursor-not-allowed transition-colors cursor-pointer whitespace-nowrap shrink-0"
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
      <div className="p-5 sm:p-6 space-y-5 border-b border-slate-100 dark:border-slate-800">
        {deals.length < 2 ? (
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg p-4 text-xs text-slate-600 dark:text-slate-300">
            Save or display at least <strong>2 deals</strong> in the comparison view to unlock AI discrepancy analysis and counter-negotiation talking points.
          </div>
        ) : (
          <>
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  1. Select Deals to Compare ({selectedDeals.length} selected, min 2)
                </span>
                {selectionSummary && (
                  <span className="font-mono text-slate-600 dark:text-slate-400 tabular-nums">
                    Rate spread:{' '}
                    <strong className="text-slate-900 dark:text-slate-100">
                      {formatCurrencyExact(selectionSummary.spread, currency)}
                    </strong>{' '}
                    ({formatCurrencyExact(selectionSummary.minRate, currency)} →{' '}
                    {formatCurrencyExact(selectionSummary.maxRate, currency)}) ·{' '}
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
                          ? 'border-blue-600 dark:border-blue-500 bg-blue-50/40 dark:bg-blue-950/40'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-800/70'
                      }`}
                    >
                      <span className="mt-0.5 shrink-0">
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-blue-700 dark:text-blue-400" aria-hidden="true" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400 dark:text-slate-500" aria-hidden="true" />
                        )}
                      </span>
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                            {deal.name}
                          </span>
                          <span className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100 shrink-0 tabular-nums">
                            {formatCurrencyExact(deal.result.breakdown.totalRecommendedRate, currency)}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                          {PLATFORM_SPECS[deal.profile.platform].shortLabel} · Base{' '}
                          {formatCurrencyExact(deal.result.breakdown.baseCreationFee, currency)} · Riders{' '}
                          {formatCurrencyExact(deal.result.breakdown.totalCommercialRiders, currency)}
                        </div>
                        {deal.tags && deal.tags.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1">
                            {deal.tags.map((tag) => (
                              <span
                                key={`coach-tag-${deal.id}-${tag}`}
                                className="px-1.5 py-0.5 text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-sm"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                        <p
                          className={`text-[11px] leading-snug line-clamp-2 ${
                            hasNotes
                              ? 'text-slate-700 dark:text-slate-300'
                              : 'text-slate-400 dark:text-slate-500 italic'
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
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  2. Counter-Negotiation Posture
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  {FOCUS_OPTIONS.find((f) => f.id === focus)?.hint}
                </div>
              </div>
              <div
                role="group"
                aria-label="Counter-negotiation focus"
                className="inline-flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg"
              >
                {FOCUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    aria-pressed={focus === opt.id}
                    onClick={() => setFocus(opt.id)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                      focus === opt.id
                        ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
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
            className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/70 rounded-lg flex items-start justify-between gap-3 text-xs text-red-900 dark:text-red-200"
          >
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-700 dark:text-red-400 shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <div className="font-semibold">Unable to generate coaching analysis</div>
                <div className="text-red-800 dark:text-red-300 mt-0.5">{error}</div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={selectedDeals.length < 2 || loading}
              className="px-3 py-1.5 text-xs font-medium text-red-800 dark:text-red-200 bg-white dark:bg-slate-900 border border-red-300 dark:border-red-700 rounded-md hover:bg-red-50 dark:hover:bg-red-950/60 cursor-pointer shrink-0"
            >
              Retry
            </button>
          </div>
        )}
      </div>

      {/* Analysis Output */}
      {analysis && (
        <div className="p-5 sm:p-6 space-y-6 bg-white dark:bg-slate-900">
          {isStale && (
            <div className="px-3.5 py-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/70 rounded-lg flex flex-wrap items-center justify-between gap-2 text-xs text-amber-900 dark:text-amber-200">
              <span>
                Deal selection, notes, or negotiation posture changed since this brief was generated.
              </span>
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={selectedDeals.length < 2 || loading}
                className="font-semibold text-amber-950 dark:text-amber-100 underline hover:no-underline cursor-pointer"
              >
                Re-analyze with updated inputs
              </button>
            </div>
          )}

          {/* Executive Summary + Counter-Offer Targets */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-7 border border-slate-200 dark:border-slate-800 rounded-lg p-4 bg-slate-50/50 dark:bg-slate-800/50 space-y-2">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Executive Discrepancy Assessment
              </div>
              <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
                {analysis.executiveSummary}
              </p>
              <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700/80 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                <strong className="text-slate-900 dark:text-slate-100">Concession Playbook: </strong>
                {analysis.counterOfferRecommendation.concessionPlaybook}
              </div>
            </div>

            <div className="lg:col-span-5 grid grid-cols-2 gap-3 tabular-nums">
              <div className="border border-blue-200 dark:border-blue-800/70 bg-blue-50/50 dark:bg-blue-950/40 rounded-lg p-4 flex flex-col justify-between">
                <div className="text-[11px] font-semibold text-blue-900 dark:text-blue-300 uppercase tracking-wide">
                  Recommended Anchor
                </div>
                <div className="font-mono text-xl font-bold text-blue-900 dark:text-blue-100 mt-1">
                  {formatCurrencyExact(
                    analysis.counterOfferRecommendation.recommendedAnchorRate,
                    currency
                  )}
                </div>
                <div className="text-[11px] text-blue-800 dark:text-blue-300/90 mt-1">
                  Opening counter-offer quote
                </div>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 rounded-lg p-4 flex flex-col justify-between">
                <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                  Walk-Away Floor
                </div>
                <div className="font-mono text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                  {formatCurrencyExact(
                    analysis.counterOfferRecommendation.recommendedFloorRate,
                    currency
                  )}
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                  Minimum cash before trimming scope
                </div>
              </div>
            </div>
          </div>

          {/* Detected Fee & Scope Discrepancies */}
          <div className="space-y-3">
            <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
              Analyzed Fee &amp; Scope Discrepancies
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {analysis.keyDiscrepancies.map((item, idx) => (
                <div
                  key={`disc-${idx}`}
                  className="border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 bg-white dark:bg-slate-950/60 space-y-1"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                      {item.dimension}
                    </span>
                    <span className="font-mono text-[11px] font-semibold text-blue-700 dark:text-blue-400 shrink-0">
                      {item.deltaSummary}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {item.strategicImpact}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Counter-Negotiation Talking Points */}
          <div className="space-y-3">
            <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
              Counter-Negotiation Talking Points
            </h3>
            <div className="space-y-3">
              {analysis.talkingPoints.map((tp, idx) => (
                <div
                  key={`tp-${idx}`}
                  className="border border-slate-200 dark:border-slate-800 rounded-lg p-4 bg-white dark:bg-slate-950/50 space-y-2.5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {idx + 1}. {tp.title}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Applies to: <strong className="text-slate-700 dark:text-slate-300">{tp.targetDealName}</strong>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCopyScript(idx, tp.scriptQuote)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors cursor-pointer shrink-0 whitespace-nowrap"
                    >
                      {copiedScriptIdx === idx ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
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

                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    <strong className="text-slate-800 dark:text-slate-200">Why it works: </strong>
                    {tp.rationale}
                  </p>

                  <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-lg p-3 flex items-start gap-2.5">
                    <MessageSquareQuote
                      className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0 mt-0.5"
                      aria-hidden="true"
                    />
                    <p className="text-xs sm:text-[13px] text-slate-800 dark:text-slate-200 leading-relaxed">
                      &ldquo;{tp.scriptQuote}&rdquo;
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Brand Sponsor Outreach Email Composer */}
      {emailTargetDeal && generatedOutreach && (
        <div
          ref={outreachSectionRef}
          className="p-5 sm:p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/40 space-y-4 scroll-mt-24"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-2">
                <Mail className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0" aria-hidden="true" />
                <h3 className="font-display text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100">
                  Brand Sponsor Outreach Email Generator
                </h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Synthesizes your deal notes, rate calculations, and AI Negotiating Coach posture into a copy-ready sponsor email.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400 font-mono tabular-nums">
              <span>
                Anchor:{' '}
                <strong className="text-slate-900 dark:text-slate-100">
                  {formatCurrencyExact(generatedOutreach.anchorRateUsd, currency)}
                </strong>
              </span>
              <span aria-hidden="true">·</span>
              <span>
                Floor:{' '}
                <strong className="text-slate-900 dark:text-slate-100">
                  {formatCurrencyExact(generatedOutreach.floorRateUsd, currency)}
                </strong>
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-sans">
                {generatedOutreach.usedNotes ? 'Uses deal notes' : 'No notes on deal'}
              </span>
            </div>
          </div>

          {/* Target Deal + Personalization Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label
                htmlFor="outreach-target-deal"
                className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1"
              >
                Target Deal Scenario
              </label>
              <select
                id="outreach-target-deal"
                value={emailTargetDeal.id}
                onChange={(e) => {
                  setEmailTargetDealId(e.target.value);
                  setHasManualEmailEdit(false);
                }}
                className="w-full px-2.5 py-2 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600"
              >
                {deals.map((d) => (
                  <option key={`outreach-opt-${d.id}`} value={d.id}>
                    {d.name} ({formatCurrencyExact(d.result.breakdown.totalRecommendedRate, currency)})
                    {d.notes?.trim() ? ' · Notes' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="outreach-brand-name"
                className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1"
              >
                Brand Sponsor Name
              </label>
              <input
                id="outreach-brand-name"
                type="text"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="e.g., Acme FinTech"
                className="w-full px-2.5 py-2 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label
                htmlFor="outreach-contact-name"
                className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1"
              >
                Sponsor Contact (Optional)
              </label>
              <input
                id="outreach-contact-name"
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="e.g., Sarah"
                className="w-full px-2.5 py-2 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label
                htmlFor="outreach-creator-name"
                className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1"
              >
                Your Name
              </label>
              <input
                id="outreach-creator-name"
                type="text"
                value={creatorName}
                onChange={(e) => setCreatorName(e.target.value)}
                placeholder="e.g., Alex Rivera"
                className="w-full px-2.5 py-2 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          {/* Template Selector */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
            <div
              role="group"
              aria-label="Outreach email template style"
              className="flex flex-wrap items-center gap-1.5"
            >
              {analysis?.outreachEmail && (
                <button
                  type="button"
                  aria-pressed={emailTemplateId === 'ai_coach_draft'}
                  onClick={() => {
                    setEmailTemplateId('ai_coach_draft');
                    setHasManualEmailEdit(false);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    emailTemplateId === 'ai_coach_draft'
                      ? 'bg-blue-700 dark:bg-blue-600 text-white border-blue-700 dark:border-blue-600'
                      : 'bg-white dark:bg-slate-900 text-blue-800 dark:text-blue-400 border-blue-300 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950/50'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                  AI Coach Custom Draft
                </button>
              )}

              {OUTREACH_TEMPLATE_OPTIONS.map((tpl) => {
                const active =
                  emailTemplateId === tpl.id ||
                  (emailTemplateId === 'ai_coach_draft' &&
                    !analysis?.outreachEmail &&
                    tpl.id === 'counter_offer');
                return (
                  <button
                    key={tpl.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      setEmailTemplateId(tpl.id);
                      setHasManualEmailEdit(false);
                    }}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      active
                        ? 'bg-slate-900 dark:bg-blue-600 text-white border-slate-900 dark:border-blue-600'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    {tpl.label}
                  </button>
                );
              })}
            </div>

            {hasManualEmailEdit && (
              <button
                type="button"
                onClick={handleResetOutreachDraft}
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 cursor-pointer whitespace-nowrap shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                Reset to Template
              </button>
            )}
          </div>

          {/* Deal Notes & Coach Context Strip */}
          <div className="px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-600 dark:text-slate-400 flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <span className="font-semibold text-slate-800 dark:text-slate-200">Deal Notes Input: </span>
              {emailTargetDeal.notes?.trim() ? (
                <span className="text-slate-700 dark:text-slate-300">{emailTargetDeal.notes.trim()}</span>
              ) : (
                <span className="italic text-slate-500 dark:text-slate-400">
                  No notes saved on &ldquo;{emailTargetDeal.name}&rdquo; yet — add negotiation notes in the matrix below to weave specific brand feedback into this email.
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 shrink-0">
              Posture:{' '}
              <strong className="text-slate-700 dark:text-slate-300">
                {FOCUS_OPTIONS.find((f) => f.id === focus)?.label}
              </strong>
              {analysis ? ' · Enriched with AI Coach' : ''}
            </div>
          </div>

          {/* Editable Email Subject & Body */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <label htmlFor="outreach-subject" className="sr-only">
                Email Subject
              </label>
              <div className="flex-1 flex items-center bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-600/15">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mr-2 shrink-0">
                  Subject:
                </span>
                <input
                  id="outreach-subject"
                  type="text"
                  value={editedSubject}
                  onChange={(e) => {
                    setEditedSubject(e.target.value);
                    setHasManualEmailEdit(true);
                  }}
                  className="w-full text-xs sm:text-sm font-medium text-slate-900 dark:text-slate-100 bg-transparent focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => handleCopyOutreachEmail('subject')}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                {copiedEmailType === 'subject' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                    Copy Subject
                  </>
                )}
              </button>
            </div>

            <label htmlFor="outreach-body" className="sr-only">
              Sponsor Outreach Email Body
            </label>
            <textarea
              id="outreach-body"
              rows={13}
              value={editedBody}
              onChange={(e) => {
                setEditedBody(e.target.value);
                setHasManualEmailEdit(true);
              }}
              className="w-full p-3.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs sm:text-[13px] text-slate-800 dark:text-slate-200 leading-relaxed focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 resize-y"
            />
          </div>

          {/* Copy Footer */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              {hasManualEmailEdit
                ? 'Custom edits active — click Reset to Template to re-sync with deal changes.'
                : analysis
                ? 'Populated with AI Negotiating Coach discrepancies, anchor targets, and deal notes.'
                : deals.length >= 2
                ? 'Populated with Coach posture logic and deal notes. Run Generate Talking Points above for AI-synthesized custom copy.'
                : 'Populated with Coach posture logic, rate breakdown, and deal notes.'}
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleCopyOutreachEmail('body')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                {copiedEmailType === 'body' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
                    Copied Body
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                    Copy Body Only
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => handleCopyOutreachEmail('full')}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-blue-600 rounded-lg hover:bg-slate-800 dark:hover:bg-blue-500 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                {copiedEmailType === 'full' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                    Copied Outreach Email
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                    Copy Full Email
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
