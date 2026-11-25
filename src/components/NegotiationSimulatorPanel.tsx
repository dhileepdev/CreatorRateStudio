import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Check,
  Columns3,
  Copy,
  Handshake,
  Scale,
  Shield,
  SlidersHorizontal,
} from 'lucide-react';
import {
  ClauseLibraryVariant,
  ClauseVariantPosture,
  getClauseLibraryVariants,
} from '../data/clauseLibraryAlternatives';
import { ClauseRiskWeight, ContractClause } from '../types/calculator';
import { resolveClauseRiskWeight } from '../utils/pricingEngine';
import { BrandAgencyProfile } from './BrandAgencyProfileCard';

export type NegotiationStance = 'aggressive' | 'standard' | 'collaborative';

export const STANCE_TO_POSTURE: Record<NegotiationStance, ClauseVariantPosture> = {
  aggressive: 'creator_friendly',
  standard: 'standard',
  collaborative: 'balanced_compromise',
};

interface StanceSpec {
  id: NegotiationStance;
  label: string;
  tagline: string;
  protectionLevel: string;
  dealVelocity: string;
  activeButtonClass: string;
  accentTextClass: string;
  surfaceTintClass: string;
}

const STANCE_SPECS: Record<NegotiationStance, StanceSpec> = {
  aggressive: {
    id: 'aggressive',
    label: 'Aggressive',
    tagline: 'Hard boundaries, upfront deposits, strict IP retention & walk-away leverage.',
    protectionLevel: 'Maximum Protection',
    dealVelocity: 'Slower Legal Review',
    activeButtonClass:
      'bg-red-700 dark:bg-red-600 text-white border-red-700 dark:border-red-600',
    accentTextClass: 'text-red-700 dark:text-red-400',
    surfaceTintClass:
      'bg-red-50/60 dark:bg-red-950/35 border-red-200 dark:border-red-900/70',
  },
  standard: {
    id: 'standard',
    label: 'Standard',
    tagline: 'Industry-benchmark creator terms balancing firm protections and clean sign-off.',
    protectionLevel: 'Benchmark Protection',
    dealVelocity: 'Predictable Sign-Off',
    activeButtonClass:
      'bg-blue-700 dark:bg-blue-600 text-white border-blue-700 dark:border-blue-600',
    accentTextClass: 'text-blue-700 dark:text-blue-400',
    surfaceTintClass:
      'bg-blue-50/60 dark:bg-blue-950/35 border-blue-200 dark:border-blue-900/70',
  },
  collaborative: {
    id: 'collaborative',
    label: 'Collaborative',
    tagline: 'Flexible enterprise compromises built to clear procurement fast without losing core rights.',
    protectionLevel: 'Targeted Guardrails',
    dealVelocity: 'Fastest Close',
    activeButtonClass:
      'bg-emerald-700 dark:bg-emerald-600 text-white border-emerald-700 dark:border-emerald-600',
    accentTextClass: 'text-emerald-700 dark:text-emerald-400',
    surfaceTintClass:
      'bg-emerald-50/60 dark:bg-emerald-950/35 border-emerald-200 dark:border-emerald-900/70',
  },
};

const STANCE_ORDER: NegotiationStance[] = ['aggressive', 'standard', 'collaborative'];

export function resolveSimulatedVariant(
  clauseId: number,
  stance: NegotiationStance
): ClauseLibraryVariant {
  const variants = getClauseLibraryVariants(clauseId);
  const targetPosture = STANCE_TO_POSTURE[stance];
  return variants.find((v) => v.posture === targetPosture) ?? variants[0];
}

function buildSimulatedGuidance(
  clause: ContractClause,
  stance: NegotiationStance,
  counterparty: BrandAgencyProfile
): {
  variant: ClauseLibraryVariant;
  openingPitch: string;
  pushbackPrep: string;
} {
  const variant = resolveSimulatedVariant(clause.clauseId, stance);
  const brand = counterparty.brandName.trim() || 'your team';
  const contact = counterparty.primaryContactName.trim();
  const rep = counterparty.representedBy.trim();
  const greeting = contact ? `Hi ${contact},` : rep ? `Hi ${rep} team,` : `Hi ${brand} team,`;

  let openingPitch = '';
  let pushbackPrep = '';

  if (stance === 'aggressive') {
    openingPitch = `${greeting} On "${clause.clauseTitle}", our studio requires the revised wording below as a condition of execution—we cannot sign agreements that leave this exposure open. Please drop this replacement clause directly into the final PDF so we can lock production dates.`;
    pushbackPrep =
      clause.category === 'Payment'
        ? 'Likely pushback: "Procurement cannot process upfront deposits or Net-14." Counter: Hold firm on the 50% deposit or add a 15% financing surcharge for Net-30.'
        : clause.category === 'Rights & IP'
          ? 'Likely pushback: "Legal requires full ownership for paid media." Counter: Offer a 350% perpetual buyout quote to anchor why fixed-term licensing saves budget.'
          : clause.category === 'Exclusivity'
            ? 'Likely pushback: "We need full category protection." Counter: Price blanket category lockouts at +200% of Base Fee or cap at 3 named competitors.'
            : 'Likely pushback: "Our legal template is non-negotiable." Counter: Clarify that uncapped personal liability and missing kill fees are strict insurance blockers.';
  } else if (stance === 'standard') {
    openingPitch = `${greeting} To keep "${clause.clauseTitle}" aligned with standard creator industry benchmarks, I've drafted clean replacement language below that protects both ${brand} and my studio. Happy to walk through this briefly if helpful.`;
    pushbackPrep =
      clause.category === 'Payment'
        ? 'Likely pushback: "AP runs on Net-30 cycles." Counter: Accept Net-30 only if tied strictly to submission date with a 5-business-day auto-approval clause.'
        : clause.category === 'Rights & IP'
          ? 'Likely pushback: "We may want to run ads longer if creative converts." Counter: Keep the 90-day base term and pre-lock an optional 50% renewal rate.'
          : clause.category === 'Exclusivity'
            ? 'Likely pushback: "Can we widen the competitor list?" Counter: Allow up to 3–5 explicitly named direct competitors in a written schedule.'
            : 'Likely pushback: "Legal prefers our standard phrasing." Counter: Keep their formatting while inserting mutual indemnity and a 1× fee cap.';
  } else {
    openingPitch = `${greeting} I want to make legal sign-off on "${clause.clauseTitle}" as smooth as possible for ${brand}${rep ? ` and ${rep}` : ''}. Here is a balanced compromise wording designed to satisfy enterprise compliance while keeping essential creator guardrails intact.`;
    pushbackPrep =
      clause.category === 'Payment'
        ? 'Trade-off: Accepts Net-30 timing to match enterprise AP, while still locking auto-approval and removing pay-when-paid risk.'
        : clause.category === 'Rights & IP'
          ? 'Trade-off: Extends licensing flexibility or renewal convenience while firmly blocking permanent copyright transfer or AI likeness training.'
          : clause.category === 'Exclusivity'
            ? 'Trade-off: Accommodates brand campaign windows cleanly while ensuring restrictions expire automatically without post-term overhang.'
            : 'Trade-off: Offers tiered kill-fee flexibility or 2× cap compromise while eliminating unlimited liability and one-sided fee clawbacks.';
  }

  return { variant, openingPitch, pushbackPrep };
}

interface NegotiationSimulatorPanelProps {
  stance: NegotiationStance;
  onChangeStance: (stance: NegotiationStance) => void;
  allClauses: ContractClause[];
  flaggedClauseIds: number[];
  clauseRiskWeights: Partial<Record<number, ClauseRiskWeight>>;
  selectedClauseVariants: Partial<Record<number, string>>;
  counterparty: BrandAgencyProfile;
  onApplyStanceToCriticalClauses: (
    stance: NegotiationStance,
    clauseIds: number[]
  ) => void;
  onApplySingleClauseVariant: (
    clauseId: number,
    variantId: string,
    variantLabel: string
  ) => void;
  onLogNegotiationNote: (clauseId: number, note: string) => void;
  onInspectClauseInScanner: (clauseId: number) => void;
  onCopyText: (text: string, label: string) => void;
}

export const NegotiationSimulatorPanel: React.FC<NegotiationSimulatorPanelProps> = ({
  stance,
  onChangeStance,
  allClauses,
  flaggedClauseIds,
  clauseRiskWeights,
  selectedClauseVariants,
  counterparty,
  onApplyStanceToCriticalClauses,
  onApplySingleClauseVariant,
  onLogNegotiationNote,
  onInspectClauseInScanner,
  onCopyText,
}) => {
  const [scopeMode, setScopeMode] = useState<'flagged' | 'all'>('all');
  const [compareAllStances, setCompareAllStances] = useState(false);

  // Critical clauses = clauses rated 'critical' by effective weight (either default critical or escalated to critical)
  const allCriticalClauses = useMemo(() => {
    return allClauses.filter(
      (clause) =>
        resolveClauseRiskWeight(clause, clauseRiskWeights) === 'critical'
    );
  }, [allClauses, clauseRiskWeights]);

  const flaggedCriticalClauses = useMemo(() => {
    return allCriticalClauses.filter((clause) =>
      flaggedClauseIds.includes(clause.clauseId)
    );
  }, [allCriticalClauses, flaggedClauseIds]);

  const effectiveScopeMode: 'flagged' | 'all' =
    flaggedCriticalClauses.length > 0 ? scopeMode : 'all';

  const visibleCriticalClauses =
    effectiveScopeMode === 'flagged'
      ? flaggedCriticalClauses
      : allCriticalClauses;

  const [selectedClauseId, setSelectedClauseId] = useState<number>(
    visibleCriticalClauses[0]?.clauseId ?? 1
  );

  useEffect(() => {
    if (
      visibleCriticalClauses.length > 0 &&
      !visibleCriticalClauses.some((c) => c.clauseId === selectedClauseId)
    ) {
      setSelectedClauseId(visibleCriticalClauses[0].clauseId);
    }
  }, [visibleCriticalClauses, selectedClauseId]);

  const selectedClause =
    visibleCriticalClauses.find((c) => c.clauseId === selectedClauseId) ??
    visibleCriticalClauses[0];

  const activeStanceSpec = STANCE_SPECS[stance];

  const syncedCount = useMemo(() => {
    return visibleCriticalClauses.filter((clause) => {
      const target = resolveSimulatedVariant(clause.clauseId, stance);
      const currentId = selectedClauseVariants[clause.clauseId] ?? 'standard';
      return currentId === target.id;
    }).length;
  }, [visibleCriticalClauses, stance, selectedClauseVariants]);

  const allVisibleSynced =
    visibleCriticalClauses.length > 0 &&
    syncedCount === visibleCriticalClauses.length;

  const selectedGuidance = useMemo(() => {
    if (!selectedClause) return null;
    return buildSimulatedGuidance(selectedClause, stance, counterparty);
  }, [selectedClause, stance, counterparty]);

  const allThreeComparisons = useMemo(() => {
    if (!selectedClause) return [];
    return STANCE_ORDER.map((s) => ({
      stance: s,
      spec: STANCE_SPECS[s],
      guidance: buildSimulatedGuidance(selectedClause, s, counterparty),
    }));
  }, [selectedClause, counterparty]);

  const handleCopyCriticalPack = () => {
    if (visibleCriticalClauses.length === 0) return;
    const headerLines = [
      `NEGOTIATION SIMULATOR REDLINE PACK — ${activeStanceSpec.label.toUpperCase()} STANCE`,
      counterparty.brandName.trim()
        ? `Brand: ${counterparty.brandName.trim()}${
            counterparty.representedBy.trim()
              ? ` (Represented by ${counterparty.representedBy.trim()})`
              : ''
          }`
        : null,
      counterparty.primaryContactName.trim()
        ? `Primary Contact: ${counterparty.primaryContactName.trim()}`
        : null,
      `Scope: ${visibleCriticalClauses.length} Critical Clause(s)`,
    ].filter((line): line is string => line !== null);

    const clauseBlocks = visibleCriticalClauses.map((clause) => {
      const { variant, openingPitch } = buildSimulatedGuidance(
        clause,
        stance,
        counterparty
      );
      return [
        `### Clause #${clause.clauseId}: ${clause.clauseTitle} (${variant.label})`,
        `Framing: ${openingPitch}`,
        `Suggested Edit:\n"${variant.clauseText}"`,
      ].join('\n');
    });

    onCopyText(
      `${headerLines.join('\n')}\n\n---\n\n${clauseBlocks.join('\n\n---\n\n')}`,
      `${visibleCriticalClauses.length} ${activeStanceSpec.label} critical redline(s)`
    );
  };

  if (!selectedClause || !selectedGuidance) {
    return null;
  }

  const currentSelectedVariantId =
    selectedClauseVariants[selectedClause.clauseId] ?? 'standard';
  const isSelectedClauseSynced =
    currentSelectedVariantId === selectedGuidance.variant.id;

  return (
    <div
      id="negotiation-simulator"
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 scroll-mt-24"
    >
      {/* Header Row */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <SlidersHorizontal
              className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0"
              aria-hidden="true"
            />
            <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              Negotiation Simulator
            </h3>
            <span
              className="text-slate-300 dark:text-slate-600"
              aria-hidden="true"
            >
              ·
            </span>
            <span
              className={`text-xs font-semibold ${activeStanceSpec.accentTextClass}`}
            >
              {activeStanceSpec.label} Stance
            </span>
            <span
              className="text-slate-300 dark:text-slate-600"
              aria-hidden="true"
            >
              ·
            </span>
            <span className="text-xs font-mono tabular-nums text-slate-600 dark:text-slate-400">
              {visibleCriticalClauses.length} critical clause
              {visibleCriticalClauses.length === 1 ? '' : 's'}
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            Toggle between Aggressive, Standard, and Collaborative negotiation stances to dynamically recalibrate suggested edits, pitch framing, and pushback prep across critical clauses.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setCompareAllStances((prev) => !prev)}
            aria-pressed={compareAllStances}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              compareAllStances
                ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100'
                : 'bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <Columns3 className="w-3.5 h-3.5" aria-hidden="true" />
            {compareAllStances ? 'Single Stance View' : 'Compare All 3'}
          </button>

          <button
            type="button"
            onClick={handleCopyCriticalPack}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Copy className="w-3.5 h-3.5" aria-hidden="true" />
            Copy {activeStanceSpec.label} Pack
          </button>

          <button
            type="button"
            disabled={allVisibleSynced}
            onClick={() =>
              onApplyStanceToCriticalClauses(
                stance,
                visibleCriticalClauses.map((c) => c.clauseId)
              )
            }
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
              allVisibleSynced
                ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 cursor-default'
                : `${activeStanceSpec.activeButtonClass} hover:opacity-90 cursor-pointer`
            }`}
          >
            <Check className="w-3.5 h-3.5" aria-hidden="true" />
            {allVisibleSynced
              ? `${activeStanceSpec.label} Active in Draft`
              : `Apply ${activeStanceSpec.label} to ${visibleCriticalClauses.length} Critical`}
          </button>
        </div>
      </div>

      {/* 3-Way Stance Toggle Selector */}
      <div
        role="group"
        aria-label="Select negotiation stance"
        className="grid grid-cols-1 md:grid-cols-3 gap-2.5"
      >
        {STANCE_ORDER.map((stanceId) => {
          const spec = STANCE_SPECS[stanceId];
          const isActive = stance === stanceId;
          const Icon =
            stanceId === 'aggressive'
              ? Shield
              : stanceId === 'standard'
                ? Scale
                : Handshake;

          return (
            <button
              key={stanceId}
              type="button"
              aria-pressed={isActive}
              onClick={() => onChangeStance(stanceId)}
              className={`text-left p-3.5 rounded-lg border transition-colors cursor-pointer space-y-1.5 ${
                isActive
                  ? spec.surfaceTintClass
                  : 'bg-slate-50/70 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 hover:bg-slate-100/70 dark:hover:bg-slate-800/50'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-slate-100">
                  <Icon
                    className={`w-3.5 h-3.5 shrink-0 ${
                      isActive
                        ? spec.accentTextClass
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                    aria-hidden="true"
                  />
                  {spec.label}
                </span>
                <span
                  className={`text-[11px] font-semibold whitespace-nowrap shrink-0 ${
                    isActive
                      ? spec.accentTextClass
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {isActive ? 'Active' : 'Select'}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                {spec.tagline}
              </p>
              <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono tabular-nums text-slate-500 dark:text-slate-400 pt-0.5">
                <span>{spec.protectionLevel}</span>
                <span aria-hidden="true">·</span>
                <span>{spec.dealVelocity}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Scope Bar + Master-Detail Critical Clause Workspace */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
        <div className="px-4 py-2.5 bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              Critical Clauses Scope
            </span>
            {flaggedCriticalClauses.length > 0 ? (
              <div
                role="group"
                aria-label="Filter simulator critical clauses"
                className="inline-flex items-center p-0.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-md"
              >
                <button
                  type="button"
                  aria-pressed={effectiveScopeMode === 'flagged'}
                  onClick={() => setScopeMode('flagged')}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    effectiveScopeMode === 'flagged'
                      ? 'bg-slate-900 dark:bg-blue-600 text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  Flagged Critical ({flaggedCriticalClauses.length})
                </button>
                <button
                  type="button"
                  aria-pressed={effectiveScopeMode === 'all'}
                  onClick={() => setScopeMode('all')}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    effectiveScopeMode === 'all'
                      ? 'bg-slate-900 dark:bg-blue-600 text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  All Critical ({allCriticalClauses.length})
                </button>
              </div>
            ) : (
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Showing all {allCriticalClauses.length} critical clauses (flag clauses in the scanner below to narrow scope)
              </span>
            )}
          </div>

          <span className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
            {syncedCount}/{visibleCriticalClauses.length} synced to{' '}
            {activeStanceSpec.label}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-slate-800">
          {/* Left 4 cols: Critical Clause Selector List */}
          <div className="lg:col-span-4 divide-y divide-slate-100 dark:divide-slate-800 max-h-[420px] overflow-y-auto bg-white dark:bg-slate-900">
            {visibleCriticalClauses.map((clause) => {
              const isSelected = clause.clauseId === selectedClause.clauseId;
              const isFlagged = flaggedClauseIds.includes(clause.clauseId);
              const targetVariant = resolveSimulatedVariant(clause.clauseId, stance);
              const appliedVariantId =
                selectedClauseVariants[clause.clauseId] ?? 'standard';
              const isSynced = appliedVariantId === targetVariant.id;

              return (
                <button
                  key={`sim-clause-${clause.clauseId}`}
                  type="button"
                  onClick={() => setSelectedClauseId(clause.clauseId)}
                  className={`w-full text-left px-3.5 py-3 transition-colors cursor-pointer space-y-1 ${
                    isSelected
                      ? 'bg-blue-50/70 dark:bg-blue-950/40'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                      #{clause.clauseId} {clause.clauseTitle}
                    </span>
                    {isSynced && (
                      <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 whitespace-nowrap shrink-0">
                        Applied
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    <span>{clause.category}</span>
                    {isFlagged && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="text-red-700 dark:text-red-400 font-medium">
                          Flagged
                        </span>
                      </>
                    )}
                    <span aria-hidden="true">·</span>
                    <span className="truncate">{targetVariant.label}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right 8 cols: Dynamic Stance Output */}
          <div className="lg:col-span-8 p-4 sm:p-5 bg-white dark:bg-slate-900 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="min-w-0">
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Critical Clause #{selectedClause.clauseId} ·{' '}
                  {selectedClause.category}
                  {flaggedClauseIds.includes(selectedClause.clauseId)
                    ? ' · Flagged in Audit'
                    : ''}
                </div>
                <h4 className="font-display text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                  {selectedClause.clauseTitle}
                </h4>
              </div>

              <button
                type="button"
                onClick={() => onInspectClauseInScanner(selectedClause.clauseId)}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                Inspect in Scanner
                <ArrowRight className="w-3 h-3" aria-hidden="true" />
              </button>
            </div>

            {compareAllStances ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {allThreeComparisons.map(({ stance: s, spec, guidance }) => {
                  const isCurrentApplied =
                    currentSelectedVariantId === guidance.variant.id;
                  return (
                    <div
                      key={`compare-${selectedClause.clauseId}-${s}`}
                      className={`p-3 rounded-lg border flex flex-col justify-between gap-3 ${
                        s === stance
                          ? spec.surfaceTintClass
                          : 'bg-slate-50/70 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`text-xs font-bold ${spec.accentTextClass}`}
                          >
                            {spec.label}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                            {spec.dealVelocity}
                          </span>
                        </div>
                        <div className="text-[11px] font-semibold text-slate-800 dark:text-slate-200">
                          {guidance.variant.label}
                        </div>
                        <p className="text-[11px] font-mono text-slate-700 dark:text-slate-300 leading-relaxed bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-2.5">
                          {guidance.variant.clauseText}
                        </p>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/70 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={() =>
                            onCopyText(
                              guidance.variant.clauseText,
                              `Clause #${selectedClause.clauseId} (${spec.label})`
                            )
                          }
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer whitespace-nowrap shrink-0"
                        >
                          <Copy className="w-3 h-3" aria-hidden="true" />
                          Copy
                        </button>
                        <button
                          type="button"
                          disabled={isCurrentApplied}
                          onClick={() => {
                            onChangeStance(s);
                            onApplySingleClauseVariant(
                              selectedClause.clauseId,
                              guidance.variant.id,
                              `${spec.label}: ${guidance.variant.label}`
                            );
                          }}
                          className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                            isCurrentApplied
                              ? 'text-emerald-700 dark:text-emerald-400 cursor-default'
                              : 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white cursor-pointer'
                          }`}
                        >
                          {isCurrentApplied ? 'Active in Draft' : 'Use This'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Simulated Replacement Clause */}
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        Suggested Edit ({activeStanceSpec.label})
                      </span>
                      <span
                        className="text-slate-300 dark:text-slate-600"
                        aria-hidden="true"
                      >
                        ·
                      </span>
                      <span
                        className={`font-medium ${activeStanceSpec.accentTextClass}`}
                      >
                        {selectedGuidance.variant.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() =>
                          onCopyText(
                            selectedGuidance.variant.clauseText,
                            `Clause #${selectedClause.clauseId} (${activeStanceSpec.label}) edit`
                          )
                        }
                        className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 dark:text-blue-400 hover:underline cursor-pointer whitespace-nowrap shrink-0"
                      >
                        <Copy className="w-3 h-3" aria-hidden="true" />
                        Copy Edit
                      </button>

                      <button
                        type="button"
                        disabled={isSelectedClauseSynced}
                        onClick={() =>
                          onApplySingleClauseVariant(
                            selectedClause.clauseId,
                            selectedGuidance.variant.id,
                            `${activeStanceSpec.label}: ${selectedGuidance.variant.label}`
                          )
                        }
                        className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md border transition-colors whitespace-nowrap shrink-0 ${
                          isSelectedClauseSynced
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 cursor-default'
                            : 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100 hover:bg-slate-800 dark:hover:bg-white cursor-pointer'
                        }`}
                      >
                        <Check className="w-3 h-3" aria-hidden="true" />
                        {isSelectedClauseSynced
                          ? 'Active in Draft'
                          : 'Apply to Clause'}
                      </button>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono text-slate-800 dark:text-slate-200 leading-relaxed">
                    {selectedGuidance.variant.clauseText}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Best fit: {selectedGuidance.variant.bestFor}
                  </p>
                </div>

                {/* Opening Pitch + Pushback Prep */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        Negotiation Framing Pitch
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            onCopyText(
                              `${selectedGuidance.openingPitch}\n\n"${selectedGuidance.variant.clauseText}"`,
                              `Clause #${selectedClause.clauseId} ${activeStanceSpec.label} pitch`
                            )
                          }
                          className="text-[11px] font-medium text-blue-700 dark:text-blue-400 hover:underline cursor-pointer whitespace-nowrap shrink-0"
                        >
                          Copy Pitch
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            onLogNegotiationNote(
                              selectedClause.clauseId,
                              `[${activeStanceSpec.label} Stance] ${selectedGuidance.openingPitch}`
                            )
                          }
                          className="text-[11px] font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:underline cursor-pointer whitespace-nowrap shrink-0"
                        >
                          Log Note
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      {selectedGuidance.openingPitch}
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <span className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Expected Counterparty Pushback &amp; Trade-Off
                    </span>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      {selectedGuidance.pushbackPrep}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
