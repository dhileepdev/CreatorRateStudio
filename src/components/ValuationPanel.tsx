import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BookmarkPlus,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  FileText,
  Scale,
  Share2,
  Tag,
  TrendingUp,
  X,
} from 'lucide-react';
import {
  EXCLUSIVITY_SPECS,
  NICHE_BENCHMARKS,
  PLATFORM_SPECS,
  USAGE_RIGHTS_SPECS,
} from '../data/benchmarks';
import {
  CalculatedDealResult,
  CreatorProfile,
  DealScope,
  DEFAULT_DEAL_TAGS,
  TieredPackage,
} from '../types/calculator';
import { useCurrency } from '../context/CurrencyContext';
import {
  calculateCampaignRoi,
  formatCurrency,
  formatCurrencyExact,
  formatNumber,
} from '../utils/pricingEngine';

interface ValuationPanelProps {
  profile: CreatorProfile;
  scope: DealScope;
  baseResult: CalculatedDealResult;
  result: CalculatedDealResult;
  inflationEnabled: boolean;
  annualInflationPct: number;
  inflationYears: number;
  inflationUpliftAmount: number;
  onToggleInflation: () => void;
  onChangeInflationPct: (pct: number) => void;
  onChangeInflationYears: (years: number) => void;
  savedDealsCount: number;
  sharedUrl: string | null;
  onCopyRateCard: () => void;
  onShareConfiguration: () => void;
  onDismissSharedUrl: () => void;
  onSaveToComparison: (
    customName: string,
    notes: string,
    targetCpa?: number,
    targetMonthlyRevenue?: number,
    tags?: string[]
  ) => void;
  onOpenComparison: () => void;
  onScrollToScripts: () => void;
  onApplyTierScope: (tierId: 'tierA' | 'tierB' | 'tierC') => void;
}

const INFLATION_PRESETS = [2.5, 3.5, 5.0, 7.0];

export const ValuationPanel: React.FC<ValuationPanelProps> = ({
  profile,
  scope,
  baseResult,
  result,
  inflationEnabled,
  annualInflationPct,
  inflationYears,
  inflationUpliftAmount,
  onToggleInflation,
  onChangeInflationPct,
  onChangeInflationYears,
  savedDealsCount,
  sharedUrl,
  onCopyRateCard,
  onShareConfiguration,
  onDismissSharedUrl,
  onSaveToComparison,
  onOpenComparison,
  onScrollToScripts,
  onApplyTierScope,
}) => {
  const { currency, currencySpec, fxMetadata, openProModal } = useCurrency();
  const [copiedShareLink, setCopiedShareLink] = useState(false);
  const [dealNameInput, setDealNameInput] = useState('');
  const [dealNotesInput, setDealNotesInput] = useState('');
  const [targetCpaInput, setTargetCpaInput] = useState('');
  const [targetMonthlyRevenueInput, setTargetMonthlyRevenueInput] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTagInput, setCustomTagInput] = useState('');
  const [expandedTier, setExpandedTier] = useState<'tierA' | 'tierB' | 'tierC' | null>('tierB');
  const [roiTargetCpaInput, setRoiTargetCpaInput] = useState('50');
  const [roiAvgOrderValueInput, setRoiAvgOrderValueInput] = useState('120');

  const b = result.breakdown;
  const baseB = baseResult.breakdown;
  const platformSpec = PLATFORM_SPECS[profile.platform];
  const nicheSpec = NICHE_BENCHMARKS[profile.niche];

  const parsedRoiTargetCpa = Number(roiTargetCpaInput);
  const parsedRoiAov = Number(roiAvgOrderValueInput);
  const hasValidRoiCpa =
    roiTargetCpaInput.trim() !== '' &&
    Number.isFinite(parsedRoiTargetCpa) &&
    parsedRoiTargetCpa > 0;

  const campaignRoi = useMemo(() => {
    if (!hasValidRoiCpa) return null;
    const safeAov =
      roiAvgOrderValueInput.trim() !== '' &&
      Number.isFinite(parsedRoiAov) &&
      parsedRoiAov >= 0
        ? parsedRoiAov
        : 0;
    return calculateCampaignRoi({
      profile,
      result,
      targetCpaUsd: parsedRoiTargetCpa,
      avgOrderValueUsd: safeAov,
    });
  }, [hasValidRoiCpa, parsedRoiTargetCpa, parsedRoiAov, roiAvgOrderValueInput, profile, result]);

  const creativeSharePct =
    b.totalRecommendedRate > 0
      ? Math.round((b.baseCreationFee / b.totalRecommendedRate) * 100)
      : 100;
  const ridersSharePct = 100 - creativeSharePct;

  const inflationCompoundPct =
    (Math.pow(1 + Math.max(0, annualInflationPct) / 100, Math.max(1, inflationYears)) - 1) *
    100;

  const tiers: TieredPackage[] = [
    result.tieredPackages.tierA_Organic,
    result.tieredPackages.tierB_StandardGrowth,
    result.tieredPackages.tierC_FullScale,
  ];

  const handleSaveDeal = (e: React.FormEvent) => {
    e.preventDefault();
    const defaultName = `${platformSpec.shortLabel} · ${nicheSpec.label.split(',')[0]} · ${
      USAGE_RIGHTS_SPECS[scope.usageRightsTerm].label.split(' ')[0]
    }`;
    const parsedCpa = Number(targetCpaInput);
    const validTargetCpa =
      targetCpaInput.trim() !== '' && Number.isFinite(parsedCpa) && parsedCpa > 0
        ? parsedCpa
        : undefined;
    const parsedRev = Number(targetMonthlyRevenueInput);
    const validTargetMonthlyRevenue =
      targetMonthlyRevenueInput.trim() !== '' && Number.isFinite(parsedRev) && parsedRev > 0
        ? parsedRev
        : undefined;
    const pendingCustom = customTagInput.trim();
    const combinedTags = pendingCustom
      ? Array.from(new Set([...selectedTags, pendingCustom]))
      : selectedTags;
    onSaveToComparison(
      dealNameInput.trim() || defaultName,
      dealNotesInput.trim(),
      validTargetCpa,
      validTargetMonthlyRevenue,
      combinedTags
    );
    setDealNameInput('');
    setDealNotesInput('');
    setTargetCpaInput('');
    setTargetMonthlyRevenueInput('');
    setSelectedTags([]);
    setCustomTagInput('');
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  return (
    <div className="space-y-6">
      {/* Hero Valuation Card */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 transition-colors">
        <div className="flex flex-wrap items-start justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Total Recommended Deal Rate ({currency})
              {inflationEnabled && (
                <span className="ml-1.5 font-mono text-emerald-700 dark:text-emerald-400">
                  · Inflation-Adjusted (+{inflationCompoundPct.toFixed(1)}%)
                </span>
              )}
            </div>
            <div className="font-display text-3xl sm:text-4xl font-bold text-slate-900 dark:text-slate-100 tracking-tight font-mono mt-1 tabular-nums">
              {formatCurrencyExact(b.totalRecommendedRate, currency)}
            </div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400 mt-2 tabular-nums">
              <span>{platformSpec.label}</span>
              <span aria-hidden="true">·</span>
              <span>{formatNumber(profile.medianViews)} median views</span>
              <span aria-hidden="true">·</span>
              <span>
                {creativeSharePct}% creative / {ridersSharePct}% rights
              </span>
              {inflationEnabled && inflationUpliftAmount > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono text-emerald-700 dark:text-emerald-400">
                    Unadjusted {formatCurrencyExact(baseB.totalRecommendedRate, currency)} (+
                    {formatCurrencyExact(inflationUpliftAmount, currency)})
                  </span>
                </>
              )}
            </div>
            {currency !== 'USD' && (
              <div className="text-[11px] font-mono text-blue-700 dark:text-blue-400 mt-1.5">
                Converted from {formatCurrencyExact(b.totalRecommendedRate, 'USD')} USD (1 USD = {currencySpec.rateFromUsd} {currency}
                {fxMetadata.source !== 'fallback' && fxMetadata.asOfDate
                  ? ` · ${fxMetadata.provider} ${fxMetadata.asOfDate}`
                  : ''}
                ) ·{' '}
                <button
                  type="button"
                  onClick={() => openProModal(null)}
                  className="underline hover:text-blue-900 dark:hover:text-blue-300 font-sans cursor-pointer"
                >
                  Currency settings
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-col items-start sm:items-end gap-1 text-xs">
            <span className="text-slate-500 dark:text-slate-400">Base Creation Fee</span>
            <span className="font-mono text-lg font-semibold text-slate-900 dark:text-slate-100">
              {formatCurrencyExact(b.baseCreationFee, currency)}
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
              +{formatCurrencyExact(b.totalCommercialRiders, currency)} in rights riders
            </span>
          </div>
        </div>

        {/* Inflation Adjustment Control Bar */}
        <div className="py-4 border-b border-slate-100 dark:border-slate-800 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <label
                htmlFor="inflation-adjustment-toggle"
                className="text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer"
              >
                Inflation Adjustment (Cost-of-Living Indexing)
              </label>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Scale your target quote and 3-tier rate packages by an annual CPI percentage to preserve purchasing power.
              </p>
            </div>
            <button
              id="inflation-adjustment-toggle"
              type="button"
              role="switch"
              aria-checked={inflationEnabled}
              onClick={onToggleInflation}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                inflationEnabled
                  ? 'bg-emerald-700 dark:bg-emerald-600'
                  : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  inflationEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {inflationEnabled && (
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-lg space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="annual-inflation-pct"
                    className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Annual Inflation Rate (%)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id="annual-inflation-pct"
                      type="number"
                      min={0}
                      max={50}
                      step={0.1}
                      value={annualInflationPct}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        onChangeInflationPct(
                          Number.isFinite(val) ? Math.max(0, Math.min(50, val)) : 0
                        );
                      }}
                      className="w-24 px-2.5 py-1.5 text-xs sm:text-sm font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600"
                    />
                    <div className="flex flex-wrap items-center gap-1">
                      {INFLATION_PRESETS.map((preset) => {
                        const active = Math.abs(annualInflationPct - preset) < 0.05;
                        return (
                          <button
                            key={`cpi-${preset}`}
                            type="button"
                            aria-pressed={active}
                            onClick={() => onChangeInflationPct(preset)}
                            className={`px-2 py-1 text-[11px] font-mono font-medium rounded border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                              active
                                ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100'
                                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                          >
                            {preset.toFixed(1)}%
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                      Compounding Horizon
                    </span>
                    <span className="text-[11px] font-mono font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums">
                      +{formatCurrencyExact(inflationUpliftAmount, currency)} uplift
                    </span>
                  </div>
                  <div
                    role="group"
                    aria-label="Inflation compounding years"
                    className="grid grid-cols-3 gap-1.5"
                  >
                    {[1, 2, 3].map((yr) => {
                      const active = inflationYears === yr;
                      return (
                        <button
                          key={`inf-yr-${yr}`}
                          type="button"
                          aria-pressed={active}
                          onClick={() => onChangeInflationYears(yr)}
                          className={`px-2.5 py-1.5 text-xs font-mono font-medium rounded-lg border transition-colors cursor-pointer whitespace-nowrap ${
                            active
                              ? 'bg-emerald-700 dark:bg-emerald-600 text-white border-emerald-700 dark:border-emerald-600'
                              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          {yr} {yr === 1 ? 'Year' : 'Years'}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Itemized Ledger Table */}
        <div className="py-4">
          <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2.5">
            Itemized Valuation Ledger
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
            <div className="py-2 flex items-center justify-between gap-4">
              <div>
                <div className="font-medium text-slate-900 dark:text-slate-100">
                  Audience Reach & Engagement Value
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  ({formatNumber(profile.medianViews)} / 1,000) × {formatCurrencyExact(baseB.activeCpm, currency)} CPM ×{' '}
                  {baseB.platformMultiplier.toFixed(2)}x × {baseB.engagementMultiplier.toFixed(2)}x ER
                  {baseB.velocityEnabled && (
                    <span className="text-blue-700 dark:text-blue-400">
                      {' '}× {baseB.velocityMultiplier.toFixed(2)}x Vel
                    </span>
                  )}
                </div>
              </div>
              <div className="font-mono font-medium text-slate-900 dark:text-slate-100 shrink-0">
                {formatCurrencyExact(baseB.rawReachValue, currency)}
              </div>
            </div>

            <div className="py-2 flex items-center justify-between gap-4">
              <div>
                <div className="font-medium text-slate-900 dark:text-slate-100">
                  Production Cost Floor
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Studio, editing &amp; equipment baseline ({formatCurrency(100, currency)} minimum enforced)
                </div>
              </div>
              <div className="font-mono font-medium text-slate-900 dark:text-slate-100 shrink-0">
                {formatCurrencyExact(baseB.effectiveFloorCost, currency)}
              </div>
            </div>

            <div className="py-2.5 flex items-center justify-between gap-4 bg-slate-50/80 dark:bg-slate-800/70 px-2.5 -mx-2.5 rounded-md">
              <div className="font-semibold text-slate-900 dark:text-slate-100">
                Subtotal: Organic Base Creation Fee
              </div>
              <div className="font-mono font-semibold text-slate-900 dark:text-slate-100 shrink-0">
                {formatCurrencyExact(baseB.baseCreationFee, currency)}
              </div>
            </div>

            <div className="py-2 flex items-center justify-between gap-4">
              <div>
                <div className="font-medium text-slate-900 dark:text-slate-100">
                  Paid Usage Rights
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {USAGE_RIGHTS_SPECS[scope.usageRightsTerm].label} (
                  {(baseB.usageMultiplier * 100).toFixed(0)}% of Base)
                </div>
              </div>
              <div className="font-mono font-medium text-slate-900 dark:text-slate-100 shrink-0">
                {formatCurrencyExact(baseB.usageRightsFee, currency)}
              </div>
            </div>

            <div className="py-2 flex items-center justify-between gap-4">
              <div>
                <div className="font-medium text-slate-900 dark:text-slate-100">
                  Whitelisting / Paid Boosting
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {scope.whitelistingEnabled
                    ? `${baseB.whitelistingBasis} · Expires in ${scope.whitelistingExpirationDays}d`
                    : 'Not enabled'}
                </div>
              </div>
              <div className="font-mono font-medium text-slate-900 dark:text-slate-100 shrink-0">
                {formatCurrencyExact(baseB.whitelistingFee, currency)}
              </div>
            </div>

            <div className="py-2 flex items-center justify-between gap-4">
              <div>
                <div className="font-medium text-slate-900 dark:text-slate-100">
                  Category Exclusivity
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {EXCLUSIVITY_SPECS[scope.exclusivityType].label} (
                  {(baseB.exclusivityMultiplier * 100).toFixed(0)}% of Base)
                </div>
              </div>
              <div className="font-mono font-medium text-slate-900 dark:text-slate-100 shrink-0">
                {formatCurrencyExact(baseB.exclusivityFee, currency)}
              </div>
            </div>

            {(baseB.rushFee > 0 || baseB.excessRevisionsFee > 0) && (
              <>
                {baseB.rushFee > 0 && (
                  <div className="py-2 flex items-center justify-between gap-4">
                    <div>
                      <div className="font-medium text-slate-900 dark:text-slate-100">
                        Rush Turnaround (&lt;5 Business Days)
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        +25% expedited surcharge
                      </div>
                    </div>
                    <div className="font-mono font-medium text-slate-900 dark:text-slate-100 shrink-0">
                      {formatCurrencyExact(baseB.rushFee, currency)}
                    </div>
                  </div>
                )}
                {baseB.excessRevisionsFee > 0 && (
                  <div className="py-2 flex items-center justify-between gap-4">
                    <div>
                      <div className="font-medium text-slate-900 dark:text-slate-100">
                        Additional Revision Rounds (+{baseB.excessRevisionCount})
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        Beyond standard 2-round creative cap
                      </div>
                    </div>
                    <div className="font-mono font-medium text-slate-900 dark:text-slate-100 shrink-0">
                      {formatCurrencyExact(baseB.excessRevisionsFee, currency)}
                    </div>
                  </div>
                )}
              </>
            )}

            {inflationEnabled && (
              <div className="py-2.5 flex items-center justify-between gap-4 bg-emerald-50/70 dark:bg-emerald-950/40 px-2.5 -mx-2.5 rounded-md">
                <div>
                  <div className="font-semibold text-emerald-950 dark:text-emerald-200">
                    Cost-of-Living Inflation Adjustment
                  </div>
                  <div className="text-xs text-emerald-800 dark:text-emerald-400 font-mono">
                    {annualInflationPct.toFixed(1)}% annual CPI · {inflationYears}{' '}
                    {inflationYears === 1 ? 'year' : 'years'} (+{inflationCompoundPct.toFixed(1)}%)
                  </div>
                </div>
                <div className="font-mono font-semibold text-emerald-800 dark:text-emerald-300 shrink-0">
                  +{formatCurrencyExact(inflationUpliftAmount, currency)}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tax & Statutory Reminders */}
        <div className="py-3 px-3.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-600 dark:text-slate-300 space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>
              Est. 15.3% US Self-Employment Tax Reserve:{' '}
              <strong className="font-mono text-slate-900 dark:text-slate-100">
                {formatCurrencyExact(b.estimatedSelfEmploymentTax, currency)}
              </strong>
            </span>
            <span>
              Est. Net After SE Tax:{' '}
              <strong className="font-mono text-slate-900 dark:text-slate-100">
                {formatCurrencyExact(b.estimatedNetAfterSETax, currency)}
              </strong>
            </span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            2026 US Tax Note: Under the One Big Beautiful Bill Act, 1099-NEC reporting begins at $2,000, though all sponsorship revenue remains taxable.{' '}
            {b.totalRecommendedRate >= 800 &&
              'NY Freelance Isn’t Free Act applies (>= $800): mandatory payment within 30 days of completion.'}
          </div>
        </div>

        {/* Save to Deal Comparison + Export Actions */}
        <div className="pt-5 mt-5 border-t border-slate-100 dark:border-slate-800 space-y-3">
          <form onSubmit={handleSaveDeal} className="space-y-2.5">
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={dealNameInput}
                onChange={(e) => setDealNameInput(e.target.value)}
                placeholder="Deal label (e.g., Acme FinTech 90d Offer)"
                aria-label="Deal label for comparison"
                className="flex-1 px-3 py-2 text-xs sm:text-sm bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
              />
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-medium text-white bg-blue-700 dark:bg-blue-600 rounded-lg hover:bg-blue-800 dark:hover:bg-blue-500 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                <BookmarkPlus className="w-4 h-4" aria-hidden="true" />
                Save to Compare
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <input
                  type="number"
                  min={1}
                  step="any"
                  value={targetCpaInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    setTargetCpaInput(val);
                    const num = Number(val);
                    if (val.trim() !== '' && Number.isFinite(num) && num > 0) {
                      setRoiTargetCpaInput(val);
                    }
                  }}
                  placeholder="Brand Target CPA (USD Optional)"
                  aria-label="Brand Target CPA in US dollars"
                  className="w-full px-3 py-2 text-xs font-mono bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 placeholder:font-sans focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
                />
                {currency !== 'USD' && Number(targetCpaInput) > 0 && (
                  <div className="text-[11px] font-mono text-blue-700 dark:text-blue-400 mt-1">
                    ≈ {formatCurrencyExact(Number(targetCpaInput), currency)}
                  </div>
                )}
              </div>
              <div>
                <input
                  type="number"
                  min={100}
                  step="any"
                  value={targetMonthlyRevenueInput}
                  onChange={(e) => setTargetMonthlyRevenueInput(e.target.value)}
                  placeholder="Target Monthly Revenue (USD Optional)"
                  aria-label="Target Monthly Revenue goal in US dollars"
                  className="w-full px-3 py-2 text-xs font-mono bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 placeholder:font-sans focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
                />
                {currency !== 'USD' && Number(targetMonthlyRevenueInput) > 0 && (
                  <div className="text-[11px] font-mono text-blue-700 dark:text-blue-400 mt-1">
                    ≈ {formatCurrencyExact(Number(targetMonthlyRevenueInput), currency)}
                  </div>
                )}
              </div>
            </div>
            <textarea
              rows={2}
              value={dealNotesInput}
              onChange={(e) => setDealNotesInput(e.target.value)}
              placeholder="Negotiation notes (optional) — e.g., Brand requested 90d paid usage & Net-30; countered with 2-round cap."
              aria-label="Negotiation notes for saved deal"
              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 resize-y"
            />
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 dark:text-slate-400 mr-1">
                  <Tag className="w-3 h-3 text-slate-400" aria-hidden="true" />
                  Tags:
                </span>
                {DEFAULT_DEAL_TAGS.map((tag) => {
                  const active = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      aria-pressed={active}
                      onClick={() => toggleTag(tag)}
                      className={`px-2 py-0.5 text-[11px] font-medium rounded-md border transition-colors cursor-pointer ${
                        active
                          ? 'bg-blue-700 dark:bg-blue-600 text-white border-blue-700 dark:border-blue-600'
                          : 'bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
                <input
                  type="text"
                  value={customTagInput}
                  onChange={(e) => setCustomTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && customTagInput.trim()) {
                      e.preventDefault();
                      const nextTag = customTagInput.trim();
                      if (!selectedTags.includes(nextTag)) {
                        setSelectedTags((prev) => [...prev, nextTag]);
                      }
                      setCustomTagInput('');
                    }
                  }}
                  placeholder="+ Custom tag"
                  aria-label="Custom tag name"
                  className="w-28 px-2 py-0.5 text-[11px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>
          </form>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onCopyRateCard}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors whitespace-nowrap cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                Copy Rate Card
              </button>
              <button
                type="button"
                onClick={() => {
                  onShareConfiguration();
                  setCopiedShareLink(true);
                  window.setTimeout(() => setCopiedShareLink(false), 2000);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-blue-800 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100/80 dark:hover:bg-blue-900/60 transition-colors whitespace-nowrap cursor-pointer"
              >
                {copiedShareLink ? (
                  <Check className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
                ) : (
                  <Share2 className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" aria-hidden="true" />
                )}
                Share Configuration
              </button>
              <button
                type="button"
                onClick={onScrollToScripts}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors whitespace-nowrap cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                Counter-Pitch Scripts
              </button>
            </div>

            <button
              type="button"
              onClick={onOpenComparison}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 cursor-pointer whitespace-nowrap"
            >
              <Scale className="w-3.5 h-3.5" aria-hidden="true" />
              <span>
                Compare Deals{savedDealsCount > 0 ? ` (${savedDealsCount})` : ''}
              </span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>

          {sharedUrl && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-lg space-y-1.5">
              <div className="flex items-center justify-between gap-2 text-[11px]">
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  Shareable Configuration Link (encodes current profile &amp; scope)
                </span>
                <button
                  type="button"
                  onClick={onDismissSharedUrl}
                  aria-label="Dismiss shareable link"
                  className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={sharedUrl}
                  onFocus={(e) => e.target.select()}
                  aria-label="Shareable configuration URL"
                  className="flex-1 px-2.5 py-1.5 text-[11px] font-mono bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-slate-700 dark:text-slate-200 focus:outline-none focus:border-blue-600"
                />
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(sharedUrl);
                      setCopiedShareLink(true);
                      window.setTimeout(() => setCopiedShareLink(false), 2000);
                    } catch {
                      // Input remains selectable if clipboard API is unavailable
                    }
                  }}
                  className="px-2.5 py-1.5 text-[11px] font-medium text-white dark:text-slate-950 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white rounded transition-colors cursor-pointer shrink-0"
                >
                  {copiedShareLink ? 'Copied' : 'Copy URL'}
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Campaign ROI Calculator */}
      <section
        id="campaign-roi"
        aria-label="Campaign ROI calculator"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 space-y-4 transition-colors"
      >
        <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="inline-flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0" aria-hidden="true" />
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                Campaign ROI Calculator
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Estimates units sold, conversion revenue, and ROAS against your{' '}
              <span className="font-mono text-slate-700 dark:text-slate-200">
                {formatCurrencyExact(b.totalRecommendedRate, currency)}
              </span>{' '}
              total deal rate.
            </p>
          </div>

          {hasValidRoiCpa && targetCpaInput !== roiTargetCpaInput && (
            <button
              type="button"
              onClick={() => setTargetCpaInput(roiTargetCpaInput)}
              className="text-xs font-medium text-blue-700 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline cursor-pointer whitespace-nowrap shrink-0"
            >
              Use Target CPA in Save Form
            </button>
          )}
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="roi-target-cpa"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
            >
              Sponsor Target CPA (USD)
            </label>
            <input
              id="roi-target-cpa"
              type="number"
              min={1}
              step="any"
              value={roiTargetCpaInput}
              onChange={(e) => setRoiTargetCpaInput(e.target.value)}
              placeholder="e.g., 50"
              className="w-full px-3 py-2 text-xs sm:text-sm font-mono bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
            />
            {currency !== 'USD' && hasValidRoiCpa && (
              <div className="text-[11px] font-mono text-blue-700 dark:text-blue-400 mt-1">
                ≈ {formatCurrencyExact(parsedRoiTargetCpa, currency)} / conversion
              </div>
            )}
          </div>

          <div>
            <label
              htmlFor="roi-aov"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
            >
              Avg. Order Value / Unit Price (USD)
            </label>
            <input
              id="roi-aov"
              type="number"
              min={0}
              step="any"
              value={roiAvgOrderValueInput}
              onChange={(e) => setRoiAvgOrderValueInput(e.target.value)}
              placeholder="e.g., 120"
              className="w-full px-3 py-2 text-xs sm:text-sm font-mono bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
            />
            {currency !== 'USD' && Number.isFinite(parsedRoiAov) && parsedRoiAov > 0 && (
              <div className="text-[11px] font-mono text-blue-700 dark:text-blue-400 mt-1">
                ≈ {formatCurrencyExact(parsedRoiAov, currency)} / unit
              </div>
            )}
          </div>
        </div>

        {/* Estimated Outcomes */}
        {!campaignRoi ? (
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-600 dark:text-slate-300">
            Enter a positive <strong>Sponsor Target CPA</strong> to estimate break-even units sold, conversion revenue, and ROAS.
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 tabular-nums">
              {/* Target CPA Pace Outcome */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg space-y-2">
                <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                  At Target CPA ({formatCurrencyExact(campaignRoi.targetCpaUsd, currency)})
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xs text-slate-600 dark:text-slate-400">Units Sold Needed</span>
                  <span className="font-mono text-base font-bold text-slate-900 dark:text-slate-100">
                    {formatNumber(campaignRoi.unitsAtTargetCpa)} units
                  </span>
                </div>
                <div className="flex items-baseline justify-between gap-2 pt-1.5 border-t border-slate-200/80 dark:border-slate-700">
                  <span className="text-xs text-slate-600 dark:text-slate-400">Est. Revenue</span>
                  <span className="font-mono text-base font-bold text-blue-800 dark:text-blue-300">
                    {formatCurrencyExact(campaignRoi.revenueAtTargetCpa, currency)}
                  </span>
                </div>
                <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  Implied Return: {campaignRoi.roasAtTargetCpa.toFixed(2)}x ROAS
                </div>
              </div>

              {/* Audience Engagement Forecast Outcome */}
              <div className="p-3.5 bg-blue-50/40 dark:bg-blue-950/35 border border-blue-200 dark:border-blue-800/70 rounded-lg space-y-2">
                <div className="text-[11px] font-semibold text-blue-900 dark:text-blue-200">
                  Audience Forecast ({(campaignRoi.engagementCaptureRate * 100).toFixed(1)}% of{' '}
                  {formatNumber(campaignRoi.totalEngagements)} actions)
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xs text-slate-700 dark:text-slate-300">Projected Units Sold</span>
                  <span className="font-mono text-base font-bold text-slate-900 dark:text-slate-100">
                    ~{formatNumber(campaignRoi.projectedUnitsSold)} units
                  </span>
                </div>
                <div className="flex items-baseline justify-between gap-2 pt-1.5 border-t border-blue-200/80 dark:border-blue-800/60">
                  <span className="text-xs text-slate-700 dark:text-slate-300">Projected Revenue</span>
                  <span className="font-mono text-base font-bold text-blue-900 dark:text-blue-200">
                    {formatCurrencyExact(campaignRoi.projectedRevenue, currency)}
                  </span>
                </div>
                <div className="text-[11px] font-mono text-blue-800 dark:text-blue-300">
                  {campaignRoi.projectedRoas.toFixed(2)}x ROAS · Proj. CPA{' '}
                  {campaignRoi.projectedUnitsSold > 0
                    ? formatCurrencyExact(campaignRoi.projectedCpaUsd, currency)
                    : '—'}
                </div>
              </div>
            </div>

            {/* CPA Efficiency Verdict */}
            <div
              className={`px-3.5 py-2.5 rounded-lg border text-xs flex items-start gap-2 ${
                campaignRoi.meetsTargetCpa
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/70 text-emerald-950 dark:text-emerald-200'
                  : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/70 text-amber-950 dark:text-amber-200'
              }`}
            >
              {campaignRoi.meetsTargetCpa ? (
                <CheckCircle2
                  className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5"
                  aria-hidden="true"
                />
              ) : (
                <AlertTriangle
                  className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5"
                  aria-hidden="true"
                />
              )}
              <span className="leading-relaxed">
                {campaignRoi.meetsTargetCpa ? (
                  <>
                    <strong>Meets Target CPA:</strong> Engagement forecast projects{' '}
                    <strong className="font-mono">
                      {formatNumber(campaignRoi.projectedUnitsSold)} units
                    </strong>{' '}
                    (vs.{' '}
                    <span className="font-mono">
                      {formatNumber(campaignRoi.unitsAtTargetCpa)}
                    </span>{' '}
                    needed), yielding a projected CPA of{' '}
                    <strong className="font-mono">
                      {formatCurrencyExact(campaignRoi.projectedCpaUsd, currency)}
                    </strong>{' '}
                    and{' '}
                    <strong className="font-mono">
                      {formatCurrencyExact(campaignRoi.projectedRevenue, currency)}
                    </strong>{' '}
                    in sponsor revenue.
                  </>
                ) : (
                  <>
                    <strong>Below Target CPA Pace:</strong> At{' '}
                    <span className="font-mono">
                      {formatCurrencyExact(campaignRoi.targetCpaUsd, currency)}
                    </span>{' '}
                    CPA, the sponsor needs{' '}
                    <strong className="font-mono">
                      {formatNumber(campaignRoi.unitsAtTargetCpa)} units
                    </strong>
                    , whereas organic engagement projects{' '}
                    <strong className="font-mono">
                      ~{formatNumber(campaignRoi.projectedUnitsSold)} units
                    </strong>
                    . Pair this deliverable with paid ad amplification or unbundle riders to improve sponsor CPA.
                  </>
                )}
              </span>
            </div>
          </div>
        )}
      </section>

      {/* Module 3: Three-Tier Package Matrix */}
      <section
        id="packages"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 space-y-4 scroll-mt-24 transition-colors"
      >
        <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
            Three-Tier Negotiation Matrix
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Present three structured options instead of a single flat quote to avoid &ldquo;Instant Yes&rdquo; undercharging.
          </p>
        </div>

        <div className="space-y-3">
          {tiers.map((tier) => {
            const isExpanded = expandedTier === tier.id;
            return (
              <div
                key={tier.id}
                className={`border rounded-xl transition-colors ${
                  tier.recommended
                    ? 'border-blue-600 dark:border-blue-500 bg-blue-50/30 dark:bg-blue-950/30'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                }`}
              >
                <button
                  type="button"
                  onClick={() =>
                    setExpandedTier(isExpanded ? null : tier.id)
                  }
                  className="w-full p-4 flex items-center justify-between gap-4 text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-600 rounded-xl"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {tier.name}
                      </span>
                      {tier.recommended && (
                        <span className="text-[11px] font-semibold text-blue-700 dark:text-blue-400">
                          · Recommended Anchor
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                      {tier.subtitle}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-mono text-base font-bold text-slate-900 dark:text-slate-100">
                      {formatCurrencyExact(tier.fee, currency)}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-500 dark:text-slate-400" aria-hidden="true" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-500 dark:text-slate-400" aria-hidden="true" />
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <div className="font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Deliverables
                        </div>
                        <ul className="space-y-1 text-slate-600 dark:text-slate-400 list-disc pl-4">
                          {tier.deliverables.map((item, idx) => (
                            <li key={idx}>{item}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            Usage Rights:{' '}
                          </span>
                          <span className="text-slate-600 dark:text-slate-400">{tier.usageSummary}</span>
                        </div>
                        <div>
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            Exclusivity:{' '}
                          </span>
                          <span className="text-slate-600 dark:text-slate-400">
                            {tier.exclusivitySummary}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1">
                      {tier.lineItems.map((li) => (
                        <div
                          key={li.label}
                          className="flex items-center justify-between text-slate-600 dark:text-slate-400"
                        >
                          <span>{li.label}</span>
                          <span className="font-mono text-slate-900 dark:text-slate-100">
                            {formatCurrencyExact(li.amount, currency)}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => onApplyTierScope(tier.id)}
                        className="px-3 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded-md transition-colors cursor-pointer"
                      >
                        Load This Tier Into Calculator
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
