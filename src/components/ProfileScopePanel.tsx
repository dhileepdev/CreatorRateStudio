import React from 'react';
import { AlertTriangle, Info, ShieldAlert } from 'lucide-react';
import {
  CREATOR_PRESETS,
  EXCLUSIVITY_SPECS,
  NICHE_BENCHMARKS,
  PLATFORM_SPECS,
  USAGE_RIGHTS_SPECS,
} from '../data/benchmarks';
import {
  CalculatedDealResult,
  CreatorProfile,
  DealScope,
  ExclusivityType,
  NicheId,
  PlatformId,
  UsageRightsTerm,
} from '../types/calculator';
import { useCurrency } from '../context/CurrencyContext';
import { formatCurrency, formatCurrencyExact, formatNumber } from '../utils/pricingEngine';

interface ProfileScopePanelProps {
  profile: CreatorProfile;
  scope: DealScope;
  result: CalculatedDealResult;
  activePresetId: string | null;
  onApplyPreset: (presetId: string) => void;
  onChangeProfile: (updater: (prev: CreatorProfile) => CreatorProfile) => void;
  onChangeScope: (updater: (prev: DealScope) => DealScope) => void;
}

export const ProfileScopePanel: React.FC<ProfileScopePanelProps> = ({
  profile,
  scope,
  result,
  activePresetId,
  onApplyPreset,
  onChangeProfile,
  onChangeScope,
}) => {
  const { currency } = useCurrency();
  const nicheSpec = NICHE_BENCHMARKS[profile.niche];
  const platformIds: PlatformId[] = [
    'instagram_reels',
    'tiktok',
    'youtube_longform',
    'youtube_shorts',
    'instagram_story',
    'cross_post_bundle',
  ];

  const handleNumberChange = (
    raw: string,
    setter: (num: number) => void,
    min = 0
  ) => {
    const parsed = Number(raw);
    if (Number.isNaN(parsed)) {
      setter(min);
    } else {
      setter(Math.max(min, parsed));
    }
  };

  return (
    <div className="space-y-6">
      {/* Preset Quick-Load Bar */}
      <section className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
          <h2 className="font-display text-sm font-semibold text-slate-900">
            Load Benchmark Persona
          </h2>
          <span className="text-xs text-slate-500">
            Test tier calculations or enter your own analytics
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {CREATOR_PRESETS.map((preset) => {
            const isActive = activePresetId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => onApplyPreset(preset.id)}
                className={`text-left px-3 py-2.5 rounded-lg border text-xs transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                  isActive
                    ? 'border-blue-600 bg-blue-50/70 text-slate-900'
                    : 'border-slate-200 bg-slate-50/50 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="font-semibold text-slate-900 truncate">
                  {preset.label}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                  {preset.description}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Section 1: Creator Metrics & Verified Reach */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900">
              1. Creator Metrics & Verified Reach
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Prices attention from your median 10–15 non-viral views rather than vanity follower counts.
            </p>
          </div>
          <span className="text-xs font-medium text-slate-600 tabular-nums">
            {result.followerTier.label} · {result.followerTier.rangeLabel}
          </span>
        </div>

        {/* Platform Selection */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-2">
            Primary Deliverable Platform
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {platformIds.map((pid) => {
              const spec = PLATFORM_SPECS[pid];
              const active = profile.platform === pid;
              return (
                <button
                  key={pid}
                  type="button"
                  onClick={() =>
                    onChangeProfile((prev) => ({ ...prev, platform: pid }))
                  }
                  className={`px-3 py-2.5 rounded-lg border text-left transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                    active
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="text-xs font-semibold whitespace-nowrap truncate">
                    {spec.shortLabel}
                  </div>
                  <div
                    className={`text-[11px] font-mono mt-0.5 ${
                      active ? 'text-slate-300' : 'text-slate-500'
                    }`}
                  >
                    {pid === 'youtube_longform'
                      ? `${profile.youtubeMultiplier.toFixed(2)}x`
                      : `${spec.multiplier.toFixed(2)}x`}
                  </div>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-slate-500 mt-2">
            {PLATFORM_SPECS[profile.platform].description}
          </p>

          {profile.platform === 'youtube_longform' && (
            <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-medium text-slate-700">
                  YouTube Production Complexity Multiplier (4.00x – 6.00x)
                </span>
                <span className="font-mono font-semibold text-slate-900">
                  {profile.youtubeMultiplier.toFixed(2)}x
                </span>
              </div>
              <input
                type="range"
                min={4}
                max={6}
                step={0.25}
                value={profile.youtubeMultiplier}
                onChange={(e) =>
                  onChangeProfile((prev) => ({
                    ...prev,
                    youtubeMultiplier: Number(e.target.value),
                  }))
                }
                aria-label="YouTube Long-Form Multiplier"
                className="w-full accent-slate-900 cursor-pointer"
              />
            </div>
          )}
        </div>

        {/* Niche & CPM */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="niche-select"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Content Vertical / Niche
            </label>
            <select
              id="niche-select"
              value={profile.niche}
              onChange={(e) =>
                onChangeProfile((prev) => ({
                  ...prev,
                  niche: e.target.value as NicheId,
                  customCpm: null,
                }))
              }
              className="w-full px-3 py-2.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
            >
              {Object.values(NICHE_BENCHMARKS).map((n) => (
                <option key={n.id} value={n.id}>
                  {n.label}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500 mt-1.5">{nicheSpec.notes}</p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="cpm-slider"
                className="text-xs font-semibold text-slate-700"
              >
                Niche Sponsorship CPM
              </label>
              <span className="text-xs font-mono font-semibold text-slate-900">
                {formatCurrency(result.breakdown.activeCpm, currency)} / 1K views
              </span>
            </div>
            <input
              id="cpm-slider"
              type="range"
              min={nicheSpec.cpmMin}
              max={nicheSpec.cpmMax}
              step={0.5}
              value={result.breakdown.activeCpm}
              onChange={(e) =>
                onChangeProfile((prev) => ({
                  ...prev,
                  customCpm: Number(e.target.value),
                }))
              }
              className="w-full mt-2 accent-blue-700 cursor-pointer"
            />
            <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono mt-1">
              <span>{formatCurrency(nicheSpec.cpmMin, currency)} min</span>
              <button
                type="button"
                onClick={() =>
                  onChangeProfile((prev) => ({ ...prev, customCpm: null }))
                }
                className="text-blue-700 hover:underline font-sans cursor-pointer"
              >
                Reset ({formatCurrency(nicheSpec.defaultCpm, currency)})
              </button>
              <span>{formatCurrency(nicheSpec.cpmMax, currency)} max</span>
            </div>
          </div>
        </div>

        {/* Follower Count, Median Views, Production Floor */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label
              htmlFor="follower-count"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Total Followers
            </label>
            <input
              id="follower-count"
              type="number"
              min={0}
              step={500}
              value={profile.followerCount}
              onChange={(e) =>
                handleNumberChange(e.target.value, (val) =>
                  onChangeProfile((prev) => ({ ...prev, followerCount: val }))
                )
              }
              className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Used for tier benchmarking & sanity checks.
            </p>
          </div>

          <div>
            <label
              htmlFor="median-views"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Median Views (10–15 Posts)
            </label>
            <input
              id="median-views"
              type="number"
              min={0}
              step={500}
              value={profile.medianViews}
              onChange={(e) =>
                handleNumberChange(e.target.value, (val) =>
                  onChangeProfile((prev) => ({ ...prev, medianViews: val }))
                )
              }
              className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Use median (middle) non-viral view count.
            </p>
          </div>

          <div>
            <label
              htmlFor="production-floor"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Production Floor (USD)
            </label>
            <input
              id="production-floor"
              type="number"
              min={100}
              step={25}
              value={profile.productionFloorCost}
              onChange={(e) =>
                handleNumberChange(
                  e.target.value,
                  (val) =>
                    onChangeProfile((prev) => ({
                      ...prev,
                      productionFloorCost: val,
                    })),
                  0
                )
              }
              className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              {formatCurrency(100, currency)} minimum floor for gear, editing &amp; overhead.
              {currency !== 'USD' && (
                <span className="font-mono text-blue-700 ml-1">
                  (≈ {formatCurrencyExact(profile.productionFloorCost, currency)})
                </span>
              )}
            </p>
          </div>
        </div>
      </section>

      {/* Section 2: Audience Engagement Quality */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900">
              2. High-Intent Audience Engagement
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Measures saves, shares, and comments relative to median views.
            </p>
          </div>
          <div className="text-xs font-medium text-slate-800 tabular-nums">
            <span className="font-mono font-semibold text-blue-700">
              {result.breakdown.calculatedER.toFixed(1)}% ER
            </span>
            <span className="text-slate-400 mx-1.5">·</span>
            <span>{result.breakdown.engagementTierLabel}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label
              htmlFor="comments-input"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Median Comments
            </label>
            <input
              id="comments-input"
              type="number"
              min={0}
              step={10}
              value={profile.engagementMetrics.comments}
              onChange={(e) =>
                handleNumberChange(e.target.value, (val) =>
                  onChangeProfile((prev) => ({
                    ...prev,
                    engagementMetrics: {
                      ...prev.engagementMetrics,
                      comments: val,
                    },
                  }))
                )
              }
              className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
            />
          </div>

          <div>
            <label
              htmlFor="shares-input"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Median Shares
            </label>
            <input
              id="shares-input"
              type="number"
              min={0}
              step={10}
              value={profile.engagementMetrics.shares}
              onChange={(e) =>
                handleNumberChange(e.target.value, (val) =>
                  onChangeProfile((prev) => ({
                    ...prev,
                    engagementMetrics: {
                      ...prev.engagementMetrics,
                      shares: val,
                    },
                  }))
                )
              }
              className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
            />
          </div>

          <div>
            <label
              htmlFor="saves-input"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Median Saves
            </label>
            <input
              id="saves-input"
              type="number"
              min={0}
              step={10}
              value={profile.engagementMetrics.saves}
              onChange={(e) =>
                handleNumberChange(e.target.value, (val) =>
                  onChangeProfile((prev) => ({
                    ...prev,
                    engagementMetrics: {
                      ...prev.engagementMetrics,
                      saves: val,
                    },
                  }))
                )
              }
              className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-xs text-slate-500">
          <span>
            Total High-Intent Actions:{' '}
            <strong className="font-mono text-slate-800">
              {formatNumber(
                profile.engagementMetrics.comments +
                  profile.engagementMetrics.shares +
                  profile.engagementMetrics.saves
              )}
            </strong>{' '}
            / {formatNumber(profile.medianViews)} views
          </span>
          <span className="font-mono text-slate-700">
            Coefficient: {result.breakdown.engagementMultiplier.toFixed(2)}x
          </span>
        </div>
      </section>

      {/* Section 3: Contract Scope & Rights Riders */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-5">
        <div className="pb-3 border-b border-slate-100">
          <h2 className="font-display text-base font-semibold text-slate-900">
            3. Contract Scope & Rights Riders
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Price paid ad licensing, handle whitelisting, and category lockouts as separate line items.
          </p>
        </div>

        {/* Paid Usage Rights */}
        <div>
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1.5">
            <label
              htmlFor="usage-rights-select"
              className="text-xs font-semibold text-slate-700"
            >
              Paid Digital Ad Usage Rights
            </label>
            <span className="text-[11px] text-slate-500">
              Benchmark: 75% of initial brand requests seek ≤30 days
            </span>
          </div>
          <select
            id="usage-rights-select"
            value={scope.usageRightsTerm}
            onChange={(e) =>
              onChangeScope((prev) => ({
                ...prev,
                usageRightsTerm: e.target.value as UsageRightsTerm,
              }))
            }
            className="w-full px-3 py-2.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
          >
            {(Object.keys(USAGE_RIGHTS_SPECS) as UsageRightsTerm[]).map(
              (key) => {
                const spec = USAGE_RIGHTS_SPECS[key];
                return (
                  <option key={key} value={key}>
                    {spec.label} ({spec.benchmarkRange})
                  </option>
                );
              }
            )}
          </select>
          <p className="text-xs text-slate-500 mt-1.5">
            {USAGE_RIGHTS_SPECS[scope.usageRightsTerm].description}
          </p>
        </div>

        {/* Whitelisting / Paid Boosting */}
        <div className="pt-2 border-t border-slate-100 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <label
                htmlFor="whitelisting-toggle"
                className="text-xs font-semibold text-slate-800 cursor-pointer"
              >
                Handle Whitelisting / Paid Boosting (Meta Partnership / TikTok Spark Ads)
              </label>
              <p className="text-xs text-slate-500 mt-0.5">
                Billed at 20% of Base Fee or 15% of brand ad spend, whichever is higher.
              </p>
            </div>
            <button
              id="whitelisting-toggle"
              type="button"
              role="switch"
              aria-checked={scope.whitelistingEnabled}
              onClick={() =>
                onChangeScope((prev) => ({
                  ...prev,
                  whitelistingEnabled: !prev.whitelistingEnabled,
                }))
              }
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                scope.whitelistingEnabled ? 'bg-blue-700' : 'bg-slate-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  scope.whitelistingEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {scope.whitelistingEnabled && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
              <div>
                <label
                  htmlFor="ad-spend-input"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Brand Paid Ad Spend Budget (USD Optional)
                </label>
                <input
                  id="ad-spend-input"
                  type="number"
                  min={0}
                  step={500}
                  value={scope.whitelistingAdSpendEstimate}
                  onChange={(e) =>
                    handleNumberChange(e.target.value, (val) =>
                      onChangeScope((prev) => ({
                        ...prev,
                        whitelistingAdSpendEstimate: val,
                      }))
                    )
                  }
                  className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Enter $0 to apply standard 20% Base Fee rate.
                  {currency !== 'USD' && scope.whitelistingAdSpendEstimate > 0 && (
                    <span className="font-mono text-blue-700 ml-1">
                      (≈ {formatCurrencyExact(scope.whitelistingAdSpendEstimate, currency)})
                    </span>
                  )}
                </p>
              </div>
              <div>
                <label
                  htmlFor="whitelisting-exp"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Mandatory Auth Expiration (Days)
                </label>
                <input
                  id="whitelisting-exp"
                  type="number"
                  min={7}
                  max={365}
                  step={15}
                  value={scope.whitelistingExpirationDays}
                  onChange={(e) =>
                    handleNumberChange(
                      e.target.value,
                      (val) =>
                        onChangeScope((prev) => ({
                          ...prev,
                          whitelistingExpirationDays: val,
                        })),
                      7
                    )
                  }
                  className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Prevents uncapped Spark / Meta ad access.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Category Exclusivity */}
        <div className="pt-2 border-t border-slate-100">
          <label className="block text-xs font-semibold text-slate-700 mb-2">
            Category Exclusivity Scope
          </label>
          <div className="space-y-2">
            {(Object.keys(EXCLUSIVITY_SPECS) as ExclusivityType[]).map((key) => {
              const spec = EXCLUSIVITY_SPECS[key];
              const selected = scope.exclusivityType === key;
              const isBlanket = key === 'blanket_vertical_prohibition';
              return (
                <label
                  key={key}
                  className={`flex items-start justify-between gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selected
                      ? isBlanket
                        ? 'border-red-300 bg-red-50/60'
                        : 'border-blue-600 bg-blue-50/50'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <input
                      type="radio"
                      name="exclusivity-type"
                      checked={selected}
                      onChange={() =>
                        onChangeScope((prev) => ({
                          ...prev,
                          exclusivityType: key,
                        }))
                      }
                      className="mt-0.5 accent-blue-700"
                    />
                    <div>
                      <div className="text-xs font-semibold text-slate-900">
                        {spec.label}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {spec.description}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`text-xs font-mono whitespace-nowrap shrink-0 ${
                      isBlanket ? 'text-red-700 font-semibold' : 'text-slate-600'
                    }`}
                  >
                    {spec.benchmarkRange}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Turnaround & Revision Governance */}
        <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Delivery Turnaround Window
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() =>
                  onChangeScope((prev) => ({
                    ...prev,
                    turnaroundWindow: 'standard_14d',
                  }))
                }
                className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                  scope.turnaroundWindow === 'standard_14d'
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                Standard (14d)
              </button>
              <button
                type="button"
                onClick={() =>
                  onChangeScope((prev) => ({
                    ...prev,
                    turnaroundWindow: 'rush_under_5d',
                  }))
                }
                className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                  scope.turnaroundWindow === 'rush_under_5d'
                    ? 'border-amber-700 bg-amber-700 text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                Rush (&lt;5d, +25%)
              </button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="revisions-input"
                className="text-xs font-semibold text-slate-700"
              >
                Included Revision Rounds
              </label>
              <span className="text-[11px] text-slate-500">
                Standard cap: 2 rounds
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="revisions-input"
                type="number"
                min={1}
                max={10}
                value={scope.includedRevisionRounds}
                onChange={(e) =>
                  handleNumberChange(
                    e.target.value,
                    (val) =>
                      onChangeScope((prev) => ({
                        ...prev,
                        includedRevisionRounds: val,
                      })),
                    1
                  )
                }
                className="w-20 px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
              />
              {scope.includedRevisionRounds > 2 ? (
                <div className="flex-1 flex items-center gap-1.5 text-xs text-slate-700">
                  <span>Fee/extra:</span>
                  <select
                    aria-label="Excess revision fee per round"
                    value={scope.excessRevisionFeePerRound}
                    onChange={(e) =>
                      onChangeScope((prev) => ({
                        ...prev,
                        excessRevisionFeePerRound: Number(e.target.value),
                      }))
                    }
                    className="px-2 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg"
                  >
                    <option value={150}>{formatCurrency(150, currency)}/rd</option>
                    <option value={200}>{formatCurrency(200, currency)}/rd</option>
                    <option value={250}>{formatCurrency(250, currency)}/rd</option>
                    <option value={350}>{formatCurrency(350, currency)}/rd</option>
                  </select>
                </div>
              ) : (
                <span className="text-xs text-slate-500">
                  2 rounds covered in Base Fee
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Defensive Guardrails & Active Warnings */}
      {result.warnings.length > 0 && (
        <section aria-label="Pricing and scope guardrails" className="space-y-3">
          {result.warnings.map((w) => {
            const styles =
              w.severity === 'critical'
                ? 'bg-red-50 border-red-200 text-red-950'
                : w.severity === 'warning'
                ? 'bg-amber-50 border-amber-200 text-amber-950'
                : 'bg-blue-50/70 border-blue-200 text-slate-900';

            const IconComponent =
              w.severity === 'critical'
                ? ShieldAlert
                : w.severity === 'warning'
                ? AlertTriangle
                : Info;

            const iconColor =
              w.severity === 'critical'
                ? 'text-red-700'
                : w.severity === 'warning'
                ? 'text-amber-700'
                : 'text-blue-700';

            return (
              <div
                key={w.id}
                className={`border rounded-xl p-4 flex items-start gap-3 ${styles}`}
              >
                <IconComponent
                  className={`w-4 h-4 mt-0.5 shrink-0 ${iconColor}`}
                  aria-hidden="true"
                />
                <div className="space-y-1 text-xs">
                  <div className="font-semibold">{w.title}</div>
                  <p className="leading-relaxed opacity-90">{w.message}</p>
                  {w.actionHint && (
                    <p className="font-medium underline underline-offset-2 pt-0.5">
                      Recommended: {w.actionHint}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
};
