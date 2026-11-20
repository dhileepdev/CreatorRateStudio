import React from 'react';
import {
  Activity,
  Minus,
  RotateCcw,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { useCurrency } from '../context/CurrencyContext';
import {
  CalculatedDealResult,
  CreatorProfile,
  EngagementVelocityBenchmarks,
} from '../types/calculator';
import {
  formatCurrencyExact,
  formatNumber,
  getDefaultEngagementVelocity,
} from '../utils/pricingEngine';

interface EngagementVelocityWidgetProps {
  profile: CreatorProfile;
  result: CalculatedDealResult;
  onChangeProfile: (updater: (prev: CreatorProfile) => CreatorProfile) => void;
}

const SENSITIVITY_PRESETS: Array<{ value: number; label: string }> = [
  { value: 0.5, label: '0.50x Conservative' },
  { value: 1.0, label: '1.00x Balanced' },
  { value: 1.5, label: '1.50x Responsive' },
  { value: 2.0, label: '2.00x High-Beta' },
];

export const EngagementVelocityWidget: React.FC<EngagementVelocityWidgetProps> = ({
  profile,
  result,
  onChangeProfile,
}) => {
  const { currency } = useCurrency();
  const b = result.breakdown;

  const fallbackVelocity = getDefaultEngagementVelocity(
    profile.medianViews,
    b.calculatedER
  );
  const velocity: EngagementVelocityBenchmarks =
    profile.engagementVelocity ?? fallbackVelocity;

  const updateVelocity = (
    updater: (prev: EngagementVelocityBenchmarks) => EngagementVelocityBenchmarks
  ) => {
    onChangeProfile((prev) => {
      const current =
        prev.engagementVelocity ??
        getDefaultEngagementVelocity(prev.medianViews, b.calculatedER);
      return {
        ...prev,
        engagementVelocity: updater(current),
      };
    });
  };

  const handleNumericField = (
    raw: string,
    field: 'recentLowViews' | 'recentHighViews' | 'recentLowER' | 'recentHighER',
    maxVal?: number
  ) => {
    const parsed = Number(raw);
    const safe = Number.isNaN(parsed)
      ? 0
      : maxVal !== undefined
        ? Math.min(maxVal, Math.max(0, parsed))
        : Math.max(0, parsed);
    updateVelocity((prev) => ({
      ...prev,
      [field]: safe,
    }));
  };

  const handleSyncToCurrent = () => {
    const synced = getDefaultEngagementVelocity(profile.medianViews, b.calculatedER);
    updateVelocity((prev) => ({
      ...synced,
      enabled: prev.enabled,
      sensitivity: prev.sensitivity,
    }));
  };

  const lowViews = Math.min(velocity.recentLowViews, velocity.recentHighViews);
  const highViews = Math.max(velocity.recentLowViews, velocity.recentHighViews);
  const lowER = Math.min(velocity.recentLowER, velocity.recentHighER);
  const highER = Math.max(velocity.recentLowER, velocity.recentHighER);
  const hasInvertedBounds =
    velocity.recentLowViews > velocity.recentHighViews ||
    velocity.recentLowER > velocity.recentHighER;

  const velocityDeltaPct = (b.velocityMultiplier - 1) * 100;
  const staticReachValue =
    b.velocityMultiplier > 0 ? b.rawReachValue / b.velocityMultiplier : b.rawReachValue;
  const reachImpactUsd = b.velocityEnabled ? b.rawReachValue - staticReachValue : 0;

  const spreadLabel =
    b.viewSpreadRatio <= 2.0
      ? 'Tight Consistency'
      : b.viewSpreadRatio <= 4.0
        ? 'Moderate Variance'
        : 'High Viral Volatility';

  const statusTone = !b.velocityEnabled
    ? 'text-slate-600 dark:text-slate-400'
    : b.velocityIndex >= 10
      ? 'text-emerald-700 dark:text-emerald-400'
      : b.velocityIndex <= -10
        ? 'text-amber-700 dark:text-amber-400'
        : 'text-blue-700 dark:text-blue-400';

  const StatusIcon = !b.velocityEnabled
    ? Minus
    : b.velocityIndex >= 10
      ? TrendingUp
      : b.velocityIndex <= -10
        ? TrendingDown
        : Minus;

  const maxSwingPct = Math.min(45, Math.round(20 * velocity.sensitivity));

  return (
    <section
      aria-label="Engagement velocity and valuation sensitivity"
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 space-y-5"
    >
      {/* Header Row */}
      <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Activity
              className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0"
              aria-hidden="true"
            />
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              Engagement Velocity &amp; Engine Sensitivity
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Enter your recent low and high performance benchmarks to dynamically tune how strongly the valuation engine reacts to momentum.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <label
            htmlFor="velocity-enabled-toggle"
            className="text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer whitespace-nowrap"
          >
            {velocity.enabled ? 'Active in Engine' : 'Static Model'}
          </label>
          <button
            id="velocity-enabled-toggle"
            type="button"
            role="switch"
            aria-checked={velocity.enabled}
            onClick={() =>
              updateVelocity((prev) => ({ ...prev, enabled: !prev.enabled }))
            }
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
              velocity.enabled
                ? 'bg-blue-700 dark:bg-blue-600'
                : 'bg-slate-300 dark:bg-slate-700'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                velocity.enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Live Velocity Telemetry Strip (Unboxed Metadata, Tabular Numerals) */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs tabular-nums">
        <div className={`inline-flex items-center gap-1.5 font-semibold ${statusTone}`}>
          <StatusIcon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>{b.velocityStatusLabel}</span>
          {b.velocityEnabled && (
            <>
              <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
                ·
              </span>
              <span className="font-mono">
                Index {b.velocityIndex >= 0 ? `+${b.velocityIndex}` : b.velocityIndex}
              </span>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-slate-700 dark:text-slate-300">
          <span>
            Multiplier:{' '}
            <strong className="text-slate-900 dark:text-slate-100">
              {b.velocityMultiplier.toFixed(2)}x
            </strong>
            {b.velocityEnabled && (
              <span className={`ml-1 ${statusTone}`}>
                ({velocityDeltaPct >= 0 ? '+' : ''}
                {velocityDeltaPct.toFixed(1)}%)
              </span>
            )}
          </span>
          <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
            ·
          </span>
          <span>
            Reach Impact:{' '}
            <strong className={reachImpactUsd >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}>
              {reachImpactUsd >= 0 ? '+' : ''}
              {formatCurrencyExact(reachImpactUsd, currency)}
            </strong>
          </span>
        </div>
      </div>

      {/* Recent High / Low Benchmark Inputs */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Recent Performance Benchmarks (Last 10–15 Posts)
          </span>
          <button
            type="button"
            onClick={handleSyncToCurrent}
            className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 dark:text-blue-400 hover:underline cursor-pointer whitespace-nowrap shrink-0"
          >
            <RotateCcw className="w-3 h-3" aria-hidden="true" />
            Sync Band to Current Metrics
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label
              htmlFor="velocity-low-views"
              className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1"
            >
              Recent Low Views
            </label>
            <input
              id="velocity-low-views"
              type="number"
              min={0}
              step={500}
              value={velocity.recentLowViews}
              onChange={(e) => handleNumericField(e.target.value, 'recentLowViews')}
              className="w-full px-2.5 py-2 text-xs sm:text-sm font-mono tabular-nums bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
            />
          </div>

          <div>
            <label
              htmlFor="velocity-high-views"
              className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1"
            >
              Recent High Views
            </label>
            <input
              id="velocity-high-views"
              type="number"
              min={0}
              step={500}
              value={velocity.recentHighViews}
              onChange={(e) => handleNumericField(e.target.value, 'recentHighViews')}
              className="w-full px-2.5 py-2 text-xs sm:text-sm font-mono tabular-nums bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
            />
          </div>

          <div>
            <label
              htmlFor="velocity-low-er"
              className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1"
            >
              Recent Low ER (%)
            </label>
            <input
              id="velocity-low-er"
              type="number"
              min={0}
              max={100}
              step={0.1}
              value={velocity.recentLowER}
              onChange={(e) => handleNumericField(e.target.value, 'recentLowER', 100)}
              className="w-full px-2.5 py-2 text-xs sm:text-sm font-mono tabular-nums bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
            />
          </div>

          <div>
            <label
              htmlFor="velocity-high-er"
              className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1"
            >
              Recent High ER (%)
            </label>
            <input
              id="velocity-high-er"
              type="number"
              min={0}
              max={100}
              step={0.1}
              value={velocity.recentHighER}
              onChange={(e) => handleNumericField(e.target.value, 'recentHighER', 100)}
              className="w-full px-2.5 py-2 text-xs sm:text-sm font-mono tabular-nums bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
            />
          </div>
        </div>

        {hasInvertedBounds && (
          <p className="text-[11px] text-amber-700 dark:text-amber-400">
            Note: Low benchmark exceeds high benchmark—band endpoints are automatically ordered for calculation ({formatNumber(lowViews)}–{formatNumber(highViews)} views · {lowER.toFixed(1)}%–{highER.toFixed(1)}% ER).
          </p>
        )}
      </div>

      {/* Benchmark Position Gauges */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
        {/* View Velocity Band */}
        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between gap-2 text-[11px] tabular-nums">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Median View Position
            </span>
            <span className="font-mono text-slate-600 dark:text-slate-400">
              {formatNumber(profile.medianViews)} ({b.velocityViewPositionPct}% of band)
            </span>
          </div>
          <div className="relative h-2 rounded-sm bg-slate-200 dark:bg-slate-800">
            <div
              aria-hidden="true"
              className="absolute inset-y-0 left-1/2 w-px bg-slate-400/70 dark:bg-slate-600"
            />
            <div
              aria-hidden="true"
              style={{ width: `${b.velocityViewPositionPct}%` }}
              className={`h-full rounded-sm transition-all duration-200 ${
                velocity.enabled
                  ? 'bg-blue-700 dark:bg-blue-500'
                  : 'bg-slate-400 dark:bg-slate-600'
              }`}
            />
            <div
              aria-hidden="true"
              style={{ left: `${b.velocityViewPositionPct}%` }}
              className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-3.5 rounded-xs bg-slate-900 dark:bg-white border border-white dark:border-slate-900"
            />
          </div>
          <div className="flex items-center justify-between text-[10px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
            <span>Low {formatNumber(lowViews)}</span>
            <span>
              {b.viewSpreadRatio.toFixed(1)}x spread · {spreadLabel}
            </span>
            <span>High {formatNumber(highViews)}</span>
          </div>
        </div>

        {/* ER Velocity Band */}
        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between gap-2 text-[11px] tabular-nums">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Engagement Rate Position
            </span>
            <span className="font-mono text-slate-600 dark:text-slate-400">
              {b.calculatedER.toFixed(1)}% ({b.velocityErPositionPct}% of band)
            </span>
          </div>
          <div className="relative h-2 rounded-sm bg-slate-200 dark:bg-slate-800">
            <div
              aria-hidden="true"
              className="absolute inset-y-0 left-1/2 w-px bg-slate-400/70 dark:bg-slate-600"
            />
            <div
              aria-hidden="true"
              style={{ width: `${b.velocityErPositionPct}%` }}
              className={`h-full rounded-sm transition-all duration-200 ${
                velocity.enabled
                  ? 'bg-emerald-600 dark:bg-emerald-500'
                  : 'bg-slate-400 dark:bg-slate-600'
              }`}
            />
            <div
              aria-hidden="true"
              style={{ left: `${b.velocityErPositionPct}%` }}
              className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-3.5 rounded-xs bg-slate-900 dark:bg-white border border-white dark:border-slate-900"
            />
          </div>
          <div className="flex items-center justify-between text-[10px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
            <span>Low {lowER.toFixed(1)}%</span>
            <span>Mid {((lowER + highER) / 2).toFixed(1)}%</span>
            <span>High {highER.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      {/* Valuation Engine Sensitivity Control */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <label
            htmlFor="velocity-sensitivity-slider"
            className="font-semibold text-slate-700 dark:text-slate-300"
          >
            Valuation Engine Sensitivity
          </label>
          <span className="font-mono tabular-nums text-slate-700 dark:text-slate-300">
            <strong className="text-slate-900 dark:text-slate-100">
              {velocity.sensitivity.toFixed(2)}x
            </strong>{' '}
            · up to ±{maxSwingPct}% reach elasticity
          </span>
        </div>

        <input
          id="velocity-sensitivity-slider"
          type="range"
          min={0.25}
          max={2.0}
          step={0.05}
          value={velocity.sensitivity}
          onChange={(e) =>
            updateVelocity((prev) => ({
              ...prev,
              sensitivity: Number(e.target.value),
            }))
          }
          className="w-full accent-blue-700 dark:accent-blue-500 cursor-pointer"
        />

        <div className="flex flex-wrap items-center gap-1.5">
          {SENSITIVITY_PRESETS.map((preset) => {
            const active = Math.abs(velocity.sensitivity - preset.value) < 0.03;
            return (
              <button
                key={preset.value}
                type="button"
                aria-pressed={active}
                onClick={() =>
                  updateVelocity((prev) => ({
                    ...prev,
                    sensitivity: preset.value,
                  }))
                }
                className={`px-2.5 py-1 text-[11px] font-mono font-medium rounded-md border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-slate-900 dark:bg-blue-600 text-white border-slate-900 dark:border-blue-600'
                    : 'bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};
