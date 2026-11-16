import React, { useState } from 'react';
import {
  ArrowRight,
  BookmarkPlus,
  ChevronDown,
  ChevronUp,
  Copy,
  FileText,
  Scale,
  Tag,
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
import { formatCurrencyExact, formatNumber } from '../utils/pricingEngine';

interface ValuationPanelProps {
  profile: CreatorProfile;
  scope: DealScope;
  result: CalculatedDealResult;
  savedDealsCount: number;
  onCopyRateCard: () => void;
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
  onCopyRateCard,
  onSaveToComparison,
  onOpenComparison,
  onScrollToScripts,
  onApplyTierScope,
}) => {
  const [dealNameInput, setDealNameInput] = useState('');
  const [dealNotesInput, setDealNotesInput] = useState('');
  const [targetCpaInput, setTargetCpaInput] = useState('');
  const [targetMonthlyRevenueInput, setTargetMonthlyRevenueInput] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTagInput, setCustomTagInput] = useState('');
  const [expandedTier, setExpandedTier] = useState<'tierA' | 'tierB' | 'tierC' | null>('tierB');

  const b = result.breakdown;
  const platformSpec = PLATFORM_SPECS[profile.platform];
  const nicheSpec = NICHE_BENCHMARKS[profile.niche];

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
              Total Recommended Deal Rate
            </div>
            <div className="font-display text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight font-mono mt-1">
              {formatCurrencyExact(b.totalRecommendedRate)}
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
          </div>

          <div className="flex flex-col items-start sm:items-end gap-1 text-xs">
            <span className="text-slate-500">Base Creation Fee</span>
            <span className="font-mono text-lg font-semibold text-slate-900">
              {formatCurrencyExact(b.baseCreationFee)}
            </span>
            <span className="text-[11px] text-slate-500 font-mono">
              +{formatCurrencyExact(b.totalCommercialRiders)} in rights riders
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
                  ({formatNumber(profile.medianViews)} / 1,000) × ${b.activeCpm.toFixed(2)} CPM ×{' '}
                  {b.platformMultiplier.toFixed(2)}x × {b.engagementMultiplier.toFixed(2)}x ER
                </div>
              </div>
              <div className="font-mono font-medium text-slate-900 shrink-0">
                {formatCurrencyExact(b.rawReachValue)}
              </div>
            </div>

            <div className="py-2 flex items-center justify-between gap-4">
              <div>
                <div className="font-medium text-slate-900">
                  Production Cost Floor
                </div>
                <div className="text-xs text-slate-500">
                  Studio, editing & equipment baseline ($100 minimum enforced)
                </div>
              </div>
              <div className="font-mono font-medium text-slate-900 shrink-0">
                {formatCurrencyExact(b.effectiveFloorCost)}
              </div>
            </div>

            <div className="py-2.5 flex items-center justify-between gap-4 bg-slate-50/80 px-2.5 -mx-2.5 rounded-md">
              <div className="font-semibold text-slate-900">
                Subtotal: Organic Base Creation Fee
              </div>
              <div className="font-mono font-semibold text-slate-900 shrink-0">
                {formatCurrencyExact(b.baseCreationFee)}
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
                {formatCurrencyExact(b.usageRightsFee)}
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
                {formatCurrencyExact(b.whitelistingFee)}
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
                {formatCurrencyExact(b.exclusivityFee)}
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
                      {formatCurrencyExact(b.rushFee)}
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
                      {formatCurrencyExact(b.excessRevisionsFee)}
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
                {formatCurrencyExact(b.estimatedSelfEmploymentTax)}
              </strong>
            </span>
            <span>
              Est. Net After SE Tax:{' '}
              <strong className="font-mono text-slate-900">
                {formatCurrencyExact(b.estimatedNetAfterSETax)}
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
              <input
                type="number"
                min={1}
                step="any"
                value={targetCpaInput}
                onChange={(e) => setTargetCpaInput(e.target.value)}
                placeholder="Brand Target CPA ($ Optional)"
                aria-label="Brand Target CPA in dollars"
                className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 placeholder:font-sans focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
              />
              <input
                type="number"
                min={100}
                step="any"
                value={targetMonthlyRevenueInput}
                onChange={(e) => setTargetMonthlyRevenueInput(e.target.value)}
                placeholder="Target Monthly Revenue ($ Optional)"
                aria-label="Target Monthly Revenue goal in dollars"
                className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 placeholder:font-sans focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
              />
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
        </div>
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
                      {formatCurrencyExact(tier.fee)}
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
                            {formatCurrencyExact(li.amount)}
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
