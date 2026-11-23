import React, { useMemo, useState } from 'react';
import { Flame } from 'lucide-react';
import { CONTRACT_RED_FLAGS } from '../data/benchmarks';
import { CalculatedDealResult, DealScope } from '../types/calculator';
import { useCurrency } from '../context/CurrencyContext';
import { formatCurrency } from '../utils/pricingEngine';

type HeatTier = 'extreme' | 'high' | 'elevated' | 'moderate';
type HeatmapSortMode = 'impact' | 'clause_order';

interface ClauseFinancialExposure {
  clauseId: number;
  clauseTitle: string;
  category: string;
  tier: HeatTier;
  tierLabel: string;
  estimatedExposureUsd: number;
  displayImpactOverride?: string;
  impactBasis: string;
  sortScore: number;
}

const HEAT_TIER_STYLES: Record<
  HeatTier,
  {
    label: string;
    swatchClass: string;
    tileClass: string;
    tierTextClass: string;
    valueTextClass: string;
  }
> = {
  extreme: {
    label: 'Extreme',
    swatchClass: 'bg-red-600 dark:bg-red-500',
    tileClass:
      'bg-red-50/90 dark:bg-red-950/60 border-red-300/90 dark:border-red-800/80 hover:border-red-500 dark:hover:border-red-500',
    tierTextClass: 'text-red-800 dark:text-red-300',
    valueTextClass: 'text-red-950 dark:text-red-100',
  },
  high: {
    label: 'High',
    swatchClass: 'bg-orange-500 dark:bg-orange-400',
    tileClass:
      'bg-orange-50/90 dark:bg-orange-950/50 border-orange-300/85 dark:border-orange-800/75 hover:border-orange-500 dark:hover:border-orange-500',
    tierTextClass: 'text-orange-800 dark:text-orange-300',
    valueTextClass: 'text-orange-950 dark:text-orange-100',
  },
  elevated: {
    label: 'Elevated',
    swatchClass: 'bg-amber-400 dark:bg-amber-400',
    tileClass:
      'bg-amber-50/85 dark:bg-amber-950/40 border-amber-300/80 dark:border-amber-800/65 hover:border-amber-500 dark:hover:border-amber-500',
    tierTextClass: 'text-amber-800 dark:text-amber-300',
    valueTextClass: 'text-amber-950 dark:text-amber-100',
  },
  moderate: {
    label: 'Moderate',
    swatchClass: 'bg-yellow-300 dark:bg-yellow-500/70',
    tileClass:
      'bg-yellow-50/75 dark:bg-yellow-950/25 border-yellow-300/70 dark:border-yellow-800/50 hover:border-yellow-500 dark:hover:border-yellow-500',
    tierTextClass: 'text-yellow-800 dark:text-yellow-300',
    valueTextClass: 'text-slate-900 dark:text-yellow-100',
  },
};

function computeClauseFinancialExposure(
  clauseId: number,
  baseFee: number,
  totalRate: number,
  excessRevFee: number
): Omit<ClauseFinancialExposure, 'clauseId' | 'clauseTitle' | 'category'> {
  const safeBase = Math.max(100, baseFee);
  const safeTotal = Math.max(safeBase, totalRate);
  const safeRevFee = Math.max(150, excessRevFee || 200);

  switch (clauseId) {
    case 14:
      return {
        tier: 'extreme',
        tierLabel: 'Extreme',
        estimatedExposureUsd: Math.max(50000, safeTotal * 10),
        displayImpactOverride: 'Uncapped',
        impactBasis: 'Unlimited third-party legal defense & damages',
        sortScore: 1000000 + safeTotal * 10,
      };
    case 15:
      return {
        tier: 'extreme',
        tierLabel: 'Extreme',
        estimatedExposureUsd: 53088,
        impactBasis: 'Up to $53,088 FTC civil penalty / post',
        sortScore: 530880,
      };
    case 5:
      return {
        tier: 'extreme',
        tierLabel: 'Extreme',
        estimatedExposureUsd: safeBase * 3.5,
        impactBasis: '350% perpetual buyout fee forfeited',
        sortScore: 300000 + safeBase * 3.5,
      };
    case 4:
      return {
        tier: 'extreme',
        tierLabel: 'Extreme',
        estimatedExposureUsd: safeBase * 3.0,
        impactBasis: 'Permanent copyright & future renewal loss',
        sortScore: 280000 + safeBase * 3.0,
      };
    case 8:
      return {
        tier: 'high',
        tierLabel: 'High',
        estimatedExposureUsd: safeBase * 2.0,
        impactBasis: '200% blanket category lockout opportunity cost',
        sortScore: 180000 + safeBase * 2.0,
      };
    case 2:
      return {
        tier: 'high',
        tierLabel: 'High',
        estimatedExposureUsd: safeTotal,
        impactBasis: '100% deal fee exposed to algorithm variance',
        sortScore: 140000 + safeTotal,
      };
    case 3:
      return {
        tier: 'high',
        tierLabel: 'High',
        estimatedExposureUsd: safeTotal,
        impactBasis: '100% payout tied to third-party client credit',
        sortScore: 135000 + safeTotal,
      };
    case 12:
      return {
        tier: 'high',
        tierLabel: 'High',
        estimatedExposureUsd: safeTotal,
        impactBasis: '50%–100% unrecovered production & hold loss',
        sortScore: 130000 + safeTotal,
      };
    case 9:
      return {
        tier: 'high',
        tierLabel: 'High',
        estimatedExposureUsd: safeBase * 1.0,
        impactBasis: 'Unpaid post-campaign competitor restriction',
        sortScore: 120000 + safeBase,
      };
    case 13:
      return {
        tier: 'elevated',
        tierLabel: 'Elevated',
        estimatedExposureUsd: safeBase * 0.85,
        impactBasis: 'Subjective earned-fee clawback exposure',
        sortScore: 80000 + safeBase * 0.85,
      };
    case 6:
      return {
        tier: 'elevated',
        tierLabel: 'Elevated',
        estimatedExposureUsd: safeBase * 0.6,
        impactBasis: 'Unpaid handle ad-spend leverage (3× 20%)',
        sortScore: 70000 + safeBase * 0.6,
      };
    case 10: {
      const revExposure = Math.max(safeRevFee * 3, safeBase * 0.45);
      return {
        tier: 'elevated',
        tierLabel: 'Elevated',
        estimatedExposureUsd: revExposure,
        impactBasis: '3+ unpaid reshoot & revision rounds',
        sortScore: 60000 + revExposure,
      };
    }
    case 1:
      return {
        tier: 'elevated',
        tierLabel: 'Elevated',
        estimatedExposureUsd: safeTotal * 0.25,
        impactBasis: '90–120d delayed cash-flow & collection drag',
        sortScore: 50000 + safeTotal * 0.25,
      };
    case 7:
      return {
        tier: 'moderate',
        tierLabel: 'Moderate',
        estimatedExposureUsd: safeBase * 0.25,
        impactBasis: 'Eroded paid usage term & renewal ambiguity',
        sortScore: 25000 + safeBase * 0.25,
      };
    case 11:
    default:
      return {
        tier: 'moderate',
        tierLabel: 'Moderate',
        estimatedExposureUsd: safeBase * 0.2,
        impactBasis: 'Permanent organic feed real-estate lock',
        sortScore: 20000 + safeBase * 0.2,
      };
  }
}

interface ContractRiskHeatmapProps {
  result: CalculatedDealResult;
  scope: DealScope;
  flaggedClauseIds: number[];
  activeClauseId: number;
  onSelectClause: (clauseId: number) => void;
}

export const ContractRiskHeatmap: React.FC<ContractRiskHeatmapProps> = ({
  result,
  scope,
  flaggedClauseIds,
  activeClauseId,
  onSelectClause,
}) => {
  const { currency } = useCurrency();
  const [sortMode, setSortMode] = useState<HeatmapSortMode>('impact');
  const [dimUnflagged, setDimUnflagged] = useState(false);

  const b = result.breakdown;

  const exposures = useMemo<ClauseFinancialExposure[]>(() => {
    const items = CONTRACT_RED_FLAGS.map((clause) => {
      const calc = computeClauseFinancialExposure(
        clause.clauseId,
        b.baseCreationFee,
        b.totalRecommendedRate,
        scope.excessRevisionFeePerRound
      );
      return {
        clauseId: clause.clauseId,
        clauseTitle: clause.clauseTitle,
        category: clause.category,
        ...calc,
      };
    });

    if (sortMode === 'impact') {
      return [...items].sort((a, bItem) => bItem.sortScore - a.sortScore);
    }
    return items;
  }, [
    b.baseCreationFee,
    b.totalRecommendedRate,
    scope.excessRevisionFeePerRound,
    sortMode,
  ]);

  const flaggedExposureSummary = useMemo(() => {
    const activeItems = exposures.filter((item) =>
      flaggedClauseIds.includes(item.clauseId)
    );
    const hasUncapped = activeItems.some((item) => item.clauseId === 14);
    const quantifiableUsd = activeItems
      .filter((item) => item.clauseId !== 14)
      .reduce((sum, item) => sum + item.estimatedExposureUsd, 0);
    return {
      count: activeItems.length,
      quantifiableUsd,
      hasUncapped,
    };
  }, [exposures, flaggedClauseIds]);

  return (
    <div
      id="contract-risk-heatmap"
      aria-label="Contract financial risk heatmap"
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 space-y-4 transition-colors"
    >
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2">
            <Flame
              className="w-4 h-4 text-orange-600 dark:text-orange-400 shrink-0"
              aria-hidden="true"
            />
            <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              Financial Impact Risk Heatmap
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            All 15 clauses heat-mapped by estimated unnegotiated financial exposure against your{' '}
            <span className="font-mono tabular-nums text-slate-700 dark:text-slate-200">
              {formatCurrency(b.totalRecommendedRate, currency)}
            </span>{' '}
            deal rate. Click any tile to jump directly to its redline.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Sort Toggle */}
          <div
            role="group"
            aria-label="Risk heatmap sort order"
            className="inline-flex p-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
          >
            <button
              type="button"
              aria-pressed={sortMode === 'impact'}
              onClick={() => setSortMode('impact')}
              className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                sortMode === 'impact'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Highest Impact
            </button>
            <button
              type="button"
              aria-pressed={sortMode === 'clause_order'}
              onClick={() => setSortMode('clause_order')}
              className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                sortMode === 'clause_order'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Clause #1–15
            </button>
          </div>

          {flaggedClauseIds.length > 0 && (
            <button
              type="button"
              aria-pressed={dimUnflagged}
              onClick={() => setDimUnflagged((prev) => !prev)}
              className={`px-2.5 py-1.5 text-[11px] font-medium rounded-md border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                dimUnflagged
                  ? 'border-blue-600 dark:border-blue-500 bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {dimUnflagged ? 'Highlighting Flagged' : 'Highlight Flagged'}
            </button>
          )}
        </div>
      </div>

      {/* Heat Scale Legend + Flagged Exposure Total */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
        <div className="flex flex-wrap items-center gap-3 text-slate-600 dark:text-slate-400">
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            Exposure Scale:
          </span>
          {(['extreme', 'high', 'elevated', 'moderate'] as const).map((tier) => (
            <span key={tier} className="inline-flex items-center gap-1.5">
              <span
                className={`w-2.5 h-2.5 rounded-xs shrink-0 ${HEAT_TIER_STYLES[tier].swatchClass}`}
                aria-hidden="true"
              />
              <span>{HEAT_TIER_STYLES[tier].label}</span>
            </span>
          ))}
        </div>

        <div className="font-mono tabular-nums text-slate-600 dark:text-slate-300">
          {flaggedExposureSummary.count > 0 ? (
            <>
              Flagged Exposure:{' '}
              <strong className="text-red-700 dark:text-red-400 font-semibold">
                {formatCurrency(flaggedExposureSummary.quantifiableUsd, currency)}
                {flaggedExposureSummary.hasUncapped ? ' + Uncapped Liability' : ''}
              </strong>
            </>
          ) : (
            <span className="text-slate-400 dark:text-slate-500">
              Flag clauses in the scanner to sum active dollar exposure
            </span>
          )}
        </div>
      </div>

      {/* 15-Clause Heatmap Matrix */}
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {exposures.map((item) => {
          const style = HEAT_TIER_STYLES[item.tier];
          const isFlagged = flaggedClauseIds.includes(item.clauseId);
          const isActive = activeClauseId === item.clauseId;
          const isDimmed = dimUnflagged && !isFlagged;

          return (
            <button
              key={`heat-${item.clauseId}`}
              type="button"
              onClick={() => onSelectClause(item.clauseId)}
              aria-label={`Clause ${item.clauseId} ${item.clauseTitle}, ${item.tierLabel} financial impact: ${
                item.displayImpactOverride ??
                formatCurrency(item.estimatedExposureUsd, currency)
              }`}
              className={`text-left p-3 rounded-lg border transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                style.tileClass
              } ${
                isActive
                  ? 'ring-2 ring-blue-600 dark:ring-blue-400 ring-offset-1 ring-offset-white dark:ring-offset-slate-900'
                  : ''
              } ${isDimmed ? 'opacity-40 hover:opacity-85' : ''}`}
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-1.5 text-[10px] font-mono tabular-nums">
                  <span className={`font-bold ${style.tierTextClass}`}>
                    #{item.clauseId} · {item.tierLabel}
                  </span>
                  {isFlagged && (
                    <span className="font-sans font-semibold text-blue-700 dark:text-blue-300">
                      Flagged
                    </span>
                  )}
                </div>

                <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 leading-snug line-clamp-2">
                  {item.clauseTitle}
                </div>
              </div>

              <div className="space-y-0.5 pt-1 border-t border-black/5 dark:border-white/10">
                <div
                  className={`font-mono tabular-nums text-sm font-bold ${style.valueTextClass}`}
                >
                  {item.displayImpactOverride ??
                    formatCurrency(item.estimatedExposureUsd, currency)}
                </div>
                <div className="text-[10px] text-slate-600 dark:text-slate-300 leading-tight line-clamp-2">
                  {item.impactBasis}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
