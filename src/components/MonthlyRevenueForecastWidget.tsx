import React, { useMemo, useState } from 'react';
import { CalendarRange, Check } from 'lucide-react';
import { PLATFORM_SPECS } from '../data/benchmarks';
import {
  CalculatedDealResult,
  CreatorProfile,
  DealScope,
} from '../types/calculator';
import { useCurrency } from '../context/CurrencyContext';
import { formatCurrencyExact, formatNumber } from '../utils/pricingEngine';

type CadenceUnit = 'monthly' | 'weekly';
type ActiveMonthsOption = 10 | 11 | 12;

interface CadencePreset {
  id: string;
  label: string;
  count: number;
  unit: CadenceUnit;
}

const CADENCE_PRESETS: CadencePreset[] = [
  { id: '1-mo', label: '1 / mo', count: 1, unit: 'monthly' },
  { id: '2-mo', label: '2 / mo', count: 2, unit: 'monthly' },
  { id: '1-wk', label: '1 / wk (4.3/mo)', count: 1, unit: 'weekly' },
  { id: '6-mo', label: '6 / mo', count: 6, unit: 'monthly' },
  { id: '2-wk', label: '2 / wk (8.7/mo)', count: 2, unit: 'weekly' },
];

const ACTIVE_MONTH_OPTIONS: ActiveMonthsOption[] = [10, 11, 12];

interface MonthlyRevenueForecastWidgetProps {
  profile: CreatorProfile;
  scope: DealScope;
  result: CalculatedDealResult;
  inflationEnabled: boolean;
  currentTargetMonthlyRevenue: string;
  onApplyMonthlyTargetToSaveForm: (monthlyUsdString: string) => void;
}

function formatCadenceNum(value: number): string {
  if (!Number.isFinite(value)) return '0';
  return Number.isInteger(value) ? value.toString() : value.toFixed(1);
}

export const MonthlyRevenueForecastWidget: React.FC<MonthlyRevenueForecastWidgetProps> = ({
  profile,
  scope,
  result,
  inflationEnabled,
  currentTargetMonthlyRevenue,
  onApplyMonthlyTargetToSaveForm,
}) => {
  const { currency } = useCurrency();
  const [cadenceUnit, setCadenceUnit] = useState<CadenceUnit>('monthly');
  const [cadenceCountInput, setCadenceCountInput] = useState<string>('2');
  const [activeMonthsPerYear, setActiveMonthsPerYear] = useState<ActiveMonthsOption>(12);
  const [justApplied, setJustApplied] = useState(false);

  const b = result.breakdown;
  const platformSpec = PLATFORM_SPECS[profile.platform];

  const parsedCount = Number(cadenceCountInput);
  const validCadenceCount =
    cadenceCountInput.trim() !== '' && Number.isFinite(parsedCount) && parsedCount > 0
      ? Math.min(cadenceUnit === 'weekly' ? 14 : 60, parsedCount)
      : 0;

  const forecast = useMemo(() => {
    const dealsPerMonth =
      cadenceUnit === 'weekly' ? validCadenceCount * (52 / 12) : validCadenceCount;
    const annualDeals = dealsPerMonth * activeMonthsPerYear;

    const monthlyGross = b.totalRecommendedRate * dealsPerMonth;
    const annualGross = b.totalRecommendedRate * annualDeals;

    const monthlyBaseCreative = b.baseCreationFee * dealsPerMonth;
    const monthlyRightsRiders = b.totalCommercialRiders * dealsPerMonth;

    const annualBaseCreative = b.baseCreationFee * annualDeals;
    const annualRightsRiders = b.totalCommercialRiders * annualDeals;

    const annualSETax = annualGross * 0.153;
    const annualNetAfterTax = annualGross - annualSETax;
    const monthlyNetAfterTax = monthlyGross * (1 - 0.153);

    const baseSharePct =
      annualGross > 0 ? Math.round((annualBaseCreative / annualGross) * 100) : 100;
    const ridersSharePct = Math.max(0, 100 - baseSharePct);

    const tierAMonthly = result.tieredPackages.tierA_Organic.fee * dealsPerMonth;
    const tierAAnnual = result.tieredPackages.tierA_Organic.fee * annualDeals;

    const tierCMonthly = result.tieredPackages.tierC_FullScale.fee * dealsPerMonth;
    const tierCAnnual = result.tieredPackages.tierC_FullScale.fee * annualDeals;

    return {
      dealsPerMonth,
      annualDeals,
      monthlyGross,
      annualGross,
      monthlyBaseCreative,
      monthlyRightsRiders,
      annualBaseCreative,
      annualRightsRiders,
      annualSETax,
      annualNetAfterTax,
      monthlyNetAfterTax,
      baseSharePct,
      ridersSharePct,
      tierAMonthly,
      tierAAnnual,
      tierCMonthly,
      tierCAnnual,
    };
  }, [
    cadenceUnit,
    validCadenceCount,
    activeMonthsPerYear,
    b.totalRecommendedRate,
    b.baseCreationFee,
    b.totalCommercialRiders,
    result.tieredPackages.tierA_Organic.fee,
    result.tieredPackages.tierC_FullScale.fee,
  ]);

  const roundedMonthlyUsdString =
    forecast.monthlyGross > 0 ? Math.round(forecast.monthlyGross).toString() : '';
  const isSyncedWithSaveForm =
    roundedMonthlyUsdString !== '' &&
    currentTargetMonthlyRevenue === roundedMonthlyUsdString;

  const handleSelectPreset = (preset: CadencePreset) => {
    setCadenceUnit(preset.unit);
    setCadenceCountInput(preset.count.toString());
  };

  const handleUnitChange = (nextUnit: CadenceUnit) => {
    if (nextUnit === cadenceUnit) return;
    if (validCadenceCount > 0) {
      const converted =
        nextUnit === 'weekly'
          ? Math.max(0.25, Math.round((validCadenceCount / (52 / 12)) * 4) / 4)
          : Math.max(0.5, Math.round(validCadenceCount * (52 / 12) * 2) / 2);
      setCadenceCountInput(converted.toString());
    }
    setCadenceUnit(nextUnit);
  };

  const handleApplyToSaveForm = () => {
    if (!roundedMonthlyUsdString) return;
    onApplyMonthlyTargetToSaveForm(roundedMonthlyUsdString);
    setJustApplied(true);
    window.setTimeout(() => setJustApplied(false), 1800);
  };

  const activePresetId = CADENCE_PRESETS.find(
    (p) => p.unit === cadenceUnit && Math.abs(p.count - validCadenceCount) < 0.001
  )?.id;

  const hasVelocityActive =
    Boolean(profile.engagementVelocity?.enabled) &&
    b.velocityMultiplier !== 1;

  return (
    <section
      id="monthly-revenue-potential"
      aria-label="Monthly revenue potential forecast"
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 space-y-5 transition-colors"
    >
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2">
            <CalendarRange
              className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0"
              aria-hidden="true"
            />
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              Monthly Revenue Potential
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Forecasts monthly and annualized sponsorship income from your{' '}
            <span className="font-mono tabular-nums text-slate-700 dark:text-slate-200">
              {formatCurrencyExact(b.totalRecommendedRate, currency)}
            </span>{' '}
            deal structure ({platformSpec.shortLabel}
            {scope.whitelistingEnabled ? ' + whitelisting' : ''})
            {inflationEnabled || hasVelocityActive ? (
              <span className="text-slate-400 dark:text-slate-500">
                {' '}
                · includes{' '}
                {[
                  inflationEnabled ? 'inflation adjustment' : null,
                  hasVelocityActive ? 'engagement velocity' : null,
                ]
                  .filter(Boolean)
                  .join(' & ')}
              </span>
            ) : null}
            .
          </p>
        </div>

        {roundedMonthlyUsdString && (
          <button
            type="button"
            onClick={handleApplyToSaveForm}
            disabled={isSyncedWithSaveForm}
            className={`inline-flex items-center gap-1 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
              isSyncedWithSaveForm || justApplied
                ? 'text-emerald-700 dark:text-emerald-400 cursor-default'
                : 'text-blue-700 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline cursor-pointer'
            }`}
          >
            {(isSyncedWithSaveForm || justApplied) && (
              <Check className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            )}
            {isSyncedWithSaveForm || justApplied
              ? 'Synced to Save Form'
              : 'Use Forecast in Save Form'}
          </button>
        )}
      </div>

      {/* Posting Cadence Controls */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Sponsored Posting Cadence
          </span>
          <div
            className="flex flex-wrap items-center gap-1.5"
            role="group"
            aria-label="Posting cadence presets"
          >
            {CADENCE_PRESETS.map((preset) => {
              const active = activePresetId === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => handleSelectPreset(preset)}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
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

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
          {/* Custom Deal Count */}
          <div className="sm:col-span-4">
            <label
              htmlFor="forecast-cadence-count"
              className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1"
            >
              Sponsored Deals
            </label>
            <input
              id="forecast-cadence-count"
              type="number"
              min={0.25}
              max={cadenceUnit === 'weekly' ? 14 : 60}
              step={cadenceUnit === 'weekly' ? 0.25 : 0.5}
              value={cadenceCountInput}
              onChange={(e) => setCadenceCountInput(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono tabular-nums bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
            />
          </div>

          {/* Cadence Interval Toggle */}
          <div className="sm:col-span-4">
            <span className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
              Cadence Interval
            </span>
            <div
              className="grid grid-cols-2 p-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
              role="group"
              aria-label="Cadence interval unit"
            >
              <button
                type="button"
                aria-pressed={cadenceUnit === 'monthly'}
                onClick={() => handleUnitChange('monthly')}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  cadenceUnit === 'monthly'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Per Month
              </button>
              <button
                type="button"
                aria-pressed={cadenceUnit === 'weekly'}
                onClick={() => handleUnitChange('weekly')}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  cadenceUnit === 'weekly'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Per Week
              </button>
            </div>
          </div>

          {/* Active Billing Months / Year */}
          <div className="sm:col-span-4">
            <span className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
              Active Months / Year
            </span>
            <div
              className="grid grid-cols-3 p-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
              role="group"
              aria-label="Active sponsored months per year"
            >
              {ACTIVE_MONTH_OPTIONS.map((months) => {
                const active = activeMonthsPerYear === months;
                return (
                  <button
                    key={months}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setActiveMonthsPerYear(months)}
                    className={`px-2 py-1.5 text-xs font-mono tabular-nums font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                      active
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    {months}m
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Primary Forecast KPIs (Hairline-divided, zero nested cards) */}
      {validCadenceCount > 0 ? (
        <div className="space-y-4 pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4 border-y border-slate-100 dark:border-slate-800">
            <div className="space-y-1">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Monthly Revenue Potential
              </div>
              <div className="font-mono tabular-nums text-2xl sm:text-3xl font-bold text-slate-950 dark:text-slate-50 tracking-tight">
                {formatCurrencyExact(forecast.monthlyGross, currency)}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                {formatCadenceNum(forecast.dealsPerMonth)} sponsored {platformSpec.shortLabel}
                {forecast.dealsPerMonth === 1 ? '' : 's'} / mo
              </div>
            </div>

            <div className="space-y-1 sm:pl-4 sm:border-l sm:border-slate-100 sm:dark:border-slate-800">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-400">
                Annualized Gross ({activeMonthsPerYear} Active Mo)
              </div>
              <div className="font-mono tabular-nums text-2xl sm:text-3xl font-bold text-blue-700 dark:text-blue-400 tracking-tight">
                {formatCurrencyExact(forecast.annualGross, currency)}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                {formatNumber(Math.round(forecast.annualDeals * 10) / 10)} total sponsored deals / yr
              </div>
            </div>
          </div>

          {/* Secondary Tax & Take-Home Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="space-y-0.5">
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                Est. Annual Net (After 15.3% SE Tax)
              </div>
              <div className="font-mono tabular-nums text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                {formatCurrencyExact(forecast.annualNetAfterTax, currency)}
              </div>
              <div className="text-[11px] font-mono tabular-nums text-slate-400 dark:text-slate-500">
                {formatCurrencyExact(forecast.monthlyNetAfterTax, currency)} / mo net
              </div>
            </div>

            <div className="space-y-0.5">
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                Annual SE Tax Reserve (15.3%)
              </div>
              <div className="font-mono tabular-nums text-sm font-semibold text-slate-800 dark:text-slate-200">
                {formatCurrencyExact(forecast.annualSETax, currency)}
              </div>
              <div className="text-[11px] font-mono tabular-nums text-slate-400 dark:text-slate-500">
                {formatCurrencyExact(forecast.annualSETax / 4, currency)} / quarterly est.
              </div>
            </div>

            <div className="space-y-0.5">
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                Annual Commercial Riders Uplift
              </div>
              <div className="font-mono tabular-nums text-sm font-semibold text-slate-800 dark:text-slate-200">
                {formatCurrencyExact(forecast.annualRightsRiders, currency)}
              </div>
              <div className="text-[11px] font-mono tabular-nums text-slate-400 dark:text-slate-500">
                {formatCurrencyExact(forecast.monthlyRightsRiders, currency)} / mo above base fee
              </div>
            </div>
          </div>

          {/* Revenue Composition Bar: Creative Base vs Commercial Rights Riders */}
          <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-medium text-slate-700 dark:text-slate-300">
                Annual Revenue Mix
              </span>
              <span className="font-mono tabular-nums text-[11px] text-slate-500 dark:text-slate-400">
                Creative Base {forecast.baseSharePct}% ({formatCurrencyExact(forecast.annualBaseCreative, currency)}) · Commercial Riders {forecast.ridersSharePct}% ({formatCurrencyExact(forecast.annualRightsRiders, currency)})
              </span>
            </div>
            <div
              className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex"
              role="img"
              aria-label={`Annual revenue mix: ${forecast.baseSharePct}% creative base fees and ${forecast.ridersSharePct}% commercial rights riders`}
            >
              <div
                className="h-full bg-blue-700 dark:bg-blue-500 transition-all duration-300"
                style={{ width: `${forecast.baseSharePct}%` }}
              />
              {forecast.ridersSharePct > 0 && (
                <div
                  className="h-full bg-emerald-600 dark:bg-emerald-500 transition-all duration-300"
                  style={{ width: `${forecast.ridersSharePct}%` }}
                />
              )}
            </div>
          </div>

          {/* Deal Structure Annualized Comparison */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Annualized Potential by Deal Structure (at {formatCadenceNum(forecast.dealsPerMonth)} deals/mo)
              </span>
              <span className="text-[11px] text-slate-400 dark:text-slate-500">
                Comparing your 3 negotiation tiers
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-slate-800 border-t border-slate-100 dark:border-slate-800">
              <div className="py-2.5 sm:pr-4 space-y-0.5">
                <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Option A · Organic Only
                </div>
                <div className="font-mono tabular-nums text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {formatCurrencyExact(forecast.tierAAnnual, currency)}
                  <span className="text-[11px] font-normal text-slate-400 dark:text-slate-500">
                    {' '}
                    / yr
                  </span>
                </div>
                <div className="font-mono tabular-nums text-[11px] text-slate-400 dark:text-slate-500">
                  {formatCurrencyExact(forecast.tierAMonthly, currency)} / mo
                </div>
              </div>

              <div className="py-2.5 sm:px-4 space-y-0.5">
                <div className="text-[11px] font-semibold text-blue-700 dark:text-blue-400">
                  Current Deal Scope
                </div>
                <div className="font-mono tabular-nums text-sm font-bold text-slate-950 dark:text-slate-50">
                  {formatCurrencyExact(forecast.annualGross, currency)}
                  <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
                    {' '}
                    / yr
                  </span>
                </div>
                <div className="font-mono tabular-nums text-[11px] text-blue-700 dark:text-blue-400">
                  {formatCurrencyExact(forecast.monthlyGross, currency)} / mo
                </div>
              </div>

              <div className="py-2.5 sm:pl-4 space-y-0.5">
                <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Option C · Full Scale
                </div>
                <div className="font-mono tabular-nums text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                  {formatCurrencyExact(forecast.tierCAnnual, currency)}
                  <span className="text-[11px] font-normal text-slate-400 dark:text-slate-500">
                    {' '}
                    / yr
                  </span>
                </div>
                <div className="font-mono tabular-nums text-[11px] text-slate-400 dark:text-slate-500">
                  {formatCurrencyExact(forecast.tierCMonthly, currency)} / mo
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="py-4 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
          Enter a sponsored posting cadence greater than 0 to calculate monthly and annualized revenue potential.
        </div>
      )}
    </section>
  );
};
