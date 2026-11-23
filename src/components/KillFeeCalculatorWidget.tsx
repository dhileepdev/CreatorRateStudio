import React, { useMemo, useState } from 'react';
import { Check, Copy, RotateCcw, Shield } from 'lucide-react';
import { CalculatedDealResult } from '../types/calculator';
import { useCurrency } from '../context/CurrencyContext';
import { formatCurrencyExact } from '../utils/pricingEngine';

type ProductionStageId = 'pre_production' | 'production' | 'post_production';
type FeeBasis = 'total_deal' | 'base_creation';

interface StageDefinition {
  id: ProductionStageId;
  label: string;
  shortLabel: string;
  milestoneSummary: string;
}

const PRODUCTION_STAGES: StageDefinition[] = [
  {
    id: 'pre_production',
    label: 'Pre-Production',
    shortLabel: 'Pre-Prod',
    milestoneSummary: 'Agreement signed, campaign dates booked, concepting or brief review underway',
  },
  {
    id: 'production',
    label: 'Production',
    shortLabel: 'Production',
    milestoneSummary: 'Concept/script approved, equipment or talent booked, filming scheduled or in progress',
  },
  {
    id: 'post_production',
    label: 'Post-Production',
    shortLabel: 'Post-Prod',
    milestoneSummary: 'Footage filmed, editing underway, or first draft deliverable submitted for review',
  },
];

const DEFAULT_STAGE_PERCENTAGES: Record<ProductionStageId, number> = {
  pre_production: 25,
  production: 50,
  post_production: 100,
};

interface KillFeeSchedulePreset {
  id: string;
  label: string;
  percentages: Record<ProductionStageId, number>;
}

const SCHEDULE_PRESETS: KillFeeSchedulePreset[] = [
  {
    id: 'standard',
    label: 'Standard (25 / 50 / 100%)',
    percentages: { pre_production: 25, production: 50, post_production: 100 },
  },
  {
    id: 'protective',
    label: 'Protective (50 / 75 / 100%)',
    percentages: { pre_production: 50, production: 75, post_production: 100 },
  },
  {
    id: 'flexible',
    label: 'Flexible (20 / 50 / 80%)',
    percentages: { pre_production: 20, production: 50, post_production: 80 },
  },
];

interface KillFeeCalculatorWidgetProps {
  result: CalculatedDealResult;
}

function clampPercentage(raw: number): number {
  if (!Number.isFinite(raw)) return 0;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

export const KillFeeCalculatorWidget: React.FC<KillFeeCalculatorWidgetProps> = ({
  result,
}) => {
  const { currency } = useCurrency();
  const [selectedStage, setSelectedStage] = useState<ProductionStageId>('production');
  const [feeBasis, setFeeBasis] = useState<FeeBasis>('total_deal');
  const [stagePercentages, setStagePercentages] = useState<
    Record<ProductionStageId, number>
  >(DEFAULT_STAGE_PERCENTAGES);
  const [copiedClause, setCopiedClause] = useState(false);

  const b = result.breakdown;
  const basisAmountUsd =
    feeBasis === 'total_deal' ? b.totalRecommendedRate : b.baseCreationFee;
  const basisLabel =
    feeBasis === 'total_deal' ? 'Total Deal Value' : 'Base Creation Fee';

  const stageBreakdowns = useMemo(() => {
    return PRODUCTION_STAGES.map((stage) => {
      const pct = stagePercentages[stage.id];
      const payoutUsd = (basisAmountUsd * pct) / 100;
      const waivedUsd = Math.max(0, basisAmountUsd - payoutUsd);
      const estimatedNetUsd = payoutUsd * (1 - 0.153);
      return {
        ...stage,
        pct,
        payoutUsd,
        waivedUsd,
        estimatedNetUsd,
      };
    });
  }, [basisAmountUsd, stagePercentages]);

  const activeStageData =
    stageBreakdowns.find((s) => s.id === selectedStage) ?? stageBreakdowns[1];

  const isCustomized =
    stagePercentages.pre_production !== DEFAULT_STAGE_PERCENTAGES.pre_production ||
    stagePercentages.production !== DEFAULT_STAGE_PERCENTAGES.production ||
    stagePercentages.post_production !== DEFAULT_STAGE_PERCENTAGES.post_production;

  const activePresetId = SCHEDULE_PRESETS.find(
    (preset) =>
      preset.percentages.pre_production === stagePercentages.pre_production &&
      preset.percentages.production === stagePercentages.production &&
      preset.percentages.post_production === stagePercentages.post_production
  )?.id;

  const handleUpdateStagePct = (stageId: ProductionStageId, nextVal: number) => {
    setStagePercentages((prev) => ({
      ...prev,
      [stageId]: clampPercentage(nextVal),
    }));
  };

  const generatedKillFeeClause = useMemo(() => {
    const pre = stageBreakdowns[0];
    const prod = stageBreakdowns[1];
    const post = stageBreakdowns[2];
    const basisPhrase =
      feeBasis === 'total_deal'
        ? `the Total Deal Value (${formatCurrencyExact(basisAmountUsd, currency)})`
        : `the Base Creation Fee (${formatCurrencyExact(basisAmountUsd, currency)})`;

    return `Cancellation & Kill Fee Schedule: If Brand cancels or terminates this Agreement for convenience without material breach by Creator, Brand shall pay a non-refundable Kill Fee based on ${basisPhrase} according to the active production stage at written notice of cancellation: (a) Pre-Production (after Agreement execution and calendar hold): ${pre.pct}% (${formatCurrencyExact(pre.payoutUsd, currency)}); (b) Production (after concept/script approval or shoot scheduling): ${prod.pct}% (${formatCurrencyExact(prod.payoutUsd, currency)}); (c) Post-Production (after filming commences or first draft submission): ${post.pct}% (${formatCurrencyExact(post.payoutUsd, currency)}). Kill Fees are payable within fourteen (14) calendar days of cancellation notice, and all unpaid commercial usage rights immediately revert to Creator.`;
  }, [stageBreakdowns, feeBasis, basisAmountUsd, currency]);

  const handleCopyClause = async () => {
    try {
      await navigator.clipboard.writeText(generatedKillFeeClause);
      setCopiedClause(true);
      window.setTimeout(() => setCopiedClause(false), 1800);
    } catch {
      // Clipboard access unavailable
    }
  };

  return (
    <section
      id="kill-fee-calculator"
      aria-label="Kill fee cancellation protection calculator"
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 space-y-5 transition-colors"
    >
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2">
            <Shield
              className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0"
              aria-hidden="true"
            />
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              Kill Fee Calculator
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Define cancellation recovery percentages across production stages against your{' '}
            <span className="font-mono tabular-nums text-slate-700 dark:text-slate-200">
              {formatCurrencyExact(basisAmountUsd, currency)}
            </span>{' '}
            {basisLabel.toLowerCase()}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isCustomized && (
            <button
              type="button"
              onClick={() => setStagePercentages(DEFAULT_STAGE_PERCENTAGES)}
              className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3 h-3" aria-hidden="true" />
              Reset Defaults
            </button>
          )}
          <button
            type="button"
            onClick={handleCopyClause}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100/80 dark:hover:bg-blue-900/60 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            {copiedClause ? (
              <Check
                className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400"
                aria-hidden="true"
              />
            ) : (
              <Copy className="w-3.5 h-3.5" aria-hidden="true" />
            )}
            {copiedClause ? 'Clause Copied' : 'Copy Kill Fee Clause'}
          </button>
        </div>
      </div>

      {/* Basis Toggle + Schedule Presets */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          className="inline-flex p-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
          role="group"
          aria-label="Kill fee calculation basis"
        >
          <button
            type="button"
            aria-pressed={feeBasis === 'total_deal'}
            onClick={() => setFeeBasis('total_deal')}
            className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              feeBasis === 'total_deal'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Total Deal ({formatCurrencyExact(b.totalRecommendedRate, currency)})
          </button>
          <button
            type="button"
            aria-pressed={feeBasis === 'base_creation'}
            onClick={() => setFeeBasis('base_creation')}
            className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              feeBasis === 'base_creation'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Base Fee Only ({formatCurrencyExact(b.baseCreationFee, currency)})
          </button>
        </div>

        <div
          className="flex flex-wrap items-center gap-1.5"
          role="group"
          aria-label="Kill fee schedule presets"
        >
          {SCHEDULE_PRESETS.map((preset) => {
            const active = activePresetId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                aria-pressed={active}
                onClick={() => setStagePercentages(preset.percentages)}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-md border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-blue-700 dark:bg-blue-600 text-white border-blue-700 dark:border-blue-600'
                    : 'bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Stage Selector + Custom Percentage Slider for Active Stage */}
      <div className="space-y-3">
        <div
          className="grid grid-cols-3 p-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
          role="tablist"
          aria-label="Cancellation production stage"
        >
          {stageBreakdowns.map((stage) => {
            const active = stage.id === selectedStage;
            return (
              <button
                key={stage.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setSelectedStage(stage.id)}
                className={`px-2.5 py-2 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap truncate ${
                  active
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <span>{stage.label}</span>
                <span className="ml-1.5 font-mono tabular-nums text-[11px] opacity-75">
                  {stage.pct}%
                </span>
              </button>
            );
          })}
        </div>

        {/* Selected Stage Primary Payout & Percentage Control */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 py-4 border-y border-slate-100 dark:border-slate-800 items-center">
          <div className="sm:col-span-6 space-y-1">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-400">
              {activeStageData.label} Kill Fee Payout
            </div>
            <div className="flex items-baseline gap-2.5">
              <span className="font-mono tabular-nums text-2xl sm:text-3xl font-bold text-slate-950 dark:text-slate-50 tracking-tight">
                {formatCurrencyExact(activeStageData.payoutUsd, currency)}
              </span>
              <span className="font-mono tabular-nums text-xs font-semibold text-blue-700 dark:text-blue-400">
                {activeStageData.pct}% of {basisLabel.toLowerCase()}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {activeStageData.milestoneSummary}.
            </p>
          </div>

          <div className="sm:col-span-6 sm:pl-4 sm:border-l sm:border-slate-100 sm:dark:border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="kill-fee-stage-slider"
                className="text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                {activeStageData.label} Recovery %
              </label>
              <div className="inline-flex items-center gap-1">
                <input
                  id="kill-fee-stage-number"
                  type="number"
                  min={0}
                  max={100}
                  step={5}
                  value={activeStageData.pct}
                  onChange={(e) =>
                    handleUpdateStagePct(activeStageData.id, Number(e.target.value))
                  }
                  aria-label={`${activeStageData.label} kill fee percentage`}
                  className="w-16 px-2 py-1 text-right text-xs font-mono tabular-nums font-semibold bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
                />
                <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                  %
                </span>
              </div>
            </div>

            <input
              id="kill-fee-stage-slider"
              type="range"
              min={0}
              max={100}
              step={5}
              value={activeStageData.pct}
              onChange={(e) =>
                handleUpdateStagePct(activeStageData.id, Number(e.target.value))
              }
              className="w-full accent-blue-700 dark:accent-blue-500 cursor-pointer"
            />

            <div className="flex items-center justify-between gap-2 text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
              <span>
                Est. Net (after 15.3% SE tax):{' '}
                <strong className="text-emerald-700 dark:text-emerald-400 font-semibold">
                  {formatCurrencyExact(activeStageData.estimatedNetUsd, currency)}
                </strong>
              </span>
              <span>
                Waived: {formatCurrencyExact(activeStageData.waivedUsd, currency)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Full 3-Stage Milestone Schedule (Hairline-Divided, Direct Inline % Editing) */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
            Full Production Stage Payout Schedule
          </span>
          <span className="text-[11px] text-slate-400 dark:text-slate-500">
            Click any stage to inspect or adjust percentages directly
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-slate-800 border-t border-slate-100 dark:border-slate-800">
          {stageBreakdowns.map((stage, idx) => {
            const isSelected = stage.id === selectedStage;
            return (
              <div
                key={`schedule-${stage.id}`}
                onClick={() => setSelectedStage(stage.id)}
                className={`py-3 space-y-1.5 cursor-pointer transition-colors ${
                  idx === 0
                    ? 'sm:pr-4'
                    : idx === 1
                      ? 'sm:px-4'
                      : 'sm:pl-4'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`text-xs font-semibold ${
                      isSelected
                        ? 'text-blue-700 dark:text-blue-400'
                        : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {idx + 1}. {stage.label}
                  </span>
                  <div
                    className="inline-flex items-center gap-0.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={5}
                      value={stage.pct}
                      onChange={(e) =>
                        handleUpdateStagePct(stage.id, Number(e.target.value))
                      }
                      aria-label={`${stage.label} payout percentage`}
                      className="w-12 px-1.5 py-0.5 text-right text-[11px] font-mono tabular-nums font-semibold bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-600"
                    />
                    <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
                      %
                    </span>
                  </div>
                </div>

                <div className="font-mono tabular-nums text-base font-bold text-slate-950 dark:text-slate-50">
                  {formatCurrencyExact(stage.payoutUsd, currency)}
                </div>

                <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-200 ${
                      isSelected
                        ? 'bg-blue-700 dark:bg-blue-500'
                        : 'bg-slate-400 dark:bg-slate-600'
                    }`}
                    style={{ width: `${stage.pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Contract-Ready Clause Preview */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
        <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
          Generated Contract Wording Preview
        </div>
        <p className="text-[11px] font-mono text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-3">
          {generatedKillFeeClause}
        </p>
      </div>
    </section>
  );
};
