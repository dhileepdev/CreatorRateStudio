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
  result: CalculatedDealResult;
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

export const ValuationPanel: React.FC<ValuationPanelProps> = ({
  profile,
  scope,
  result,
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
      <section className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <div className="text-xs font-medium text-slate-500">
              Total Recommended Deal Rate ({currency})
            </div>
            <div className="font-display text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight font-mono mt-1">
              {formatCurrencyExact(b.totalRecommendedRate, currency)}
            </div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 mt-2 tabular-nums">
              <span>{platformSpec.label}</span>
              <span aria-hidden="true">·</span>
              <span>{formatNumber(profile.medianViews)} median views</span>
              <span aria-hidden="true">·</span>
              <span>
                {creativeSharePct}% creative / {ridersSharePct}% rights
              </span>
            </div>
            {currency !== 'USD' && (
              <div className="text-[11px] font-mono text-blue-700 mt-1.5">
                Converted from {formatCurrencyExact(b.totalRecommendedRate, 'USD')} USD (1 USD = {currencySpec.rateFromUsd} {currency}
                {fxMetadata.source !== 'fallback' && fxMetadata.asOfDate
                  ? ` · ${fxMetadata.provider} ${fxMetadata.asOfDate}`
                  : ''}
                ) ·{' '}
                <button
                  type="button"
                  onClick={() => openProModal(null)}
                  className="underline hover:text-blue-900 font-sans cursor-pointer"
                >
                  Currency settings
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-col items-start sm:items-end gap-1 text-xs">
            <span className="text-slate-500">Base Creation Fee</span>
            <span className="font-mono text-lg font-semibold text-slate-900">
              {formatCurrencyExact(b.baseCreationFee, currency)}
            </span>
            <span className="text-[11px] text-slate-500 font-mono">
              +{formatCurrencyExact(b.totalCommercialRiders, currency)} in rights riders
            </span>
          </div>
        </div>

        {/* Itemized Ledger Table */}
        <div className="py-4">
          <div className="text-xs font-semibold text-slate-700 mb-2.5">
            Itemized Valuation Ledger
          </div>
          <div className="divide-y divide-slate-100 text-sm">
            <div className="py-2 flex items-center justify-between gap-4">
              <div>
                <div className="font-medium text-slate-900">
                  Audience Reach & Engagement Value
                </div>
                <div className="text-xs text-slate-500 font-mono">
                  ({formatNumber(profile.medianViews)} / 1,000) × {formatCurrencyExact(b.activeCpm, currency)} CPM ×{' '}
                  {b.platformMultiplier.toFixed(2)}x × {b.engagementMultiplier.toFixed(2)}x ER
                </div>
              </div>
              <div className="font-mono font-medium text-slate-900 shrink-0">
                {formatCurrencyExact(b.rawReachValue, currency)}
              </div>
            </div>

            <div className="py-2 flex items-center justify-between gap-4">
              <div>
                <div className="font-medium text-slate-900">
                  Production Cost Floor
                </div>
                <div className="text-xs text-slate-500">
                  Studio, editing &amp; equipment baseline ({formatCurrency(100, currency)} minimum enforced)
                </div>
              </div>
              <div className="font-mono font-medium text-slate-900 shrink-0">
                {formatCurrencyExact(b.effectiveFloorCost, currency)}
              </div>
            </div>

            <div className="py-2.5 flex items-center justify-between gap-4 bg-slate-50/80 px-2.5 -mx-2.5 rounded-md">
              <div className="font-semibold text-slate-900">
                Subtotal: Organic Base Creation Fee
              </div>
              <div className="font-mono font-semibold text-slate-900 shrink-0">
                {formatCurrencyExact(b.baseCreationFee, currency)}
              </div>
            </div>

            <div className="py-2 flex items-center justify-between gap-4">
              <div>
                <div className="font-medium text-slate-900">
                  Paid Usage Rights
                </div>
                <div className="text-xs text-slate-500">
                  {USAGE_RIGHTS_SPECS[scope.usageRightsTerm].label} (
                  {(b.usageMultiplier * 100).toFixed(0)}% of Base)
                </div>
              </div>
              <div className="font-mono font-medium text-slate-900 shrink-0">
                {formatCurrencyExact(b.usageRightsFee, currency)}
              </div>
            </div>

            <div className="py-2 flex items-center justify-between gap-4">
              <div>
                <div className="font-medium text-slate-900">
                  Whitelisting / Paid Boosting
                </div>
                <div className="text-xs text-slate-500">
                  {scope.whitelistingEnabled
                    ? `${b.whitelistingBasis} · Expires in ${scope.whitelistingExpirationDays}d`
                    : 'Not enabled'}
                </div>
              </div>
              <div className="font-mono font-medium text-slate-900 shrink-0">
                {formatCurrencyExact(b.whitelistingFee, currency)}
              </div>
            </div>

            <div className="py-2 flex items-center justify-between gap-4">
              <div>
                <div className="font-medium text-slate-900">
                  Category Exclusivity
                </div>
                <div className="text-xs text-slate-500">
                  {EXCLUSIVITY_SPECS[scope.exclusivityType].label} (
                  {(b.exclusivityMultiplier * 100).toFixed(0)}% of Base)
                </div>
              </div>
              <div className="font-mono font-medium text-slate-900 shrink-0">
                {formatCurrencyExact(b.exclusivityFee, currency)}
              </div>
            </div>

            {(b.rushFee > 0 || b.excessRevisionsFee > 0) && (
              <>
                {b.rushFee > 0 && (
                  <div className="py-2 flex items-center justify-between gap-4">
                    <div>
                      <div className="font-medium text-slate-900">
                        Rush Turnaround (&lt;5 Business Days)
                      </div>
                      <div className="text-xs text-slate-500">+25% expedited surcharge</div>
                    </div>
                    <div className="font-mono font-medium text-slate-900 shrink-0">
                      {formatCurrencyExact(b.rushFee, currency)}
                    </div>
                  </div>
                )}
                {b.excessRevisionsFee > 0 && (
                  <div className="py-2 flex items-center justify-between gap-4">
                    <div>
                      <div className="font-medium text-slate-900">
                        Additional Revision Rounds (+{b.excessRevisionCount})
                      </div>
                      <div className="text-xs text-slate-500">
                        Beyond standard 2-round creative cap
                      </div>
                    </div>
                    <div className="font-mono font-medium text-slate-900 shrink-0">
                      {formatCurrencyExact(b.excessRevisionsFee, currency)}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Tax & Statutory Reminders */}
        <div className="py-3 px-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>
              Est. 15.3% US Self-Employment Tax Reserve:{' '}
              <strong className="font-mono text-slate-900">
                {formatCurrencyExact(b.estimatedSelfEmploymentTax, currency)}
              </strong>
            </span>
            <span>
              Est. Net After SE Tax:{' '}
              <strong className="font-mono text-slate-900">
                {formatCurrencyExact(b.estimatedNetAfterSETax, currency)}
              </strong>
            </span>
          </div>
          <div className="text-[11px] text-slate-500 leading-relaxed">
            2026 US Tax Note: Under the One Big Beautiful Bill Act, 1099-NEC reporting begins at $2,000, though all sponsorship revenue remains taxable.{' '}
            {b.totalRecommendedRate >= 800 &&
              'NY Freelance Isn’t Free Act applies (>= $800): mandatory payment within 30 days of completion.'}
          </div>
        </div>

        {/* Save to Deal Comparison + Export Actions */}
        <div className="pt-5 mt-5 border-t border-slate-100 space-y-3">
          <form onSubmit={handleSaveDeal} className="space-y-2.5">
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={dealNameInput}
                onChange={(e) => setDealNameInput(e.target.value)}
                placeholder="Deal label (e.g., Acme FinTech 90d Offer)"
                aria-label="Deal label for comparison"
                className="flex-1 px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
              />
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
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
                  className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 placeholder:font-sans focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
                />
                {currency !== 'USD' && Number(targetCpaInput) > 0 && (
                  <div className="text-[11px] font-mono text-blue-700 mt-1">
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
                  className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 placeholder:font-sans focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
                />
                {currency !== 'USD' && Number(targetMonthlyRevenueInput) > 0 && (
                  <div className="text-[11px] font-mono text-blue-700 mt-1">
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
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 resize-y"
            />
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 mr-1">
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
                          ? 'bg-blue-700 text-white border-blue-700'
                          : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
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
                  className="w-28 px-2 py-0.5 text-[11px] bg-white border border-slate-300 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>
          </form>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onCopyRateCard}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap cursor-pointer"
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
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-blue-800 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100/80 transition-colors whitespace-nowrap cursor-pointer"
              >
                {copiedShareLink ? (
                  <Check className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
                ) : (
                  <Share2 className="w-3.5 h-3.5 text-blue-700" aria-hidden="true" />
                )}
                Share Configuration
              </button>
              <button
                type="button"
                onClick={onScrollToScripts}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                Counter-Pitch Scripts
              </button>
            </div>

            <button
              type="button"
              onClick={onOpenComparison}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-800 cursor-pointer whitespace-nowrap"
            >
              <Scale className="w-3.5 h-3.5" aria-hidden="true" />
              <span>
                Compare Deals{savedDealsCount > 0 ? ` (${savedDealsCount})` : ''}
              </span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>

          {sharedUrl && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
              <div className="flex items-center justify-between gap-2 text-[11px]">
                <span className="font-semibold text-slate-700">
                  Shareable Configuration Link (encodes current profile &amp; scope)
                </span>
                <button
                  type="button"
                  onClick={onDismissSharedUrl}
                  aria-label="Dismiss shareable link"
                  className="text-slate-400 hover:text-slate-700 cursor-pointer"
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
                  className="flex-1 px-2.5 py-1.5 text-[11px] font-mono bg-white border border-slate-300 rounded text-slate-700 focus:outline-none focus:border-blue-600"
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
                  className="px-2.5 py-1.5 text-[11px] font-medium text-white bg-slate-900 hover:bg-slate-800 rounded transition-colors cursor-pointer shrink-0"
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
        className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-4"
      >
        <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="inline-flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-700 shrink-0" aria-hidden="true" />
              <h2 className="font-display text-base font-semibold text-slate-900">
                Campaign ROI Calculator
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Estimates units sold, conversion revenue, and ROAS against your{' '}
              <span className="font-mono text-slate-700">
                {formatCurrencyExact(b.totalRecommendedRate, currency)}
              </span>{' '}
              total deal rate.
            </p>
          </div>

          {hasValidRoiCpa && targetCpaInput !== roiTargetCpaInput && (
            <button
              type="button"
              onClick={() => setTargetCpaInput(roiTargetCpaInput)}
              className="text-xs font-medium text-blue-700 hover:text-blue-800 underline cursor-pointer whitespace-nowrap shrink-0"
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
              className="block text-xs font-semibold text-slate-700 mb-1"
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
              className="w-full px-3 py-2 text-xs sm:text-sm font-mono bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
            />
            {currency !== 'USD' && hasValidRoiCpa && (
              <div className="text-[11px] font-mono text-blue-700 mt-1">
                ≈ {formatCurrencyExact(parsedRoiTargetCpa, currency)} / conversion
              </div>
            )}
          </div>

          <div>
            <label
              htmlFor="roi-aov"
              className="block text-xs font-semibold text-slate-700 mb-1"
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
              className="w-full px-3 py-2 text-xs sm:text-sm font-mono bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
            />
            {currency !== 'USD' && Number.isFinite(parsedRoiAov) && parsedRoiAov > 0 && (
              <div className="text-[11px] font-mono text-blue-700 mt-1">
                ≈ {formatCurrencyExact(parsedRoiAov, currency)} / unit
              </div>
            )}
          </div>
        </div>

        {/* Estimated Outcomes */}
        {!campaignRoi ? (
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600">
            Enter a positive <strong>Sponsor Target CPA</strong> to estimate break-even units sold, conversion revenue, and ROAS.
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 tabular-nums">
              {/* Target CPA Pace Outcome */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                <div className="text-[11px] font-semibold text-slate-600">
                  At Target CPA ({formatCurrencyExact(campaignRoi.targetCpaUsd, currency)})
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xs text-slate-600">Units Sold Needed</span>
                  <span className="font-mono text-base font-bold text-slate-900">
                    {formatNumber(campaignRoi.unitsAtTargetCpa)} units
                  </span>
                </div>
                <div className="flex items-baseline justify-between gap-2 pt-1.5 border-t border-slate-200/80">
                  <span className="text-xs text-slate-600">Est. Revenue</span>
                  <span className="font-mono text-base font-bold text-blue-800">
                    {formatCurrencyExact(campaignRoi.revenueAtTargetCpa, currency)}
                  </span>
                </div>
                <div className="text-[11px] font-mono text-slate-500">
                  Implied Return: {campaignRoi.roasAtTargetCpa.toFixed(2)}x ROAS
                </div>
              </div>

              {/* Audience Engagement Forecast Outcome */}
              <div className="p-3.5 bg-blue-50/40 border border-blue-200 rounded-lg space-y-2">
                <div className="text-[11px] font-semibold text-blue-900">
                  Audience Forecast ({(campaignRoi.engagementCaptureRate * 100).toFixed(1)}% of{' '}
                  {formatNumber(campaignRoi.totalEngagements)} actions)
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xs text-slate-700">Projected Units Sold</span>
                  <span className="font-mono text-base font-bold text-slate-900">
                    ~{formatNumber(campaignRoi.projectedUnitsSold)} units
                  </span>
                </div>
                <div className="flex items-baseline justify-between gap-2 pt-1.5 border-t border-blue-200/80">
                  <span className="text-xs text-slate-700">Projected Revenue</span>
                  <span className="font-mono text-base font-bold text-blue-900">
                    {formatCurrencyExact(campaignRoi.projectedRevenue, currency)}
                  </span>
                </div>
                <div className="text-[11px] font-mono text-blue-800">
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
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                  : 'bg-amber-50 border-amber-200 text-amber-950'
              }`}
            >
              {campaignRoi.meetsTargetCpa ? (
                <CheckCircle2
                  className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5"
                  aria-hidden="true"
                />
              ) : (
                <AlertTriangle
                  className="w-4 h-4 text-amber-700 shrink-0 mt-0.5"
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
        className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-4 scroll-mt-24"
      >
        <div className="pb-3 border-b border-slate-100">
          <h2 className="font-display text-base font-semibold text-slate-900">
            Three-Tier Negotiation Matrix
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
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
                    ? 'border-blue-600 bg-blue-50/30'
                    : 'border-slate-200 bg-white'
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
                      <span className="font-display text-sm font-semibold text-slate-900">
                        {tier.name}
                      </span>
                      {tier.recommended && (
                        <span className="text-[11px] font-semibold text-blue-700">
                          · Recommended Anchor
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">
                      {tier.subtitle}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-mono text-base font-bold text-slate-900">
                      {formatCurrencyExact(tier.fee, currency)}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-500" aria-hidden="true" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-500" aria-hidden="true" />
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 pt-2 border-t border-slate-100 space-y-3 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <div className="font-semibold text-slate-700 mb-1">
                          Deliverables
                        </div>
                        <ul className="space-y-1 text-slate-600 list-disc pl-4">
                          {tier.deliverables.map((item, idx) => (
                            <li key={idx}>{item}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <span className="font-semibold text-slate-700">
                            Usage Rights:{' '}
                          </span>
                          <span className="text-slate-600">{tier.usageSummary}</span>
                        </div>
                        <div>
                          <span className="font-semibold text-slate-700">
                            Exclusivity:{' '}
                          </span>
                          <span className="text-slate-600">
                            {tier.exclusivitySummary}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 space-y-1">
                      {tier.lineItems.map((li) => (
                        <div
                          key={li.label}
                          className="flex items-center justify-between text-slate-600"
                        >
                          <span>{li.label}</span>
                          <span className="font-mono text-slate-900">
                            {formatCurrencyExact(li.amount, currency)}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => onApplyTierScope(tier.id)}
                        className="px-3 py-1.5 text-xs font-medium text-blue-700 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
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
