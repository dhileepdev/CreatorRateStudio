import React, { useMemo, useState } from 'react';
import { CalendarRange, CheckCircle2, AlertTriangle, TrendingUp } from 'lucide-react';
import { useCurrency } from '../context/CurrencyContext';
import { INDUSTRY_TIER_BENCHMARKS, NICHE_BENCHMARKS } from '../data/benchmarks';
import {
  CalculatedDealResult,
  CreatorProfile,
  SavedDealSnapshot,
} from '../types/calculator';
import { formatCurrency, formatCurrencyExact, formatNumber } from '../utils/pricingEngine';

interface BenchmarksSectionProps {
  profile: CreatorProfile;
  result: CalculatedDealResult;
  savedDeals?: SavedDealSnapshot[];
}

type RateBasis = 'current' | 'tierB' | 'tierA' | 'custom';

const FREQUENCY_PRESETS = [1, 2, 3, 4, 6, 8];

export const BenchmarksSection: React.FC<BenchmarksSectionProps> = ({
  profile,
  result,
  savedDeals = [],
}) => {
  const { currency } = useCurrency();

  const savedMonthlyTargetUsd = useMemo(() => {
    const goals = savedDeals
      .map((d) => d.targetMonthlyRevenue)
      .filter((v): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0);
    if (goals.length === 0) return null;
    return goals[goals.length - 1];
  }, [savedDeals]);

  const [rateBasis, setRateBasis] = useState<RateBasis>('current');
  const [customDealRateInput, setCustomDealRateInput] = useState<string>(() =>
    String(Math.round(result.breakdown.totalRecommendedRate))
  );
  const [campaignsPerMonthInput, setCampaignsPerMonthInput] = useState<string>('2');
  const [monthlyTargetInput, setMonthlyTargetInput] = useState<string>(() =>
    String(savedMonthlyTargetUsd ?? 10000)
  );

  const activeDealRateUsd = useMemo(() => {
    if (rateBasis === 'tierA') return result.tieredPackages.tierA_Organic.fee;
    if (rateBasis === 'tierB') return result.tieredPackages.tierB_StandardGrowth.fee;
    if (rateBasis === 'custom') {
      const parsed = Number(customDealRateInput);
      return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
    }
    return result.breakdown.totalRecommendedRate;
  }, [rateBasis, customDealRateInput, result]);

  const campaignsPerMonth = useMemo(() => {
    const parsed = Number(campaignsPerMonthInput);
    if (!Number.isFinite(parsed) || parsed < 0) return 0;
    return Math.min(30, parsed);
  }, [campaignsPerMonthInput]);

  const monthlyTargetUsd = useMemo(() => {
    const parsed = Number(monthlyTargetInput);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }, [monthlyTargetInput]);

  const projection = useMemo(() => {
    const projectedMonthlyRevenue = activeDealRateUsd * campaignsPerMonth;
    const projectedAnnualRevenue = projectedMonthlyRevenue * 12;
    const annualCampaignCount = campaignsPerMonth * 12;
    const annualSeTaxReserve = projectedAnnualRevenue * 0.153;
    const annualNetAfterTax = projectedAnnualRevenue - annualSeTaxReserve;

    const annualTargetRevenue = monthlyTargetUsd * 12;
    const annualDelta =
      annualTargetRevenue > 0 ? projectedAnnualRevenue - annualTargetRevenue : null;
    const targetAchievementPct =
      annualTargetRevenue > 0 ? (projectedAnnualRevenue / annualTargetRevenue) * 100 : null;
    const campaignsNeededPerMonth =
      monthlyTargetUsd > 0 && activeDealRateUsd > 0
        ? monthlyTargetUsd / activeDealRateUsd
        : null;

    const quarters = [
      { label: 'Q1 (Months 1–3)', months: 3 },
      { label: 'Q2 (Months 4–6)', months: 6 },
      { label: 'Q3 (Months 7–9)', months: 9 },
      { label: 'Q4 (Months 10–12)', months: 12 },
    ].map((q) => ({
      ...q,
      cumulativeGross: projectedMonthlyRevenue * q.months,
      cumulativeTarget: monthlyTargetUsd * q.months,
      campaignsCompleted: campaignsPerMonth * q.months,
    }));

    return {
      projectedMonthlyRevenue,
      projectedAnnualRevenue,
      annualCampaignCount,
      annualSeTaxReserve,
      annualNetAfterTax,
      annualTargetRevenue,
      annualDelta,
      targetAchievementPct,
      campaignsNeededPerMonth,
      quarters,
    };
  }, [activeDealRateUsd, campaignsPerMonth, monthlyTargetUsd]);

  return (
    <section id="benchmarks" className="space-y-6 scroll-mt-24">
      <div>
        <h2 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100">
          2026 Industry Sponsorship Benchmarks &amp; CPM Reference ({currency})
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Cross-reference your median-view Base Creation Fee against published 2026 CreatiCalc, InfluenceFlow, and Gigapay benchmarks.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Follower Tier Table */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/70 flex items-center justify-between gap-2">
            <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
              Average Organic Sponsorship Rates by Follower Tier
            </h3>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Your Tier:{' '}
              <strong className="text-blue-700 dark:text-blue-400">
                {result.followerTier.label}
              </strong>
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 bg-slate-50/40 dark:bg-slate-950/40">
                  <th className="py-2.5 px-4 font-semibold">Tier</th>
                  <th className="py-2.5 px-4 font-semibold">Followers</th>
                  <th className="py-2.5 px-4 font-semibold text-right">IG Reel</th>
                  <th className="py-2.5 px-4 font-semibold text-right">TikTok</th>
                  <th className="py-2.5 px-4 font-semibold text-right">YT Long-Form</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Typical ER</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 tabular-nums">
                {INDUSTRY_TIER_BENCHMARKS.map((row) => {
                  const isCurrent = row.id === result.followerTier.id;
                  const suffix = row.isPlus ? '+' : '';
                  return (
                    <tr
                      key={row.id}
                      className={
                        isCurrent
                          ? 'bg-blue-50/60 dark:bg-blue-950/40 font-medium text-slate-900 dark:text-slate-100'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50/60 dark:hover:bg-slate-800/40'
                      }
                    >
                      <td className="py-2.5 px-4 font-semibold text-slate-900 dark:text-slate-100">
                        {row.tierName}
                        {isCurrent && (
                          <span className="ml-1.5 text-[11px] text-blue-700 dark:text-blue-400 font-semibold">
                            (You)
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-slate-600 dark:text-slate-400">
                        {row.followerRange}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-right">
                        {formatCurrency(row.instagramReelUsd, currency)}
                        {suffix}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-right">
                        {formatCurrency(row.tiktokVideoUsd, currency)}
                        {suffix}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-right">
                        {formatCurrency(row.youtubeLongFormUsd, currency)}
                        {suffix}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-right text-slate-600 dark:text-slate-400">
                        {row.typicalER}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Niche CPM Table */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/70">
            <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
              2026 Verified Niche Sponsorship CPMs
            </h3>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {Object.values(NICHE_BENCHMARKS).map((niche) => {
              const isCurrent = niche.id === profile.niche;
              return (
                <div
                  key={niche.id}
                  className={`px-4 py-3 flex items-center justify-between gap-4 ${
                    isCurrent ? 'bg-blue-50/60 dark:bg-blue-950/40' : ''
                  }`}
                >
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-slate-100">
                      {niche.label}
                      {isCurrent && (
                        <span className="ml-1.5 text-[11px] text-blue-700 dark:text-blue-400">
                          (Active)
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Default benchmark: {formatCurrency(niche.defaultCpm, currency)} / 1K views
                    </div>
                  </div>
                  <div className="font-mono font-semibold text-slate-900 dark:text-slate-100 shrink-0">
                    {formatCurrency(niche.cpmMin, currency)} – {formatCurrency(niche.cpmMax, currency)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Projected Annual Revenue Calculator */}
      <section
        id="annual-revenue"
        aria-label="Projected Annual Revenue calculator"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/70 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2">
              <CalendarRange className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0" aria-hidden="true" />
              <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                Projected Annual Revenue Calculator (12-Month Extrapolation)
              </h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Extrapolates your deal rate and monthly sponsorship targets across 12 months based on your target campaign cadence.
            </p>
          </div>

          {savedMonthlyTargetUsd !== null &&
            Number(monthlyTargetInput) !== savedMonthlyTargetUsd && (
              <button
                type="button"
                onClick={() => setMonthlyTargetInput(String(savedMonthlyTargetUsd))}
                className="text-xs font-medium text-blue-700 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline cursor-pointer whitespace-nowrap shrink-0"
              >
                Use Saved Monthly Goal ({formatCurrencyExact(savedMonthlyTargetUsd, currency)})
              </button>
            )}
        </div>

        <div className="p-5 sm:p-6 space-y-5">
          {/* Controls Row */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Rate Basis & Optional Custom Rate */}
            <div className="lg:col-span-5 space-y-2.5">
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                1. Deal Rate per Campaign
              </div>
              <div
                role="group"
                aria-label="Deal rate basis for annual projection"
                className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-1.5"
              >
                {(
                  [
                    {
                      id: 'current' as const,
                      label: 'Current Rate',
                      rate: result.breakdown.totalRecommendedRate,
                    },
                    {
                      id: 'tierB' as const,
                      label: 'Option B Anchor',
                      rate: result.tieredPackages.tierB_StandardGrowth.fee,
                    },
                    {
                      id: 'tierA' as const,
                      label: 'Organic Base',
                      rate: result.tieredPackages.tierA_Organic.fee,
                    },
                    {
                      id: 'custom' as const,
                      label: 'Custom Rate',
                      rate: null,
                    },
                  ] as const
                ).map((opt) => {
                  const active = rateBasis === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => {
                        setRateBasis(opt.id);
                        if (opt.id === 'custom' && customDealRateInput.trim() === '') {
                          setCustomDealRateInput(
                            String(Math.round(result.breakdown.totalRecommendedRate))
                          );
                        }
                      }}
                      className={`px-3 py-2 text-left rounded-lg border transition-colors cursor-pointer ${
                        active
                          ? 'bg-slate-900 dark:bg-blue-600 text-white border-slate-900 dark:border-blue-600'
                          : 'bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="text-[11px] font-medium whitespace-nowrap">
                        {opt.label}
                      </div>
                      <div
                        className={`text-xs font-mono font-bold tabular-nums mt-0.5 ${
                          active ? 'text-blue-200 dark:text-blue-100' : 'text-slate-900 dark:text-slate-100'
                        }`}
                      >
                        {opt.rate !== null
                          ? formatCurrencyExact(opt.rate, currency)
                          : formatCurrencyExact(activeDealRateUsd, currency)}
                      </div>
                    </button>
                  );
                })}
              </div>

              {rateBasis === 'custom' && (
                <div>
                  <label
                    htmlFor="annual-custom-rate"
                    className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1"
                  >
                    Custom Campaign Rate (USD)
                  </label>
                  <input
                    id="annual-custom-rate"
                    type="number"
                    min={0}
                    step="any"
                    value={customDealRateInput}
                    onChange={(e) => setCustomDealRateInput(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
                  />
                  {currency !== 'USD' && activeDealRateUsd > 0 && (
                    <div className="text-[11px] font-mono text-blue-700 dark:text-blue-400 mt-1">
                      ≈ {formatCurrencyExact(activeDealRateUsd, currency)} / campaign
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Campaign Frequency */}
            <div className="lg:col-span-4 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="annual-campaign-freq"
                  className="text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  2. Campaign Frequency (Deals / Month)
                </label>
                <span className="font-mono text-xs font-bold text-blue-700 dark:text-blue-400 tabular-nums">
                  {formatNumber(projection.annualCampaignCount)} deals/yr
                </span>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={0.5}
                  max={12}
                  step={0.5}
                  aria-label="Campaign frequency slider"
                  value={Math.min(12, Math.max(0.5, campaignsPerMonth || 0.5))}
                  onChange={(e) => setCampaignsPerMonthInput(e.target.value)}
                  className="flex-1 accent-blue-700 dark:accent-blue-500 cursor-pointer"
                />
                <input
                  id="annual-campaign-freq"
                  type="number"
                  min={0}
                  max={30}
                  step={0.5}
                  value={campaignsPerMonthInput}
                  onChange={(e) => setCampaignsPerMonthInput(e.target.value)}
                  className="w-20 px-2.5 py-1.5 text-xs font-mono text-right bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {FREQUENCY_PRESETS.map((freq) => {
                  const active = Math.abs(campaignsPerMonth - freq) < 0.01;
                  return (
                    <button
                      key={`freq-${freq}`}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setCampaignsPerMonthInput(String(freq))}
                      className={`px-2.5 py-1 text-[11px] font-mono font-medium rounded-md border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                        active
                          ? 'bg-blue-700 dark:bg-blue-600 text-white border-blue-700 dark:border-blue-600'
                          : 'bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {freq}/mo
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Monthly Deal Revenue Target */}
            <div className="lg:col-span-3 space-y-2">
              <label
                htmlFor="annual-monthly-target"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                3. Monthly Deal Target (USD)
              </label>
              <input
                id="annual-monthly-target"
                type="number"
                min={0}
                step={100}
                value={monthlyTargetInput}
                onChange={(e) => setMonthlyTargetInput(e.target.value)}
                placeholder="e.g., 10000"
                className="w-full px-3 py-2 text-xs sm:text-sm font-mono bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
              />
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums space-y-0.5">
                <div>
                  12-Mo Goal:{' '}
                  <strong className="text-slate-800 dark:text-slate-200">
                    {formatCurrencyExact(projection.annualTargetRevenue, currency)}
                  </strong>
                </div>
                {projection.campaignsNeededPerMonth !== null && (
                  <div>
                    Pace needed:{' '}
                    <strong className="text-slate-800 dark:text-slate-200">
                      {projection.campaignsNeededPerMonth.toFixed(1)} deals/mo
                    </strong>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 12-Month Extrapolation Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 tabular-nums">
            <div className="p-4 bg-blue-50/50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/70 rounded-lg space-y-1">
              <div className="text-[11px] font-semibold text-blue-900 dark:text-blue-300">
                Projected Annual Revenue
              </div>
              <div className="font-mono text-xl sm:text-2xl font-bold text-blue-950 dark:text-blue-100">
                {formatCurrencyExact(projection.projectedAnnualRevenue, currency)}
              </div>
              <div className="text-[11px] text-blue-800 dark:text-blue-300/90 font-mono">
                {formatCurrencyExact(activeDealRateUsd, currency)} × {campaignsPerMonth}/mo × 12
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-lg space-y-1">
              <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                Monthly Run Rate
              </div>
              <div className="font-mono text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
                {formatCurrencyExact(projection.projectedMonthlyRevenue, currency)}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                {campaignsPerMonth} {campaignsPerMonth === 1 ? 'campaign' : 'campaigns'} / month
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-lg space-y-1">
              <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                Est. Net After 15.3% SE Tax
              </div>
              <div className="font-mono text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
                {formatCurrencyExact(projection.annualNetAfterTax, currency)}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                Tax reserve: {formatCurrencyExact(projection.annualSeTaxReserve, currency)}/yr
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-lg space-y-1">
              <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                Annual Variance vs. Goal
              </div>
              <div
                className={`font-mono text-xl sm:text-2xl font-bold ${
                  projection.annualDelta === null
                    ? 'text-slate-900 dark:text-slate-100'
                    : projection.annualDelta >= 0
                    ? 'text-emerald-800 dark:text-emerald-400'
                    : 'text-amber-800 dark:text-amber-400'
                }`}
              >
                {projection.annualDelta !== null
                  ? `${projection.annualDelta >= 0 ? '+' : ''}${formatCurrencyExact(
                      projection.annualDelta,
                      currency
                    )}`
                  : '—'}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                {projection.targetAchievementPct !== null
                  ? `${projection.targetAchievementPct.toFixed(0)}% of 12-mo target`
                  : 'Set a monthly target'}
              </div>
            </div>
          </div>

          {/* Goal Progress Bar + Quarterly Cumulative Milestones */}
          <div className="space-y-3 pt-1">
            {projection.targetAchievementPct !== null && (
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="inline-flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
                    {projection.annualDelta !== null && projection.annualDelta >= 0 ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0" aria-hidden="true" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" aria-hidden="true" />
                    )}
                    <span>
                      {projection.annualDelta !== null && projection.annualDelta >= 0
                        ? `On pace to exceed your 12-month goal by ${formatCurrencyExact(
                            projection.annualDelta,
                            currency
                          )}`
                        : `Need ${
                            projection.campaignsNeededPerMonth !== null
                              ? `${projection.campaignsNeededPerMonth.toFixed(1)} campaigns/mo`
                              : 'higher frequency'
                          } at ${formatCurrencyExact(activeDealRateUsd, currency)} to reach ${formatCurrencyExact(
                            projection.annualTargetRevenue,
                            currency
                          )}/yr`}
                    </span>
                  </span>
                  <span className="font-mono font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                    {projection.targetAchievementPct.toFixed(1)}%
                  </span>
                </div>
                <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-sm overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      projection.targetAchievementPct >= 100
                        ? 'bg-emerald-700 dark:bg-emerald-500'
                        : 'bg-blue-700 dark:bg-blue-500'
                    }`}
                    style={{
                      width: `${Math.min(100, Math.max(0, projection.targetAchievementPct))}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Quarterly Cumulative Run-Rate Strip */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-1 tabular-nums">
              {projection.quarters.map((q) => (
                <div
                  key={q.label}
                  className="px-3.5 py-2.5 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-950/60 space-y-1"
                >
                  <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{q.label}</span>
                    <span className="font-mono">{q.campaignsCompleted} deals</span>
                  </div>
                  <div className="font-mono text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400 shrink-0" aria-hidden="true" />
                    {formatCurrencyExact(q.cumulativeGross, currency)}
                  </div>
                  {q.cumulativeTarget > 0 && (
                    <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                      Target: {formatCurrencyExact(q.cumulativeTarget, currency)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </section>
  );
};
