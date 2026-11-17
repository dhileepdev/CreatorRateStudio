import React, { useMemo } from 'react';
import {
  Activity,
  ArrowUpRight,
  Clock,
  DollarSign,
  Layers,
  ShieldCheck,
} from 'lucide-react';
import { useCurrency } from '../context/CurrencyContext';
import { SavedDealSnapshot } from '../types/calculator';
import {
  formatCurrency,
  formatCurrencyExact,
  formatNumber,
} from '../utils/pricingEngine';

interface SavedDealsHighlightsProps {
  deals: SavedDealSnapshot[];
  totalSavedCount: number;
  isFiltered: boolean;
  onLoadDealIntoCalculator?: (deal: SavedDealSnapshot) => void;
}

function isDealClosed(deal: SavedDealSnapshot): boolean {
  return (deal.tags ?? []).some((t) => t.trim().toLowerCase() === 'closed');
}

function isDealActiveNegotiation(deal: SavedDealSnapshot): boolean {
  return (deal.tags ?? []).some((t) => {
    const lower = t.trim().toLowerCase();
    return (
      lower === 'negotiation pending' ||
      lower === 'high priority' ||
      lower === 'follow-up needed'
    );
  });
}

export const SavedDealsHighlights: React.FC<SavedDealsHighlightsProps> = ({
  deals,
  totalSavedCount,
  isFiltered,
  onLoadDealIntoCalculator,
}) => {
  const { currency } = useCurrency();

  const metrics = useMemo(() => {
    const count = deals.length;
    if (count === 0) {
      return null;
    }

    let totalValue = 0;
    let totalPendingValue = 0;
    let pendingCount = 0;
    let activeNegotiationCount = 0;
    let closedValue = 0;
    let closedCount = 0;
    let sumActiveCpm = 0;
    let totalMedianViews = 0;
    let totalRidersValue = 0;
    let sumErPct = 0;
    let highestDeal: SavedDealSnapshot = deals[0];

    for (const deal of deals) {
      const rate = deal.result.breakdown.totalRecommendedRate;
      const riders = deal.result.breakdown.totalCommercialRiders;
      const cpm = deal.result.breakdown.activeCpm;
      const views = deal.profile.medianViews;
      const er = deal.result.breakdown.calculatedER;

      totalValue += rate;
      totalRidersValue += riders;
      sumActiveCpm += cpm;
      totalMedianViews += views;
      sumErPct += er;

      if (rate > highestDeal.result.breakdown.totalRecommendedRate) {
        highestDeal = deal;
      }

      if (isDealClosed(deal)) {
        closedCount += 1;
        closedValue += rate;
      } else {
        pendingCount += 1;
        totalPendingValue += rate;
        if (isDealActiveNegotiation(deal)) {
          activeNegotiationCount += 1;
        }
      }
    }

    const averageDealCpm = sumActiveCpm / count;
    const blendedEffectiveCpm =
      totalMedianViews > 0 ? (totalValue / totalMedianViews) * 1000 : averageDealCpm;
    const averageDealRate = totalValue / count;
    const commercialRidersSharePct =
      totalValue > 0 ? (totalRidersValue / totalValue) * 100 : 0;
    const averageErPct = sumErPct / count;
    const pendingSharePct =
      totalValue > 0 ? (totalPendingValue / totalValue) * 100 : 0;

    return {
      count,
      totalValue,
      totalPendingValue,
      pendingCount,
      activeNegotiationCount,
      closedValue,
      closedCount,
      averageDealCpm,
      blendedEffectiveCpm,
      averageDealRate,
      totalMedianViews,
      commercialRidersSharePct,
      totalRidersValue,
      averageErPct,
      pendingSharePct,
      highestDeal,
    };
  }, [deals]);

  if (!metrics) {
    return null;
  }

  return (
    <section
      aria-label="Saved Deals Highlights"
      className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-4"
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-700 shrink-0" aria-hidden="true" />
            <h2 className="font-display text-base font-semibold text-slate-900">
              Saved Deals Highlights
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
            Pipeline KPIs across{' '}
            {isFiltered ? (
              <>
                <span className="font-medium text-slate-700">
                  {metrics.count} filtered
                </span>{' '}
                of {totalSavedCount} saved{' '}
                {totalSavedCount === 1 ? 'deal' : 'deals'}
              </>
            ) : (
              <>
                {metrics.count} saved {metrics.count === 1 ? 'deal' : 'deals'}
              </>
            )}{' '}
            · {metrics.pendingCount} pending · {metrics.closedCount} closed
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-600 tabular-nums shrink-0">
          <span className="font-mono font-semibold text-slate-900">
            {formatCurrencyExact(metrics.totalValue, currency)}
          </span>
          <span className="text-slate-400">total pipeline</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* KPI 1: Total Pending Value */}
        <div className="border border-slate-200/80 rounded-lg p-3.5 bg-slate-50/50 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                Total Pending Value
              </span>
              <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" aria-hidden="true" />
            </div>
            <div className="font-mono text-xl font-bold text-slate-900 tabular-nums mt-1.5">
              {formatCurrencyExact(metrics.totalPendingValue, currency)}
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-200/70 flex items-center justify-between gap-2 text-[11px] text-slate-600 tabular-nums">
            <span>
              {metrics.pendingCount} open{' '}
              {metrics.pendingCount === 1 ? 'deal' : 'deals'}
              {metrics.activeNegotiationCount > 0
                ? ` (${metrics.activeNegotiationCount} active)`
                : ''}
            </span>
            <span className="font-mono font-medium text-amber-700">
              {metrics.pendingSharePct.toFixed(0)}%
            </span>
          </div>
        </div>

        {/* KPI 2: Average Deal CPM */}
        <div className="border border-slate-200/80 rounded-lg p-3.5 bg-slate-50/50 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                Average Deal CPM
              </span>
              <Activity className="w-3.5 h-3.5 text-blue-700 shrink-0" aria-hidden="true" />
            </div>
            <div className="font-mono text-xl font-bold text-slate-900 tabular-nums mt-1.5">
              {formatCurrencyExact(metrics.averageDealCpm, currency)}
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-200/70 flex items-center justify-between gap-2 text-[11px] text-slate-600 tabular-nums">
            <span>Effective eCPM</span>
            <span className="font-mono font-medium text-slate-900">
              {formatCurrencyExact(metrics.blendedEffectiveCpm, currency)} ·{' '}
              {formatNumber(metrics.totalMedianViews)} views
            </span>
          </div>
        </div>

        {/* KPI 3: Average Deal Rate & Highest Proposal */}
        <div className="border border-slate-200/80 rounded-lg p-3.5 bg-slate-50/50 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                Average Deal Rate
              </span>
              <DollarSign className="w-3.5 h-3.5 text-emerald-700 shrink-0" aria-hidden="true" />
            </div>
            <div className="font-mono text-xl font-bold text-slate-900 tabular-nums mt-1.5">
              {formatCurrencyExact(metrics.averageDealRate, currency)}
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-200/70 flex items-center justify-between gap-2 text-[11px] text-slate-600 tabular-nums">
            <span className="truncate" title={metrics.highestDeal.name}>
              Top: {metrics.highestDeal.name}
            </span>
            {onLoadDealIntoCalculator ? (
              <button
                type="button"
                onClick={() => onLoadDealIntoCalculator(metrics.highestDeal)}
                className="inline-flex items-center gap-0.5 font-mono font-medium text-blue-700 hover:text-blue-800 whitespace-nowrap shrink-0 cursor-pointer"
                title={`Load ${metrics.highestDeal.name} into calculator`}
              >
                {formatCurrency(
                  metrics.highestDeal.result.breakdown.totalRecommendedRate,
                  currency
                )}
                <ArrowUpRight className="w-3 h-3" aria-hidden="true" />
              </button>
            ) : (
              <span className="font-mono font-medium text-slate-900 whitespace-nowrap shrink-0">
                {formatCurrency(
                  metrics.highestDeal.result.breakdown.totalRecommendedRate,
                  currency
                )}
              </span>
            )}
          </div>
        </div>

        {/* KPI 4: Closed Value & Commercial Rights Mix */}
        <div className="border border-slate-200/80 rounded-lg p-3.5 bg-slate-50/50 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                {metrics.closedCount > 0 ? 'Closed Deal Value' : 'Commercial Rights Mix'}
              </span>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" aria-hidden="true" />
            </div>
            <div className="font-mono text-xl font-bold text-slate-900 tabular-nums mt-1.5">
              {metrics.closedCount > 0
                ? formatCurrencyExact(metrics.closedValue, currency)
                : `${metrics.commercialRidersSharePct.toFixed(1)}%`}
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-200/70 flex items-center justify-between gap-2 text-[11px] text-slate-600 tabular-nums">
            {metrics.closedCount > 0 ? (
              <>
                <span>
                  {metrics.closedCount} closed ·{' '}
                  {metrics.commercialRidersSharePct.toFixed(0)}% riders
                </span>
                <span className="font-mono font-medium text-slate-900">
                  {metrics.averageErPct.toFixed(1)}% ER
                </span>
              </>
            ) : (
              <>
                <span>
                  Riders {formatCurrency(metrics.totalRidersValue, currency)}
                </span>
                <span className="font-mono font-medium text-slate-900">
                  {metrics.averageErPct.toFixed(1)}% avg ER
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
